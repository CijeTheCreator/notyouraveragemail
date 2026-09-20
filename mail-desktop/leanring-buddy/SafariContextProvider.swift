//
//  SafariContextProvider.swift
//  leanring-buddy
//
//  App context provider for Apple Safari & Safari Technology Preview.
//  Extracts active tab URL, page title, user-selected text (via Accessibility API),
//  and page text preview silently in <25ms with zero UI disruption.
//

import AppKit
import ApplicationServices
import Foundation

final class SafariContextProvider: AppContextProvider {
    static let shared = SafariContextProvider()

    let providerId: String = "com.modernmail.provider.safari"
    let supportedBundleIdentifiers: [String] = [
        "com.apple.Safari",
        "com.apple.SafariTechnologyPreview"
    ]

    func collectContext(for app: NSRunningApplication) async -> AppContextResult {
        NSLog("🌐 [SafariContextProvider] Collecting context from Apple Safari...")

        return await Task.detached(priority: .userInitiated) { [weak self] () -> AppContextResult in
            guard let self = self else {
                return AppContextResult(
                    appName: "Safari",
                    bundleIdentifier: app.bundleIdentifier ?? "com.apple.Safari",
                    windowTitle: nil,
                    files: [],
                    textContext: nil,
                    screenshotBase64: nil
                )
            }

            return self.extractSafariData(app: app)
        }.value
    }

    private func extractSafariData(app: NSRunningApplication) -> AppContextResult {
        let bundleId = app.bundleIdentifier ?? "com.apple.Safari"
        let pid = app.processIdentifier

        // Step 1: Fast AppleScript extraction of active tab URL and Title (<10ms)
        let script = """
        tell application id "\(bundleId)"
            if (count of windows) is 0 then
                return "NO_WINDOWS"
            end if
            tell front window
                set curTab to current tab
                set tabUrl to URL of curTab
                set tabName to name of curTab
                return tabUrl & "|||" & tabName
            end tell
        end tell
        """

        let output = runAppleScript(script)
        guard !output.isEmpty, output != "NO_WINDOWS" else {
            NSLog("ℹ️ [SafariContextProvider] Safari has no open windows or documents")
            return makeEmptyResult(bundleId: bundleId)
        }

        let parts = output.components(separatedBy: "|||")
        let rawUrl = parts.indices.contains(0) ? parts[0].trimmingCharacters(in: .whitespacesAndNewlines) : ""
        let tabTitle = parts.indices.contains(1) ? parts[1].trimmingCharacters(in: .whitespacesAndNewlines) : "Webpage"

        // Filter internal or non-web schemes
        let isInternal = rawUrl.isEmpty ||
            rawUrl.hasPrefix("about:") ||
            rawUrl.hasPrefix("safari-resource:") ||
            rawUrl.hasPrefix("file:") ||
            rawUrl.hasPrefix("blob:")

        let cleanUrl = isInternal ? nil : rawUrl

        NSLog("🌐 [SafariContextProvider] Tab Title: '\(tabTitle)', URL: '\(cleanUrl ?? "none")'")

        // Step 2: Zero-config Selected Text extraction via Accessibility API (<3ms)
        let selectedQuote = extractSelectedText(for: pid)
        if let quote = selectedQuote {
            NSLog("✂️ [SafariContextProvider] Captured selected quote (\(quote.count) chars): '\(quote.prefix(60))...'")
        }

        // Step 3: Page text extraction (Try JavaScript innerText first, fallback to AX element value)
        var pageText = extractPageTextViaScript(bundleId: bundleId)
        if pageText == nil || pageText?.isEmpty == true {
            pageText = extractFocusedAXText(for: pid)
        }

        return AppContextResult(
            appName: "Safari",
            bundleIdentifier: bundleId,
            windowTitle: tabTitle,
            files: [],
            textContext: pageText,
            screenshotBase64: nil,
            pageURL: cleanUrl,
            selectedQuote: selectedQuote
        )
    }

    /// Extracts user-selected text using macOS Accessibility API without needing browser developer flags
    private func extractSelectedText(for pid: pid_t) -> String? {
        let appElement = AXUIElementCreateApplication(pid)
        var focusedValue: AnyObject?
        guard AXUIElementCopyAttributeValue(appElement, kAXFocusedUIElementAttribute as CFString, &focusedValue) == .success,
              let focused = focusedValue as! AXUIElement? else {
            return nil
        }

        var selectedValue: AnyObject?
        if AXUIElementCopyAttributeValue(focused, kAXSelectedTextAttribute as CFString, &selectedValue) == .success,
           let text = selectedValue as? String {
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                return trimmed
            }
        }
        return nil
    }

    /// Attempts to extract clean page text via AppleScript if "Allow JavaScript from Apple Events" is enabled
    private func extractPageTextViaScript(bundleId: String) -> String? {
        let script = """
        tell application id "\(bundleId)"
            try
                tell front window
                    return do JavaScript "document.body.innerText" in current tab
                end tell
            on error
                return ""
            end try
        end tell
        """
        let result = runAppleScript(script)
        let trimmed = result.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    /// Fallback extraction of focused AX element text
    private func extractFocusedAXText(for pid: pid_t) -> String? {
        let appElement = AXUIElementCreateApplication(pid)
        var focusedValue: AnyObject?
        guard AXUIElementCopyAttributeValue(appElement, kAXFocusedUIElementAttribute as CFString, &focusedValue) == .success,
              let focused = focusedValue as! AXUIElement? else {
            return nil
        }

        var textValue: AnyObject?
        if AXUIElementCopyAttributeValue(focused, kAXValueAttribute as CFString, &textValue) == .success,
           let text = textValue as? String {
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                return trimmed
            }
        }
        return nil
    }

    private func runAppleScript(_ script: String) -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        process.arguments = ["-e", script]
        let pipe = Pipe()
        process.standardOutput = pipe
        do {
            try process.run()
            process.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            return String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        } catch {
            NSLog("⚠️ [SafariContextProvider] AppleScript execution error: \(error)")
            return ""
        }
    }

    private func makeEmptyResult(bundleId: String) -> AppContextResult {
        AppContextResult(
            appName: "Safari",
            bundleIdentifier: bundleId,
            windowTitle: nil,
            files: [],
            textContext: nil,
            screenshotBase64: nil,
            pageURL: nil,
            selectedQuote: nil
        )
    }
}
