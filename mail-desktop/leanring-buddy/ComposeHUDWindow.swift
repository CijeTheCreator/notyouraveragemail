//
//  ComposeHUDWindow.swift
//  leanring-buddy
//
//  Apple-native Top-Right Compose HUD window.
//  Appears when AI drafting completes, presenting Approve / Edit / Reject controls.
//

import AppKit
import Combine
import SwiftUI

@MainActor
final class ComposeHUDManager: ObservableObject {
    static let shared = ComposeHUDManager()

    @Published var isShowingHUD: Bool = false
    @Published var currentDraft: EmailDraft?
    @Published var isSending: Bool = false
    @Published var statusMessage: String?

    private var hudPanel: NSPanel?

    func showHUD(for draft: EmailDraft) {
        self.currentDraft = draft
        self.isShowingHUD = true
        self.statusMessage = nil

        createPanelIfNeeded()

        guard let panel = hudPanel, let screen = NSScreen.main else { return }

        // Position in top-right of main screen
        let screenFrame = screen.visibleFrame
        let panelWidth: CGFloat = 380
        let panelHeight: CGFloat = 340

        let originX = screenFrame.maxX - panelWidth - 24
        let originY = screenFrame.maxY - panelHeight - 24

        panel.setFrame(NSRect(x: originX, y: originY, width: panelWidth, height: panelHeight), display: true)
        panel.alphaValue = 0
        panel.orderFrontRegardless()

        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.25
            panel.animator().alphaValue = 1.0
        }
    }

    func hideHUD() {
        guard let panel = hudPanel else { return }
        NSAnimationContext.runAnimationGroup({ context in
            context.duration = 0.2
            panel.animator().alphaValue = 0.0
        }, completionHandler: {
            panel.orderOut(nil)
            self.isShowingHUD = false
            self.currentDraft = nil
        })
    }

    private func createPanelIfNeeded() {
        if hudPanel != nil { return }

        let panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 380, height: 340),
            styleMask: [.nonactivatingPanel, .titled, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        panel.isFloatingPanel = true
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.titleVisibility = .hidden
        panel.titlebarAppearsTransparent = true
        panel.isMovableByWindowBackground = true
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true

        let hostingView = NSHostingView(rootView: ComposeHUDView(manager: self))
        panel.contentView = hostingView
        self.hudPanel = panel
    }
}

struct ComposeHUDView: View {
    @ObservedObject var manager: ComposeHUDManager
    @State private var isEditing: Bool = false

    @State private var editableTo: String = ""
    @State private var editableSubject: String = ""
    @State private var editableBody: String = ""

    var body: some View {
        ZStack {
            // Apple native visual effect background (vibrancy material)
            VisualEffectBlur(material: .hudWindow, blendingMode: .behindWindow)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: 12) {
                // Header
                HStack {
                    Image(systemName: "envelope.badge.shield.half.filled")
                        .foregroundColor(.blue)
                        .font(.system(size: 15, weight: .semibold))
                    Text("Draft Ready")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.primary)

                    Spacer()

                    Button(action: {
                        manager.hideHUD()
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.secondary)
                            .padding(4)
                            .background(Color.white.opacity(0.08))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }

                Divider().opacity(0.3)

                if isEditing {
                    // Inline Editing Mode
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("To:")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondary)
                                .frame(width: 40, alignment: .leading)
                            TextField("Recipient", text: $editableTo)
                                .textFieldStyle(.roundedBorder)
                                .font(.system(size: 12))
                        }

                        HStack {
                            Text("Subject:")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondary)
                                .frame(width: 40, alignment: .leading)
                            TextField("Subject", text: $editableSubject)
                                .textFieldStyle(.roundedBorder)
                                .font(.system(size: 12))
                        }

                        TextEditor(text: $editableBody)
                            .font(.system(size: 12))
                            .frame(height: 90)
                            .padding(4)
                            .background(Color(NSColor.textBackgroundColor).opacity(0.8))
                            .cornerRadius(6)
                    }
                } else {
                    // Review Mode
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("To:")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondary)
                            Text(manager.currentDraft?.to.isEmpty == false ? manager.currentDraft!.to : "(No recipient specified)")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(manager.currentDraft?.to.isEmpty == false ? .primary : .secondary)
                        }

                        HStack {
                            Text("Subject:")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondary)
                            Text(manager.currentDraft?.subject ?? "")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.primary)
                                .lineLimit(1)
                        }

                        ScrollView {
                            Text(manager.currentDraft?.body ?? "")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(8)
                                .background(Color.black.opacity(0.15))
                                .cornerRadius(8)
                        }
                        .frame(height: 80)
                    }
                }

                // Attached Files Chips
                if let files = manager.currentDraft?.attachedFiles, !files.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(files, id: \.self) { file in
                                HStack(spacing: 4) {
                                    Image(systemName: "paperclip")
                                        .font(.system(size: 9))
                                    Text(URL(fileURLWithPath: file).lastPathComponent)
                                        .font(.system(size: 10, weight: .medium))
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.blue.opacity(0.15))
                                .foregroundColor(.blue)
                                .cornerRadius(12)
                            }
                        }
                    }
                }

                Spacer()

                // Actions Footer
                HStack(spacing: 10) {
                    Button(action: {
                        manager.hideHUD()
                    }) {
                        Text("Reject")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .background(Color.red.opacity(0.12))
                            .cornerRadius(8)
                    }
                    .buttonStyle(.plain)

                    Button(action: {
                        if isEditing {
                            // Save edits
                            manager.currentDraft?.to = editableTo
                            manager.currentDraft?.subject = editableSubject
                            manager.currentDraft?.body = editableBody
                            isEditing = false
                        } else {
                            editableTo = manager.currentDraft?.to ?? ""
                            editableSubject = manager.currentDraft?.subject ?? ""
                            editableBody = manager.currentDraft?.body ?? ""
                            isEditing = true
                        }
                    }) {
                        Text(isEditing ? "Save" : "Edit")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .background(Color.white.opacity(0.12))
                            .cornerRadius(8)
                    }
                    .buttonStyle(.plain)

                    Button(action: {
                        guard let draft = manager.currentDraft else { return }
                        Task {
                            manager.isSending = true
                            manager.statusMessage = "Sending..."
                            do {
                                let success = try await ConvexService.shared.sendApprovedEmail(draft: draft)
                                if success {
                                    manager.statusMessage = "Sent!"
                                    try? await Task.sleep(nanoseconds: 800_000_000)
                                    manager.hideHUD()
                                }
                            } catch {
                                manager.statusMessage = "Send Failed"
                            }
                            manager.isSending = false
                        }
                    }) {
                        HStack(spacing: 4) {
                            if manager.isSending {
                                ProgressView()
                                    .controlSize(.small)
                            } else {
                                Image(systemName: "paperplane.fill")
                                    .font(.system(size: 10))
                                Text(manager.statusMessage ?? "Approve")
                                    .font(.system(size: 12, weight: .semibold))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                        .background(Color.blue)
                        .cornerRadius(8)
                    }
                    .buttonStyle(.plain)
                    .disabled(manager.isSending)
                }
            }
            .padding(16)
        }
        .frame(width: 380, height: 340)
        .onAppear {
            if let draft = manager.currentDraft {
                editableTo = draft.to
                editableSubject = draft.subject
                editableBody = draft.body
            }
        }
    }
}

// Visual Effect helper for NSVisualEffectView in SwiftUI
struct VisualEffectBlur: NSViewRepresentable {
    var material: NSVisualEffectView.Material = .hudWindow
    var blendingMode: NSVisualEffectView.BlendingMode = .behindWindow

    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = material
        view.blendingMode = blendingMode
        view.state = .active
        return view
    }

    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {
        nsView.material = material
        nsView.blendingMode = blendingMode
    }
}
