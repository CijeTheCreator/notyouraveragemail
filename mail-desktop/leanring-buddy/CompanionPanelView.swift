//
//  CompanionPanelView.swift
//  leanring-buddy
//
//  Modern Mail Companion menu bar panel view.
//  Clean, minimal, dark aesthetic showing Convex status, active inbox, and quick actions.
//

import AVFoundation
import Combine
import SwiftUI

struct CompanionPanelView: View {
    @ObservedObject var companionManager: CompanionManager
    @ObservedObject var convexService = ConvexService.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            panelHeader

            Divider()
                .background(DS.Colors.borderSubtle)
                .padding(.horizontal, 16)

            modernMailSection
                .padding(.top, 14)
                .padding(.horizontal, 16)

            Divider()
                .background(DS.Colors.borderSubtle)
                .padding(.horizontal, 16)
                .padding(.top, 14)

            instructionsSection
                .padding(.top, 12)
                .padding(.horizontal, 16)

            if !companionManager.allPermissionsGranted {
                Divider()
                    .background(DS.Colors.borderSubtle)
                    .padding(.horizontal, 16)
                    .padding(.top, 12)

                permissionsSection
                    .padding(.top, 12)
                    .padding(.horizontal, 16)
            }

            Spacer()
                .frame(height: 14)

            Divider()
                .background(DS.Colors.borderSubtle)
                .padding(.horizontal, 16)

            footerSection
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
        }
        .frame(width: 320)
        .background(panelBackground)
    }

    // MARK: - Header

    private var panelHeader: some View {
        HStack {
            HStack(spacing: 8) {
                Circle()
                    .fill(statusDotColor)
                    .frame(width: 8, height: 8)
                    .shadow(color: statusDotColor.opacity(0.6), radius: 4)

                Text("Modern Mail Companion")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(DS.Colors.textPrimary)
            }

            Spacer()

            Text(statusText)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(DS.Colors.textTertiary)

            Button(action: {
                NotificationCenter.default.post(name: .clickyDismissPanel, object: nil)
            }) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(DS.Colors.textTertiary)
                    .frame(width: 20, height: 20)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .pointerCursor()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Modern Mail Section

    private var modernMailSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("ACCOUNT & BACKEND")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(DS.Colors.textTertiary)
                Spacer()
                HStack(spacing: 4) {
                    Circle()
                        .fill(convexService.isConnected ? DS.Colors.success : Color.orange)
                        .frame(width: 6, height: 6)
                    Text(convexService.isConnected ? "Convex Live" : "Connecting...")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(convexService.isConnected ? DS.Colors.textSecondary : Color.orange)
                }
            }

            if !convexService.activeInboxId.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("LINKED INBOX")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(DS.Colors.textTertiary)

                    HStack {
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
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
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
                }
            } else {
                VStack(spacing: 8) {
                    HStack(spacing: 8) {
                        Image(systemName: "link.badge.plus")
                            .font(.system(size: 14))
                            .foregroundColor(DS.Colors.textTertiary)

                        Text("No account linked yet")
                            .font(.system(size: 12))
                            .foregroundColor(DS.Colors.textSecondary)

                        Spacer()
                    }

                    Button(action: {
                        if let url = URL(string: "http://localhost:3000/auth/companion") {
                            NSWorkspace.shared.open(url)
                        }
                    }) {
                        HStack(spacing: 6) {
                            Image(systemName: "safari")
                                .font(.system(size: 11))
                            Text("Sign In on Web to Link ↗")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(DS.Colors.overlayCursorBlue)
                        .cornerRadius(6)
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
    }

    // MARK: - Instructions Section

    private var instructionsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("QUICK ACTIONS")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(DS.Colors.textTertiary)

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Text("⌃⌥")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.white.opacity(0.12))
                        .cornerRadius(4)

                    Text("Hold to speak & draft mail with selected files")
                        .font(.system(size: 11))
                        .foregroundColor(DS.Colors.textSecondary)
                }

                HStack(spacing: 8) {
                    Text("🔐")
                        .font(.system(size: 11))
                    Text("Instant OTP alerts with auto-fill & copy")
                        .font(.system(size: 11))
                        .foregroundColor(DS.Colors.textSecondary)
                }

                Button(action: {
                    if companionManager.isOverlayVisible {
                        companionManager.setClickyCursorEnabled(false)
                    } else {
                        companionManager.setClickyCursorEnabled(true)
                    }
                }) {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(companionManager.isOverlayVisible ? DS.Colors.overlayCursorBlue : DS.Colors.textTertiary)
                            .frame(width: 7, height: 7)
                        Text(companionManager.isOverlayVisible ? "Cursor Buddy: Active (Click to Hide)" : "Cursor Buddy: Hidden (Click to Show)")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(companionManager.isOverlayVisible ? DS.Colors.textPrimary : DS.Colors.textTertiary)
                        Spacer()
                    }
                    .padding(.vertical, 4)
                    .padding(.horizontal, 6)
                    .background(companionManager.isOverlayVisible ? DS.Colors.overlayCursorBlue.opacity(0.12) : Color.white.opacity(0.04))
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)
                .pointerCursor()
            }
            .padding(10)
            .background(Color.white.opacity(0.03))
            .cornerRadius(8)
        }
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

    // MARK: - Footer

    private var footerSection: some View {
        HStack {
            Button(action: {
                relaunchApp()
            }) {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 10))
                    Text("Relaunch")
                        .font(.system(size: 11))
                }
                .foregroundColor(DS.Colors.textTertiary)
            }
            .buttonStyle(.plain)
            .pointerCursor()

            Spacer()

            Button(action: {
                NSApplication.shared.terminate(nil)
            }) {
                Text("Quit")
                    .font(.system(size: 11))
                    .foregroundColor(DS.Colors.textTertiary)
            }
            .buttonStyle(.plain)
            .pointerCursor()
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

    private var statusDotColor: Color {
        if !companionManager.isOverlayVisible {
            return DS.Colors.textTertiary
        }
        switch companionManager.voiceState {
        case .idle:
            return DS.Colors.success
        case .listening, .processing, .responding:
            return DS.Colors.blue400
        }
    }

    private var statusText: String {
        if !companionManager.allPermissionsGranted {
            return "Permissions"
        }
        if !companionManager.isOverlayVisible {
            return "Ready"
        }
        switch companionManager.voiceState {
        case .idle:
            return "Active"
        case .listening:
            return "Listening"
        case .processing:
            return "Processing"
        case .responding:
            return "Responding"
        }
    }
}
