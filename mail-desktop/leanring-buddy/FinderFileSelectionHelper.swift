//
//  FinderFileSelectionHelper.swift
//  leanring-buddy
//
//  Fast-path (<10ms) macOS file selection grabber using AppleScript.
//  Deterministically extracts file paths highlighted in Finder or on Desktop.
//

import AppKit
import Foundation

struct SelectedFileInfo: Identifiable, Equatable {
    var id: String { path }
    let path: String
    let name: String
    let sizeBytes: Int64
    let isDirectory: Bool

    var formattedSize: String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useAll]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: sizeBytes)
    }
}

final class FinderFileSelectionHelper {
    static let shared = FinderFileSelectionHelper()

    /// Queries Finder via AppleScript (with fallback to Process osascript) to get the currently selected file paths.
    func getCurrentlySelectedFiles() -> [SelectedFileInfo] {
        NSLog("🔍 [FinderFileSelectionHelper] Querying Finder for selected files...")

        // Strategy 1: Try in-process NSAppleScript
        var paths = getSelectedPathsViaNSAppleScript()

        // Strategy 2: If NSAppleScript fails or returns empty, fallback to /usr/bin/osascript via Process
        if paths.isEmpty {
            NSLog("🔍 [FinderFileSelectionHelper] NSAppleScript returned 0 paths, attempting /usr/bin/osascript fallback...")
            paths = getSelectedPathsViaProcess()
        }

        // Strategy 3: Check frontmost document if not Finder
        if paths.isEmpty {
            if let doc = getFrontmostDocumentPath() {
                paths = [doc.path]
            }
        }

        NSLog("🔍 [FinderFileSelectionHelper] Successfully detected \(paths.count) file paths: \(paths)")

        var results: [SelectedFileInfo] = []
        for path in paths {
            if let fileInfo = makeFileInfo(from: path) {
                results.append(fileInfo)
            }
        }

        return results
    }

    private func getSelectedPathsViaProcess() -> [String] {
        let script = """
        tell application "Finder"
            set sel to selection as alias list
            set str to ""
            repeat with anItem in sel
                set str to str & (POSIX path of anItem) & linefeed
            end repeat
            return str
        end tell
        """

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        process.arguments = ["-e", script]
        let pipe = Pipe()
        process.standardOutput = pipe

        do {
            try process.run()
            process.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            if let output = String(data: data, encoding: .utf8) {
                let lines = output.components(separatedBy: .newlines)
                    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
                return lines
            }
        } catch {
            NSLog("⚠️ [FinderFileSelectionHelper] Process osascript error: \(error)")
        }
        return []
    }

    private func getSelectedPathsViaNSAppleScript() -> [String] {
        let scriptSource = """
        tell application "Finder"
            set selectedItems to selection as alias list
            set pathList to {}
            repeat with anItem in selectedItems
                set end of pathList to POSIX path of anItem
            end repeat
            return pathList
        end tell
        """

        var error: NSDictionary?
        guard let script = NSAppleScript(source: scriptSource) else {
            return []
        }

        let outputDescriptor = script.executeAndReturnError(&error)
        if let error = error {
            NSLog("⚠️ [FinderFileSelectionHelper] NSAppleScript error: \(error)")
            return []
        }

        var paths: [String] = []
        let count = outputDescriptor.numberOfItems

        if count > 0 {
            for i in 1...count {
                if let itemDesc = outputDescriptor.atIndex(i),
                   let pathString = itemDesc.stringValue {
                    let cleanPath = pathString.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !cleanPath.isEmpty {
                        paths.append(cleanPath)
                    }
                }
            }
        } else if let singleString = outputDescriptor.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines), !singleString.isEmpty {
            paths.append(singleString)
        }

        return paths
    }

    /// Tries to get the open document path of the frontmost application if not Finder
    func getFrontmostDocumentPath() -> SelectedFileInfo? {
        let scriptSource = """
        tell application "System Events"
            set frontApp to name of first application process whose frontmost is true
        end tell
        try
            tell application frontApp
                set docPath to POSIX path of (file of front document as text)
                return docPath
            end tell
        on error
            return ""
        end try
        """

        var error: NSDictionary?
        guard let script = NSAppleScript(source: scriptSource) else { return nil }
        let descriptor = script.executeAndReturnError(&error)
        guard let pathString = descriptor.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines),
              !pathString.isEmpty else {
            return nil
        }
        return makeFileInfo(from: pathString)
    }

    func makeFileInfo(from path: String) -> SelectedFileInfo? {
        let fileManager = FileManager.default
        var isDir: ObjCBool = false
        guard fileManager.fileExists(atPath: path, isDirectory: &isDir) else {
            return nil
        }

        let url = URL(fileURLWithPath: path)
        let name = url.lastPathComponent

        var size: Int64 = 0
        if let attrs = try? fileManager.attributesOfItem(atPath: path),
           let fileSize = attrs[.size] as? Int64 {
            size = fileSize
        }

        return SelectedFileInfo(
            path: path,
            name: name,
            sizeBytes: size,
            isDirectory: isDir.boolValue
        )
    }
}
