//
//  ChromiumContextProvider.swift
//  leanring-buddy
//
//  App context provider for Chromium-based browsers:
//  Google Chrome, Arc, Brave, and Microsoft Edge.
//  Extracts active tab URL, page title, user-selected text (via Accessibility API),
//  and page text preview silently in <25ms with zero UI disruption.
//

import AppKit
import ApplicationServices
import Foundation

final class ChromiumContextProvider: AppContextProvider {
    static let shared = ChromiumContextProvider()

    let providerId: String = "com.modernmail.provider.chromium"
    let supportedBundleIdentifiers: [String] = [
        "com.google.Chrome",
        "com.google.Chrome.canary",
        "com.google.Chrome.beta",
        "com.google.Chrome.dev",
        "company.thebrowser.Browser", // Arc
        "com.brave.Browser",          // Brave
        "com.microsoft.edgemac",      // Microsoft Edge
        "com.microsoft.edgemac.Canary",
        "com.microsoft.edgemac.Dev"
    ]

    func collectContext(for app: NSRunningApplication) async -> AppContextResult {
        let appName = app.localizedName ?? "Browser"
        NSLog("🌐 [ChromiumContextProvider] Collecting context from \(appName) (PID: \(app.processIdentifier))...")

        return await Task.detached(priority: .userInitiated) { [weak self] () -> AppContextResult in
            guard let self = self else {
                return AppContextResult(
                    appName: appName,
                    bundleIdentifier: app.bundleIdentifier ?? "com.google.Chrome",
                    windowTitle: nil,
                    files: [],
                    textContext: nil,
                    screenshotBase64: nil
                )
            }

            return self.extractChromiumData(app: app)
        }.value
    }

    private func extractChromiumData(app: NSRunningApplication) -> AppContextResult {
        let bundleId = app.bundleIdentifier ?? "com.google.Chrome"
        let appName = app.localizedName ?? "Browser"
        let pid = app.processIdentifier

        // Step 1: Zero-config Selected Text extraction via Accessibility API (<3ms)
        // Extract this first so it is never dropped by downstream window checks
        let selectedQuote = extractSelectedText(for: pid)
        if let quote = selectedQuote {
            NSLog("✂️ [ChromiumContextProvider] Captured selected quote (\(quote.count) chars): '\(quote.prefix(60))...'")
        }

        // Step 2: AppleScript extraction of active tab URL and Title (<10ms)
        // Includes multi-window fallback to ensure background/headless instances don't mask visible tabs
        let script = """
        tell application id "\(bundleId)"
            try
                set curTab to active tab of front window
                set tabUrl to URL of curTab
                set tabTitle to title of curTab
                if tabUrl is not "" then
                    return tabUrl & "|||" & tabTitle
                end if
            end try
            repeat with w in windows
                try
                    set curTab to active tab of w
                    set tabUrl to URL of curTab
                    if tabUrl is not "" then
                        set tabTitle to title of curTab
                        return tabUrl & "|||" & tabTitle
                    end if
                end try
            end repeat
            return "NO_WINDOWS"
        end tell
        """

        let output = runAppleScript(script)
        var tabUrl: String? = nil
        var tabTitle: String? = nil

        if !output.isEmpty && output != "NO_WINDOWS" {
            let parts = output.components(separatedBy: "|||")
            let raw = parts.indices.contains(0) ? parts[0].trimmingCharacters(in: .whitespacesAndNewlines) : ""
            let title = parts.indices.contains(1) ? parts[1].trimmingCharacters(in: .whitespacesAndNewlines) : ""

            if !raw.isEmpty && !isInternalScheme(raw) {
                tabUrl = raw
            }
            if !title.isEmpty {
                tabTitle = title
            }
        }

        // Step 3: Accessibility API fallback for URL and Window Title if AppleScript yielded nothing
        if tabUrl == nil || tabTitle == nil {
            NSLog("ℹ️ [ChromiumContextProvider] AppleScript returned empty/NO_WINDOWS, attempting Accessibility fallback for PID \(pid)...")
            let (fallbackUrl, fallbackTitle) = extractFromAccessibility(for: pid)
            if tabUrl == nil, let fUrl = fallbackUrl, !isInternalScheme(fUrl) {
                tabUrl = fUrl
                NSLog("✅ [ChromiumContextProvider] Recovered URL via Accessibility: '\(fUrl)'")
            }
            if tabTitle == nil, let fTitle = fallbackTitle {
                tabTitle = fTitle
                NSLog("✅ [ChromiumContextProvider] Recovered Title via Accessibility: '\(fTitle)'")
            }
        }

        NSLog("🌐 [ChromiumContextProvider] Final Result -> Title: '\(tabTitle ?? "none")', URL: '\(tabUrl ?? "none")'")

        // Step 4: Page text extraction
        var pageText = extractPageTextViaScript(bundleId: bundleId)
        if pageText == nil || pageText?.isEmpty == true {
            pageText = extractFocusedAXText(for: pid)
        }

        return AppContextResult(
            appName: appName,
            bundleIdentifier: bundleId,
            windowTitle: tabTitle,
            files: [],
            textContext: pageText,
            screenshotBase64: nil,
            pageURL: tabUrl,
            selectedQuote: selectedQuote
        )
    }

    private func isInternalScheme(_ url: String) -> Bool {
        url.isEmpty ||
        url.hasPrefix("chrome:") ||
        url.hasPrefix("chrome-extension:") ||
        url.hasPrefix("edge:") ||
        url.hasPrefix("about:") ||
        url.hasPrefix("brave:") ||
        url.hasPrefix("file:") ||
        url.hasPrefix("blob:")
    }

    /// Extracts user-selected text using macOS Accessibility API without needing developer flags
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

    /// Fallback extraction of URL and Window Title directly from the frontmost application's AX hierarchy
    private func extractFromAccessibility(for pid: pid_t) -> (url: String?, title: String?) {
        let appElement = AXUIElementCreateApplication(pid)
        var focusedWindowValue: AnyObject?
        guard AXUIElementCopyAttributeValue(appElement, kAXFocusedWindowAttribute as CFString, &focusedWindowValue) == .success,
              let focusedWindow = focusedWindowValue as! AXUIElement? else {
            return (nil, nil)
        }

        // Window Title
        var title: String? = nil
        var titleVal: AnyObject?
        if AXUIElementCopyAttributeValue(focusedWindow, kAXTitleAttribute as CFString, &titleVal) == .success,
           let t = titleVal as? String {
            let clean = t.replacingOccurrences(of: " - Google Chrome", with: "")
                .replacingOccurrences(of: " - Arc", with: "")
                .replacingOccurrences(of: " - Brave", with: "")
                .replacingOccurrences(of: " - Microsoft Edge", with: "")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            if !clean.isEmpty {
                title = clean
            }
        }

        // Search for address bar URL
        let url = findAddressBarUrl(in: focusedWindow, depth: 0)
        return (url, title)
    }

    /// Recursively inspects the window AX tree to discover the active address bar text field
    private func findAddressBarUrl(in element: AXUIElement, depth: Int) -> String? {
        if depth > 8 { return nil }

        var roleVal: AnyObject?
        AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &roleVal)
        let role = roleVal as? String ?? ""

        if role == "AXTextField" {
            var val: AnyObject?
            if AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &val) == .success,
               let text = val as? String {
                let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
                if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") {
                    return trimmed
                } else if trimmed.contains(".com") || trimmed.contains(".org") || trimmed.contains(".net") || trimmed.contains(".io") || trimmed.contains(".dev") || trimmed.contains("localhost") {
                    return "https://" + trimmed
                }
            }
        }

        var urlVal: AnyObject?
        if AXUIElementCopyAttributeValue(element, "AXURL" as CFString, &urlVal) == .success,
           let urlStr = urlVal as? String, !urlStr.isEmpty {
            return urlStr
        }

        var childrenVal: AnyObject?
        if AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &childrenVal) == .success,
           let children = childrenVal as? [AXUIElement] {
            for child in children {
                if let found = findAddressBarUrl(in: child, depth: depth + 1) {
                    return found
                }
            }
        }

        return nil
    }

    /// Extracts page text via Chromium's native AppleScript javascript execution
    private func extractPageTextViaScript(bundleId: String) -> String? {
        let script = """
        tell application id "\(bundleId)"
            try
                tell front window
                    return execute active tab javascript "document.body.innerText"
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
        let stdoutPipe = Pipe()
        let stderrPipe = Pipe()
        process.standardOutput = stdoutPipe
        process.standardError = stderrPipe
        do {
            try process.run()
            process.waitUntilExit()
            let stdoutData = stdoutPipe.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: stdoutData, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if output.isEmpty {
                let stderrData = stderrPipe.fileHandleForReading.readDataToEndOfFile()
                let errStr = String(data: stderrData, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                if !errStr.isEmpty {
                    NSLog("ℹ️ [ChromiumContextProvider] AppleScript note: \(errStr)")
                }
            }
            return output
        } catch {
            NSLog("⚠️ [ChromiumContextProvider] AppleScript execution error: \(error)")
            return ""
        }
    }
}
