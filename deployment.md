# Frontend Deployment Guide: Hosting on Convex (`convex.site`)

This guide outlines how to build and upload the **NotYourAverageMail** web frontend directly to your Convex deployment's static site domain (`https://steady-ram-494.convex.site`) using `@convex-dev/static-hosting`.

---

## 1. Prerequisites & Environment Variables

The backend environment variables (such as `AGENTMAIL_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `FIGMA_CLIENT_SECRET`, `FIRECRAWL_API_KEY`, and `SITE_URL`) are already securely configured directly on your Convex deployment. **You do not need to re-enter them.**

For the frontend static build (`mail-web`), ensure `mail-web/.env.local` contains the following client-side (`NEXT_PUBLIC_*`) variables:

```bash
# mail-web/.env.local

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
```

---

## 2. Deployment Steps

Once you are on a stable internet connection:

### Step 1: Navigate to the Web Workspace
```bash
cd mail-web
```

### Step 2: Ensure Dependencies & Backend are in Sync
```bash
pnpm install
pnpm exec convex dev --once
```
*(This ensures your `convex.config.ts` component registrations and `convex/http.ts` routes are up to date on your deployment).*

### Step 3: Build the Static Export
Run the Next.js static production build:
```bash
pnpm run build
```
This produces the statically rendered HTML, JS chunks, CSS, and static assets in the `mail-web/out` directory.

### Step 4: Upload Assets to Convex Static Hosting

To deploy to your **development** deployment (`dev:steady-ram-494`):
```bash
npx @convex-dev/static-hosting upload --dist out -j 3
```

To deploy to a **production** deployment:
```bash
npx @convex-dev/static-hosting deploy --dist out
```

> **Note on Concurrency (`-j`)**:
> The project includes ~400 broker logos in `public/broker-logos`. Passing `-j 3` (3 concurrent workers) helps prevent socket dropouts on variable internet connections while uploading files to Convex file storage.

---

## 3. Verification

Once the upload completes:
1. Open your browser and navigate to:
   ```
   https://steady-ram-494.convex.site
   ```
2. Verify:
   - **Landing page**: Loads correctly with brutalist theme and animations.
   - **Authentication**: Sign-in / sign-up routes work (`/auth/signin`).
   - **Figma OAuth**: Navigating to `/auth/figma` redirects to the Convex HTTP endpoint (`https://steady-ram-494.convex.site/api/auth/figma/start`).
   - **Webmail Interface**: Accessing `/mail` loads the inbox view with real-time Convex reactive queries.
