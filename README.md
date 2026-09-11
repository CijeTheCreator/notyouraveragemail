# Modern Mail ⚡

An intelligent, neobrutalist email client powered by **Convex**, **AgentMail**, and **Firecrawl**. Built with Next.js 16 (Turbopack) and Tailwind CSS.

---

## 🏗 Architecture & Tech Stack

```
                     ┌───────────────────────┐
                     │      AgentMail        │
                     │  (Inbound / Outbound) │
                     └──────────┬────────────┘
                                │
                    Webhook / API Sync
                                │
                                ▼
                     ┌───────────────────────┐
                     │     Convex Cloud      │
                     │  • Database           │
                     │  • Scheduled Pipeline │
                     │  • Convex Auth        │
                     └──────┬──────────┬─────┘
                            │          │
        ctx.scheduler.runAfter(0)      │ Real-Time WebSocket Sync
                            │          │
                            ▼          ▼
┌──────────────────────────────┐   ┌──────────────────────────┐
│      Firecrawl Scraper       │   │     Next.js Frontend     │
│  • Trustpilot Extraction     │   │  • Neobrutalist UI       │
│  • Cloudflare Bypass         │   │  • TrustScore Badges     │
│  • Top Complaints Extraction │   │  • Priority Inbox Sort   │
└──────────────────────────────┘   └──────────────────────────┘
```

---

## 1. Convex (Reactive Backend & Event Pipeline)

[Convex](https://convex.dev) serves as the reactive database, asynchronous job scheduler, and authentication provider for the entire application.

### Why Convex?
- **Zero-Latency Inbound Ingestion**: Inbound emails are committed to the `messages` table immediately, providing instant feedback in the user interface.
- **Asynchronous Event-Driven Pipeline**: Heavy enrichment (OTP extraction, Action Card detection, Firecrawl domain scraping) runs asynchronously in the background via `ctx.scheduler.runAfter(0, internal.pipeline.orchestrator.processIncomingMessage, { messageId, inboxId })`.
- **End-to-End Type Safety**: TypeScript types are generated automatically from `convex/schema.ts`, ensuring compile-time safety across both backend functions and React components.
- **Real-Time Reactive UI**: All mail views, search filters, and reputation updates subscribe to queries with `useQuery(api.messages.list, ...)` and update instantly via WebSockets without manual polling or state refreshing.

### Core Database Tables (`convex/schema.ts`)
- **`messages`**: Stores emails with folder status (`inbox`, `sent`, `trash`, `spam`), sender metadata, OTP codes, action card definitions, and Firecrawl-enriched fields (`trustScore`, `ratingCategory`, `priority`, `isSuspicious`).
- **`domainIntelligence`**: Persistent cache for domain reputation scraped via Firecrawl, indexed by `by_domain`. Prevents redundant external scraping requests across messages from the same domain.
- **`inboxes`**: Links AgentMail inbox handles to registered users.
- **`users` & `authSessions`**: Managed via `@convex-dev/auth`.

---

## 2. AgentMail (Programmatic Email Infrastructure)

[AgentMail](https://agentmail.to) powers the application's email ingestion and delivery.

### Inbound Ingestion & Sync (`convex/agentmail.ts`)
- **API Synchronization**: `syncInboxMessages` fetches messages from the AgentMail inbox endpoint (`https://api.agentmail.to/v0/inboxes/{inboxId}/messages`) using the secret `AGENTMAIL_API_KEY`.
- **Smart Routing**:
  - Outgoing emails sent by the user (`fromEmail === inboxId`) are routed directly to `recordSentMessage` (`folder: "sent"`).
  - Inbound emails are routed to `upsertInboundMessage`, saved as unread inbox items, and handed off to the pipeline orchestrator.
- **Webhook Ingestion**: The HTTP endpoint at `convex/http.ts` receives live webhook notifications from AgentMail for immediate, zero-polling email receipt.

### Outbound Sending (`convex/agentmail.ts`)
- The `sendEmail` action sends multipart emails via AgentMail's REST API (`POST /v0/inboxes/{inboxId}/messages`), automatically records the sent email to the `messages` table, and triggers sonner toast notifications in the UI.

---

## 3. Firecrawl (Domain Reputation & Trustpilot Intelligence)

[Firecrawl](https://firecrawl.dev) enables automated, headless extraction of web intelligence—even on sites protected by advanced bot detection and Cloudflare challenges.

### How It Works (`convex/pipeline/domainReputation.ts`)
1. **Domain Extraction & Filtering**:
   - Parses the sender's domain (e.g., `security@stripe.com` → `stripe.com`).
   - Ignores consumer webmail providers (`gmail.com`, `yahoo.com`, `outlook.com`, `icloud.com`, etc.) to conserve scraping quotas and avoid false-positive classifications.
2. **Cache Check**:
   - Queries the `domainIntelligence` table by `by_domain`. If cached and fresh, reuses existing reputation data instantly.
3. **Headless Scraping with Firecrawl**:
   - Calls the Firecrawl API (`POST https://api.firecrawl.dev/v1/scrape`) targeting `https://www.trustpilot.com/review/{domain}`.
   - Configured with `waitFor: 3000` to successfully pass Cloudflare browser verification challenges.
   - Uses `formats: ["markdown", "json"]` with custom `jsonOptions` schema to extract:
     - `companyName`
     - `trustScore` (0.0 to 5.0)
     - `ratingCategory` ("Great", "Average", "Bad")
     - `reviewCount`
     - `topComplaints`: up to 3 concise, specific natural-language customer complaints extracted directly from 1-star reviews.
4. **Automated Inbox Down-ranking**:
   - Senders with a TrustScore below 3.0 are marked as `isSuspicious: true` and downgraded to `priority: "low"`.
   - Normal or high-trust senders maintain `priority: "normal"` or `priority: "high"`.
   - The UI's "⚡ Priority (Trust & Urgency)" sorting order automatically floats verified senders to the top while pushing low-trust or unverified mail down.

---

## 4. Subscriptions & Autonomous Cancellation (Firecrawl Powered)

Recurring receipts, renewal notices, and price updates arrive constantly. Modern Mail extracts your subscriptions into a dedicated, minimalist **Subscriptions** manager without cluttering your inbox or email reader pane.

### How It Works (`convex/pipeline/subscriptionCancellation.ts`)
1. **Inbound Detection**:
   - Analyzes incoming messages for recurring billing receipts and subscription renewals.
   - Extracts service name, sender domain, and monthly cost.

2. **Authentication Method & Firecrawl Portal Discovery**:
   - Checks if sign-in is mail-based (e.g. magic link / email token) versus password-based.
     - *Magic link services*: Modern Mail has access to inbound mail, enabling autonomous background login and cancellation via headless agent (`One-Click Cancel`).
     - *Password-protected services*: Direct deep-link redirect to the cancellation/billing portal (`Cancel ↗`).
   - Uses Firecrawl search to locate direct billing and cancellation portals, caching results by domain in `subscriptionPolicies`.
   - *(TODO: A directory of popular websites, their sign-in methods, and cancellation skills will be maintained for fast zero-scrape lookups).*

3. **Minimalist Subscriptions List**:
   - Clean, tabular layout styled identically to the main mail list.
   - **Logo**: Website logo via domain lookup with initials avatar fallback.
   - **Name & Domain**: Clean typography with domain label.
   - **Monthly Amount**: Prominent monospace subscription cost.
   - **Single Tracked Spend Pill**: Integrated in the header bar showing total monthly commitment (`Tracked Spend: $XX.XX/mo`).
   - **Action Buttons**:
     - `One-Click Cancel`: For email/magic-link services. Triggers autonomous cancellation in the background.
     - `Cancel ↗`: For password services. Directly opens the cancellation portal in a new tab.

---

## 5. Design System & UI Features

- **Neobrutalism**: High-contrast `#2C2A29` borders, vibrant accent colors, bold `brutal-shadow` offsets, Anton headline typography, and monospace accents.
- **Uniform Trustpilot Star Badges**:
  - Direct integration of official Trustpilot CDN star SVGs (`public/trustpilot/stars/stars-{score}.svg`) on email list rows.
  - Sized uniformly across high and low scores for clean vertical alignment.
- **Interactive Trustpilot Card Popover**:
  - Clicking any star badge opens an interactive popover card showing:
    - Official Trustpilot brand logo and company name.
    - Official Trustpilot star mark SVG icon and numeric TrustScore out of `5.0`.
    - Star category and total verified review count.
    - Top 3 natural-language customer complaints.
    - Direct link to the company's live Trustpilot profile.
- **Priority Inbox Sorting**: Dropdown selector supporting `⚡ Priority (Trust & Urgency)`, `🕒 Newest First`, and `⏳ Oldest First`.

---

## 6. Getting Started

### Prerequisites
- Node.js 18+ & pnpm (`npm install -g pnpm`)
- A [Convex](https://convex.dev) account
- An [AgentMail](https://agentmail.to) API key
- A [Firecrawl](https://firecrawl.dev) API key

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd modern-mail/web

# Install dependencies
pnpm install
```

### Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment-name>.convex.cloud
```

Set Convex deployment environment variables:
```bash
npx convex env set AGENTMAIL_API_KEY="your-agentmail-api-key"
npx convex env set FIRECRAWL_API_KEY="your-firecrawl-api-key"
npx convex env set SITE_URL="http://localhost:3000"
```

### Run the Development Server

```bash
pnpm dev
```

This launches both Convex dev sync and Next.js Turbopack at [http://localhost:3000](http://localhost:3000).

---

## 7. Project Structure

```
modern-mail/web/
├── app/
│   ├── components/
│   │   ├── TrustScoreBadge.tsx          # Official Trustpilot stars & popover card
│   │   ├── SubscriptionsView.tsx        # Clean Subscriptions list with One-Click / Cancel buttons
│   │   ├── EmailList.tsx                # Mail list with Priority sorting & badges
│   │   ├── EmailReader.tsx              # Clean full message reading pane
│   │   ├── Sidebar.tsx                  # Folder navigation & account info
│   │   └── ComposeModal.tsx             # Mail composer
│   ├── page.tsx                         # Main client-side reactive state & layout
│   └── layout.tsx                       # Root layout with brutalist Toast notifications
├── convex/
│   ├── pipeline/
│   │   ├── subscriptionCancellation.ts  # Portal scraper & autonomous One-Click cancel
│   │   ├── domainReputation.ts          # Firecrawl scraping & Trustpilot parser
│   │   ├── orchestrator.ts              # Asynchronous inbound pipeline
│   │   ├── otp.ts                       # OTP & 2FA code extractor
│   │   └── actionCards.ts               # Inbound receipt detection
│   ├── seedSubscriptions.ts             # Sample test subscriptions seeder
│   ├── agentmail.ts                     # AgentMail API synchronization & sender
│   ├── messages.ts                      # Message queries, mutations & trash actions
│   ├── auth.ts                          # Convex Auth configuration
│   └── schema.ts                        # Data schema & indexes
└── public/
    └── trustpilot/
        ├── logo-black.svg               # Official Trustpilot logo
        ├── star-mark-white.svg          # Official Trustpilot star mark
        └── stars/                       # Official star SVGs (stars-0.0 to stars-5.0)
```
