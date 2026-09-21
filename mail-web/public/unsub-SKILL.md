---
name: unsub-skill
description: Autonomous subscription cancellation engine. Learn how to discover supported companies and fetch step-by-step Firecrawl + Playwright cancellation procedures via public HTTP endpoints.
---

# Unsub Skill: Autonomous Subscription Cancellation Engine

The **Unsub Skill** provides autonomous agents, automation tools, and developers with programmatic access to tested, reverse-engineered subscription cancellation workflows.

Whenever NotYourAverageMail's autonomous agent successfully completes a subscription cancellation, it synthesizes the real-world execution logs into a reproducible **Cancelling Skill**. Each skill documents the precise DOM selectors, Firecrawl interactive actions, and Playwright code required to cancel that specific service.

---

## Service Endpoints

All endpoints are public and CORS-enabled:
- **Production Base URL**: `https://steady-ram-494.convex.site`
- **Local Dev Base URL**: `http://localhost:3000` (or your Convex dev site URL)

---

## 1. List Available Companies

Retrieve a list of all services and domains with published cancellation skills.

### Request
```http
GET /api/unsub/companies HTTP/1.1
Host: steady-ram-494.convex.site
Accept: application/json
```

### Curl Example
```bash
curl -s "https://steady-ram-494.convex.site/api/unsub/companies"
```

### Response Schema (`200 OK`)
```json
{
  "ok": true,
  "count": 2,
  "companies": [
    {
      "company": "Adobe",
      "domain": "adobe.com",
      "portalUrl": "https://account.adobe.com/plans",
      "updatedAt": 1726928400000,
      "createdAt": 1726928400000
    },
    {
      "company": "Netflix",
      "domain": "netflix.com",
      "portalUrl": "https://www.netflix.com/youraccount",
      "updatedAt": 1726929000000,
      "createdAt": 1726929000000
    }
  ]
}
```

---

## 2. Get Cancellation Skill for a Company

Retrieve the complete step-by-step procedural cancellation guide for a given company or domain.

### Request
```http
GET /api/unsub/skill?domain=adobe.com HTTP/1.1
Host: steady-ram-494.convex.site
Accept: application/json
```
*(You can query by either `?domain=<domain>` or `?company=<company_name>`)*

### Curl Example
```bash
curl -s "https://steady-ram-494.convex.site/api/unsub/skill?domain=adobe.com"
```

### Response Schema (`200 OK`)
```json
{
  "ok": true,
  "company": "Adobe",
  "domain": "adobe.com",
  "portalUrl": "https://account.adobe.com/plans",
  "skillText": "# Cancellation Skill: Adobe (adobe.com)\n\n## Overview\n...",
  "updatedAt": 1726928400000
}
```

### Error Response (`404 Not Found`)
```json
{
  "ok": false,
  "error": "No cancellation skill found for example.com"
}
```

---

## How Agents Should Execute Cancellation Skills

When an external agent needs to cancel a subscription on behalf of a user:

1. **Discovery**:
   Query `GET /api/unsub/companies` to verify if the company is supported.
2. **Fetch Skill**:
   Query `GET /api/unsub/skill?domain=<domain>` to fetch the procedural instructions (`skillText`).
3. **Template Parameter Substitution**:
   The `skillText` contains standardized placeholders:
   - `<USER_EMAIL>`: The user's account email address.
   - `<PASSWORD>`: The user's account password.
   - `<OTP_CODE>`: Multi-factor or one-time verification code received via email/SMS.
   - `<MAGIC_LINK>`: Login magic link received in the user's inbox.
4. **Execution via Firecrawl or Playwright**:
   - **Using Firecrawl**: Start a browser session via `POST https://api.firecrawl.dev/v2/scrape` with `interactive: true`, then issue interactive actions via `POST /v2/scrape/:id/interact` using the JSON action schemas provided in each step.
   - **Using Playwright**: Run the provided Playwright snippets directly in a headless browser session.
5. **Verification**:
   Inspect the DOM for the confirmation indicator specified in the **Verification Criteria** section of the skill to ensure the plan is officially cancelled.

---

## TypeScript Agent Integration Example

```typescript
async function cancelSubscriptionForUser(companyDomain: string, credentials: { email: string }) {
  const baseUrl = "https://steady-ram-494.convex.site";

  // 1. Fetch the cancellation skill
  const res = await fetch(`${baseUrl}/api/unsub/skill?domain=${encodeURIComponent(companyDomain)}`);
  if (!res.ok) {
    throw new Error(`Cancellation skill not available for ${companyDomain}`);
  }

  const data = await res.json();
  const proceduralInstructions = data.skillText;

  console.log(`[Agent] Retrieved procedural cancellation skill for ${data.company}:`);
  console.log(proceduralInstructions);

  // 2. Feed procedural instructions to your automation runner or browser agent
  // e.g., execute Firecrawl interactive actions or Playwright steps
}
```
