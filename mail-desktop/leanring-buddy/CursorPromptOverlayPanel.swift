//
//  CursorPromptOverlayPanel.swift
//  leanring-buddy
//
//  Floating prompt window anchored right beside the mouse cursor.
//  Triggered via Option + Space (⌥Space).
//  Collects prompt text, initiates background file upload to Convex storage,
//  and invokes the Convex drafting action.
//

import AppKit
import Combine
import SwiftUI

@MainActor
final class CursorPromptOverlayManager: ObservableObject {
    static let shared = CursorPromptOverlayManager()

    @Published var isShowing: Bool = false
    @Published var promptText: String = ""
    @Published var selectedFiles: [SelectedFileInfo] = []
    @Published var appContext: AppContextResult? = nil

    private var panel: NSPanel?
    private var clickOutsideMonitor: Any?

    func showPromptWindow(context: AppContextResult) {
        self.appContext = context
        self.selectedFiles = context.files
        self.promptText = ""
        self.isShowing = true

        createPanelIfNeeded()

        guard let panel = self.panel else { return }

        // Determine if file selection row should be shown (Finder only)
        let isFinderSelection = (context.appName == "Finder" && !context.files.isEmpty)

        // Position panel beside the cursor
        let mouseLocation = NSEvent.mouseLocation
        let panelWidth: CGFloat = 380
        let panelHeight: CGFloat = isFinderSelection ? 82 : 46

        // Find which screen contains the mouse, or fallback to main
        let screen = NSScreen.screens.first(where: { $0.frame.contains(mouseLocation) }) ?? NSScreen.main
        let screenFrame = screen?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)

        // Offset slightly to the right and below/above the cursor
        var originX = mouseLocation.x + 16
        var originY = mouseLocation.y - panelHeight - 12

        // Keep inside visible screen bounds
        if originX + panelWidth > screenFrame.maxX - 16 {
            originX = mouseLocation.x - panelWidth - 16
        }
        if originY < screenFrame.minY + 16 {
            originY = mouseLocation.y + 16
        }

        panel.setFrame(NSRect(x: originX, y: originY, width: panelWidth, height: panelHeight), display: true)
        panel.alphaValue = 0
        panel.makeKeyAndOrderFront(nil)
        panel.orderFrontRegardless()

        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.18
            panel.animator().alphaValue = 1.0
        }

        installClickOutsideMonitor()
    }

    func showPromptWindow(initialFiles: [SelectedFileInfo]) {
        let context = AppContextResult(
            appName: "Finder",
            bundleIdentifier: "com.apple.finder",
            windowTitle: initialFiles.first?.name,
            files: initialFiles,
            textContext: nil,
            screenshotBase64: nil
        )
        showPromptWindow(context: context)
    }

    func hidePromptWindow() {
        removeClickOutsideMonitor()
        guard let panel = self.panel else { return }

        NSAnimationContext.runAnimationGroup({ context in
            context.duration = 0.15
            panel.animator().alphaValue = 0.0
        }, completionHandler: {
            panel.orderOut(nil)
            self.isShowing = false
            self.promptText = ""
        })
    }

    private func createPanelIfNeeded() {
        if panel != nil { return }

        let customPanel = KeyablePromptPanel(
            contentRect: NSRect(x: 0, y: 0, width: 380, height: 82),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        customPanel.isFloatingPanel = true
        customPanel.level = .floating
        customPanel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        customPanel.isOpaque = false
        customPanel.backgroundColor = .clear
        customPanel.hasShadow = true
        customPanel.hidesOnDeactivate = false

        let hostingView = NSHostingView(rootView: CursorPromptView(manager: self))
        customPanel.contentView = hostingView
        self.panel = customPanel
    }

    private func installClickOutsideMonitor() {
        removeClickOutsideMonitor()
        clickOutsideMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] _ in
            guard let self = self, self.isShowing else { return }
            self.hidePromptWindow()
        }
    }

    private func removeClickOutsideMonitor() {
        if let monitor = clickOutsideMonitor {
            NSEvent.removeMonitor(monitor)
            clickOutsideMonitor = nil
        }
    }
}

/// Custom NSPanel subclass that accepts key focus without stealing main application activation
private class KeyablePromptPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}

struct CursorPromptView: View {
    @ObservedObject var manager: CursorPromptOverlayManager

    private var isFinderSelection: Bool {
        manager.appContext?.appName == "Finder" && !manager.selectedFiles.isEmpty
    }

    var body: some View {
        ZStack {
            // Apple Native frosted HUD glass
            VisualEffectBlur(material: .hudWindow, blendingMode: .behindWindow)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(0.35),
                                    Color.white.opacity(0.1)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )

            VStack(alignment: .leading, spacing: isFinderSelection ? 6 : 0) {
                // Row 1: Text field and submit button
                HStack(spacing: 8) {
                    Image(systemName: "sparkle")
                        .foregroundColor(.blue)
                        .font(.system(size: 14, weight: .semibold))

                    // Plain text input with autofocus, Enter to submit, Esc to cancel
                    CustomPromptTextField(text: $manager.promptText, onCommit: {
                        submitPrompt()
                    }, onCancel: {
                        manager.hidePromptWindow()
                    })

                    Button(action: {
                        submitPrompt()
                    }) {
                        Image(systemName: "arrow.right.circle.fill")
                            .font(.system(size: 18))
                            .foregroundColor(manager.promptText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? Color.secondary.opacity(0.5) : Color.blue)
                    }
                    .buttonStyle(.plain)
                    .disabled(manager.promptText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                if isFinderSelection {
                    Divider().opacity(0.2)

                    // Row 2: Selected Files Chips & Add Attachment Button (Finder selections only)
                    HStack(spacing: 6) {
                        Image(systemName: "paperclip")
                            .font(.system(size: 10))
                            .foregroundColor(.blue)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 4) {
                                ForEach(manager.selectedFiles) { file in
                                    HStack(spacing: 3) {
                                        Text(file.name)
                                            .font(.system(size: 10, weight: .medium))
                                            .foregroundColor(.primary)
                                            .lineLimit(1)

                                        Button(action: {
                                            manager.selectedFiles.removeAll(where: { $0.id == file.id })
                                        }) {
                                            Image(systemName: "xmark")
                                                .font(.system(size: 8))
                                                .foregroundColor(.secondary)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.white.opacity(0.12))
                                    .clipShape(Capsule())
                                    .overlay(
                                        Capsule().stroke(Color.white.opacity(0.18), lineWidth: 0.7)
                                    )
                                }
                            }
                        }

                        Spacer()

                        Button(action: {
                            pickMoreFiles()
                        }) {
                            HStack(spacing: 2) {
                                Image(systemName: "plus")
                                    .font(.system(size: 8, weight: .bold))
                                Text("Attach")
                                    .font(.system(size: 9, weight: .medium))
                            }
                            .foregroundColor(.blue)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.blue.opacity(0.12))
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, isFinderSelection ? 8 : 10)
        }
        .frame(width: 380, height: isFinderSelection ? 82 : 46)
    }

    private func pickMoreFiles() {
        let openPanel = NSOpenPanel()
        openPanel.allowsMultipleSelection = true
        openPanel.canChooseDirectories = false
        openPanel.canChooseFiles = true
        openPanel.prompt = "Attach"

        if openPanel.runModal() == .OK {
            for url in openPanel.urls {
                if let info = FinderFileSelectionHelper.shared.makeFileInfo(from: url.path) {
                    if !manager.selectedFiles.contains(where: { $0.path == info.path }) {
                        manager.selectedFiles.append(info)
                    }
                }
            }
        }
    }

    private func submitPrompt() {
        let text = manager.promptText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        let files = manager.selectedFiles
        let screenCtx = manager.appContext?.formattedScreenContext
        manager.hidePromptWindow()

        var userInfo: [String: Any] = [
            "prompt": text,
            "files": files
        ]
        if let screenCtx = screenCtx, !screenCtx.isEmpty {
            userInfo["screenContext"] = screenCtx
        }

        NotificationCenter.default.post(
            name: NSNotification.Name("TriggerPromptDrafting"),
            object: nil,
            userInfo: userInfo
        )
    }
}

/// Custom NSViewRepresentable NSTextField wrapper to handle direct Enter / Esc key events cleanly
struct CustomPromptTextField: NSViewRepresentable {
    @Binding var text: String
    var onCommit: () -> Void
    var onCancel: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeNSView(context: Context) -> NSTextField {
        let textField = NSTextField()
        textField.isBordered = false
        textField.drawsBackground = false
        textField.focusRingType = .none
        textField.font = NSFont.systemFont(ofSize: 13, weight: .regular)
        textField.textColor = NSColor.labelColor
        textField.placeholderString = "What would you like to email?"
        textField.delegate = context.coordinator

        // Request initial focus once window is ready
        DispatchQueue.main.async {
            textField.window?.makeFirstResponder(textField)
        }

        return textField
    }

    func updateNSView(_ nsView: NSTextField, context: Context) {
        // Only update stringValue if different and not currently editing
        if nsView.stringValue != text {
            nsView.stringValue = text
            // Move insertion point to end instead of selecting entire text
            if let currentEditor = nsView.currentEditor() {
                let length = nsView.stringValue.utf16.count
                currentEditor.selectedRange = NSRange(location: length, length: 0)
            }
        }
    }

    class Coordinator: NSObject, NSTextFieldDelegate {
        var parent: CustomPromptTextField

        init(_ parent: CustomPromptTextField) {
            self.parent = parent
        }

        func controlTextDidChange(_ obj: Notification) {
            if let textField = obj.object as? NSTextField {
                parent.text = textField.stringValue
            }
        }

        func control(_ control: NSControl, textView: NSTextView, doCommandBy commandSelector: Selector) -> Bool {
            if commandSelector == #selector(NSResponder.insertNewline(_:)) {
                parent.onCommit()
                return true
            } else if commandSelector == #selector(NSResponder.cancelOperation(_:)) {
                parent.onCancel()
                return true
            }
            return false
        }
    }
}
