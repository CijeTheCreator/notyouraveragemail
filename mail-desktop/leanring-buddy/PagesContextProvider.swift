//
//  PagesContextProvider.swift
//  leanring-buddy
//
//  App context provider for Apple Pages (com.apple.iWork.Pages).
//  Extracts document title, body text, and exports native .pages and .pdf files
//  for seamless LLM drafting and attachment handling.
//

import AppKit
import Foundation

final class PagesContextProvider: AppContextProvider {
    static let shared = PagesContextProvider()

    let providerId: String = "com.modernmail.provider.pages"
    let supportedBundleIdentifiers: [String] = ["com.apple.iWork.Pages"]

    func collectContext(for app: NSRunningApplication) async -> AppContextResult {
        NSLog("📄 [PagesContextProvider] Collecting context from Apple Pages...")

        return await Task.detached(priority: .userInitiated) { [weak self] () -> AppContextResult in
            guard let self = self else {
                return AppContextResult(
                    appName: "Pages",
                    bundleIdentifier: "com.apple.iWork.Pages",
                    windowTitle: nil,
                    files: [],
                    textContext: nil,
                    screenshotBase64: nil
                )
            }

            return self.extractPagesData()
        }.value
    }

    private func extractPagesData() -> AppContextResult {
        let stagingId = UUID().uuidString
        let stagingDir = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("ModernMail/Pages/\(stagingId)")

        do {
            try FileManager.default.createDirectory(at: stagingDir, withIntermediateDirectories: true)
        } catch {
            NSLog("⚠️ [PagesContextProvider] Failed to create staging directory: \(error)")
        }

        // AppleScript:
        // 1. Checks if Pages has any open documents
        // 2. Extracts document name
        // 3. Extracts document body text
        // 4. Determines existing file path if saved
        // 5. Exports to PDF
        // 6. Exports or copies .pages file
        let script = """
        tell application "Pages"
            if (count of documents) is 0 then
                return "NO_DOCUMENTS"
            end if

            set doc to front document
            set docName to name of doc
            if docName ends with ".pages" then
                set baseName to text 1 thru -7 of docName
            else
                set baseName to docName
            end if

            set docText to ""
            try
                set docText to body text of doc
            end try

            set originalPath to ""
            try
                set docFile to file of doc
                set originalPath to POSIX path of (docFile as alias)
            end try

            return baseName & "|||" & docText & "|||" & originalPath
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
            NSLog("⚠️ [PagesContextProvider] AppleScript execution error: \(error)")
            return makeEmptyResult()
        }

        guard !output.isEmpty, output != "NO_DOCUMENTS" else {
            NSLog("ℹ️ [PagesContextProvider] Pages is running but has no open documents")
            return makeEmptyResult()
        }

        let parts = output.components(separatedBy: "|||")
        let baseName = parts.indices.contains(0) && !parts[0].isEmpty ? parts[0] : "Untitled"
        let bodyText = parts.indices.contains(1) ? parts[1] : ""
        let originalPath = parts.indices.contains(2) ? parts[2].trimmingCharacters(in: .whitespacesAndNewlines) : ""

        NSLog("📄 [PagesContextProvider] Document: '\(baseName)', originalPath: '\(originalPath)', text length: \(bodyText.count)")

        // Sanitize file name for filesystem
        let safeName = baseName.replacingOccurrences(of: "/", with: "-")
        let pdfTargetURL = stagingDir.appendingPathComponent("\(safeName).pdf")
        let pagesTargetURL = stagingDir.appendingPathComponent("\(safeName).pages")

        // Step 1: Export PDF via AppleScript
        let exportPdfScript = """
        set targetPdf to (POSIX file "\(pdfTargetURL.path)")
        tell application "Pages"
            try
                export front document to targetPdf as PDF
                return "SUCCESS"
            on error errMsg
                return "ERROR: " & errMsg
            end try
        end tell
        """
        _ = runAppleScript(exportPdfScript)

        // Step 2: Acquire .pages file
        if !originalPath.isEmpty && FileManager.default.fileExists(atPath: originalPath) {
            // Copy existing saved .pages file to staging
            try? FileManager.default.copyItem(at: URL(fileURLWithPath: originalPath), to: pagesTargetURL)
        } else {
            // Document is unsaved; save a copy to staging via AppleScript
            let savePagesScript = """
            set targetPages to (POSIX file "\(pagesTargetURL.path)")
            tell application "Pages"
                try
                    save front document in targetPages
                    return "SUCCESS"
                on error errMsg
                    return "ERROR: " & errMsg
                end try
            end tell
            """
            _ = runAppleScript(savePagesScript)
        }

        // Gather generated files
        var stagedFiles: [SelectedFileInfo] = []

        // Add .pages file if present
        let finalPagesPath = FileManager.default.fileExists(atPath: pagesTargetURL.path)
            ? pagesTargetURL.path
            : (!originalPath.isEmpty && FileManager.default.fileExists(atPath: originalPath) ? originalPath : nil)

        if let pagesPath = finalPagesPath,
           let pagesInfo = FinderFileSelectionHelper.shared.makeFileInfo(from: pagesPath) {
            stagedFiles.append(pagesInfo)
            NSLog("✅ [PagesContextProvider] Staged .pages attachment: \(pagesInfo.name) (\(pagesInfo.formattedSize))")
        }

        // Add .pdf file if present
        if FileManager.default.fileExists(atPath: pdfTargetURL.path),
           let pdfInfo = FinderFileSelectionHelper.shared.makeFileInfo(from: pdfTargetURL.path) {
            stagedFiles.append(pdfInfo)
            NSLog("✅ [PagesContextProvider] Staged .pdf attachment: \(pdfInfo.name) (\(pdfInfo.formattedSize))")
        }

        return AppContextResult(
            appName: "Pages",
            bundleIdentifier: "com.apple.iWork.Pages",
            windowTitle: safeName,
            files: stagedFiles,
            textContext: bodyText.isEmpty ? nil : bodyText,
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
            NSLog("⚠️ [PagesContextProvider] Script error: \(error)")
            return ""
        }
    }

    private func makeEmptyResult() -> AppContextResult {
        AppContextResult(
            appName: "Pages",
            bundleIdentifier: "com.apple.iWork.Pages",
            windowTitle: nil,
            files: [],
            textContext: nil,
            screenshotBase64: nil
        )
    }
}
