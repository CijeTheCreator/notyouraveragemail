//
//  ConvexService.swift
//  leanring-buddy
//
//  Client for Modern Mail's Convex backend.
//  Subscribes to live OTP alerts and runs AI actions (drafting, Computer Use coordinate detection, email sending).
//

import Foundation
import Combine
import ConvexMobile

struct OtpAlertItem: Codable, Identifiable, Equatable {
    var id: String { messageId }
    let messageId: String
    let fromName: String
    let fromEmail: String
    let subject: String
    let otpCode: String
    let timestamp: String
    let isRead: Bool
}

struct LiveAlertsResponse: Codable {
    let otpAlerts: [OtpAlertItem]
    let latestOtp: OtpAlertItem?
    let unreadCount: Double?
}

/// Mirrors the return value of `figma:getFigmaConnectionStatus`.
struct FigmaConnectionStatus: Codable, Equatable {
    let connected: Bool
    let figmaHandle: String?
    let figmaEmail: String?
    let isGlobal: Bool?
}

struct AttachmentItem: Codable, Equatable, Identifiable {
    var id: String { path.isEmpty ? storageId : path }
    var storageId: String
    var name: String
    var sizeBytes: Int64
    var path: String
}

struct EmailDraft: Codable, Equatable {
    var to: String
    var subject: String
    var body: String
    var attachedFiles: [String]
    var attachments: [AttachmentItem]?
    /// Server-side warning to show in the HUD (e.g. a Figma rate limit that blocked a PDF export).
    var notice: String?
}

struct OtpCoordinatesResponse: Codable {
    let found: Bool
    let screenX: Int
    let screenYTopLeft: Int
    let screenYBottomLeft: Int
    let confidence: Double?
    let description: String?
}

@MainActor
final class ConvexService: ObservableObject {
    static let shared = ConvexService()

    @Published var deploymentURL: String {
        didSet {
            UserDefaults.standard.set(deploymentURL, forKey: "convex_deployment_url")
            reconnectClient()
        }
    }

    @Published var activeInboxId: String {
        didSet {
            UserDefaults.standard.set(activeInboxId, forKey: "active_inbox_id")
            restartActiveSubscription()
        }
    }

    @Published var siteURL: String {
        didSet {
            UserDefaults.standard.set(siteURL, forKey: "convex_site_url")
        }
    }

    @Published var isConnected: Bool = false
    @Published var lastDetectedOtp: OtpAlertItem?
    @Published var activeDraft: EmailDraft?
    @Published var figmaStatus: FigmaConnectionStatus?

    private var convexClient: ConvexClient?
    private var liveAlertsCancellable: AnyCancellable?
    private var figmaStatusCancellable: AnyCancellable?
    private var webSocketStateCancellable: AnyCancellable?
    private var savedOnNewOtp: ((OtpAlertItem) -> Void)?
    private var knownOtpCodes = Set<String>()
    private var isInitialSnapshot = true
    private let session = URLSession.shared

    init() {
        self.deploymentURL = UserDefaults.standard.string(forKey: "convex_deployment_url") ?? "https://steady-ram-494.convex.cloud"
        self.siteURL = UserDefaults.standard.string(forKey: "convex_site_url") ?? "https://steady-ram-494.convex.site"
        self.activeInboxId = UserDefaults.standard.string(forKey: "active_inbox_id") ?? ""
        let savedKnown = UserDefaults.standard.stringArray(forKey: "known_otp_message_ids") ?? []
        self.knownOtpCodes = Set(savedKnown)
        setupClient()
        startFigmaStatusSubscription()
    }

    private func setupClient() {
        let client = ConvexClient(deploymentUrl: deploymentURL)
        self.convexClient = client

        webSocketStateCancellable = client.watchWebSocketState()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                guard let self = self else { return }
                self.isConnected = (state == .connected)
            }
    }

    private func reconnectClient() {
        stopSubscription()
        setupClient()
        startFigmaStatusSubscription()
        if let onNewOtp = savedOnNewOtp {
            startSubscription(onNewOtp: onNewOtp)
        }
    }

    private func restartActiveSubscription() {
        startFigmaStatusSubscription()
        if let onNewOtp = savedOnNewOtp {
            startSubscription(onNewOtp: onNewOtp)
        }
    }

    // MARK: - Figma Connection Status

    /// Live subscription to `figma:getFigmaConnectionStatus`, so the panel flips to
    /// "Connected" the moment the OAuth callback saves the connection.
    private func startFigmaStatusSubscription() {
        figmaStatusCancellable?.cancel()
        figmaStatusCancellable = nil
        figmaStatus = nil

        guard !activeInboxId.isEmpty, let client = convexClient else { return }

        let publisher: AnyPublisher<FigmaConnectionStatus, ClientError> = client.subscribe(
            to: "figma:getFigmaConnectionStatus",
            with: ["inboxId": activeInboxId]
        )

        figmaStatusCancellable = publisher
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { completion in
                if case .failure(let error) = completion {
                    print("⚠️ [ConvexService] Figma status subscription error: \(error)")
                }
            }, receiveValue: { [weak self] status in
                self?.figmaStatus = status
            })
    }

    func disconnectFigma() {
        guard !activeInboxId.isEmpty,
              let url = URL(string: "\(deploymentURL)/api/mutation") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "path": "figma:disconnectFigma",
            "args": ["inboxId": activeInboxId]
        ]
        guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        request.httpBody = body

        Task {
            _ = try? await session.data(for: request)
        }
    }

    // MARK: - Real-time WebSocket Subscription

    /// Starts real-time WebSocket subscription to live alerts
    func startSubscription(onNewOtp: @escaping (OtpAlertItem) -> Void) {
        self.savedOnNewOtp = onNewOtp
        liveAlertsCancellable?.cancel()
        liveAlertsCancellable = nil

        guard !activeInboxId.isEmpty else { return }
        guard let client = convexClient else {
            setupClient()
            return
        }

        print("⚡️ [ConvexService] Subscribing via WebSocket to companion:getLiveAlerts for \(activeInboxId)")

        self.isInitialSnapshot = true

        let publisher: AnyPublisher<LiveAlertsResponse, ClientError> = client.subscribe(
            to: "companion:getLiveAlerts",
            with: ["inboxId": activeInboxId]
        )

        liveAlertsCancellable = publisher
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { completion in
                if case .failure(let error) = completion {
                    print("⚠️ [ConvexService] Live alerts subscription error: \(error)")
                }
            }, receiveValue: { [weak self] alerts in
                guard let self = self else { return }
                self.isConnected = true

                if self.isInitialSnapshot {
                    self.isInitialSnapshot = false
                    // Seed existing OTP message IDs so historical alerts never fire upon app launch
                    for alert in alerts.otpAlerts {
                        self.knownOtpCodes.insert(alert.messageId)
                    }
                    UserDefaults.standard.set(Array(self.knownOtpCodes), forKey: "known_otp_message_ids")
                    return
                }

                if let latest = alerts.latestOtp {
                    if !self.knownOtpCodes.contains(latest.messageId) {
                        self.knownOtpCodes.insert(latest.messageId)
                        UserDefaults.standard.set(Array(self.knownOtpCodes), forKey: "known_otp_message_ids")
                        self.lastDetectedOtp = latest
                        onNewOtp(latest)
                    }
                }
            })
    }

    func stopSubscription() {
        liveAlertsCancellable?.cancel()
        liveAlertsCancellable = nil
    }

    // Backward compatibility aliases for existing caller sites
    func startPolling(interval: TimeInterval = 3.0, onNewOtp: @escaping (OtpAlertItem) -> Void) {
        startSubscription(onNewOtp: onNewOtp)
    }

    func stopPolling() {
        stopSubscription()
    }

    // MARK: - Actions

    /// Generates a storage upload URL from Convex mutation companion:generateUploadUrl
    func generateUploadUrl() async throws -> String {
        guard let url = URL(string: "\(deploymentURL)/api/mutation") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "path": "companion:generateUploadUrl",
            "args": [:]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, _) = try await session.data(for: request)

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let uploadUrl = json["value"] as? String else {
            throw NSError(domain: "ConvexService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to obtain upload URL from Convex"])
        }

        return uploadUrl
    }

    /// Uploads a local file to Convex storage and returns its storageId
    func uploadFileToConvex(fileURL: URL) async throws -> String {
        let uploadEndpoint = try await generateUploadUrl()
        guard let targetURL = URL(string: uploadEndpoint) else {
            throw URLError(.badURL)
        }

        let fileData = try Data(contentsOf: fileURL)
        var request = URLRequest(url: targetURL)
        request.httpMethod = "POST"
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        request.httpBody = fileData

        let (data, response) = try await session.data(for: request)
        guard let httpRes = response as? HTTPURLResponse, (200...299).contains(httpRes.statusCode) else {
            throw NSError(domain: "ConvexService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Convex storage file upload failed"])
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let storageId = json["storageId"] as? String else {
            throw NSError(domain: "ConvexService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Missing storageId in upload response"])
        }

        return storageId
    }

    /// Calls Convex action to draft email with OpenAI and attaches fileIds
    func draftEmail(prompt: String, fileNames: [String], fileIds: [AttachmentItem] = [], screenContext: String? = nil) async throws -> EmailDraft {
        guard let url = URL(string: "\(deploymentURL)/api/action") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let fileIdsPayload: [[String: Any]] = fileIds.map { item in
            [
                "storageId": item.storageId,
                "name": item.name,
                "sizeBytes": item.sizeBytes,
                "path": item.path
            ]
        }

        var args: [String: Any] = [
            "inboxId": activeInboxId,
            "prompt": prompt,
            "fileNames": fileNames,
            "fileIds": fileIdsPayload
        ]
        if let screenContext = screenContext {
            args["screenContext"] = screenContext
        }

        let payload: [String: Any] = [
            "path": "companion:draftEmail",
            "args": args
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, _) = try await session.data(for: request)

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let value = json["value"] as? [String: Any] else {
            throw NSError(domain: "ConvexService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid drafting response from Convex"])
        }

        var parsedAttachments: [AttachmentItem] = []
        if let rawAttachments = (value["selectedAttachments"] ?? value["attachments"] ?? value["fileIds"]) as? [[String: Any]] {
            for item in rawAttachments {
                let storageId = item["storageId"] as? String ?? ""
                let name = item["name"] as? String ?? ""
                let sizeBytes = (item["sizeBytes"] as? NSNumber)?.int64Value ?? 0
                let path = item["path"] as? String ?? ""
                parsedAttachments.append(AttachmentItem(
                    storageId: storageId,
                    name: name,
                    sizeBytes: sizeBytes,
                    path: path
                ))
            }
        } else {
            parsedAttachments = fileIds
        }

        let attachedFilePaths = (value["attachedFiles"] as? [String]) ?? parsedAttachments.map { $0.path.isEmpty ? $0.name : $0.path }

        let draft = EmailDraft(
            to: value["to"] as? String ?? "",
            subject: value["subject"] as? String ?? "New Message",
            body: value["body"] as? String ?? prompt,
            attachedFiles: attachedFilePaths,
            attachments: parsedAttachments,
            notice: (value["notice"] as? String).flatMap { $0.isEmpty ? nil : $0 }
        )
        self.activeDraft = draft
        return draft
    }

    /// Calls Convex action to locate OTP input coordinates via OpenAI Computer Use
    func detectOtpCoordinates(
        screenshotBase64: String,
        displayWidth: Int,
        displayHeight: Int,
        screenshotWidth: Int? = nil,
        screenshotHeight: Int? = nil
    ) async throws -> OtpCoordinatesResponse {
        guard let url = URL(string: "\(deploymentURL)/api/action") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var args: [String: Any] = [
            "screenshotBase64": screenshotBase64,
            "displayWidth": displayWidth,
            "displayHeight": displayHeight
        ]
        if let screenshotWidth = screenshotWidth, let screenshotHeight = screenshotHeight {
            args["screenshotWidth"] = screenshotWidth
            args["screenshotHeight"] = screenshotHeight
        }

        let payload: [String: Any] = [
            "path": "companion:detectOtpCoordinates",
            "args": args
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, _) = try await session.data(for: request)

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let value = json["value"] as? [String: Any] else {
            throw NSError(domain: "ConvexService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid coordinate response from Convex"])
        }

        let valueData = try JSONSerialization.data(withJSONObject: value)
        return try JSONDecoder().decode(OtpCoordinatesResponse.self, from: valueData)
    }

    /// Fetches an OpenAI Realtime authorization token minted by Convex
    func fetchTranscribeToken() async throws -> String {
        guard let url = URL(string: "\(deploymentURL)/api/action") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "path": "companion:createTranscribeToken",
            "args": [String: Any]()
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, _) = try await session.data(for: request)

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let value = json["value"] as? [String: Any] else {
            let body = String(data: data, encoding: .utf8) ?? "unknown"
            throw NSError(domain: "ConvexService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid transcription token response from Convex: \(body)"])
        }

        if let errorMessage = value["error"] as? String, !errorMessage.isEmpty {
            throw NSError(domain: "ConvexService", code: -2, userInfo: [NSLocalizedDescriptionKey: errorMessage])
        }

        guard let token = value["token"] as? String, !token.isEmpty else {
            throw NSError(domain: "ConvexService", code: -3, userInfo: [NSLocalizedDescriptionKey: "Convex returned no transcription token."])
        }

        return token
    }

    /// Sends an approved email via Convex action
    func sendApprovedEmail(draft: EmailDraft) async throws -> Bool {
        guard let url = URL(string: "\(deploymentURL)/api/action") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var sendArgs: [String: Any] = [
            "inboxId": activeInboxId,
            "to": draft.to,
            "subject": draft.subject,
            "body": draft.body
        ]

        // Only attachments already uploaded to Convex storage can be sent.
        let uploadedAttachments = (draft.attachments ?? [])
            .filter { !$0.storageId.isEmpty }
            .map { ["storageId": $0.storageId, "name": $0.name] }
        if !uploadedAttachments.isEmpty {
            sendArgs["attachments"] = uploadedAttachments
        }

        let payload: [String: Any] = [
            "path": "companion:sendApprovedEmail",
            "args": sendArgs
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await session.data(for: request)

        guard let httpRes = response as? HTTPURLResponse, (200...299).contains(httpRes.statusCode) else {
            throw NSError(domain: "ConvexService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to send email via Convex"])
        }

        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        return json?["status"] as? String != "error"
    }

    /// Marks an OTP message as read once processed
    func markOtpAsRead(messageId: String) {
        guard let url = URL(string: "\(deploymentURL)/api/action") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "path": "companion:markOtpAsRead",
            "args": [
                "inboxId": activeInboxId,
                "messageId": messageId
            ]
        ]

        guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        request.httpBody = body

        Task {
            _ = try? await session.data(for: request)
        }
    }
}
