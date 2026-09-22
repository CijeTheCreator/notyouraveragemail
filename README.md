# NotYourAverageMail ⚡

> Autonomous AI mail client and native macOS MailBuddy companion featuring one-click subscription cancellation, 760+ data broker privacy removal, Trustpilot sender reputation, screen-aware OTP auto-fill, and voice/contextual email drafting. Built for the **Convex All Gas Hackathon**.

- **Live Application:** [https://steady-ram-494.convex.site](https://steady-ram-494.convex.site)
- **Convex Deployment:** [https://steady-ram-494.convex.cloud](https://steady-ram-494.convex.cloud)
- **Install Desktop Companion:** `curl -fsSL https://steady-ram-494.convex.site/install.sh | bash`

---

## 🚀 Overview

**NotYourAverageMail** reimagines email as an active mission-runner rather than a passive chronological inbox. Traditional webmail sits idly while subscriptions silently renew, data brokers sell your personal address, and authentication codes clutter your reading pane.

Powered by **Convex**, **OpenAI**, **Firecrawl**, and **AgentMail**, NotYourAverageMail combines a sleek architectural web client with a native macOS cursor companion (**MailBuddy**) to run autonomous workflows:

1. **Autonomous Subscription Cancellation**: Cancels paid subscriptions in the background using `@convex-dev/agent` with OpenAI and interactive Firecrawl sessions, resolving magic links and OTPs from your inbox, and capturing screenshot proof.
2. **Autonomous Data Broker Privacy Removal (Eraser)**: Dispatches automated opt-out requests across a catalog of 760+ data brokers and verifies deletion with proof screenshots stored in Convex.
3. **Public Cancelling & Opt-Out Skills Engine**: Synthesizes real-world execution traces into structured, procedural Playwright workflows exposed via public CORS HTTP APIs and external agent skills (`/Unsub skill`, `/Opt-out skill`).
4. **Live Sender Trust Ratings**: Scrapes Trustpilot via Firecrawl in real time, displaying verified TrustScores, customer complaints, and down-ranking suspicious senders in your inbox.
5. **MailBuddy Native Desktop Companion**: Lives beside your cursor on macOS, automatically detecting incoming 2FA/OTPs, locating the code input on your screen with OpenAI Computer Use, and auto-typing the digits. Also provides `⌘⇧M` contextual drafting from Pages, Keynote, Figma, or your browser, plus `⌃⌥` push-to-talk voice dictation over OpenAI Realtime WebSockets.

---

## 🏗 System Architecture

```
                                ┌────────────────────────┐
                                │       AgentMail        │
                                │  (Inbound / Outbound)  │
                                └───────────┬────────────┘
                                            │
                                Webhook / API Message Sync
                                            │
                                            ▼
                                ┌────────────────────────┐
                                │      Convex Cloud      │
                                │  • Reactive Database   │
                                │  • @convex-dev/agent   │
                                │  • Pipeline Scheduler  │
                                │  • File Storage (ctx)  │
                                │  • Convex Auth Engine  │
                                │  • Static Hosting      │
                                └───────┬────────┬───────┘
                                        │        │
            ctx.scheduler.runAfter(0)   │        │ Real-Time WebSocket Subscriptions
                                        │        │
                                        ▼        ▼
 ┌─────────────────────────────────────────┐  ┌──────────────────────────────────────────┐
 │    Autonomous Agent Pipeline & Web      │  │        Next.js Client (mail-web)         │
 │  • Firecrawl Interactive Scrape (/v2)   │  │  • Architectural Grid UI & Dark Theme   │
 │  • OpenAI gpt-5-nano Agent Reasoning    │  │  • Real-Time Reactive Inbox Sync         │
 │  • 760+ Data Broker Eraser Engine       │  │  • TrustScore Badges & Popovers          │
 │  • Public /Unsub & /Opt-out Skill APIs  │  │  • Subscriptions & Data Removal Views    │
 └─────────────────────────────────────────┘  │  • Interactive Judges Testing Panel      │
                                              └──────────────────▲───────────────────────┘
                                                                 │
                                                      ConvexMobile Swift SDK (WS)
                                                                 │
 ┌─────────────────────────────────────────┐  ┌──────────────────┴───────────────────────┐
 │       Test Simulators (Local/Live)      │  │      macOS MailBuddy (mail-desktop)      │
 │  • test-subscription (NotReallyAdobe)   │  │  • Cursor Buddy Overlay & Smooth Bézier  │
 │  • test-removal (Test Data Broker)      │  │  • Screen-Aware OTP Auto-Fill (CGEvent)  │
 │  • Local OTP Insertion Test Harness     │  │  • Contextual Drafting (⌘⇧M)             │
 └─────────────────────────────────────────┘  │  • OpenAI Realtime Voice Push-To-Talk    │
                                              └──────────────────────────────────────────┘
```

---

## ✨ Key Features

### 1. Modern Architectural Web Interface (`mail-web`)
- **Architectural Grid Design**: High-contrast, clean container grid lines, boundary crosshairs, and corner brackets inspired by Firecrawl's design system with monospace metrics and dark theme.
- **Real-Time Reactive Updates**: Subscribes directly to Convex database queries over WebSockets (`useQuery(api.messages.list, ...)`), delivering instant updates with zero client polling.
- **Priority Inbox Sorting**: Intelligently ranks messages using Trustpilot TrustScores, sender reputation, and priority signals (`⚡ Priority`, `🕒 Newest First`, `⏳ Oldest First`).
- **Interactive Judges Panel**: Rainbow trigger button in the navigation bar opening a testing drawer with live one-click actions: trigger Adobe subscription cancellation, dispatch data broker removal, or test local OTP injection.

### 2. Autonomous Subscription Cancellation & Skills Engine
- **Autonomous Cancellation Agent (`cancellationAgent.ts`)**: Built with `@convex-dev/agent` and OpenAI (`gpt-5-nano` via `@ai-sdk/openai`). Uses Firecrawl `/v2/scrape/{scrapeId}/interact` to navigate customer billing portals, fill cancellation forms, and handle login roadblocks.
- **Autonomous Auth Resolution**: Intercepts incoming magic link sign-ins and 2FA verification emails from the AgentMail inbox to complete portal authentication automatically.
- **Proof of Cancellation**: Captures full-page screenshot proof saved directly to Convex file storage (`ctx.storage`) and updates subscription records with status timestamps.
- **Cancelling Skills Engine (`cancellingSkills.ts`)**: Synthesizes successful cancellation run logs via LLM into structured, procedural Firecrawl and Playwright cancellation workflows with token placeholders (`<USER_EMAIL>`, `<PASSWORD>`, `<OTP_CODE>`).
- **Public Unsub Skill API**:
  - `GET /api/unsub/companies` — Lists companies with proven cancellation skills.
  - `GET /api/unsub/skill?company=...` — Returns step-by-step procedural cancellation code.
  - Mirrored in `.agents/skills/unsub-skill/` and `/public/unsub-SKILL.md`.

### 3. Autonomous Data Broker Privacy Removal (Eraser)
- **760+ Broker Catalog (`dataBrokers.ts`)**: Extensive database of data brokers and people-search sites categorized by opt-out mechanisms (interactive portal, email, web form).
- **Autonomous Removal Agent (`dataRemovalAgent.ts`)**: Dispatches automated removal workflows with proof screenshot capture saved to Convex storage.
- **Opt-Out Skills Engine (`optOutSkills.ts`)**: Synthesizes verified opt-out procedures into procedural Playwright scripts with PII token redaction (`<FULL_NAME>`, `<USER_EMAIL>`, `<PHONE_NUMBER>`, `<RESIDENTIAL_ADDRESS>`).
- **Public Opt-Out Skill API**:
  - `GET /api/optout/brokers` — Lists indexed data brokers.
  - `GET /api/optout/skill?broker=...` — Returns procedural deletion procedures.
  - Mirrored in `.agents/skills/opt-out-skill/` and `/public/opt-out-SKILL.md`.

### 4. Live Sender Trustpilot Intelligence
- **Zero-Latency Domain Reputation**: Parses sender domains, bypassing standard webmail providers, and queries cached reputation or scrapes `trustpilot.com/review/{domain}` via Firecrawl.
- **TrustScore & Complaint Extraction**: Extracts numeric TrustScore (`0.0` to `5.0`), star categories, total review counts, and top 3 natural-language customer complaint signals.
- **Automated Down-Ranking**: Senders with a TrustScore below `3.0` are flagged as suspicious (`isSuspicious: true`) and deprioritized in the inbox.
- **Interactive Badges & Popovers**: Pixel-accurate Trustpilot star badges open interactive review popovers with direct review links.

### 5. MailBuddy macOS Desktop Companion (`mail-desktop`)
A native Swift / AppKit companion adapted from Clicky (YC) that lives beside your cursor:
- **Zero-Click Screen-Aware OTP Auto-Fill**:
  - Subscribes reactively to Convex via the official `ConvexMobile` Swift SDK over WebSocket.
  - When an incoming OTP email arrives, MailBuddy captures the active display via ScreenCaptureKit.
  - Calls Convex action `companion:detectOtpCoordinates` powered by OpenAI Computer Use (`gpt-5-nano`) to find input bounding boxes.
  - The cursor buddy flies along a smooth Bézier arc to the target field, clicks, and types the digits via synthetic CoreGraphics events.
- **Contextual Drafting (`⌘⇧M`)**:
  - Extracts document titles, text, and outlines in <100ms from **Apple Pages**, **Apple Keynote**, **Apple Safari**, **Chromium browsers** (Chrome, Arc, Brave, Edge), or **Figma** via AppleScript and macOS Accessibility APIs.
  - Dual-exports native files and vector `.pdf` assets, staging them directly to Convex file storage (`ctx.storage`).
  - Generates context-rich drafts using `@convex-dev/agent` with search tools and recipient resolution, presented in a floating Compose HUD with **Approve**, **Edit**, and **Reject** controls.
- **Voice Push-To-Talk (`⌃⌥`)**:
  - Hold `Control + Option` anywhere in macOS to stream 24kHz PCM audio over WebSocket to OpenAI Realtime (`gpt-live-transcribe`).
  - Displays a floating live transcript bar and automatically populates the drafting pipeline.

### 6. Convex Static Hosting (`@convex-dev/static-hosting`)
- Full web frontend statically exported and hosted directly on Convex Cloud at [https://steady-ram-494.convex.site](https://steady-ram-494.convex.site).
- Custom HTTP router in `mail-web/convex/http.ts` automatically resolves extensionless Next.js routes (e.g. `/auth/companion` or `/mail`) to their underlying `.html` static storage assets before falling back to SPA routing.

---

## 📁 Repository Structure

```
.
├── README.md               # Root repository documentation (this file)
├── hackathon.md            # Evidence-based hackathon build log & milestones
│
├── mail-web/               # Web Application & Convex Backend
│   ├── app/                # Next.js 16 App Router (React 19, Tailwind CSS v4)
│   │   ├── components/     # UI components (EmailList, Reader, JudgesPanel, Subscriptions)
│   │   ├── landing/        # Architectural landing page sections & tech reels
│   │   └── mail/           # Inbox application route
│   ├── convex/             # Convex Realtime Backend
│   │   ├── schema.ts       # Database schema (messages, subscriptions, brokers, skills)
│   │   ├── http.ts         # AgentMail webhook, OAuth callbacks, static hosting router
│   │   ├── companion.ts    # Desktop companion drafting, OTP detection, voice token minting
│   │   ├── agentmail.ts    # AgentMail API synchronization & outbound sending
│   │   ├── figma.ts        # Figma OAuth 2.0 & vector export integration
│   │   ├── dataBrokers.ts  # 760+ data broker catalog queries
│   │   └── pipeline/       # Autonomous AI agent pipeline
│   │       ├── cancellationAgent.ts    # Autonomous subscription cancellation (@convex-dev/agent)
│   │       ├── dataRemovalAgent.ts     # Autonomous data broker opt-out agent
│   │       ├── cancellingSkills.ts     # Cancelling skills generator & API
│   │       ├── optOutSkills.ts         # Opt-out skills generator & API
│   │       ├── domainReputation.ts     # Firecrawl Trustpilot scraper & cache
│   │       └── draftingAgent.ts        # Context-aware email drafting agent
│   └── public/             # Static assets, install.sh, broker logos, skill specifications
│
├── mail-desktop/           # Native macOS Desktop Companion (MailBuddy)
│   ├── MailBuddy/          # Swift / SwiftUI / AppKit Companion Source
│   │   ├── ConvexService.swift                 # ConvexMobile WebSocket client
│   │   ├── CompanionManager.swift              # Cursor buddy state machine & synthetic inputs
│   │   ├── ComposeHUDWindow.swift              # Floating Compose HUD (Approve/Edit/Reject)
│   │   ├── OtpAlertOverlayPanel.swift          # Floating OTP alert card
│   │   ├── OpenAIRealtimeTranscriptionProvider.swift # Realtime voice dictation
│   │   └── AppContextProvider.swift            # Context extractors (Pages, Keynote, Browsers, Figma)
│   ├── MailBuddy.xcodeproj # Xcode Project
│   └── scripts/            # Automated release packaging (.dmg, .zip) and install scripts
│
├── test-subscription/      # Companion Subscription Portal Simulator
│   ├── app/                # Adobe Creative Cloud simulator (checkout, login, plans)
│   └── components/         # Subscription management & cancellation UI
│
├── test-removal/           # Companion Data Broker Portal Simulator
│   └── app/                # Opt-out form & test OTP verification harness
│
└── .agents/skills/         # Autonomous agent skills (unsub-skill, opt-out-skill, convex)
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Reactive Backend & DB** | [Convex](https://convex.dev) (Realtime sync, Asynchronous Scheduler, HTTP Actions, File Storage, `@convex-dev/agent`, `@convex-dev/static-hosting`) |
| **Authentication** | [Convex Auth](https://labs.convex.dev/auth) (Handle-based routing & Resend magic links) |
| **AI Models & Agents** | [OpenAI](https://platform.openai.com) (`gpt-5-nano` via `@ai-sdk/openai`, Computer Use vision detection, Realtime WebSocket `gpt-live-transcribe`) |
| **Web Scraping & Interaction** | [Firecrawl](https://firecrawl.dev) (Headless Trustpilot scraping, Cloudflare challenge bypass, interactive sessions) |
| **Email Infrastructure** | [AgentMail](https://agentmail.to) (Inbound/Outbound REST API & signed webhooks) |
| **Frontend Framework** | [Next.js 16](https://nextjs.org) (App Router, Turbopack, static export) & [React 19](https://react.dev) |
| **Styling & Components** | [Tailwind CSS v4](https://tailwindcss.com), [Lucide React](https://lucide.dev), [Sonner](https://sonner.emilkowal.ski) |
| **Native macOS Client** | Swift 5.9, SwiftUI, AppKit, ScreenCaptureKit, CoreGraphics, [ConvexMobile](https://github.com/get-convex/convex-swift) |
| **Package Manager** | [pnpm](https://pnpm.io) |

---

## 🚦 Getting Started

### Prerequisites
- **Node.js**: `v18+`
- **pnpm**: `npm install -g pnpm`
- **Xcode 15+** (for building `mail-desktop` locally)
- A [Convex](https://convex.dev) account
- An [AgentMail](https://agentmail.to) API key
- A [Firecrawl](https://firecrawl.dev) API key
- An [OpenAI](https://platform.openai.com) API key

---

### 1. Setting Up `mail-web` (Web Client & Convex Backend)

1. Navigate to `mail-web`:
   ```bash
   cd mail-web
   pnpm install
   ```

2. Configure environment variables in `mail-web/.env.local`:
   ```env
   NEXT_PUBLIC_CONVEX_URL=https://<your-deployment-name>.convex.cloud
   ```

3. Set Convex deployment environment variables:
   ```bash
   npx convex env set AGENTMAIL_API_KEY="your-agentmail-api-key"
   npx convex env set FIRECRAWL_API_KEY="your-firecrawl-api-key"
   npx convex env set OPENAI_API_KEY="your-openai-api-key"
   npx convex env set SITE_URL="http://localhost:3000"
   ```

4. Deploy backend functions to Convex:
   ```bash
   pnpm deploy:convex
   ```

5. Start the local Next.js web application:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

### 2. Installing MailBuddy Desktop Companion (`mail-desktop`)

#### Option A: One-Line Terminal Install (Recommended)
Run the automated installer script:
```bash
curl -fsSL https://steady-ram-494.convex.site/install.sh | bash
```

#### Option B: Build from Source
1. Open the Xcode project:
   ```bash
   open mail-desktop/MailBuddy.xcodeproj
   ```
2. Select the `MailBuddy` scheme.
3. Under **Signing & Capabilities**, select your development team (or ad-hoc signing).
4. Press **⌘R** to build and launch.
5. Grant macOS permissions when prompted (**Accessibility**, **Screen Recording**, **Microphone**).
6. Connect your inbox handle via the menu bar icon or open `notyouraveragemail://connect?inboxId=<your-inbox-id>`.

---

### 3. Setting Up `test-subscription` (Subscription Simulator)

1. In a separate terminal:
   ```bash
   cd test-subscription
   pnpm install
   pnpm dev -- -p 3001
   ```
2. Simulator runs at [http://localhost:3001](http://localhost:3001) (`notreallyadobe.aka0lisa.dev`).

---

## 🧪 Testing with the Judges Panel

When running `mail-web` or visiting [https://steady-ram-494.convex.site/mail](https://steady-ram-494.convex.site/mail):
1. Click the animated **Judges** button with the rainbow indicator in the top navbar.
2. In the testing panel:
   - **Test Subscription Cancellation**: Simulates purchasing and cancelling an Adobe Creative Cloud plan with live `@convex-dev/agent` execution logs.
   - **Test Data Broker Removal**: Triggers an opt-out run against NotReallyDataBroker and stores the proof screenshot.
   - **Test OTP Insertion**: Injects a mock OTP email to trigger MailBuddy's screen capture, computer use bounding box detection, and auto-typing.

---

## 📜 License

MIT License. Developed for the Convex All Gas Hackathon.
