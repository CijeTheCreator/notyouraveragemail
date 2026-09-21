//
//  OpenAIRealtimeTranscriptionProvider.swift
//  leanring-buddy
//
//  Streaming push-to-talk transcription backed by the OpenAI Realtime API
//  using the `gpt-live-transcribe` transcription model over WebSocket.
//  The app fetches an authorization token from Convex (`companion:createTranscribeToken`)
//  so no API key needs to be stored in Info.plist.
//

import AVFoundation
import Foundation

struct OpenAIRealtimeTranscriptionProviderError: LocalizedError {
    let message: String

    var errorDescription: String? {
        message
    }
}

/// Holds the OpenAI authorization token so pressing push-to-talk doesn't wait on a
/// Convex round trip.
@MainActor
final class OpenAILiveTokenCache {
    static let shared = OpenAILiveTokenCache()

    private struct PendingToken {
        let id = UUID()
        let task: Task<String, Error>
        let startedAt = Date()
        var isResolved = false
    }

    private static let maximumTokenAgeSeconds: TimeInterval = 15 * 60
    private static let refreshCheckIntervalSeconds: TimeInterval = 5 * 60

    private var pendingToken: PendingToken?
    private var refreshTimer: Timer?

    func startKeepingTokenFresh() {
        prefetchIfNeeded()

        guard refreshTimer == nil else { return }
        refreshTimer = Timer.scheduledTimer(
            withTimeInterval: Self.refreshCheckIntervalSeconds,
            repeats: true
        ) { _ in
            Task { @MainActor in
                OpenAILiveTokenCache.shared.prefetchIfNeeded()
            }
        }
    }

    func prefetchIfNeeded() {
        if let pendingToken, Date().timeIntervalSince(pendingToken.startedAt) < Self.maximumTokenAgeSeconds {
            return
        }
        startFetch()
    }

    /// Returns a token and whether it was already fetched when asked for.
    func takeToken(forceFresh: Bool = false) async throws -> (token: String, wasPrefetched: Bool) {
        let tokenToUse: PendingToken
        if !forceFresh,
           let pendingToken,
           Date().timeIntervalSince(pendingToken.startedAt) < Self.maximumTokenAgeSeconds {
            tokenToUse = pendingToken
        } else {
            tokenToUse = startFetch()
        }

        let wasPrefetched = tokenToUse.isResolved

        do {
            let token = try await tokenToUse.task.value
            prefetchIfNeeded()
            return (token, wasPrefetched)
        } catch {
            self.pendingToken = nil
            throw error
        }
    }

    @discardableResult
    private func startFetch() -> PendingToken {
        let task = Task { try await ConvexService.shared.fetchTranscribeToken() }
        let pending = PendingToken(task: task)
        pendingToken = pending

        Task { [weak self] in
            let result = await task.result
            guard let self, self.pendingToken?.id == pending.id else { return }

            switch result {
            case .success:
                self.pendingToken?.isResolved = true
            case .failure(let error):
                print("⚠️ OpenAI Realtime: token prefetch failed: \(error.localizedDescription)")
                self.pendingToken = nil
            }
        }

        return pending
    }
}

final class OpenAIRealtimeTranscriptionProvider: BuddyTranscriptionProvider {
    let displayName = "OpenAI Realtime"
    let requiresSpeechRecognitionPermission = false
    let isConfigured = true
    let unavailableExplanation: String? = nil

    private let sharedWebSocketURLSession = URLSession(configuration: .default)

    init() {
        Task { @MainActor in
            OpenAILiveTokenCache.shared.startKeepingTokenFresh()
        }
    }

    func startStreamingSession(
        keyterms: [String],
        onTranscriptUpdate: @escaping (String) -> Void,
        onFinalTranscriptReady: @escaping (String) -> Void,
        onError: @escaping (Error) -> Void
    ) async throws -> any BuddyStreamingTranscriptionSession {
        let session = OpenAIRealtimeTranscriptionSession(
            urlSession: sharedWebSocketURLSession,
            keyterms: keyterms,
            onTranscriptUpdate: onTranscriptUpdate,
            onFinalTranscriptReady: onFinalTranscriptReady,
            onError: onError
        )

        session.connectInBackground()
        return session
    }
}

private final class OpenAIRealtimeTranscriptionSession: NSObject, BuddyStreamingTranscriptionSession {
    private static let websocketBaseURLString = "wss://api.openai.com/v1/realtime?model=gpt-realtime-mini"
    private static let targetSampleRate = 24_000.0
    private static let readyTimeoutSeconds = 10.0
    private static let quietPeriodAfterReleaseSeconds = 0.7
    private static let finalTranscriptDeadlineSeconds = 3.5

    let finalTranscriptFallbackDelaySeconds: TimeInterval = 8.0

    private let connectStartedAt = Date()
    private let keyterms: [String]
    private let urlSession: URLSession
    private let onTranscriptUpdate: (String) -> Void
    private let onFinalTranscriptReady: (String) -> Void
    private let onError: (Error) -> Void

    private let stateQueue = DispatchQueue(label: "com.learningbuddy.openailive.state")
    private let sendQueue = DispatchQueue(label: "com.learningbuddy.openailive.send")
    private let audioPCM16Converter = BuddyPCM16AudioConverter(targetSampleRate: targetSampleRate)

    // stateQueue-owned
    private var webSocketTask: URLSessionWebSocketTask?
    private var connectTask: Task<Void, Never>?
    private var isReady = false
    private var isAwaitingFinalTranscript = false
    private var hasDeliveredFinalTranscript = false
    private var isClosed = false
    private var accumulatedTranscript = ""
    private var quietPeriodWorkItem: DispatchWorkItem?
    private var finalDeadlineWorkItem: DispatchWorkItem?
    private var readyTimeoutWorkItem: DispatchWorkItem?

    // sendQueue-owned
    private var pendingAudioData = Data()
    private var isReadyToStreamAudio = false
    private var hasReleaseBeenRequested = false
    private var totalAudioBytesSent = 0

    init(
        urlSession: URLSession,
        keyterms: [String],
        onTranscriptUpdate: @escaping (String) -> Void,
        onFinalTranscriptReady: @escaping (String) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        self.urlSession = urlSession
        self.keyterms = keyterms
        self.onTranscriptUpdate = onTranscriptUpdate
        self.onFinalTranscriptReady = onFinalTranscriptReady
        self.onError = onError
    }

    private func elapsedMilliseconds() -> Int {
        Int(Date().timeIntervalSince(connectStartedAt) * 1000)
    }

    func connectInBackground() {
        stateQueue.async {
            let timeoutWorkItem = DispatchWorkItem { [weak self] in
                guard let self, !self.isReady else { return }
                self.failSessionOnStateQueue(with: OpenAIRealtimeTranscriptionProviderError(
                    message: "Timed out connecting to OpenAI Realtime."
                ))
            }
            self.readyTimeoutWorkItem = timeoutWorkItem
            self.stateQueue.asyncAfter(
                deadline: .now() + Self.readyTimeoutSeconds,
                execute: timeoutWorkItem
            )

            self.connectTask = Task { [weak self] in
                await self?.fetchTokenAndOpenWebSocket()
            }
        }
    }

    private func fetchTokenAndOpenWebSocket() async {
        do {
            let (ephemeralToken, wasPrefetched) = try await OpenAILiveTokenCache.shared.takeToken()
            guard !Task.isCancelled else { return }
            print("🎙️ OpenAI Realtime: token ready after \(elapsedMilliseconds())ms (\(wasPrefetched ? "prefetched" : "fetched on demand"))")

            guard let websocketURL = URL(string: Self.websocketBaseURLString) else {
                throw OpenAIRealtimeTranscriptionProviderError(message: "OpenAI Realtime websocket URL is invalid.")
            }

            var request = URLRequest(url: websocketURL)
            request.setValue("Bearer \(ephemeralToken)", forHTTPHeaderField: "Authorization")

            let webSocketTask = urlSession.webSocketTask(with: request)
            let shouldOpen: Bool = stateQueue.sync {
                guard !isClosed else { return false }
                self.webSocketTask = webSocketTask
                return true
            }
            guard shouldOpen else { return }

            webSocketTask.resume()
            receiveNextMessage(from: webSocketTask)
        } catch {
            guard !Task.isCancelled else { return }
            failSession(with: error)
        }
    }

    func appendAudioBuffer(_ audioBuffer: AVAudioPCMBuffer) {
        guard let audioPCM16Data = audioPCM16Converter.convertToPCM16Data(from: audioBuffer),
              !audioPCM16Data.isEmpty else {
            return
        }

        sendQueue.async { [weak self] in
            guard let self else { return }
            self.pendingAudioData.append(audioPCM16Data)
            self.flushPendingAudioIfReadyOnSendQueue()
        }
    }

    func requestFinalTranscript() {
        stateQueue.async {
            guard !self.hasDeliveredFinalTranscript, !self.isClosed else { return }
            self.isAwaitingFinalTranscript = true
            self.scheduleFinalDeadlineOnStateQueue()
        }

        sendQueue.async { [weak self] in
            guard let self else { return }
            self.hasReleaseBeenRequested = true
            self.finishUtteranceIfReadyOnSendQueue()
        }
    }

    func cancel() {
        stateQueue.async {
            self.isClosed = true
            self.quietPeriodWorkItem?.cancel()
            self.finalDeadlineWorkItem?.cancel()
            self.readyTimeoutWorkItem?.cancel()
            self.connectTask?.cancel()
            self.webSocketTask?.cancel(with: .goingAway, reason: nil)
        }
    }

    // MARK: - Audio streaming (sendQueue)

    private func flushPendingAudioIfReadyOnSendQueue() {
        guard isReadyToStreamAudio, !pendingAudioData.isEmpty else { return }

        let chunk = pendingAudioData
        pendingAudioData.removeAll(keepingCapacity: true)

        let base64Audio = chunk.base64EncodedString()
        let payload: [String: Any] = [
            "type": "input_audio_buffer.append",
            "audio": base64Audio
        ]
        sendJSONOnSendQueue(payload)
        totalAudioBytesSent += chunk.count
    }

    private func finishUtteranceIfReadyOnSendQueue() {
        guard isReadyToStreamAudio else { return }
        flushPendingAudioIfReadyOnSendQueue()

        let commitPayload: [String: Any] = [
            "type": "input_audio_buffer.commit"
        ]
        sendJSONOnSendQueue(commitPayload)
        print("🎙️ OpenAI Realtime: committed audio buffer (sent \(totalAudioBytesSent) bytes)")
    }

    private func sendJSONOnSendQueue(_ payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let string = String(data: data, encoding: .utf8) else {
            return
        }

        let task = stateQueue.sync { self.webSocketTask }
        task?.send(.string(string)) { [weak self] error in
            if let error {
                self?.failSession(with: error)
            }
        }
    }

    // MARK: - Inbound message processing

    private func receiveNextMessage(from task: URLSessionWebSocketTask) {
        task.receive { [weak self, weak task] result in
            guard let self, let currentTask = task else { return }

            let isCurrentTask = self.stateQueue.sync { self.webSocketTask === currentTask && !self.isClosed }
            guard isCurrentTask else { return }

            switch result {
            case .success(let message):
                self.handleWebSocketMessage(message)
                self.receiveNextMessage(from: currentTask)
            case .failure(let error):
                self.handleSocketFailure(error)
            }
        }
    }

    private func handleWebSocketMessage(_ message: URLSessionWebSocketTask.Message) {
        let messageData: Data?
        switch message {
        case .string(let text):
            messageData = text.data(using: .utf8)
        case .data(let data):
            messageData = data
        @unknown default:
            messageData = nil
        }

        guard let messageData,
              let json = try? JSONSerialization.jsonObject(with: messageData) as? [String: Any],
              let eventType = json["type"] as? String else {
            return
        }

        switch eventType {
        case "session.created":
            // Send session.update with gpt-live-transcribe configuration
            var transcriptionConfig: [String: Any] = [
                "model": "gpt-live-transcribe"
            ]
            let normalizedKeyterms = keyterms.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            if !normalizedKeyterms.isEmpty {
                transcriptionConfig["prompt"] = "Vocabulary and context: \(normalizedKeyterms.joined(separator: ", "))"
            }

            let setupMessage: [String: Any] = [
                "type": "session.update",
                "session": [
                    "type": "realtime",
                    "audio": [
                        "input": [
                            "format": [
                                "type": "audio/pcm",
                                "rate": 24000
                            ],
                            "transcription": transcriptionConfig,
                            "turn_detection": NSNull()
                        ]
                    ]
                ]
            ]
            sendQueue.async { [weak self] in
                self?.sendJSONOnSendQueue(setupMessage)
            }

        case "session.updated":
            stateQueue.async { [weak self] in
                guard let self, !self.isReady else { return }
                self.isReady = true
                self.readyTimeoutWorkItem?.cancel()
                print("🎙️ OpenAI Realtime: session ready after \(self.elapsedMilliseconds())ms")
            }

            sendQueue.async { [weak self] in
                guard let self else { return }
                self.isReadyToStreamAudio = true
                self.flushPendingAudioIfReadyOnSendQueue()
                if self.hasReleaseBeenRequested {
                    self.finishUtteranceIfReadyOnSendQueue()
                }
            }

        case "conversation.item.input_audio_transcription.delta":
            if let delta = json["delta"] as? String, !delta.isEmpty {
                stateQueue.async { [weak self] in
                    guard let self else { return }
                    self.accumulatedTranscript += delta
                    let fullText = self.accumulatedTranscript.trimmingCharacters(in: .whitespacesAndNewlines)
                    self.onTranscriptUpdate(fullText)
                }
            }

        case "conversation.item.input_audio_transcription.completed":
            let finalTranscript = (json["transcript"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            stateQueue.async { [weak self] in
                guard let self else { return }
                let textToDeliver = (finalTranscript?.isEmpty == false) ? finalTranscript! : self.accumulatedTranscript.trimmingCharacters(in: .whitespacesAndNewlines)
                self.deliverFinalTranscriptOnStateQueue(textToDeliver)
            }

        case "error":
            let errorObj = json["error"] as? [String: Any]
            let errorMessage = errorObj?["message"] as? String ?? "OpenAI Realtime error"
            print("⚠️ OpenAI Realtime error: \(errorMessage)")
            stateQueue.async { [weak self] in
                guard let self else { return }
                if self.isAwaitingFinalTranscript && !self.accumulatedTranscript.isEmpty {
                    self.deliverFinalTranscriptOnStateQueue(self.accumulatedTranscript.trimmingCharacters(in: .whitespacesAndNewlines))
                } else {
                    self.failSessionOnStateQueue(with: OpenAIRealtimeTranscriptionProviderError(message: errorMessage))
                }
            }

        default:
            break
        }
    }

    private func deliverFinalTranscriptOnStateQueue(_ transcriptText: String) {
        guard !hasDeliveredFinalTranscript, !isClosed else { return }
        hasDeliveredFinalTranscript = true
        quietPeriodWorkItem?.cancel()
        finalDeadlineWorkItem?.cancel()
        readyTimeoutWorkItem?.cancel()

        print("🎙️ OpenAI Realtime: delivering final transcript: \"\(transcriptText)\"")
        onFinalTranscriptReady(transcriptText)
        cancel()
    }

    private func scheduleFinalDeadlineOnStateQueue() {
        guard finalDeadlineWorkItem == nil else { return }
        let workItem = DispatchWorkItem { [weak self] in
            guard let self else { return }
            print("🎙️ OpenAI Realtime: deadline fired, delivering whatever arrived")
            self.deliverFinalTranscriptOnStateQueue(self.accumulatedTranscript.trimmingCharacters(in: .whitespacesAndNewlines))
        }
        finalDeadlineWorkItem = workItem
        stateQueue.asyncAfter(
            deadline: .now() + Self.finalTranscriptDeadlineSeconds,
            execute: workItem
        )
    }

    private func handleSocketFailure(_ error: Error) {
        stateQueue.async { [weak self] in
            guard let self, !self.isClosed else { return }
            if self.isAwaitingFinalTranscript && !self.accumulatedTranscript.isEmpty {
                self.deliverFinalTranscriptOnStateQueue(self.accumulatedTranscript.trimmingCharacters(in: .whitespacesAndNewlines))
            } else {
                self.failSessionOnStateQueue(with: error)
            }
        }
    }

    private func failSession(with error: Error) {
        stateQueue.async { [weak self] in
            self?.failSessionOnStateQueue(with: error)
        }
    }

    private func failSessionOnStateQueue(with error: Error) {
        guard !hasDeliveredFinalTranscript, !isClosed else { return }
        print("❌ OpenAI Realtime session failed: \(error.localizedDescription)")
        onError(error)
        cancel()
    }
}
