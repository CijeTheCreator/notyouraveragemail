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

    /// Queries Finder via AppleScript to get the currently selected file paths in <10ms.
    func getCurrentlySelectedFiles() -> [SelectedFileInfo] {
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
            print("⚠️ FinderFileSelectionHelper AppleScript error: \(error)")
            return []
        }

        var results: [SelectedFileInfo] = []
        let count = outputDescriptor.numberOfItems

        if count > 0 {
            for i in 1...count {
                if let itemDesc = outputDescriptor.atIndex(i),
                   let pathString = itemDesc.stringValue {
                    let cleanPath = pathString.trimmingCharacters(in: .whitespacesAndNewlines)
                    if let fileInfo = makeFileInfo(from: cleanPath) {
                        results.append(fileInfo)
                    }
                }
            }
        } else if let singleString = outputDescriptor.stringValue, !singleString.isEmpty {
            if let fileInfo = makeFileInfo(from: singleString) {
                results.append(fileInfo)
            }
        }

        return results
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

    private func makeFileInfo(from path: String) -> SelectedFileInfo? {
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
