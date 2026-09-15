# Modern Mail ⚡

> Neobrutalist AI mail super app with autonomous triage, real-time AgentMail inbox sync, Trustpilot domain reputation intelligence, and autonomous subscription management. Built for the **Convex All Gas Hackathon**.

---

## 🚀 Overview

**Modern Mail** reimagines email as an active, intelligent dashboard rather than a passive chronological inbox. Powered by **Convex**, **AgentMail**, and **Firecrawl**, it pairs a bold neobrutalist web client with an asynchronous background pipeline that autonomously evaluates sender reputation, extracts OTP / 2FA verification codes, identifies recurring subscriptions, and automates cancellation flows.

The repository includes both the core email client (`mail-web`) and a companion subscription portal simulator (`test-checkout`) designed to prove end-to-end autonomous magic-link sign-ins and cancellation workflows.

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
                               │  • Pipeline Scheduler  │
                               │  • Convex Auth Engine  │
                               └───────┬────────┬───────┘
                                       │        │
           ctx.scheduler.runAfter(0)   │        │ Real-Time WebSocket Subscriptions
                                       │        │
                                       ▼        ▼
┌──────────────────────────────────────────┐  ┌──────────────────────────────────────────┐
│             Firecrawl Scraper            │  │          Next.js Client (mail-web)       │
│  • Headless Trustpilot Scrape & Cache    │  │  • Neobrutalist 2-Pane UI & Hotkeys      │
│  • TrustScore (0-5.0) & Star Badges      │  │  • Real-Time Reactive Inbox Sync         │
│  • Top Customer Complaints Extraction    │  │  • Interactive Trustpilot Popovers       │
│  • Cancellation Portal Discovery         │  │  • Subscriptions & Spend Dashboard       │
└──────────────────────────────────────────┘  └──────────────────▲───────────────────────┘
                                                                 │
                                                      Simulated Receipts & OTP
                                                                 │
                                              ┌──────────────────┴───────────────────────┐
                                              │       Test Simulator (test-checkout)     │
                                              │  • Adobe Creative Cloud Checkout Flow    │
                                              │  • Magic Link & OTP Passcode Trigger     │
                                              │  • Live Plan Management & Cancellation   │
                                              └──────────────────────────────────────────┘
```

---

## ✨ Key Features

### 1. Neobrutalist Mail Experience (`mail-web`)
- **Bold Visual Identity**: High-contrast dark borders (`#2C2A29`), vibrant accents, hard brutalist shadows, Anton headline typography, and monospace details.
- **2-Pane Responsive Layout**: Keyboard-accessible message list and full-width reading pane with folder filtering (`Inbox`, `Sent`, `Starred`, `Trash`, `Subscriptions`).
- **Real-Time Reactive Updates**: Subscribes directly to Convex database queries over WebSockets (`useQuery(api.messages.list, ...)`), delivering instant updates with zero client polling.

### 2. Autonomous Inbound Pipeline & Firecrawl Intelligence
- **Zero-Latency Ingestion**: Inbound messages are saved to the database immediately, while compute-heavy enrichment runs non-blockingly via Convex's background scheduler (`ctx.scheduler.runAfter(0, ...)`).
- **Trustpilot Domain Reputation**:
  - Automatically parses sender domains (ignoring standard webmail providers like Gmail, Yahoo, and Outlook).
  - Queries a cached `domainIntelligence` table, or scrapes `https://www.trustpilot.com/review/{domain}` using Firecrawl with Cloudflare challenge bypass.
  - Extracts official TrustScore (`0.0` to `5.0`), star categories, total review counts, and top 3 natural-language customer complaints.
- **Smart Inbox Down-Ranking**: Senders with a TrustScore below `3.0` are flagged as `isSuspicious` and deprioritized. The `⚡ Priority` sorting algorithm floats trusted, high-importance messages to the top.
- **Interactive Trustpilot Star Badges**: Pixel-accurate star SVGs rendered directly in the mail list. Clicking a badge opens a modal popover with review stats and verified complaint highlights.

### 3. OTP & 2FA Quick Extraction
- Regex-powered detection catches 4-8 digit verification codes and magic links instantly on incoming security emails.
- Displays prominent one-click copy passcodes directly in the reader pane and message cards.

### 4. Subscription Tracking & Autonomous Cancellation
- **Receipt & Renewal Detection**: Automatically detects incoming billing receipts and extracts service names, amounts, and renewal periods.
- **Tracked Monthly Spend**: Live aggregated pill in the Subscriptions view summarizing total monthly subscription commitments (`Tracked Spend: $XX.XX/mo`).
- **Autonomous One-Click Cancel**:
  - Distinguishes between magic-link and password-protected services.
  - For magic-link services, Modern Mail can handle inbound login emails to execute autonomous background cancellations (`One-Click Cancel`).
  - For password-protected services, surfaces direct cancellation portal links (`Cancel ↗`).

### 5. Interactive Test Harness (`test-checkout`)
- Companion app simulating an Adobe Creative Cloud / Rebill checkout and account management portal.
- Allows you to simulate purchasing plans, trigger real confirmation receipts with cancellation Action Cards into Convex, and request magic link / OTP sign-in emails for testing.

---

## 📁 Repository Structure

```
.
├── README.md               # Root repository documentation (this file)
├── hackathon.md            # Hackathon development log and milestones
├── .gitignore              # Monorepo-aware gitignore rules
│
├── mail-web/               # Core Modern Mail Web Application
│   ├── app/                # Next.js 16 App Router (React 19, Tailwind CSS v4)
│   │   ├── components/     # Neobrutalist UI components (EmailList, Reader, Badges)
│   │   ├── auth/           # Convex Auth sign-in / sign-up screens
│   │   └── page.tsx        # Main application dashboard
│   ├── convex/             # Convex Backend
│   │   ├── schema.ts       # Database schema, indexes, and validators
│   │   ├── messages.ts     # Reactive queries & mutations for mail
│   │   ├── agentmail.ts    # AgentMail API synchronization & outbound sender
│   │   ├── auth.ts         # Convex Auth handlers
│   │   ├── http.ts         # AgentMail webhook endpoint
│   │   ├── testCheckout.ts # Test mutations to simulate receipts & magic links
│   │   └── pipeline/       # Asynchronous background tasks
│   │       ├── orchestrator.ts             # Pipeline scheduler & router
│   │       ├── domainReputation.ts         # Firecrawl scraper & Trustpilot extractor
│   │       ├── otp.ts                      # Passcode / 2FA extraction
│   │       ├── actionCards.ts              # Inbound receipt detection
│   │       └── subscriptionCancellation.ts # Portal finder & cancellation handler
│   └── public/trustpilot/  # Official Trustpilot assets & star rating SVGs
│
└── test-checkout/          # Companion Checkout & Portal Simulator
    ├── app/                # Next.js app simulating Adobe/Rebill checkout & portal
    │   ├── checkout/       # Checkout page triggering subscription receipts
    │   ├── login/          # Sign-in page triggering magic links & OTP passcodes
    │   └── plans/          # Active subscription management & cancellation UI
    └── lib/convex.ts       # Convex HTTP client pointing to the shared backend
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Reactive Backend & DB** | [Convex](https://convex.dev) (Realtime sync, Asynchronous Scheduler, HTTP Webhooks) |
| **Authentication** | [Convex Auth](https://labs.convex.dev/auth) |
| **Email Infrastructure** | [AgentMail](https://agentmail.to) (Inbound/Outbound REST API & Webhooks) |
| **Web Intelligence** | [Firecrawl](https://firecrawl.dev) (Headless Trustpilot scraping & Cloudflare bypass) |
| **Frontend Framework** | [Next.js 16](https://nextjs.org) (Turbopack, App Router) & [React 19](https://react.dev) |
| **Styling & Icons** | [Tailwind CSS v4](https://tailwindcss.com), [Lucide React](https://lucide.dev), [Sonner](https://sonner.emilkowal.ski) |
| **Package Manager** | [pnpm](https://pnpm.io) |

---

## 🚦 Getting Started

### Prerequisites
- **Node.js**: `v18+`
- **pnpm**: `npm install -g pnpm`
- A [Convex](https://convex.dev) account
- An [AgentMail](https://agentmail.to) API key
- A [Firecrawl](https://firecrawl.dev) API key

---

### 1. Setting Up `mail-web` (Main Client & Backend)

1. Navigate to the `mail-web` directory:
   ```bash
   cd mail-web
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Configure your local environment variables in `mail-web/.env.local`:
   ```env
   NEXT_PUBLIC_CONVEX_URL=https://<your-deployment-name>.convex.cloud
   ```

4. Configure Convex deployment secrets:
   ```bash
   npx convex env set AGENTMAIL_API_KEY="your-agentmail-api-key"
   npx convex env set FIRECRAWL_API_KEY="your-firecrawl-api-key"
   npx convex env set SITE_URL="http://localhost:3000"
   ```

5. Start the development server (runs Convex dev sync + Next.js):
   ```bash
   pnpm dev
   ```
   Modern Mail will be available at [http://localhost:3000](http://localhost:3000).

---

### 2. Setting Up `test-checkout` (Simulator)

1. Open a second terminal window and navigate to `test-checkout`:
   ```bash
   cd test-checkout
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Ensure `test-checkout/.env.local` points to your Convex deployment:
   ```env
   NEXT_PUBLIC_CONVEX_URL=https://<your-deployment-name>.convex.cloud
   ```

4. Start the simulator:
   ```bash
   pnpm dev -- -p 3001
   ```
   The portal simulator will run at [http://localhost:3001](http://localhost:3001).

---

## 🧪 Testing the End-to-End Flow

1. **Sign in to Modern Mail**:
   - Open [http://localhost:3000](http://localhost:3000).
   - Create or log into an inbox handle (e.g. `testuser@modernmail.dev`).

2. **Simulate a Checkout & Subscription Receipt**:
   - Open [http://localhost:3001/checkout](http://localhost:3001/checkout).
   - Enter your Modern Mail email and complete the mock checkout.
   - Switch back to Modern Mail: an **Adobe Creative Cloud** receipt arrives immediately with an embedded **Cancellation Action Card**.
   - The **Subscriptions** tab updates in real-time with the new tracked monthly spend.

3. **Simulate Magic Link & OTP Sign-In**:
   - Navigate to [http://localhost:3001/login](http://localhost:3001/login).
   - Enter your email to request a magic sign-in link.
   - Modern Mail instantly captures the incoming login email, detects the 6-digit OTP passcode, and surfaces it for one-click verification.

---

## 📜 License

MIT License. Created during the Convex All Gas Hackathon.
