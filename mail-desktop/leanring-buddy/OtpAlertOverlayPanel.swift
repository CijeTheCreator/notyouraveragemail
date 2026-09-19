//
//  OtpAlertOverlayPanel.swift
//  leanring-buddy
//
//  Floating interactive OTP alert panel displayed adjacent to the cursor companion.
//  Presents the incoming verification code with one-click Auto-Fill and Copy options.
//

import AppKit
import Combine
import SwiftUI

@MainActor
final class OtpAlertOverlayManager: ObservableObject {
    static let shared = OtpAlertOverlayManager()

    @Published var isShowingAlert: Bool = false
    @Published var currentAlert: OtpAlertItem?
    @Published var isAutoFilling: Bool = false
    @Published var isCopied: Bool = false

    private var panel: NSPanel?
    private var trackingTimer: Timer?

    func showAlert(for alert: OtpAlertItem) {
        self.currentAlert = alert
        self.isShowingAlert = true
        self.isCopied = false
        self.isAutoFilling = false

        createPanelIfNeeded()
        positionNearCursorOnce()

        panel?.alphaValue = 0
        panel?.orderFrontRegardless()

        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.2
            panel?.animator().alphaValue = 1.0
        }
    }

    func hideAlert() {
        guard let panel = panel else { return }
        NSAnimationContext.runAnimationGroup({ context in
            context.duration = 0.2
            panel.animator().alphaValue = 0.0
        }, completionHandler: {
            panel.orderOut(nil)
            self.isShowingAlert = false
            self.currentAlert = nil
        })
    }

    private func createPanelIfNeeded() {
        if panel != nil { return }

        let newPanel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 300, height: 110),
            styleMask: [.nonactivatingPanel, .borderless],
            backing: .buffered,
            defer: false
        )

        newPanel.isFloatingPanel = true
        newPanel.level = .floating
        newPanel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        newPanel.isOpaque = false
        newPanel.backgroundColor = .clear
        newPanel.hasShadow = true
        newPanel.ignoresMouseEvents = false

        let hostingView = NSHostingView(rootView: OtpAlertOverlayView(manager: self))
        newPanel.contentView = hostingView
        self.panel = newPanel
    }

    private func positionNearCursorOnce() {
        guard let panel = panel else { return }
        let mouseLocation = NSEvent.mouseLocation
        let panelWidth: CGFloat = 300
        let panelHeight: CGFloat = 110

        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)

        // Clamp so the card is always completely visible on the screen
        var targetX = mouseLocation.x + 30
        var targetY = mouseLocation.y - 40

        if targetX + panelWidth > screen.maxX {
            targetX = mouseLocation.x - panelWidth - 20
        }
        if targetY < screen.minY {
            targetY = screen.minY + 20
        }
        if targetY + panelHeight > screen.maxY {
            targetY = screen.maxY - panelHeight - 20
        }

        panel.setFrame(NSRect(x: targetX, y: targetY, width: panelWidth, height: panelHeight), display: true)
    }
}

struct OtpAlertOverlayView: View {
    @ObservedObject var manager: OtpAlertOverlayManager

    var body: some View {
        ZStack {
            // Clicky dark card aesthetic with subtle blue glow
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color(red: 0.10, green: 0.10, blue: 0.12).opacity(0.95))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(DS.Colors.overlayCursorBlue.opacity(0.6), lineWidth: 1.5)
                )
                .shadow(color: DS.Colors.overlayCursorBlue.opacity(0.3), radius: 10, x: 0, y: 2)

            VStack(alignment: .leading, spacing: 8) {
                // Top row: badge + sender + close
                HStack(spacing: 6) {
                    Image(systemName: "lock.shield.fill")
                        .foregroundColor(DS.Colors.overlayCursorBlue)
                        .font(.system(size: 13))

                    VStack(alignment: .leading, spacing: 1) {
                        Text("Verification Code")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(DS.Colors.textSecondary)
                        if let from = manager.currentAlert?.fromName {
                            Text(from)
                                .font(.system(size: 9))
                                .foregroundColor(DS.Colors.textTertiary)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    // Digits pill
                    if let code = manager.currentAlert?.otpCode {
                        Text(code)
                            .font(.system(size: 14, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(DS.Colors.overlayCursorBlue.opacity(0.25))
                            .cornerRadius(6)
                    }

                    Button(action: {
                        manager.hideAlert()
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(DS.Colors.textTertiary)
                            .padding(3)
                    }
                    .buttonStyle(.plain)
                    .pointerCursor()
                }

                Text("Click Auto-Fill to fly & type code, or Copy to clipboard")
                    .font(.system(size: 9.5))
                    .foregroundColor(DS.Colors.textTertiary)
                    .lineLimit(1)

                // Actions row
                HStack(spacing: 8) {
                    // Copy button
                    Button(action: {
                        guard let code = manager.currentAlert?.otpCode else { return }
                        NSPasteboard.general.clearContents()
                        NSPasteboard.general.setString(code, forType: .string)
                        manager.isCopied = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                            manager.hideAlert()
                        }
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: manager.isCopied ? "checkmark" : "doc.on.doc")
                                .font(.system(size: 10))
                            Text(manager.isCopied ? "Copied!" : "Copy")
                                .font(.system(size: 11, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.12))
                        .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                    .pointerCursor()

                    // Auto-Fill button
                    Button(action: {
                        guard let code = manager.currentAlert?.otpCode else { return }
                        manager.isAutoFilling = true
                        NotificationCenter.default.post(
                            name: NSNotification.Name("TriggerOtpAutoFill"),
                            object: nil,
                            userInfo: ["otpCode": code]
                        )
                    }) {
                        HStack(spacing: 4) {
                            if manager.isAutoFilling {
                                ProgressView()
                                    .controlSize(.mini)
                            } else {
                                Image(systemName: "wand.and.stars")
                                    .font(.system(size: 10))
                                Text("Auto-Fill")
                                    .font(.system(size: 11, weight: .semibold))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                        .background(DS.Colors.overlayCursorBlue)
                        .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                    .pointerCursor()
                    .disabled(manager.isAutoFilling)
                }
            }
            .padding(10)
        }
        .frame(width: 280, height: 96)
    }
}
