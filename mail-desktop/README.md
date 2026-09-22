# NotYourAverageMail Desktop Companion — MailBuddy (`mail-desktop`) ⚡

An AI mail companion that lives as a buddy next to your cursor on macOS. Enhanced from **Clicky**, retaining its dark aesthetic and transparent cursor overlay, integrated with **NotYourAverageMail's Convex backend** and **OpenAI** (Computer Use + LLM drafting with `gpt-5-nano` & real-time live streaming transcription with `gpt-live-transcribe`).

---

## 🌟 Key Features

1. **Hybrid File Selection & Instant Background Composition**:
   - Highlight files in **Finder** or on your **Desktop**.
   - Press `ctrl + option` (or hold push-to-talk) and say: *"Send these files to Alex saying the invoice is attached"*.
   - In <10ms, the companion captures the exact selected files via native AppleScript without API latency.
   - The buddy cursor displays `✍️ Drafting with OpenAI...` while `gpt-5-nano` generates a structured draft asynchronously in Convex.
   - When ready, a native macOS **Top-Right Compose HUD** slides in with:
     - Recipient, Subject, Body preview, and attached file chips.
     - **Approve**: Dispatches the email immediately via Convex.
     - **Edit**: Inline in-place text editing for subject, body, or recipient.
     - **Reject**: Dismisses the draft.

2. **Real-time Inbound OTP Awareness & OpenAI Computer Use Auto-Fill**:
   - Modern Mail's Convex backend extracts `otpCode` upon inbound email receipt.
   - The desktop client maintains a real-time reactive subscription to Convex.
   - When an OTP arrives, the buddy awakens near your cursor with a glowing alert badge:
     ```
     ┌────────────────────────────────────┐
     │ 🔐 Verification Code: 625136       │
     │ [Auto-Fill]           [Copy]   [✕] │
     └────────────────────────────────────┘
     ```
   - **Copy**: Copies the 6 digits to the macOS clipboard.
   - **Auto-Fill**:
     - Captures a screen snapshot via ScreenCaptureKit.
     - Calls Convex action `companion:detectOtpCoordinates` powered by OpenAI Computer Use API (`gpt-5.6-sol`).
     - Cursor buddy flies along a smooth bezier arc directly to the verification code field.
     - Synthesizes a mouse click to focus the input.
     - Types the 6 digits into the field safely.

---

## 🏗 Project Structure

```
mail-desktop/
├── MailBuddy/
│   ├── ConvexService.swift             # Real-time Convex query & action client
│   ├── FinderFileSelectionHelper.swift # <10ms AppleScript Finder selection grabber
│   ├── ComposeHUDWindow.swift          # Top-right native Compose HUD (Approve/Edit/Reject)
│   ├── OtpAlertOverlayPanel.swift      # Floating OTP alert card with Auto-Fill & Copy
│   ├── CompanionManager.swift          # Core state machine & synthetic event dispatcher
│   ├── CompanionPanelView.swift        # Menu bar dropdown & inbox handle setting
│   ├── OverlayWindow.swift             # Transparent full-screen cursor overlay
│   └── ...
└── MailBuddy.xcodeproj                 # Xcode project (SwiftUI / AppKit)
```

---

## 🚀 Getting Started

### 1. Backend (Convex)
Ensure the Convex dev deployment has the companion functions ready:
```bash
cd ../mail-web
npx convex dev --once --typecheck=disable
```

### 2. Build & Run Desktop App
1. Open the project in Xcode:
   ```bash
   open mail-desktop/MailBuddy.xcodeproj
   ```
2. In Xcode:
   - Select the `MailBuddy` scheme.
   - Ensure your personal signing team is selected under **Signing & Capabilities**.
   - Press **Cmd + R** to build and run.
3. Grant macOS permissions when prompted:
   - **Accessibility**: for global hotkey (`ctrl + option`) and auto-fill synthetic clicks/typing.
   - **Screen Recording**: for ScreenCaptureKit screen analysis.
   - **Microphone**: for push-to-talk voice commands.
4. Click the menu bar icon to confirm your active inbox handle (e.g. `alex@agentmail.to`).
