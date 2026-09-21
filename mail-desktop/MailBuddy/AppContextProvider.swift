//
//  AppContextProvider.swift
//  leanring-buddy
//
//  Extensible provider protocol & registry for feeding active application context
//  into the Modern Mail drafting and Computer Use pipelines.
//

import AppKit
import Foundation

/// Encapsulates context harvested from the active frontmost application.
struct AppContextResult {
    /// Friendly name of the app (e.g., "Pages", "Finder", "Chrome")
    let appName: String

    /// Bundle identifier of the app (e.g., "com.apple.iWork.Pages")
    let bundleIdentifier: String

    /// Active document or window title if available
    let windowTitle: String?

    /// Files primed for attachment (e.g. exported .pages & .pdf, or selected Finder files)
    let files: [SelectedFileInfo]

    /// Text excerpt or document body content to help the AI model draft contextually
    let textContext: String?

    /// Optional base64-encoded screenshot for vision/computer use fallback
    let screenshotBase64: String?

    /// Optional active webpage URL (for browsers)
    let pageURL: String?

    /// Optional highlighted/selected quote (for browsers or text editors)
    let selectedQuote: String?

    init(
        appName: String,
        bundleIdentifier: String,
        windowTitle: String?,
        files: [SelectedFileInfo],
        textContext: String?,
        screenshotBase64: String?,
        pageURL: String? = nil,
        selectedQuote: String? = nil
    ) {
        self.appName = appName
        self.bundleIdentifier = bundleIdentifier
        self.windowTitle = windowTitle
        self.files = files
        self.textContext = textContext
        self.screenshotBase64 = screenshotBase64
        self.pageURL = pageURL
        self.selectedQuote = selectedQuote
    }

    /// Formatted screen context string ready to pass to Convex draftEmail action
    var formattedScreenContext: String {
        var parts: [String] = []
        parts.append("Application: \(appName)")
        if let windowTitle = windowTitle, !windowTitle.isEmpty {
            parts.append("Document/Window: \(windowTitle)")
        }
        if let pageURL = pageURL, !pageURL.isEmpty {
            parts.append("Page URL: \(pageURL)")
        }
        if let selectedQuote = selectedQuote, !selectedQuote.isEmpty {
            parts.append("Selected Quote:\n\"\(selectedQuote)\"")
        }
        if let textContext = textContext, !textContext.isEmpty {
            let truncated = textContext.count > 3000 ? String(textContext.prefix(3000)) + "..." : textContext
            parts.append("Content Preview:\n\(truncated)")
        }
        return parts.joined(separator: "\n")
    }
}

/// Protocol that developers implement to teach Modern Mail how to extract context & files
/// from specific macOS applications (e.g., Pages, Keynote, Safari, Chrome, Xcode).
protocol AppContextProvider {
    /// Unique provider identifier (e.g., "com.modernmail.provider.pages")
    var providerId: String { get }

    /// List of macOS bundle identifiers this provider handles
    var supportedBundleIdentifiers: [String] { get }

    /// Evaluates if this provider can handle the given application
    func canHandle(app: NSRunningApplication) -> Bool

    /// Extracts context (files, document title, text excerpt, or vision screenshot)
    func collectContext(for app: NSRunningApplication) async -> AppContextResult
}

extension AppContextProvider {
    func canHandle(app: NSRunningApplication) -> Bool {
        guard let bundleId = app.bundleIdentifier else { return false }
        return supportedBundleIdentifiers.contains(bundleId)
    }
}

/// Central registry managing extensible app context providers.
@MainActor
final class AppContextRegistry {
    static let shared = AppContextRegistry()

    private var providers: [AppContextProvider] = []
    private var fallbackProvider: AppContextProvider?

    /// Tracks the most recent non-ModernMail frontmost application
    private(set) var lastFrontmostApplication: NSRunningApplication?

    private init() {
        // Track frontmost application changes
        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(handleAppActivation(_:)),
            name: NSWorkspace.didActivateApplicationNotification,
            object: nil
        )

        // Seed with current frontmost app if not self
        if let current = NSWorkspace.shared.frontmostApplication,
           current.bundleIdentifier != Bundle.main.bundleIdentifier {
            lastFrontmostApplication = current
        }

        // Register standard default providers
        register(FinderContextProvider.shared)
        register(PagesContextProvider.shared)
        register(KeynoteContextProvider.shared)
        register(SafariContextProvider.shared)
        register(ChromiumContextProvider.shared)
        register(FigmaContextProvider.shared)
        setFallbackProvider(FallbackScreenContextProvider.shared)
    }

    @objc private func handleAppActivation(_ notification: Notification) {
        guard let app = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication,
              app.bundleIdentifier != Bundle.main.bundleIdentifier else {
            return
        }
        lastFrontmostApplication = app
    }

    /// Registers a new app context provider
    func register(_ provider: AppContextProvider) {
        providers.removeAll { $0.providerId == provider.providerId }
        providers.append(provider)
        NSLog("🔌 [AppContextRegistry] Registered provider: \(provider.providerId)")
    }

    /// Sets the fallback provider used when no specialized provider matches
    func setFallbackProvider(_ provider: AppContextProvider) {
        self.fallbackProvider = provider
        NSLog("🔌 [AppContextRegistry] Set fallback provider: \(provider.providerId)")
    }

    /// Resolves the best provider for the given running application
    func provider(for app: NSRunningApplication) -> AppContextProvider? {
        if let matched = providers.first(where: { $0.canHandle(app: app) }) {
            return matched
        }
        return fallbackProvider
    }

    /// Collects application context for the currently active (or last active) application
    func collectCurrentContext() async -> AppContextResult {
        var targetApp = NSWorkspace.shared.frontmostApplication
        if targetApp?.bundleIdentifier == Bundle.main.bundleIdentifier || targetApp == nil {
            targetApp = lastFrontmostApplication
        }

        guard let app = targetApp else {
            NSLog("⚠️ [AppContextRegistry] No active target application identified, returning generic fallback")
            return AppContextResult(
                appName: "Unknown",
                bundleIdentifier: "",
                windowTitle: nil,
                files: [],
                textContext: nil,
                screenshotBase64: nil
            )
        }

        NSLog("🎯 [AppContextRegistry] Active app: \(app.localizedName ?? "Unknown") (\(app.bundleIdentifier ?? "none"))")

        if let provider = provider(for: app) {
            NSLog("🔌 [AppContextRegistry] Routing to provider: \(provider.providerId)")
            return await provider.collectContext(for: app)
        }

        return AppContextResult(
            appName: app.localizedName ?? "Application",
            bundleIdentifier: app.bundleIdentifier ?? "",
            windowTitle: nil,
            files: [],
            textContext: nil,
            screenshotBase64: nil
        )
    }
}
