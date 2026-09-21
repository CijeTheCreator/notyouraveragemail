//
//  FinderContextProvider.swift
//  leanring-buddy
//
//  App context provider for macOS Finder / Desktop.
//  Extracts currently highlighted/selected file items.
//

import AppKit
import Foundation

final class FinderContextProvider: AppContextProvider {
    static let shared = FinderContextProvider()

    let providerId: String = "com.modernmail.provider.finder"
    let supportedBundleIdentifiers: [String] = ["com.apple.finder"]

    func collectContext(for app: NSRunningApplication) async -> AppContextResult {
        NSLog("📁 [FinderContextProvider] Querying Finder / Desktop file selection...")

        let files = FinderFileSelectionHelper.shared.getCurrentlySelectedFiles()

        return AppContextResult(
            appName: "Finder",
            bundleIdentifier: "com.apple.finder",
            windowTitle: files.first?.name,
            files: files,
            textContext: nil,
            screenshotBase64: nil
        )
    }
}
