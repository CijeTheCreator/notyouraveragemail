//
//  FallbackScreenContextProvider.swift
//  leanring-buddy
//
//  Universal fallback screen context provider for unregistered apps: captures the active
//  window title via Accessibility API and a display screenshot via ScreenCaptureKit,
//  providing visual screen context to the AI agent.
//

import AppKit
import Foundation

final class FallbackScreenContextProvider: AppContextProvider {
    static let shared = FallbackScreenContextProvider()

    let providerId: String = "com.modernmail.provider.fallback"
    let supportedBundleIdentifiers: [String] = [] // Matches any app via fallback mechanism

    func canHandle(app: NSRunningApplication) -> Bool {
        return true
    }

    func collectContext(for app: NSRunningApplication) async -> AppContextResult {
        let appName = app.localizedName ?? "Application"
        let bundleId = app.bundleIdentifier ?? ""
        NSLog("🖥️ [FallbackScreenContextProvider] Capturing visual screen context for '\(appName)' (\(bundleId))...")

        var base64Screenshot: String? = nil

        do {
            let captures = try await CompanionScreenCaptureUtility.captureAllScreensAsJPEG()
            if let targetCapture = captures.first(where: { $0.isCursorScreen }) ?? captures.first {
                base64Screenshot = targetCapture.imageData.base64EncodedString()
                NSLog("📸 [FallbackScreenContextProvider] Captured screenshot: \(targetCapture.displayWidthInPoints)x\(targetCapture.displayHeightInPoints)")
            }
        } catch {
            NSLog("⚠️ [FallbackScreenContextProvider] Failed to capture screen: \(error)")
        }

        // Check if System Events knows about any front document file
        var discoveredFiles: [SelectedFileInfo] = []
        if let frontDoc = FinderFileSelectionHelper.shared.getFrontmostDocumentPath() {
            discoveredFiles.append(frontDoc)
            NSLog("📄 [FallbackScreenContextProvider] Discovered active document file: \(frontDoc.path)")
        }

        return AppContextResult(
            appName: appName,
            bundleIdentifier: bundleId,
            windowTitle: discoveredFiles.first?.name,
            files: discoveredFiles,
            textContext: nil,
            screenshotBase64: base64Screenshot
        )
    }
}
