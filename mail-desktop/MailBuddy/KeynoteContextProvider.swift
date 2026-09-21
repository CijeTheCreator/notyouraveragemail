//
//  KeynoteContextProvider.swift
//  leanring-buddy
//
//  App context provider for Apple Keynote (com.apple.iWork.Keynote).
//  Extracts presentation title, slide-by-slide outline (titles, body text, notes),
//  and dual-exports native .key and high-resolution .pdf files for contextual
//  LLM drafting and attachment handling.
//

import AppKit
import Foundation

final class KeynoteContextProvider: AppContextProvider {
    static let shared = KeynoteContextProvider()

    let providerId: String = "com.modernmail.provider.keynote"
    let supportedBundleIdentifiers: [String] = ["com.apple.iWork.Keynote"]

    func collectContext(for app: NSRunningApplication) async -> AppContextResult {
        NSLog("📊 [KeynoteContextProvider] Collecting context from Apple Keynote...")

        return await Task.detached(priority: .userInitiated) { [weak self] () -> AppContextResult in
            guard let self = self else {
                return AppContextResult(
                    appName: "Keynote",
                    bundleIdentifier: "com.apple.iWork.Keynote",
                    windowTitle: nil,
                    files: [],
                    textContext: nil,
                    screenshotBase64: nil
                )
            }

            return self.extractKeynoteData()
        }.value
    }

    private func extractKeynoteData() -> AppContextResult {
        let stagingId = UUID().uuidString
        let stagingDir = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("ModernMail/Keynote/\(stagingId)")

        do {
            try FileManager.default.createDirectory(at: stagingDir, withIntermediateDirectories: true)
        } catch {
            NSLog("⚠️ [KeynoteContextProvider] Failed to create staging directory: \(error)")
        }

        // AppleScript:
        // 1. Checks if Keynote has any open documents
        // 2. Extracts presentation name
        // 3. Extracts slide outline (titles, body text, presenter notes for up to 10 slides)
        // 4. Determines existing file path if saved
        let script = """
        tell application "Keynote"
            if (count of documents) is 0 then
                return "NO_DOCUMENTS"
            end if

            set doc to front document
            set docName to name of doc
            if docName ends with ".key" then
                set baseName to text 1 thru -5 of docName
            else
                set baseName to docName
            end if

            set originalPath to ""
            try
                set docFile to file of doc
                set originalPath to POSIX path of (docFile as alias)
            end try

            set slideSummaries to ""
            set slideCount to count of slides of doc
            set maxSlides to 10
            if slideCount < maxSlides then
                set maxSlides to slideCount
            end if

            repeat with i from 1 to maxSlides
                set s to slide i of doc
                set sTitle to ""
                try
                    set sTitle to object text of default title item of s
                end try
                set sBody to ""
                try
                    set sBody to object text of default body item of s
                end try
                set sNotes to ""
                try
                    set sNotes to presenter notes of s
                end try

                set slideSummaries to slideSummaries & "Slide " & i & ": " & sTitle & return
                if sBody is not "" then
                    set slideSummaries to slideSummaries & sBody & return
                end if
                if sNotes is not "" then
                    set slideSummaries to slideSummaries & "Notes: " & sNotes & return
                end if
                set slideSummaries to slideSummaries & return
            end repeat

            return baseName & "|||" & slideSummaries & "|||" & originalPath
        end tell
        """

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        process.arguments = ["-e", script]
        let pipe = Pipe()
        process.standardOutput = pipe

        var output = ""
        do {
            try process.run()
            process.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            output = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        } catch {
            NSLog("⚠️ [KeynoteContextProvider] AppleScript execution error: \(error)")
            return makeEmptyResult()
        }

        guard !output.isEmpty, output != "NO_DOCUMENTS" else {
            NSLog("ℹ️ [KeynoteContextProvider] Keynote is running but has no open documents")
            return makeEmptyResult()
        }

        let parts = output.components(separatedBy: "|||")
        let baseName = parts.indices.contains(0) && !parts[0].isEmpty ? parts[0] : "Untitled Presentation"
        let slideOutline = parts.indices.contains(1) ? parts[1].trimmingCharacters(in: .whitespacesAndNewlines) : ""
        let originalPath = parts.indices.contains(2) ? parts[2].trimmingCharacters(in: .whitespacesAndNewlines) : ""

        NSLog("📊 [KeynoteContextProvider] Presentation: '\(baseName)', originalPath: '\(originalPath)', outline length: \(slideOutline.count)")

        // Sanitize file name for filesystem
        let safeName = baseName.replacingOccurrences(of: "/", with: "-")
        let pdfTargetURL = stagingDir.appendingPathComponent("\(safeName).pdf")
        let keyTargetURL = stagingDir.appendingPathComponent("\(safeName).key")

        // Step 1: Export PDF via AppleScript
        let exportPdfScript = """
        set targetPdf to (POSIX file "\(pdfTargetURL.path)")
        tell application "Keynote"
            try
                export front document to targetPdf as PDF
                return "SUCCESS"
            on error errMsg
                return "ERROR: " & errMsg
            end try
        end tell
        """
        _ = runAppleScript(exportPdfScript)

        // Step 2: Acquire .key file
        if !originalPath.isEmpty && FileManager.default.fileExists(atPath: originalPath) {
            // Copy existing saved .key bundle to staging
            try? FileManager.default.copyItem(at: URL(fileURLWithPath: originalPath), to: keyTargetURL)
        } else {
            // Presentation is unsaved; save a copy to staging via AppleScript
            let saveKeyScript = """
            set targetKey to (POSIX file "\(keyTargetURL.path)")
            tell application "Keynote"
                try
                    save front document in targetKey
                    return "SUCCESS"
                on error errMsg
                    return "ERROR: " & errMsg
                end try
            end tell
            """
            _ = runAppleScript(saveKeyScript)
        }

        // Gather generated files
        var stagedFiles: [SelectedFileInfo] = []

        // Add .key file if present
        let finalKeyPath = FileManager.default.fileExists(atPath: keyTargetURL.path)
            ? keyTargetURL.path
            : (!originalPath.isEmpty && FileManager.default.fileExists(atPath: originalPath) ? originalPath : nil)

        if let keyPath = finalKeyPath,
           let keyInfo = FinderFileSelectionHelper.shared.makeFileInfo(from: keyPath) {
            stagedFiles.append(keyInfo)
            NSLog("✅ [KeynoteContextProvider] Staged .key attachment: \(keyInfo.name) (\(keyInfo.formattedSize))")
        }

        // Add .pdf file if present
        if FileManager.default.fileExists(atPath: pdfTargetURL.path),
           let pdfInfo = FinderFileSelectionHelper.shared.makeFileInfo(from: pdfTargetURL.path) {
            stagedFiles.append(pdfInfo)
            NSLog("✅ [KeynoteContextProvider] Staged .pdf attachment: \(pdfInfo.name) (\(pdfInfo.formattedSize))")
        }

        return AppContextResult(
            appName: "Keynote",
            bundleIdentifier: "com.apple.iWork.Keynote",
            windowTitle: safeName,
            files: stagedFiles,
            textContext: slideOutline.isEmpty ? nil : slideOutline,
            screenshotBase64: nil
        )
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
            NSLog("⚠️ [KeynoteContextProvider] Script error: \(error)")
            return ""
        }
    }

    private func makeEmptyResult() -> AppContextResult {
        AppContextResult(
            appName: "Keynote",
            bundleIdentifier: "com.apple.iWork.Keynote",
            windowTitle: nil,
            files: [],
            textContext: nil,
            screenshotBase64: nil
        )
    }
}
