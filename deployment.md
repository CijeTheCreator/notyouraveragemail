# Frontend Deployment Guide: Hosting on Convex (`convex.site`)

This guide outlines how to build and upload the **NotYourAverageMail** web frontend directly to your Convex deployment's static site domain (`https://steady-ram-494.convex.site`) using `@convex-dev/static-hosting`.

---

## 1. Prerequisites & Environment Variables

### A. Convex Authentication
Ensure you are authenticated to Convex CLI (your credentials in `~/.convex/config.json`). You can verify your connection with:
```bash
npx convex deployment usage
```

### B. Configure `mail-web/.env.local`
Backend environment variables (such as `AGENTMAIL_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `FIGMA_CLIENT_SECRET`, `FIRECRAWL_API_KEY`, and `SITE_URL`) are already securely configured directly on your Convex deployment.

For client-side static build (`mail-web`), create `mail-web/.env.local` if it does not already exist:

```bash
cat << 'EOF' > mail-web/.env.local
# Convex Deployment & Endpoints
CONVEX_DEPLOYMENT=dev:steady-ram-494
NEXT_PUBLIC_CONVEX_URL=https://steady-ram-494.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://steady-ram-494.convex.site

# UI Configurations & Portal Links
NEXT_PUBLIC_JUDGES_BUTTON_VARIANT=dark
NEXT_PUBLIC_TEST_SUBSCRIPTION_PORTAL_URL=https://notreallyadobe.aka0lisa.dev/plans
NEXT_PUBLIC_TEST_BROKER_PORTAL_URL=https://notreallydatabroker.aka0lisa.dev/optout
NEXT_PUBLIC_TEST_OTP_URL=http://localhost:3002/otp
NEXT_PUBLIC_COMPANION_INSTALL_SCRIPT_URL=https://raw.githubusercontent.com/CijeTheCreator/modern-mail/main/mail-desktop/scripts/install.sh
EOF
```

---

## 2. Deployment Steps

Run the following commands from the repository root:

### Step 1: Navigate to the Web Workspace & Install Dependencies
```bash
cd mail-web
pnpm install
```

### Step 2: Ensure Backend Functions & Routes are in Sync
```bash
pnpm exec convex dev --once
```
*(This verifies type safety and ensures your `convex.config.ts` component registrations and `convex/http.ts` routes are deployed).*

### Step 3: Build the Static Export
```bash
pnpm run build
```
This produces the statically rendered HTML, JavaScript chunks, CSS, and static assets in `mail-web/out`.

### Step 4: Upload Assets to Convex Static Hosting

To deploy to your **development** deployment (`dev:steady-ram-494`):
```bash
npx @convex-dev/static-hosting upload --dist out -j 3
```

To deploy to a **production** deployment:
```bash
npx @convex-dev/static-hosting deploy --dist out
```

> **Note on Concurrency (`-j 3`)**:
> The project includes ~400 broker logos in `public/broker-logos`. Passing `-j 3` (3 concurrent workers) ensures stable asset uploads to Convex file storage without hitting rate limits or socket dropouts.

---

## 3. Verification

### Quick Terminal Check:
```bash
curl -sI https://steady-ram-494.convex.site
curl -sI https://steady-ram-494.convex.site/mail
curl -sI https://steady-ram-494.convex.site/auth/signin
```
All routes should return `HTTP/2 200`.

### Browser Verification:
1. Open your browser and navigate to:
   ```
   https://steady-ram-494.convex.site
   ```
2. Verify:
   - **Landing page**: Loads correctly with brutalist theme and animations.
   - **Authentication**: Sign-in / sign-up routes work (`/auth/signin`).
   - **Figma OAuth**: Navigating to `/auth/figma` redirects to the Convex HTTP endpoint (`https://steady-ram-494.convex.site/api/auth/figma/start`).
   - **Webmail Interface**: Accessing `/mail` loads the inbox view with real-time Convex reactive queries.
