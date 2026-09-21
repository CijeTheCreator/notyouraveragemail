//
//  CompanionManager.swift
//  leanring-buddy
//
//  Central state manager for the companion voice mode. Owns the push-to-talk
//  pipeline (dictation manager + global shortcut monitor + overlay) and
//  exposes observable voice state for the panel UI.
//

import AVFoundation
import Combine
import Foundation
import PostHog
import ScreenCaptureKit
import SwiftUI

enum CompanionVoiceState {
    case idle
    case listening
    case processing
    case responding
}

@MainActor
final class CompanionManager: ObservableObject {
    @Published private(set) var voiceState: CompanionVoiceState = .idle
    @Published private(set) var lastTranscript: String?
    @Published private(set) var currentAudioPowerLevel: CGFloat = 0
    @Published private(set) var hasAccessibilityPermission = false
    @Published private(set) var hasScreenRecordingPermission = false
    @Published private(set) var hasMicrophonePermission = false
    @Published private(set) var hasScreenContentPermission = false
    @Published var isScanningForOtp: Bool = false
    @Published var isUploadingFiles: Bool = false
    @Published var isCollectingContext: Bool = false
    @Published var isDraftingEmail: Bool = false

    /// Screen location (global AppKit coords) of a detected UI element the
    /// buddy should fly to and point at (e.g. OTP target field).
    /// Observed by BlueCursorView to trigger the flight animation.
    @Published var detectedElementScreenLocation: CGPoint?
    /// The display frame (global AppKit coords) of the screen the detected
    /// element is on, so BlueCursorView knows which screen overlay should animate.
    @Published var detectedElementDisplayFrame: CGRect?
    /// Custom speech bubble text for the pointing animation. When set,
    /// BlueCursorView uses this instead of a random pointer phrase.
    @Published var detectedElementBubbleText: String?

    // MARK: - Onboarding Video State (shared across all screen overlays)

    @Published var onboardingVideoPlayer: AVPlayer?
    @Published var showOnboardingVideo: Bool = false
    @Published var onboardingVideoOpacity: Double = 0.0
    private var onboardingVideoEndObserver: NSObjectProtocol?
    private var onboardingDemoTimeObserver: Any?

    // MARK: - Onboarding Prompt Bubble

    /// Text streamed character-by-character on the cursor after the onboarding video ends.
    @Published var onboardingPromptText: String = ""
    @Published var onboardingPromptOpacity: Double = 0.0
    @Published var showOnboardingPrompt: Bool = false

    // MARK: - Onboarding Music

    private var onboardingMusicPlayer: AVAudioPlayer?
    private var onboardingMusicFadeTimer: Timer?

    let buddyDictationManager = BuddyDictationManager()
    let globalPushToTalkShortcutMonitor = GlobalPushToTalkShortcutMonitor()
    let overlayWindowManager = OverlayWindowManager()
    // Response text is now displayed inline on the cursor overlay via
    // streamingResponseText, so no separate response overlay manager is needed.

    /// The currently running AI response task, if any. Cancelled when the user
    /// speaks again so a new response can begin immediately.
    private var currentResponseTask: Task<Void, Never>?

    private var shortcutTransitionCancellable: AnyCancellable?
    private var optionSpaceCancellable: AnyCancellable?
    private var voiceStateCancellable: AnyCancellable?
    private var audioPowerCancellable: AnyCancellable?
    private var liveTranscriptCancellable: AnyCancellable?
    private var accessibilityCheckTimer: Timer?
    private var pendingKeyboardShortcutStartTask: Task<Void, Never>?
    /// Scheduled hide for transient cursor mode — cancelled if the user
    /// speaks again before the delay elapses.
    private var transientHideTask: Task<Void, Never>?

    /// True when all three required permissions (accessibility, screen recording,
    /// microphone) are granted. Used by the panel to show a single "all good" state.
    var allPermissionsGranted: Bool {
        hasAccessibilityPermission && hasScreenRecordingPermission && hasMicrophonePermission
    }

    /// Whether the blue cursor overlay is currently visible on screen.
    /// Used by the panel to show accurate status text ("Active" vs "Ready").
    @Published private(set) var isOverlayVisible: Bool = false

    /// User preference for whether the Mail Buddy cursor should be shown.
    /// When toggled off, the overlay is hidden and push-to-talk is disabled.
    /// Persisted to UserDefaults so the choice survives app restarts.
    @Published var isMailBuddyCursorEnabled: Bool = {
        if let stored = UserDefaults.standard.object(forKey: "isMailBuddyCursorEnabled") as? Bool {
            return stored
        }
        if let legacy = UserDefaults.standard.object(forKey: "isClickyCursorEnabled") as? Bool {
            return legacy
        }
        return true
    }()

    var isClickyCursorEnabled: Bool {
        get { isMailBuddyCursorEnabled }
        set { setMailBuddyCursorEnabled(newValue) }
    }

    func setMailBuddyCursorEnabled(_ enabled: Bool) {
        isMailBuddyCursorEnabled = enabled
        UserDefaults.standard.set(enabled, forKey: "isMailBuddyCursorEnabled")
        UserDefaults.standard.set(enabled, forKey: "isClickyCursorEnabled")
        transientHideTask?.cancel()
        transientHideTask = nil

        if enabled {
            overlayWindowManager.hasShownOverlayBefore = true
            overlayWindowManager.showOverlay(onScreens: NSScreen.screens, companionManager: self)
            isOverlayVisible = true
        } else {
            overlayWindowManager.hideOverlay()
            isOverlayVisible = false
        }
    }

    /// User preference for whether automatic OTP alerts and scans should occur.
    /// Persisted to UserDefaults so the choice survives app restarts.
    @Published var isOtpAlertsEnabled: Bool = UserDefaults.standard.object(forKey: "isOtpAlertsEnabled") == nil
        ? true
        : UserDefaults.standard.bool(forKey: "isOtpAlertsEnabled")

    func setOtpAlertsEnabled(_ enabled: Bool) {
        isOtpAlertsEnabled = enabled
        UserDefaults.standard.set(enabled, forKey: "isOtpAlertsEnabled")
    }

    /// Whether the user has completed onboarding at least once. Persisted
    /// to UserDefaults so the Start button only appears on first launch.
    var hasCompletedOnboarding: Bool {
        get { UserDefaults.standard.bool(forKey: "hasCompletedOnboarding") }
        set { UserDefaults.standard.set(newValue, forKey: "hasCompletedOnboarding") }
    }

    /// Whether the user has submitted their email during onboarding.
    @Published var hasSubmittedEmail: Bool = UserDefaults.standard.bool(forKey: "hasSubmittedEmail")

    /// Submits the user's email to FormSpark and identifies them in PostHog.
    func submitEmail(_ email: String) {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty else { return }

        hasSubmittedEmail = true
        UserDefaults.standard.set(true, forKey: "hasSubmittedEmail")

        // Identify user in PostHog
        PostHogSDK.shared.identify(trimmedEmail, userProperties: [
            "email": trimmedEmail
        ])

        // Submit to FormSpark
        Task {
            var request = URLRequest(url: URL(string: "https://submit-form.com/RWbGJxmIs")!)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: ["email": trimmedEmail])
            _ = try? await URLSession.shared.data(for: request)
        }
    }

    func start() {
        refreshAllPermissions()
        print("🔑 MailBuddy start — accessibility: \(hasAccessibilityPermission), screen: \(hasScreenRecordingPermission), mic: \(hasMicrophonePermission), screenContent: \(hasScreenContentPermission), onboarded: \(hasCompletedOnboarding)")
        startPermissionPolling()
        bindVoiceStateObservation()
        bindAudioPowerLevel()
        bindLiveTranscript()
        bindShortcutTransitions()
        bindPromptDraftingShortcut()

        // Start Convex live alerts polling for real-time OTP awareness
        ConvexService.shared.startPolling { [weak self] newOtp in
            self?.handleNewOtpArrival(newOtp)
        }

        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("TriggerOtpAutoFill"),
            object: nil,
            queue: .main
        ) { [weak self] note in
            if let otpCode = note.userInfo?["otpCode"] as? String {
                self?.executeOtpAutoFill(otpCode: otpCode)
            }
        }

        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("TriggerPromptDrafting"),
            object: nil,
            queue: .main
        ) { [weak self] note in
            if let prompt = note.userInfo?["prompt"] as? String,
               let files = note.userInfo?["files"] as? [SelectedFileInfo] {
                let screenContext = note.userInfo?["screenContext"] as? String
                self?.executeFileDraftingPipeline(prompt: prompt, selectedFiles: files, screenContext: screenContext)
            }
        }

        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("ResetCompanionDraftingState"),
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.isDraftingEmail = false
            self?.isUploadingFiles = false
        }

        // If all permissions are granted, show the cursor overlay immediately.
        if allPermissionsGranted && isMailBuddyCursorEnabled {
            overlayWindowManager.hasShownOverlayBefore = true
            overlayWindowManager.showOverlay(onScreens: NSScreen.screens, companionManager: self)
            isOverlayVisible = true
        }
    }

    /// Called by BlueCursorView after the buddy finishes its pointing
    /// animation and returns to cursor-following mode.
    /// Triggers the onboarding sequence — dismisses the panel and restarts
    /// the overlay so the welcome animation and intro video play.
    func triggerOnboarding() {
        // Post notification so the panel manager can dismiss the panel
        NotificationCenter.default.post(name: .mailBuddyDismissPanel, object: nil)

        // Mark onboarding as completed so the Start button won't appear
        // again on future launches — the cursor will auto-show instead
        hasCompletedOnboarding = true

        MailBuddyAnalytics.trackOnboardingStarted()

        // Play Besaid theme at 60% volume, fade out after 1m 30s
        startOnboardingMusic()

        // Show the overlay for the first time — isFirstAppearance triggers
        // the welcome animation and onboarding video
        overlayWindowManager.showOverlay(onScreens: NSScreen.screens, companionManager: self)
        isOverlayVisible = true
    }

    /// Replays the onboarding experience from the "Watch Onboarding Again"
    /// footer link. Same flow as triggerOnboarding but the cursor overlay
    /// is already visible so we just restart the welcome animation and video.
    func replayOnboarding() {
        NotificationCenter.default.post(name: .mailBuddyDismissPanel, object: nil)
        MailBuddyAnalytics.trackOnboardingReplayed()
        startOnboardingMusic()
        // Tear down any existing overlays and recreate with isFirstAppearance = true
        overlayWindowManager.hasShownOverlayBefore = false
        overlayWindowManager.showOverlay(onScreens: NSScreen.screens, companionManager: self)
        isOverlayVisible = true
    }

    private func stopOnboardingMusic() {
        onboardingMusicFadeTimer?.invalidate()
        onboardingMusicFadeTimer = nil
        onboardingMusicPlayer?.stop()
        onboardingMusicPlayer = nil
    }

    private func startOnboardingMusic() {
        stopOnboardingMusic()
        guard let musicURL = Bundle.main.url(forResource: "ff", withExtension: "mp3") else {
            print("⚠️ MailBuddy: ff.mp3 not found in bundle")
            return
        }

        do {
            let player = try AVAudioPlayer(contentsOf: musicURL)
            player.volume = 0.3
            player.play()
            self.onboardingMusicPlayer = player

            // After 1m 30s, fade the music out over 3s
            onboardingMusicFadeTimer = Timer.scheduledTimer(withTimeInterval: 90.0, repeats: false) { [weak self] _ in
                self?.fadeOutOnboardingMusic()
            }
        } catch {
            print("⚠️ MailBuddy: Failed to play onboarding music: \(error)")
        }
    }

    private func fadeOutOnboardingMusic() {
        guard let player = onboardingMusicPlayer else { return }

        let fadeSteps = 30
        let fadeDuration: Double = 3.0
        let stepInterval = fadeDuration / Double(fadeSteps)
        let volumeDecrement = player.volume / Float(fadeSteps)
        var stepsRemaining = fadeSteps

        onboardingMusicFadeTimer = Timer.scheduledTimer(withTimeInterval: stepInterval, repeats: true) { [weak self] timer in
            stepsRemaining -= 1
            player.volume -= volumeDecrement

            if stepsRemaining <= 0 {
                timer.invalidate()
                player.stop()
                self?.onboardingMusicPlayer = nil
                self?.onboardingMusicFadeTimer = nil
            }
        }
    }

    func clearDetectedElementLocation() {
        detectedElementScreenLocation = nil
        detectedElementDisplayFrame = nil
        detectedElementBubbleText = nil
    }

    func stop() {
        globalPushToTalkShortcutMonitor.stop()
        buddyDictationManager.cancelCurrentDictation()
        overlayWindowManager.hideOverlay()
        transientHideTask?.cancel()

        currentResponseTask?.cancel()
        currentResponseTask = nil
        shortcutTransitionCancellable?.cancel()
        voiceStateCancellable?.cancel()
        audioPowerCancellable?.cancel()
        accessibilityCheckTimer?.invalidate()
        accessibilityCheckTimer = nil
    }

    func refreshAllPermissions() {
        let previouslyHadAccessibility = hasAccessibilityPermission
        let previouslyHadScreenRecording = hasScreenRecordingPermission
        let previouslyHadMicrophone = hasMicrophonePermission
        let previouslyHadAll = allPermissionsGranted

        let currentlyHasAccessibility = WindowPositionManager.hasAccessibilityPermission()
        hasAccessibilityPermission = currentlyHasAccessibility

        if currentlyHasAccessibility {
            globalPushToTalkShortcutMonitor.start()
        } else {
            globalPushToTalkShortcutMonitor.stop()
        }

        hasScreenRecordingPermission = WindowPositionManager.hasScreenRecordingPermission()

        let micAuthStatus = AVCaptureDevice.authorizationStatus(for: .audio)
        hasMicrophonePermission = micAuthStatus == .authorized

        // Debug: log permission state on changes
        if previouslyHadAccessibility != hasAccessibilityPermission
            || previouslyHadScreenRecording != hasScreenRecordingPermission
            || previouslyHadMicrophone != hasMicrophonePermission {
            print("🔑 Permissions — accessibility: \(hasAccessibilityPermission), screen: \(hasScreenRecordingPermission), mic: \(hasMicrophonePermission), screenContent: \(hasScreenContentPermission)")
        }

        // Track individual permission grants as they happen
        if !previouslyHadAccessibility && hasAccessibilityPermission {
            MailBuddyAnalytics.trackPermissionGranted(permission: "accessibility")
        }
        if !previouslyHadScreenRecording && hasScreenRecordingPermission {
            MailBuddyAnalytics.trackPermissionGranted(permission: "screen_recording")
        }
        if !previouslyHadMicrophone && hasMicrophonePermission {
            MailBuddyAnalytics.trackPermissionGranted(permission: "microphone")
        }
        // Screen content permission is persisted — once the user has approved the
        // SCShareableContent picker, we don't need to re-check it.
        if !hasScreenContentPermission {
            hasScreenContentPermission = UserDefaults.standard.bool(forKey: "hasScreenContentPermission")
        }

        if !previouslyHadAll && allPermissionsGranted {
            MailBuddyAnalytics.trackAllPermissionsGranted()
            if !isOverlayVisible && isMailBuddyCursorEnabled {
                overlayWindowManager.hasShownOverlayBefore = true
                overlayWindowManager.showOverlay(onScreens: NSScreen.screens, companionManager: self)
                isOverlayVisible = true
            }
        }
    }

    /// Triggers the macOS screen content picker by performing a dummy
    /// screenshot capture. Once the user approves, we persist the grant
    /// so they're never asked again during onboarding.
    @Published private(set) var isRequestingScreenContent = false

    func requestScreenContentPermission() {
        guard !isRequestingScreenContent else { return }
        isRequestingScreenContent = true
        Task {
            do {
                let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
                guard let display = content.displays.first else {
                    await MainActor.run { isRequestingScreenContent = false }
                    return
                }
                let filter = SCContentFilter(display: display, excludingWindows: [])
                let config = SCStreamConfiguration()
                config.width = 320
                config.height = 240
                let image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: config)
                // Verify the capture actually returned real content — a 0x0 or
                // fully-empty image means the user denied the prompt.
                let didCapture = image.width > 0 && image.height > 0
                print("🔑 Screen content capture result — width: \(image.width), height: \(image.height), didCapture: \(didCapture)")
                await MainActor.run {
                    isRequestingScreenContent = false
                    guard didCapture else { return }
                    hasScreenContentPermission = true
                    UserDefaults.standard.set(true, forKey: "hasScreenContentPermission")
                    MailBuddyAnalytics.trackPermissionGranted(permission: "screen_content")

                    // If onboarding was already completed, show the cursor overlay now
                    if hasCompletedOnboarding && allPermissionsGranted && !isOverlayVisible && isMailBuddyCursorEnabled {
                        overlayWindowManager.hasShownOverlayBefore = true
                        overlayWindowManager.showOverlay(onScreens: NSScreen.screens, companionManager: self)
                        isOverlayVisible = true
                    }
                }
            } catch {
                print("⚠️ Screen content permission request failed: \(error)")
                await MainActor.run { isRequestingScreenContent = false }
            }
        }
    }

    // MARK: - Private

    /// Triggers the system microphone prompt if the user has never been asked.
    /// Once granted/denied the status sticks and polling picks it up.
    private func promptForMicrophoneIfNotDetermined() {
        guard AVCaptureDevice.authorizationStatus(for: .audio) == .notDetermined else { return }
        AVCaptureDevice.requestAccess(for: .audio) { [weak self] granted in
            Task { @MainActor [weak self] in
                self?.hasMicrophonePermission = granted
            }
        }
    }

    /// Polls all permissions frequently so the UI updates live after the
    /// user grants them in System Settings. Screen Recording is the exception —
    /// macOS requires an app restart for that one to take effect.
    private func startPermissionPolling() {
        accessibilityCheckTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.refreshAllPermissions()
            }
        }
    }

    private func bindAudioPowerLevel() {
        audioPowerCancellable = buddyDictationManager.$currentAudioPowerLevel
            .receive(on: DispatchQueue.main)
            .sink { [weak self] powerLevel in
                self?.currentAudioPowerLevel = powerLevel
            }
    }

    /// Mirrors the partial transcript into the live transcript bar as it is spoken.
    private func bindLiveTranscript() {
        liveTranscriptCancellable = buddyDictationManager.$latestRecognizedText
            .receive(on: DispatchQueue.main)
            .sink { transcriptText in
                LiveTranscriptBarManager.shared.update(text: transcriptText)
            }
    }

    private func bindVoiceStateObservation() {
        voiceStateCancellable = buddyDictationManager.$isRecordingFromKeyboardShortcut
            .combineLatest(
                buddyDictationManager.$isFinalizingTranscript,
                buddyDictationManager.$isPreparingToRecord
            )
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isRecording, isFinalizing, isPreparing in
                guard let self else { return }

                if !isRecording && !isFinalizing && !isPreparing {
                    LiveTranscriptBarManager.shared.hide()
                }

                // Don't override .responding — the AI response pipeline
                // manages that state directly until streaming finishes.
                guard self.voiceState != .responding else { return }

                if isFinalizing {
                    self.voiceState = .processing
                } else if isRecording {
                    self.voiceState = .listening
                } else if isPreparing {
                    self.voiceState = .processing
                } else {
                    self.voiceState = .idle
                    // If the user pressed and released the hotkey without
                    // saying anything, no response task runs — schedule the
                    // transient hide here so the overlay doesn't get stuck.
                    // Only do this when no response is in flight, otherwise
                    // the brief idle gap between recording and processing
                    // would prematurely hide the overlay.
                    if self.currentResponseTask == nil {
                        self.scheduleTransientHideIfNeeded()
                    }
                }
            }
    }

    private func bindShortcutTransitions() {
        shortcutTransitionCancellable = globalPushToTalkShortcutMonitor
            .shortcutTransitionPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] transition in
                self?.handleShortcutTransition(transition)
            }
    }

    private func bindPromptDraftingShortcut() {
        optionSpaceCancellable = globalPushToTalkShortcutMonitor
            .promptDraftingShortcutPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in
                self?.handlePromptDraftingTriggered()
            }
    }

    private func handlePromptDraftingTriggered() {
        // Dismiss menu bar panel if open
        NotificationCenter.default.post(name: .mailBuddyDismissPanel, object: nil)

        // Make cursor buddy overlay visible if hidden
        if !isOverlayVisible && isMailBuddyCursorEnabled {
            overlayWindowManager.hasShownOverlayBefore = true
            overlayWindowManager.showOverlay(onScreens: NSScreen.screens, companionManager: self)
            isOverlayVisible = true
        }

        // Show spinning blue ring loader while collecting context / exporting files (<150ms)
        self.isCollectingContext = true

        Task { @MainActor in
            let appContext = await AppContextRegistry.shared.collectCurrentContext()
            self.isCollectingContext = false

            // Pop up the prompt overlay panel directly beside the cursor with primed context
            CursorPromptOverlayManager.shared.showPromptWindow(context: appContext)
        }
    }

    private func handleShortcutTransition(_ transition: BuddyPushToTalkShortcut.ShortcutTransition) {
        switch transition {
        case .pressed:
            guard !buddyDictationManager.isDictationInProgress else { return }
            // Don't register push-to-talk while the onboarding video is playing
            guard !showOnboardingVideo else { return }

            // Cancel any pending transient hide so the overlay stays visible
            transientHideTask?.cancel()
            transientHideTask = nil

            // If the cursor is hidden, bring it back transiently for this interaction
            if !isMailBuddyCursorEnabled && !isOverlayVisible {
                overlayWindowManager.hasShownOverlayBefore = true
                overlayWindowManager.showOverlay(onScreens: NSScreen.screens, companionManager: self)
                isOverlayVisible = true
            }

            // Dismiss the menu bar panel so it doesn't cover the screen
            NotificationCenter.default.post(name: .mailBuddyDismissPanel, object: nil)

            // Cancel any in-progress response from a previous utterance
            currentResponseTask?.cancel()
            clearDetectedElementLocation()

            // Dismiss the onboarding prompt if it's showing
            if showOnboardingPrompt {
                withAnimation(.easeOut(duration: 0.3)) {
                    onboardingPromptOpacity = 0.0
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                    self.showOnboardingPrompt = false
                    self.onboardingPromptText = ""
                }
            }
    

            LiveTranscriptBarManager.shared.show()

            MailBuddyAnalytics.trackPushToTalkStarted()

            pendingKeyboardShortcutStartTask?.cancel()
            pendingKeyboardShortcutStartTask = Task {
                await buddyDictationManager.startPushToTalkFromKeyboardShortcut(
                    currentDraftText: "",
                    updateDraftText: { _ in
                        // Partial transcripts are hidden (waveform-only UI)
                    },
                    submitDraftText: { [weak self] finalTranscript in
                        guard let self = self else { return }
                        self.lastTranscript = finalTranscript
                        print("🗣️ Companion received transcript: \(finalTranscript)")
                        MailBuddyAnalytics.trackUserMessageSent(transcript: finalTranscript)

                        Task { @MainActor in
                            // Query active app context (Pages, Finder, or visual fallback)
                            let appContext = await AppContextRegistry.shared.collectCurrentContext()
                            self.draftEmailFromVoice(
                                transcript: finalTranscript,
                                selectedFiles: appContext.files,
                                screenContext: appContext.formattedScreenContext
                            )
                        }
                    }
                )
            }
        case .released:
            // Cancel the pending start task in case the user released the shortcut
            // before the async startPushToTalk had a chance to begin recording.
            // Without this, a quick press-and-release drops the release event and
            // leaves the waveform overlay stuck on screen indefinitely.
            MailBuddyAnalytics.trackPushToTalkReleased()
            pendingKeyboardShortcutStartTask?.cancel()
            pendingKeyboardShortcutStartTask = nil
            buddyDictationManager.stopPushToTalkFromKeyboardShortcut()

            // A quick tap can release before dictation ever starts, in which case
            // no state change fires to hide the bar. Check shortly after.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
                guard let self, !self.buddyDictationManager.isDictationInProgress else { return }
                LiveTranscriptBarManager.shared.hide()
            }
        case .none:
            break
        }
    }

    // MARK: - Modern Mail Companion Actions

    /// Background email drafting with OpenAI via Convex
    private func draftEmailFromVoice(transcript: String, selectedFiles: [SelectedFileInfo], screenContext: String? = nil) {
        executeFileDraftingPipeline(prompt: transcript, selectedFiles: selectedFiles, screenContext: screenContext)
    }

    /// Full multi-file upload and drafting pipeline:
    /// 1. Cursor buddy turns to loader during file upload
    /// 2. Once upload completes, cursor returns to normal
    /// 3. Menu bar shows active loading indicator during drafting
    /// 4. Top-right review HUD window appears with liquid glass buttons and attachment controls
    func executeFileDraftingPipeline(prompt: String, selectedFiles: [SelectedFileInfo], screenContext: String? = nil) {
        currentResponseTask?.cancel()

        currentResponseTask = Task { @MainActor in
            var uploadedAttachments: [AttachmentItem] = []

            // Phase 1: Upload files to Convex Storage
            // The cursor buddy morphs into the loader only during upload
            if !selectedFiles.isEmpty {
                self.isUploadingFiles = true

                for file in selectedFiles {
                    let fileURL = URL(fileURLWithPath: file.path)
                    do {
                        let storageId = try await ConvexService.shared.uploadFileToConvex(fileURL: fileURL)
                        uploadedAttachments.append(
                            AttachmentItem(
                                storageId: storageId,
                                name: file.name,
                                sizeBytes: file.sizeBytes,
                                path: file.path
                            )
                        )
                    } catch {
                        print("⚠️ Upload failed for \(file.name): \(error)")
                        // Include local path even if storage upload had an issue
                        uploadedAttachments.append(
                            AttachmentItem(
                                storageId: "",
                                name: file.name,
                                sizeBytes: file.sizeBytes,
                                path: file.path
                            )
                        )
                    }
                }

                // File upload complete: return cursor buddy to normal!
                self.isUploadingFiles = false
            }

            // Phase 2: Non-blocking Drafting via Convex
            // The top menu bar shows the animated loading indicator during drafting
            self.isDraftingEmail = true

            do {
                let draft = try await ConvexService.shared.draftEmail(
                    prompt: prompt,
                    fileNames: selectedFiles.map { $0.path },
                    fileIds: uploadedAttachments,
                    screenContext: screenContext
                )
                self.isDraftingEmail = false
                ComposeHUDManager.shared.showHUD(for: draft)
            } catch {
                print("⚠️ Drafting failed: \(error)")
                self.isDraftingEmail = false
                NotificationCenter.default.post(name: NSNotification.Name("ResetCompanionDraftingState"), object: nil)
            }
        }
    }

    /// Handles new inbound OTP arrival pushed by Convex
    func handleNewOtpArrival(_ alert: OtpAlertItem) {
        guard isOtpAlertsEnabled else {
            print("ℹ️ OTP alerts disabled by user; ignoring incoming OTP.")
            return
        }

        if !isOverlayVisible && hasCompletedOnboarding && allPermissionsGranted {
            overlayWindowManager.hasShownOverlayBefore = true
            overlayWindowManager.showOverlay(onScreens: NSScreen.screens, companionManager: self)
            isOverlayVisible = true
        }

        // Automatic Computer Use flow:
        // Do not show the OTP card immediately.
        // Instead, the cursor buddy transforms into the animated 👀 eyes looking left & right while scanning.
        // If an input field is found, fly and fill automatically.
        // If no field is found, open the window with the Copy button only.
        runAutomaticOtpFlow(for: alert)
    }

    /// Automatically scans the screen for an OTP input field and auto-fills,
    /// or opens the copy-only panel if no field is located.
    func runAutomaticOtpFlow(for alert: OtpAlertItem) {
        Task { @MainActor in
            self.isScanningForOtp = true

            do {
                let screenCaptures = try await CompanionScreenCaptureUtility.captureAllScreensAsJPEG()
                guard let targetCapture = screenCaptures.first(where: { $0.isCursorScreen }) ?? screenCaptures.first else {
                    self.isScanningForOtp = false
                    OtpAlertOverlayManager.shared.showAlert(for: alert, copyOnly: true)
                    return
                }

                let base64 = targetCapture.imageData.base64EncodedString()
                let coords = try await ConvexService.shared.detectOtpCoordinates(
                    screenshotBase64: base64,
                    displayWidth: targetCapture.displayWidthInPoints,
                    displayHeight: targetCapture.displayHeightInPoints,
                    screenshotWidth: targetCapture.screenshotWidthInPixels,
                    screenshotHeight: targetCapture.screenshotHeightInPixels
                )

                self.isScanningForOtp = false

                if coords.found {
                    let targetLocation = CGPoint(
                        x: CGFloat(coords.screenX) + targetCapture.displayFrame.origin.x,
                        y: CGFloat(coords.screenYBottomLeft) + targetCapture.displayFrame.origin.y
                    )
                    self.detectedElementScreenLocation = targetLocation
                    self.detectedElementDisplayFrame = targetCapture.displayFrame
                    self.detectedElementBubbleText = ""

                    // Wait for flight to complete (1.2s), then simulate click & typing
                    try await Task.sleep(nanoseconds: 1_200_000_000)

                    let clickPoint = CGPoint(
                        x: CGFloat(coords.screenX) + targetCapture.displayFrame.origin.x,
                        y: CGFloat(coords.screenYTopLeft) + targetCapture.displayFrame.origin.y
                    )
                    self.simulateClick(at: clickPoint)
                    try await Task.sleep(nanoseconds: 150_000_000)
                    self.simulateTyping(text: alert.otpCode)

                    // Mark OTP as read in Convex
                    ConvexService.shared.markOtpAsRead(messageId: alert.messageId)

                    // Subtle confirmation sound ("Pop") and seamless return
                    NSSound(named: "Pop")?.play()
                    self.clearDetectedElementLocation()
                    OtpAlertOverlayManager.shared.hideAlert()
                } else {
                    // LLM did not find an input field on screen: show panel with Copy button only
                    OtpAlertOverlayManager.shared.showAlert(for: alert, copyOnly: true)
                }
            } catch {
                print("⚠️ Automatic OTP detection error: \(error)")
                self.isScanningForOtp = false
                OtpAlertOverlayManager.shared.showAlert(for: alert, copyOnly: true)
            }
        }
    }

    /// Executes manual OTP form fill via ScreenCaptureKit & OpenAI Computer Use (fallback / explicit trigger)
    func executeOtpAutoFill(otpCode: String) {
        Task { @MainActor in
            do {
                let screenCaptures = try await CompanionScreenCaptureUtility.captureAllScreensAsJPEG()
                guard let targetCapture = screenCaptures.first(where: { $0.isCursorScreen }) ?? screenCaptures.first else {
                    return
                }

                let base64 = targetCapture.imageData.base64EncodedString()
                let coords = try await ConvexService.shared.detectOtpCoordinates(
                    screenshotBase64: base64,
                    displayWidth: targetCapture.displayWidthInPoints,
                    displayHeight: targetCapture.displayHeightInPoints,
                    screenshotWidth: targetCapture.screenshotWidthInPixels,
                    screenshotHeight: targetCapture.screenshotHeightInPixels
                )

                if coords.found {
                    let targetLocation = CGPoint(
                        x: CGFloat(coords.screenX) + targetCapture.displayFrame.origin.x,
                        y: CGFloat(coords.screenYBottomLeft) + targetCapture.displayFrame.origin.y
                    )
                    self.detectedElementScreenLocation = targetLocation
                    self.detectedElementDisplayFrame = targetCapture.displayFrame
                    self.detectedElementBubbleText = ""

                    // Wait for flight to complete (1.2s), then simulate click & typing
                    try await Task.sleep(nanoseconds: 1_200_000_000)

                    let clickPoint = CGPoint(
                        x: CGFloat(coords.screenX) + targetCapture.displayFrame.origin.x,
                        y: CGFloat(coords.screenYTopLeft) + targetCapture.displayFrame.origin.y
                    )
                    self.simulateClick(at: clickPoint)
                    try await Task.sleep(nanoseconds: 150_000_000)
                    self.simulateTyping(text: otpCode)

                    NSSound(named: "Pop")?.play()
                    self.clearDetectedElementLocation()
                    OtpAlertOverlayManager.shared.hideAlert()
                }
            } catch {
                print("⚠️ Auto-fill error: \(error)")
            }
        }
    }

    private func simulateClick(at point: CGPoint) {
        guard let mouseDown = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left),
              let mouseUp = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left) else { return }
        mouseDown.post(tap: .cghidEventTap)
        usleep(40000)
        mouseUp.post(tap: .cghidEventTap)
    }

    private func simulateTyping(text: String) {
        for char in text {
            let str = String(char)
            let utf16Chars = Array(str.utf16)
            guard let keyDown = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: true),
                  let keyUp = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: false) else { continue }
            keyDown.keyboardSetUnicodeString(stringLength: utf16Chars.count, unicodeString: utf16Chars)
            keyUp.keyboardSetUnicodeString(stringLength: utf16Chars.count, unicodeString: utf16Chars)
            keyDown.post(tap: .cghidEventTap)
            usleep(30000)
            keyUp.post(tap: .cghidEventTap)
            usleep(30000)
        }
    }


    // MARK: - Transient Hide Helper

    /// If the cursor is in transient mode (user toggled "Show Mail Buddy" off),
    /// waits for any pointing animation to finish, then fades out the overlay after a 1-second pause.
    private func scheduleTransientHideIfNeeded() {
        guard !isMailBuddyCursorEnabled && isOverlayVisible else { return }

        transientHideTask?.cancel()
        transientHideTask = Task {
            // Wait for pointing animation to finish (location is cleared
            // when the buddy flies back to the cursor)
            while detectedElementScreenLocation != nil {
                try? await Task.sleep(nanoseconds: 200_000_000)
                guard !Task.isCancelled else { return }
            }

            // Pause 1s after everything finishes, then fade out
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            guard !Task.isCancelled else { return }
            overlayWindowManager.fadeOutAndHideOverlay()
            isOverlayVisible = false
        }
    }

    // MARK: - Onboarding Video

    /// Sets up the onboarding video player, starts playback, and schedules
    /// the demo interaction at 40s. Called by BlueCursorView when onboarding starts.
    func setupOnboardingVideo() {
        guard let videoURL = URL(string: "https://stream.mux.com/e5jB8UuSrtFABVnTHCR7k3sIsmcUHCyhtLu1tzqLlfs.m3u8") else { return }

        let player = AVPlayer(url: videoURL)
        player.isMuted = false
        player.volume = 0.0
        self.onboardingVideoPlayer = player
        self.showOnboardingVideo = true
        self.onboardingVideoOpacity = 0.0

        // Start playback immediately — the video plays while invisible,
        // then we fade in both the visual and audio over 1s.
        player.play()

        // Wait for SwiftUI to mount the view, then set opacity to 1.
        // The .animation modifier on the view handles the actual animation.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            self.onboardingVideoOpacity = 1.0
            // Fade audio volume from 0 → 1 over 2s to match visual fade
            self.fadeInVideoAudio(player: player, targetVolume: 1.0, duration: 2.0)
        }

        // At 40 seconds into the video, track onboarding demo milestone
        let demoTriggerTime = CMTime(seconds: 40, preferredTimescale: 600)
        onboardingDemoTimeObserver = player.addBoundaryTimeObserver(
            forTimes: [NSValue(time: demoTriggerTime)],
            queue: .main
        ) { [weak self] in
            _ = self
            MailBuddyAnalytics.trackOnboardingDemoTriggered()
        }

        // Fade out and clean up when the video finishes
        onboardingVideoEndObserver = NotificationCenter.default.addObserver(
            forName: AVPlayerItem.didPlayToEndTimeNotification,
            object: player.currentItem,
            queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            MailBuddyAnalytics.trackOnboardingVideoCompleted()
            self.onboardingVideoOpacity = 0.0
            // Wait for the 2s fade-out animation to complete before tearing down
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                self.tearDownOnboardingVideo()
                // After the video disappears, stream in the prompt to try talking
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    self.startOnboardingPromptStream()
                }
            }
        }
    }

    func tearDownOnboardingVideo() {
        showOnboardingVideo = false
        if let timeObserver = onboardingDemoTimeObserver {
            onboardingVideoPlayer?.removeTimeObserver(timeObserver)
            onboardingDemoTimeObserver = nil
        }
        onboardingVideoPlayer?.pause()
        onboardingVideoPlayer = nil
        if let observer = onboardingVideoEndObserver {
            NotificationCenter.default.removeObserver(observer)
            onboardingVideoEndObserver = nil
        }
    }

    private func startOnboardingPromptStream() {
        let message = "press control + option and introduce yourself"
        onboardingPromptText = ""
        showOnboardingPrompt = true
        onboardingPromptOpacity = 0.0

        withAnimation(.easeIn(duration: 0.4)) {
            onboardingPromptOpacity = 1.0
        }

        var currentIndex = 0
        Timer.scheduledTimer(withTimeInterval: 0.03, repeats: true) { timer in
            guard currentIndex < message.count else {
                timer.invalidate()
                // Auto-dismiss after 10 seconds
                DispatchQueue.main.asyncAfter(deadline: .now() + 10.0) {
                    guard self.showOnboardingPrompt else { return }
                    withAnimation(.easeOut(duration: 0.3)) {
                        self.onboardingPromptOpacity = 0.0
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                        self.showOnboardingPrompt = false
                        self.onboardingPromptText = ""
                    }
                }
                return
            }
            let index = message.index(message.startIndex, offsetBy: currentIndex)
            self.onboardingPromptText.append(message[index])
            currentIndex += 1
        }
    }

    /// Gradually raises an AVPlayer's volume from its current level to the
    /// target over the specified duration, creating a smooth audio fade-in.
    private func fadeInVideoAudio(player: AVPlayer, targetVolume: Float, duration: Double) {
        let steps = 20
        let stepInterval = duration / Double(steps)
        let volumeIncrement = (targetVolume - player.volume) / Float(steps)
        var stepsRemaining = steps

        Timer.scheduledTimer(withTimeInterval: stepInterval, repeats: true) { timer in
            stepsRemaining -= 1
            player.volume += volumeIncrement

            if stepsRemaining <= 0 {
                timer.invalidate()
                player.volume = targetVolume
            }
        }
    }
}
