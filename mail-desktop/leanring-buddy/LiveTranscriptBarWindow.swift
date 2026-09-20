//
//  LiveTranscriptBarWindow.swift
//  leanring-buddy
//
//  Small frosted bar that appears beside the cursor while push-to-talk is held
//  and writes out what you say as you say it. Same size and glass style as the
//  ⌘⇧M prompt bar, but display-only: it never takes focus or mouse events.
//

import AppKit
import Combine
import SwiftUI

@MainActor
final class LiveTranscriptBarManager: ObservableObject {
    static let shared = LiveTranscriptBarManager()

    @Published private(set) var transcriptText: String = ""

    private static let barSize = NSSize(width: 380, height: 46)
    private static let lingerAfterFinalTranscriptSeconds = 1.2

    private var panel: NSPanel?
    private var pendingHideWorkItem: DispatchWorkItem?
    /// Once the utterance is over, stop accepting updates while the bar lingers and fades.
    private var isEnding = false

    func show() {
        pendingHideWorkItem?.cancel()
        pendingHideWorkItem = nil
        isEnding = false
        transcriptText = ""

        createPanelIfNeeded()
        guard let panel else { return }

        panel.setFrame(frameBesideCursor(), display: true)
        panel.alphaValue = 0
        panel.orderFrontRegardless()

        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.15
            panel.animator().alphaValue = 1.0
        }
    }

    func update(text: String) {
        guard !isEnding else { return }
        // Empty updates are the dictation manager resetting its state at the end
        // of an utterance (show() already clears the text at the start of one).
        // Applying them would wipe the final words before they can be read.
        guard !text.isEmpty else { return }
        transcriptText = text
    }

    /// Fades the bar out. Lingers briefly when there is text so the final words
    /// can be read before it disappears.
    func hide() {
        guard let panel, panel.isVisible, !isEnding else { return }
        isEnding = true

        let delay = transcriptText.isEmpty ? 0.0 : Self.lingerAfterFinalTranscriptSeconds
        let workItem = DispatchWorkItem { [weak self] in
            guard let self, let panel = self.panel else { return }
            NSAnimationContext.runAnimationGroup({ context in
                context.duration = 0.15
                panel.animator().alphaValue = 0.0
            }, completionHandler: {
                Task { @MainActor in
                    // A new press may have re-shown the bar during the fade.
                    if self.isEnding {
                        panel.orderOut(nil)
                    }
                }
            })
        }
        pendingHideWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
    }

    private func frameBesideCursor() -> NSRect {
        let mouseLocation = NSEvent.mouseLocation
        let size = Self.barSize

        let screen = NSScreen.screens.first(where: { $0.frame.contains(mouseLocation) }) ?? NSScreen.main
        let screenFrame = screen?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)

        // Same placement as the prompt bar: right of and below the cursor,
        // flipped to stay inside the visible screen.
        var originX = mouseLocation.x + 16
        var originY = mouseLocation.y - size.height - 12

        if originX + size.width > screenFrame.maxX - 16 {
            originX = mouseLocation.x - size.width - 16
        }
        if originY < screenFrame.minY + 16 {
            originY = mouseLocation.y + 16
        }

        return NSRect(x: originX, y: originY, width: size.width, height: size.height)
    }

    private func createPanelIfNeeded() {
        if panel != nil { return }

        let barPanel = NSPanel(
            contentRect: NSRect(origin: .zero, size: Self.barSize),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        barPanel.isFloatingPanel = true
        barPanel.level = .floating
        barPanel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        barPanel.isOpaque = false
        barPanel.backgroundColor = .clear
        barPanel.hasShadow = true
        barPanel.hidesOnDeactivate = false
        barPanel.ignoresMouseEvents = true

        barPanel.contentView = NSHostingView(rootView: LiveTranscriptBarView(manager: self))
        panel = barPanel
    }
}

struct LiveTranscriptBarView: View {
    @ObservedObject var manager: LiveTranscriptBarManager

    private var hasTranscript: Bool {
        !manager.transcriptText.isEmpty
    }

    var body: some View {
        ZStack {
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

            HStack(spacing: 8) {
                Image(systemName: "waveform")
                    .foregroundColor(.blue)
                    .font(.system(size: 14, weight: .semibold))

                // Head truncation keeps the most recent words visible as the
                // sentence outgrows the bar.
                Text(hasTranscript ? manager.transcriptText : "Listening…")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundColor(hasTranscript ? .primary : .secondary)
                    .lineLimit(1)
                    .truncationMode(.head)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
        }
        .frame(width: 380, height: 46)
    }
}
