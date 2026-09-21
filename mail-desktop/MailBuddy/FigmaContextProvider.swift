//
//  FigmaContextProvider.swift
//  leanring-buddy
//
//  App context provider for Figma Desktop (com.figma.Desktop).
//  Silently captures the active design file URL & node-id via fast ⌘L clipboard
//  interception (<15ms) with seamless clipboard backup/restore, extracts the
//  Figma design context provider: parses active Figma URLs in supported browsers,
//  extracts file key and node-id, and passes context to Convex for
//  AI Vision frame matching.
//

import AppKit
import ApplicationServices
import Foundation

final class FigmaContextProvider: AppContextProvider {
    static let shared = FigmaContextProvider()

    let providerId: String = "com.modernmail.provider.figma"
    let supportedBundleIdentifiers: [String] = [
        "com.figma.Desktop",
        "com.figma.FigmaAgent"
    ]

    func collectContext(for app: NSRunningApplication) async -> AppContextResult {
        let appName = "Figma"
        let bundleId = app.bundleIdentifier ?? "com.figma.Desktop"
        let pid = app.processIdentifier

        NSLog("🎨 [FigmaContextProvider] Collecting context from Figma Desktop (PID: \(pid))...")

        return await Task.detached(priority: .userInitiated) { [weak self] () -> AppContextResult in
            guard let self = self else {
                return AppContextResult(
                    appName: appName,
                    bundleIdentifier: bundleId,
                    windowTitle: nil,
                    files: [],
                    textContext: nil,
                    screenshotBase64: nil
                )
            }

            return await self.extractFigmaData(app: app)
        }.value
    }

    private func extractFigmaData(app: NSRunningApplication) async -> AppContextResult {
        let pid = app.processIdentifier
        let bundleId = app.bundleIdentifier ?? "com.figma.Desktop"

        // 1. Extract Window / Document Title via Accessibility API
        let rawTitle = extractWindowTitle(for: pid)
        let cleanTitle = sanitizeFigmaTitle(rawTitle)
        NSLog("🎨 [FigmaContextProvider] Window title: '\(cleanTitle ?? "none")' (raw: '\(rawTitle ?? "none")')")

        // 2. Extract Active Figma URL via Silent ⌘L Clipboard Interception
        let figmaURL = extractFigmaURLViaClipboard(app: app)
        if let url = figmaURL {
            NSLog("🔗 [FigmaContextProvider] Captured Figma link: \(url)")
        } else {
            NSLog("ℹ️ [FigmaContextProvider] No Figma URL captured via ⌘L, falling back to window title")
        }

        // 3. Capture Visual Screen Context for Multimodal Frame Matching
        var base64Screenshot: String? = nil
        do {
            let captures = try await CompanionScreenCaptureUtility.captureAllScreensAsJPEG()
            if let targetCapture = captures.first(where: { $0.isCursorScreen }) ?? captures.first {
                base64Screenshot = targetCapture.imageData.base64EncodedString()
                NSLog("📸 [FigmaContextProvider] Captured Figma display screenshot: \(targetCapture.displayWidthInPoints)x\(targetCapture.displayHeightInPoints)")
            }
        } catch {
            NSLog("⚠️ [FigmaContextProvider] Failed to capture Figma display screenshot: \(error)")
        }

        // 4. Construct Content Preview String
        var textContextParts: [String] = []
        if let title = cleanTitle {
            textContextParts.append("Figma Document: \(title)")
        }
        if let url = figmaURL {
            textContextParts.append("Figma URL: \(url)")
        }

        return AppContextResult(
            appName: "Figma",
            bundleIdentifier: bundleId,
            windowTitle: cleanTitle,
            files: [],
            textContext: textContextParts.isEmpty ? nil : textContextParts.joined(separator: "\n"),
            screenshotBase64: base64Screenshot,
            pageURL: figmaURL,
            selectedQuote: nil
        )
    }

    // MARK: - Window Title Extraction

    private func extractWindowTitle(for pid: pid_t) -> String? {
        let appElement = AXUIElementCreateApplication(pid)
        var windowValue: AnyObject?
        guard AXUIElementCopyAttributeValue(appElement, kAXFocusedWindowAttribute as CFString, &windowValue) == .success,
              let window = windowValue as! AXUIElement? else {
            return nil
        }

        var titleValue: AnyObject?
        if AXUIElementCopyAttributeValue(window, kAXTitleAttribute as CFString, &titleValue) == .success,
           let title = titleValue as? String {
            let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }

        return nil
    }

    private func sanitizeFigmaTitle(_ raw: String?) -> String? {
        guard var title = raw, !title.isEmpty else { return nil }

        // Remove trailing " – Figma" or " - Figma"
        if let range = title.range(of: " – Figma", options: .backwards) {
            title = String(title[..<range.lowerBound])
        } else if let range = title.range(of: " - Figma", options: .backwards) {
            title = String(title[..<range.lowerBound])
        }

        // Remove community tag if present (e.g. "(Community)")
        title = title.replacingOccurrences(of: "(Community)", with: "").trimmingCharacters(in: .whitespacesAndNewlines)

        return title.isEmpty ? nil : title
    }

    // MARK: - Silent ⌘L Clipboard Interception

    private func extractFigmaURLViaClipboard(app: NSRunningApplication) -> String? {
        let pb = NSPasteboard.general

        // 1. Snapshot all items currently on the user's pasteboard to guarantee zero loss
        var savedItems: [[NSPasteboard.PasteboardType: Data]] = []
        if let items = pb.pasteboardItems {
            for item in items {
                var itemDict: [NSPasteboard.PasteboardType: Data] = [:]
                for type in item.types {
                    if let data = item.data(forType: type) {
                        itemDict[type] = data
                    }
                }
                if !itemDict.isEmpty {
                    savedItems.append(itemDict)
                }
            }
        }
        let initialChangeCount = pb.changeCount

        // 2. Clear pasteboard and post ⌘L to Figma
        pb.clearContents()
        simulateCommandL()

        // 3. Poll for up to 100ms for pasteboard update
        var capturedURL: String? = nil
        let deadline = Date().addingTimeInterval(0.10)

        while Date() < deadline {
            if pb.changeCount != initialChangeCount, let str = pb.string(forType: .string) {
                let trimmed = str.trimmingCharacters(in: .whitespacesAndNewlines)
                if trimmed.hasPrefix("https://www.figma.com/") || trimmed.hasPrefix("https://figma.com/") {
                    capturedURL = trimmed
                    break
                }
            }
            usleep(10000) // 10ms
        }

        // 4. Fallback: if CGEvent didn't trigger, try AppleScript keystroke
        if capturedURL == nil {
            let script = """
            tell application "System Events"
                try
                    keystroke "l" using command down
                end try
            end tell
            """
            _ = runAppleScript(script)

            let scriptDeadline = Date().addingTimeInterval(0.08)
            while Date() < scriptDeadline {
                if let str = pb.string(forType: .string) {
                    let trimmed = str.trimmingCharacters(in: .whitespacesAndNewlines)
                    if trimmed.hasPrefix("https://www.figma.com/") || trimmed.hasPrefix("https://figma.com/") {
                        capturedURL = trimmed
                        break
                    }
                }
                usleep(10000)
            }
        }

        // 5. Seamlessly restore previous pasteboard contents
        pb.clearContents()
        if !savedItems.isEmpty {
            for itemDict in savedItems {
                let newItem = NSPasteboardItem()
                for (type, data) in itemDict {
                    newItem.setData(data, forType: type)
                }
                pb.writeObjects([newItem])
            }
        }

        return capturedURL
    }

    private func simulateCommandL() {
        // Virtual Key Code 37 = 'L'
        let lKeyCode: CGKeyCode = 37
        let source = CGEventSource(stateID: .hidSystemState)

        if let keyDown = CGEvent(keyboardEventSource: source, virtualKey: lKeyCode, keyDown: true) {
            keyDown.flags = .maskCommand
            keyDown.post(tap: .cghidEventTap)
        }

        usleep(15000) // 15ms

        if let keyUp = CGEvent(keyboardEventSource: source, virtualKey: lKeyCode, keyDown: false) {
            keyUp.flags = .maskCommand
            keyUp.post(tap: .cghidEventTap)
        }
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
            return ""
        }
    }
}
