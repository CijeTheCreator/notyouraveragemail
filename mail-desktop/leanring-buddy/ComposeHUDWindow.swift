//
//  ComposeHUDWindow.swift
//  leanring-buddy
//
//  Apple-native Top-Right Compose HUD window.
//  Presents drafted mail with Apple native liquid glass capsule action buttons (Approve, Edit, Reject),
//  plus full attachment management (add more files via NSOpenPanel, remove attached files).
//

import AppKit
import Combine
import SwiftUI
import UniformTypeIdentifiers

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
        let panelWidth: CGFloat = 420
        let panelHeight: CGFloat = 390

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
        NotificationCenter.default.post(name: NSNotification.Name("ResetCompanionDraftingState"), object: nil)
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
            contentRect: NSRect(x: 0, y: 0, width: 420, height: 390),
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

// MARK: - Liquid Glass Capsule Button Style
struct LiquidGlassButtonStyle: ButtonStyle {
    var tintColor: Color = .white
    var isPrimary: Bool = false
    @State private var isHovered: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(isPrimary ? .white : tintColor)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(
                ZStack {
                    // Frosted ultra-thin vibrancy base
                    VisualEffectBlur(material: .hudWindow, blendingMode: .withinWindow)

                    if isPrimary {
                        Color.blue.opacity(configuration.isPressed ? 0.75 : (isHovered ? 0.9 : 0.8))
                    } else {
                        tintColor.opacity(configuration.isPressed ? 0.22 : (isHovered ? 0.16 : 0.09))
                    }

                    // Top specular shine
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.white.opacity(0.35),
                            Color.white.opacity(0.05)
                        ]),
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }
            )
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.white.opacity(isHovered ? 0.55 : 0.35),
                                Color.white.opacity(0.12)
                            ]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 0.9
                    )
            )
            .shadow(
                color: (isPrimary ? Color.blue : tintColor).opacity(isHovered ? 0.3 : 0.1),
                radius: isHovered ? 6 : 2,
                x: 0,
                y: 1
            )
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(.easeOut(duration: 0.15), value: isHovered)
            .onHover { hovering in
                isHovered = hovering
            }
    }
}

struct ComposeHUDView: View {
    @ObservedObject var manager: ComposeHUDManager
    @State private var isEditing: Bool = false

    @State private var editableTo: String = ""
    @State private var editableSubject: String = ""
    @State private var editableBody: String = ""
    @State private var isAddingAttachment: Bool = false
    @State private var recipientValidationError: String? = nil

    var body: some View {
        ZStack {
            // macOS Tahoe/Sonoma Liquid Glass Window Background
            VisualEffectBlur(material: .hudWindow, blendingMode: .behindWindow)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(0.32),
                                    Color.white.opacity(0.08)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )

            VStack(alignment: .leading, spacing: 12) {
                // Header with Apple Native Liquid Glass Buttons at Top Right
                HStack(alignment: .center, spacing: 8) {
                    HStack(spacing: 6) {
                        Image(systemName: "sparkles")
                            .foregroundColor(.blue)
                            .font(.system(size: 13, weight: .semibold))
                        Text("Mail Draft")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.primary)
                    }

                    Spacer()

                    // Liquid Glass Buttons: Approve, Edit, Reject
                    HStack(spacing: 6) {
                        Button(action: {
                            if isEditing {
                                // Save current text edits
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
                            HStack(spacing: 3) {
                                Image(systemName: isEditing ? "checkmark" : "pencil")
                                    .font(.system(size: 9))
                                Text(isEditing ? "Save" : "Edit")
                            }
                        }
                        .buttonStyle(LiquidGlassButtonStyle(tintColor: .primary, isPrimary: false))

                        Button(action: {
                            manager.hideHUD()
                        }) {
                            HStack(spacing: 3) {
                                Image(systemName: "xmark")
                                    .font(.system(size: 9))
                                Text("Reject")
                            }
                        }
                        .buttonStyle(LiquidGlassButtonStyle(tintColor: .red, isPrimary: false))

                        Button(action: {
                            approveAndSend()
                        }) {
                            HStack(spacing: 4) {
                                if manager.isSending {
                                    ProgressView()
                                        .controlSize(.small)
                                } else {
                                    Image(systemName: "paperplane.fill")
                                        .font(.system(size: 9))
                                    Text(manager.statusMessage ?? "Approve")
                                }
                            }
                        }
                        .buttonStyle(LiquidGlassButtonStyle(tintColor: .white, isPrimary: true))
                        .disabled(manager.isSending)
                    }
                }

                Divider().opacity(0.25)

                if isEditing {
                    // Inline Editing Mode
                    VStack(alignment: .leading, spacing: 8) {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text("To:")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(recipientValidationError != nil ? .red : .secondary)
                                    .frame(width: 48, alignment: .leading)
                                TextField("Recipient email (e.g. name@example.com)", text: $editableTo)
                                    .textFieldStyle(.roundedBorder)
                                    .font(.system(size: 12))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 5)
                                            .stroke(recipientValidationError != nil ? Color.red.opacity(0.8) : Color.clear, lineWidth: 1.5)
                                    )
                                    .onChange(of: editableTo) { newValue in
                                        if recipientValidationError != nil && isValidEmail(newValue) {
                                            recipientValidationError = nil
                                        }
                                    }
                            }

                            if let errorMsg = recipientValidationError {
                                HStack(spacing: 4) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .font(.system(size: 9))
                                        .foregroundColor(.orange)
                                    Text(errorMsg)
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundColor(.orange)
                                }
                                .padding(.leading, 54)
                            }
                        }

                        HStack {
                            Text("Subject:")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondary)
                                .frame(width: 48, alignment: .leading)
                            TextField("Subject", text: $editableSubject)
                                .textFieldStyle(.roundedBorder)
                                .font(.system(size: 12))
                        }

                        TextEditor(text: $editableBody)
                            .font(.system(size: 12))
                            .frame(height: 105)
                            .padding(4)
                            .background(Color(NSColor.textBackgroundColor).opacity(0.75))
                            .cornerRadius(8)
                    }
                } else {
                    // Review Mode
                    VStack(alignment: .leading, spacing: 7) {
                        HStack {
                            Text("To:")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondary)
                                .frame(width: 48, alignment: .leading)

                            let toTrimmed = manager.currentDraft?.to.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                            if !toTrimmed.isEmpty {
                                Text(toTrimmed)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.primary)
                            } else {
                                HStack(spacing: 5) {
                                    Image(systemName: "exclamationmark.circle.fill")
                                        .font(.system(size: 10))
                                        .foregroundColor(.orange)
                                    Text("No recipient specified (click to add)")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(.orange)
                                }
                                .onTapGesture {
                                    editableTo = ""
                                    editableSubject = manager.currentDraft?.subject ?? ""
                                    editableBody = manager.currentDraft?.body ?? ""
                                    isEditing = true
                                    recipientValidationError = "Please enter a recipient email before sending"
                                }
                            }
                        }

                        HStack {
                            Text("Subject:")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondary)
                                .frame(width: 48, alignment: .leading)
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
                                .background(Color.black.opacity(0.18))
                                .cornerRadius(8)
                        }
                        .frame(height: 105)

                        if let body = manager.currentDraft?.body, body.contains("figma.com") {
                            HStack(spacing: 5) {
                                Text("🎨")
                                    .font(.system(size: 10))
                                Text("Figma link included")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(.secondary)
                                Spacer()
                                Button(action: {
                                    if let url = URL(string: "http://localhost:3000/auth/figma") {
                                        NSWorkspace.shared.open(url)
                                    }
                                }) {
                                    Text("Figma Settings ↗")
                                        .font(.system(size: 10, weight: .semibold))
                                        .foregroundColor(.blue)
                                }
                                .buttonStyle(.plain)
                                .pointerCursor()
                            }
                            .padding(.horizontal, 2)
                        }
                    }
                }

                // Attachments Bar: View, Remove, and Add Attachments
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Attachments")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.secondary)

                        Spacer()

                        Button(action: {
                            pickAndAddAttachment()
                        }) {
                            HStack(spacing: 3) {
                                if isAddingAttachment {
                                    ProgressView()
                                        .controlSize(.mini)
                                } else {
                                    Image(systemName: "plus")
                                        .font(.system(size: 9, weight: .bold))
                                }
                                Text("Add File")
                                    .font(.system(size: 10, weight: .medium))
                            }
                            .foregroundColor(.blue)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(Color.blue.opacity(0.12))
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                        .disabled(isAddingAttachment || manager.isSending)
                    }

                    // Attached Files Chips with remove button
                    let files = manager.currentDraft?.attachedFiles ?? []
                    if files.isEmpty {
                        Text("No files attached")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary.opacity(0.7))
                            .italic()
                            .padding(.vertical, 4)
                    } else {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(files, id: \.self) { file in
                                    HStack(spacing: 4) {
                                        Image(systemName: "paperclip")
                                            .font(.system(size: 9))
                                            .foregroundColor(.blue)
                                        Text(URL(fileURLWithPath: file).lastPathComponent)
                                            .font(.system(size: 10, weight: .medium))
                                            .foregroundColor(.primary)

                                        // Remove Attachment Button
                                        Button(action: {
                                            removeAttachment(filePath: file)
                                        }) {
                                            Image(systemName: "xmark.circle.fill")
                                                .font(.system(size: 10))
                                                .foregroundColor(.secondary)
                                        }
                                        .buttonStyle(.plain)
                                        .padding(.leading, 2)
                                    }
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.white.opacity(0.1))
                                    .clipShape(Capsule())
                                    .overlay(
                                        Capsule().stroke(Color.white.opacity(0.15), lineWidth: 0.8)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer()
            }
            .padding(18)
        }
        .frame(width: 420, height: 390)
        .onAppear {
            if let draft = manager.currentDraft {
                editableTo = draft.to
                editableSubject = draft.subject
                editableBody = draft.body
            }
        }
    }

    private func isValidEmail(_ email: String) -> Bool {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let predicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return predicate.evaluate(with: trimmed)
    }

    private func approveAndSend() {
        guard var draft = manager.currentDraft else { return }

        let targetTo = (isEditing ? editableTo : draft.to).trimmingCharacters(in: .whitespacesAndNewlines)
        if targetTo.isEmpty {
            editableTo = ""
            editableSubject = isEditing ? editableSubject : draft.subject
            editableBody = isEditing ? editableBody : draft.body
            isEditing = true
            recipientValidationError = "Recipient required before sending"
            return
        }

        if !isValidEmail(targetTo) {
            editableTo = targetTo
            editableSubject = isEditing ? editableSubject : draft.subject
            editableBody = isEditing ? editableBody : draft.body
            isEditing = true
            recipientValidationError = "Please enter a valid email address (e.g. name@domain.com)"
            return
        }

        recipientValidationError = nil

        if isEditing {
            draft.to = targetTo
            draft.subject = editableSubject
            draft.body = editableBody
            manager.currentDraft = draft
            isEditing = false
        } else {
            draft.to = targetTo
            manager.currentDraft = draft
        }

        Task {
            manager.isSending = true
            manager.statusMessage = "Sending..."
            do {
                let success = try await ConvexService.shared.sendApprovedEmail(draft: draft)
                if success {
                    manager.statusMessage = "Sent!"
                    try? await Task.sleep(nanoseconds: 800_000_000)
                    manager.hideHUD()
                } else {
                    manager.statusMessage = "Failed"
                }
            } catch {
                manager.statusMessage = "Error"
            }
            manager.isSending = false
        }
    }

    private func removeAttachment(filePath: String) {
        guard var draft = manager.currentDraft else { return }
        draft.attachedFiles.removeAll(where: { $0 == filePath })
        draft.attachments?.removeAll(where: { $0.path == filePath || $0.name == URL(fileURLWithPath: filePath).lastPathComponent })
        manager.currentDraft = draft
    }

    private func pickAndAddAttachment() {
        let openPanel = NSOpenPanel()
        openPanel.allowsMultipleSelection = true
        openPanel.canChooseDirectories = false
        openPanel.canChooseFiles = true
        openPanel.prompt = "Attach"

        if openPanel.runModal() == .OK {
            let selectedURLs = openPanel.urls
            guard !selectedURLs.isEmpty else { return }

            isAddingAttachment = true
            Task {
                for url in selectedURLs {
                    let path = url.path
                    let name = url.lastPathComponent
                    let size = (try? FileManager.default.attributesOfItem(atPath: path)[.size] as? Int64) ?? 0

                    do {
                        // Upload newly added file to Convex storage immediately
                        let storageId = try await ConvexService.shared.uploadFileToConvex(fileURL: url)
                        let newAttachment = AttachmentItem(
                            storageId: storageId,
                            name: name,
                            sizeBytes: size,
                            path: path
                        )
                        if var draft = manager.currentDraft {
                            if !draft.attachedFiles.contains(path) {
                                draft.attachedFiles.append(path)
                            }
                            if draft.attachments == nil {
                                draft.attachments = []
                            }
                            draft.attachments?.append(newAttachment)
                            manager.currentDraft = draft
                        }
                    } catch {
                        print("⚠️ Failed to upload added attachment \(name): \(error)")
                        // Even if remote upload fails, append local path as fallback
                        if var draft = manager.currentDraft {
                            if !draft.attachedFiles.contains(path) {
                                draft.attachedFiles.append(path)
                            }
                            manager.currentDraft = draft
                        }
                    }
                }
                isAddingAttachment = false
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
