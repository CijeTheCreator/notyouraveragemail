//
//  leanring_buddyApp.swift
//  leanring-buddy
//
//  Menu bar-only companion app. No dock icon, no main window — just an
//  always-available status item in the macOS menu bar. Clicking the icon
//  opens a floating panel with companion voice controls.
//

import ServiceManagement
import SwiftUI
import Sparkle

@main
struct MailBuddyApp: App {
    @NSApplicationDelegateAdaptor(CompanionAppDelegate.self) var appDelegate

    var body: some Scene {
        // The app lives entirely in the menu bar panel managed by the AppDelegate.
        // This empty Settings scene satisfies SwiftUI's requirement for at least
        // one scene but is never shown (LSUIElement=true removes the app menu).
        Settings {
            EmptyView()
                .onOpenURL { url in
                    appDelegate.handleDeepLink(url)
                }
        }
    }
}

/// Manages the companion lifecycle: creates the menu bar panel and starts
/// the companion voice pipeline on launch.
@MainActor
final class CompanionAppDelegate: NSObject, NSApplicationDelegate {
    private var menuBarPanelManager: MenuBarPanelManager?
    private let companionManager = CompanionManager()
    private var sparkleUpdaterController: SPUStandardUpdaterController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        print("🎯 MailBuddy: Starting...")
        print("🎯 MailBuddy: Version \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown")")

        UserDefaults.standard.register(defaults: ["NSInitialToolTipDelay": 0])

        MailBuddyAnalytics.configure()
        MailBuddyAnalytics.trackAppOpened()

        menuBarPanelManager = MenuBarPanelManager(companionManager: companionManager)
        companionManager.hasCompletedOnboarding = true
        UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
        companionManager.start()
        // Auto-open the panel if permissions are still needed
        if !companionManager.allPermissionsGranted {
            menuBarPanelManager?.showPanelOnLaunch()
        }
        registerAsLoginItemIfNeeded()

        // Register for modernmail:// and notyouraveragemail:// deep links
        NSAppleEventManager.shared().setEventHandler(
            self,
            andSelector: #selector(handleGetURLEvent(_:withReplyEvent:)),
            forEventClass: AEEventClass(kInternetEventClass),
            andEventID: AEEventID(kAEGetURL)
        )
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        for url in urls {
            handleDeepLink(url)
        }
    }

    @objc func handleGetURLEvent(_ event: NSAppleEventDescriptor, withReplyEvent replyEvent: NSAppleEventDescriptor) {
        if let urlString = event.paramDescriptor(forKeyword: AEKeyword(keyDirectObject))?.stringValue,
           let url = URL(string: urlString) {
            handleDeepLink(url)
        }
    }

    func handleDeepLink(_ url: URL) {
        print("🔗 Deep link received: \(url.absoluteString)")
        guard let scheme = url.scheme?.lowercased(),
              scheme == "notyouraveragemail" || scheme == "modernmail" else {
            return
        }

        let host = url.host?.lowercased() ?? ""
        let path = url.path.lowercased()
        guard host == "connect" || path.contains("connect") else { return }

        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let inboxItem = components.queryItems?.first(where: { $0.name == "inboxId" }),
           let inboxId = inboxItem.value, !inboxId.isEmpty {
            DispatchQueue.main.async {
                ConvexService.shared.activeInboxId = inboxId
                ConvexService.shared.startPolling { [weak self] newOtp in
                    self?.companionManager.handleNewOtpArrival(newOtp)
                }
                self.menuBarPanelManager?.showPanel()
            }
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        companionManager.stop()
    }

    /// Registers the app as a login item so it launches automatically on
    /// startup. Uses SMAppService which shows the app in System Settings >
    /// General > Login Items, letting the user toggle it off if they want.
    private func registerAsLoginItemIfNeeded() {
        let loginItemService = SMAppService.mainApp
        if loginItemService.status != .enabled {
            do {
                try loginItemService.register()
                print("🎯 MailBuddy: Registered as login item")
            } catch {
                print("⚠️ MailBuddy: Failed to register as login item: \(error)")
            }
        }
    }

    private func startSparkleUpdater() {
        let updaterController = SPUStandardUpdaterController(
            startingUpdater: false,
            updaterDelegate: nil,
            userDriverDelegate: nil
        )
        self.sparkleUpdaterController = updaterController

        do {
            try updaterController.updater.start()
        } catch {
            print("⚠️ MailBuddy: Sparkle updater failed to start: \(error)")
        }
    }
}
