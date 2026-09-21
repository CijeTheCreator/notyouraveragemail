//
//  CompanionPanelView.swift
//  leanring-buddy
//
//  Modern Mail Companion menu bar panel view.
//  Clean, minimal dark aesthetic.
//

import AVFoundation
import Combine
import SwiftUI

struct CompanionPanelView: View {
    @ObservedObject var companionManager: CompanionManager
    @ObservedObject var convexService = ConvexService.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            panelHeader

            linkedInboxCard

            figmaCard

            settingsTogglesList

            if !companionManager.allPermissionsGranted {
                Divider()
                    .background(DS.Colors.borderSubtle)
                    .padding(.vertical, 2)

                permissionsSection
            }
        }
        .padding(14)
        .frame(width: 300)
        .background(panelBackground)
    }

    // MARK: - Header

    private var panelHeader: some View {
        HStack {
            Button(action: {
                NSApplication.shared.terminate(nil)
            }) {
                HStack(spacing: 4) {
                    Image(systemName: "power")
                        .font(.system(size: 10, weight: .medium))
                    Text("Quit")
                        .font(.system(size: 11, weight: .medium))
                }
                .foregroundColor(DS.Colors.textTertiary)
            }
            .buttonStyle(.plain)
            .pointerCursor()

            Spacer()

            Button(action: {
                NotificationCenter.default.post(name: .mailBuddyDismissPanel, object: nil)
            }) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(DS.Colors.textTertiary)
                    .frame(width: 18, height: 18)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .pointerCursor()
        }
    }

    // MARK: - Linked Inbox Card

    @ViewBuilder
    private var linkedInboxCard: some View {
        if !convexService.activeInboxId.isEmpty {
            HStack(spacing: 8) {
                Image(systemName: "envelope.badge.shield.half.filled")
                    .font(.system(size: 13))
                    .foregroundColor(DS.Colors.overlayCursorBlue)

                Text(convexService.activeInboxId)
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundColor(DS.Colors.textPrimary)
                    .lineLimit(1)
                    .truncationMode(.middle)

                Spacer()

                Button(action: {
                    convexService.activeInboxId = ""
                    convexService.isConnected = false
                }) {
                    Text("Unlink")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(DS.Colors.textTertiary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(4)
                }
                .buttonStyle(.plain)
                .pointerCursor()
            }
            .padding(10)
            .background(Color.white.opacity(0.04))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(DS.Colors.borderSubtle, lineWidth: 0.5)
            )
        } else {
            HStack(spacing: 8) {
                Image(systemName: "envelope")
                    .font(.system(size: 13))
                    .foregroundColor(DS.Colors.textTertiary)

                Text("No account linked yet")
                    .font(.system(size: 12))
                    .foregroundColor(DS.Colors.textSecondary)

                Spacer()

                Button(action: {
                    if let url = URL(string: "\(convexService.siteURL)/auth/companion") {
                        NSWorkspace.shared.open(url)
                    }
                }) {
                    Text("Connect")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(DS.Colors.overlayCursorBlue)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(DS.Colors.overlayCursorBlue.opacity(0.15))
                        .cornerRadius(4)
                }
                .buttonStyle(.plain)
                .pointerCursor()
            }
            .padding(10)
            .background(Color.white.opacity(0.04))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(DS.Colors.borderSubtle, lineWidth: 0.5)
            )
        }
    }

    // MARK: - Figma Card

    private func openFigmaConnect() {
        let encoded = convexService.activeInboxId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "\(convexService.siteURL)/api/auth/figma/start?inboxId=\(encoded)") {
            NSWorkspace.shared.open(url)
        }
    }

    @ViewBuilder
    private var figmaCard: some View {
        if let status = convexService.figmaStatus, status.connected {
            HStack(spacing: 8) {
                Image("figma-logo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 14, height: 14)

                Text(status.figmaHandle ?? status.figmaEmail ?? "Figma Connected")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(DS.Colors.textPrimary)
                    .lineLimit(1)
                    .truncationMode(.middle)

                Spacer()

                if status.isGlobal != true {
                    Button(action: { convexService.disconnectFigma() }) {
                        Text("Unlink")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(DS.Colors.textTertiary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(4)
                    }
                    .buttonStyle(.plain)
                    .pointerCursor()
                }
            }
            .padding(10)
            .background(Color.white.opacity(0.04))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(DS.Colors.borderSubtle, lineWidth: 0.5)
            )
        } else {
            HStack(spacing: 8) {
                Image("figma-logo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 14, height: 14)

                Text("Figma")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(DS.Colors.textSecondary)

                Spacer()

                Button(action: openFigmaConnect) {
                    Text("Connect")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(convexService.activeInboxId.isEmpty ? DS.Colors.textTertiary : DS.Colors.overlayCursorBlue)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(convexService.activeInboxId.isEmpty ? Color.white.opacity(0.06) : DS.Colors.overlayCursorBlue.opacity(0.15))
                        .cornerRadius(4)
                }
                .buttonStyle(.plain)
                .pointerCursor()
                .disabled(convexService.activeInboxId.isEmpty)
            }
            .padding(10)
            .background(Color.white.opacity(0.04))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(DS.Colors.borderSubtle, lineWidth: 0.5)
            )
        }
    }

    // MARK: - Native iOS/macOS Toggle Switches

    private var settingsTogglesList: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Cursor Buddy")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(DS.Colors.textPrimary)

                Spacer()

                Toggle("", isOn: Binding(
                    get: { companionManager.isMailBuddyCursorEnabled },
                    set: { companionManager.setMailBuddyCursorEnabled($0) }
                ))
                .labelsHidden()
                .toggleStyle(SwitchToggleStyle(tint: DS.Colors.overlayCursorBlue))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)

            Divider()
                .background(DS.Colors.borderSubtle)
                .padding(.horizontal, 6)

            HStack {
                Text("Instant OTP Alerts")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(DS.Colors.textPrimary)

                Spacer()

                Toggle("", isOn: Binding(
                    get: { companionManager.isOtpAlertsEnabled },
                    set: { companionManager.setOtpAlertsEnabled($0) }
                ))
                .labelsHidden()
                .toggleStyle(SwitchToggleStyle(tint: DS.Colors.overlayCursorBlue))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
        }
        .background(Color.white.opacity(0.04))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(DS.Colors.borderSubtle, lineWidth: 0.5)
        )
    }

    // MARK: - Permissions Section

    private var permissionsSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("PERMISSIONS NEEDED")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(DS.Colors.warning)

            if !companionManager.hasAccessibilityPermission {
                permissionRow(title: "Accessibility", icon: "hand.raised", isGranted: false) {
                    WindowPositionManager.requestAccessibilityPermission()
                }
            }

            if !companionManager.hasScreenRecordingPermission {
                permissionRow(title: "Screen Recording", icon: "rectangle.dashed.badge.record", isGranted: false) {
                    WindowPositionManager.requestScreenRecordingPermission()
                }
            }

            if !companionManager.hasMicrophonePermission {
                permissionRow(title: "Microphone", icon: "mic", isGranted: false) {
                    AVCaptureDevice.requestAccess(for: .audio) { _ in }
                }
            }

            Button(action: {
                relaunchApp()
            }) {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 11, weight: .semibold))
                    Text("Restart Companion to Apply")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 7)
                .background(Color.white.opacity(0.12))
                .cornerRadius(6)
            }
            .buttonStyle(.plain)
            .pointerCursor()
            .padding(.top, 4)
        }
    }

    private func permissionRow(title: String, icon: String, isGranted: Bool, action: @escaping () -> Void) -> some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: 11))
                .foregroundColor(isGranted ? DS.Colors.success : DS.Colors.warning)
                .frame(width: 14)

            Text(title)
                .font(.system(size: 12))
                .foregroundColor(DS.Colors.textSecondary)

            Spacer()

            Button(action: action) {
                Text(isGranted ? "Granted" : "Grant")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(isGranted ? DS.Colors.success : .white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(isGranted ? Color.clear : DS.Colors.accent)
                    .cornerRadius(4)
            }
            .buttonStyle(.plain)
            .pointerCursor()
            .disabled(isGranted)
        }
    }

    private func relaunchApp() {
        let appURL = Bundle.main.bundleURL
        let config = NSWorkspace.OpenConfiguration()
        NSWorkspace.shared.openApplication(at: appURL, configuration: config) { _, _ in
            DispatchQueue.main.async {
                NSApp.terminate(nil)
            }
        }
    }

    // MARK: - Visual Helpers

    private var panelBackground: some View {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(DS.Colors.background)
            .shadow(color: Color.black.opacity(0.5), radius: 20, x: 0, y: 10)
            .shadow(color: Color.black.opacity(0.3), radius: 4, x: 0, y: 2)
    }
}
