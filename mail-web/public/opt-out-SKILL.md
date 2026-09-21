---
name: opt-out-skill
description: Autonomous data broker opt-out and privacy removal engine. Learn how to discover supported data brokers and fetch step-by-step Firecrawl + Playwright deletion procedures via public HTTP endpoints.
---

# Opt-Out Skill: Autonomous Data Broker Removal Engine

The **Opt-Out Skill** provides autonomous agents, privacy bots, and developers with programmatic access to tested, reverse-engineered data deletion and opt-out suppression workflows across 750+ data brokers and people-search sites.

Whenever NotYourAverageMail's autonomous Data Removal Agent successfully completes a data broker deletion or privacy suppression request, it synthesizes the real-world browser execution logs into a reproducible **Opt-Out Skill**. Each skill documents the exact DOM selectors, search/profile navigation steps, Firecrawl interactive actions, and Playwright code required to remove personal information from that specific broker.

---

## Service Endpoints

All endpoints are public and CORS-enabled:
- **Production Base URL**: `https://steady-ram-494.convex.site`
- **Local Dev Base URL**: `http://localhost:3000` (or your Convex dev site URL)

---

## 1. List Available Data Brokers

Retrieve a list of all data brokers and people-search websites with published opt-out skills.

### Request
```http
GET /api/optout/brokers HTTP/1.1
Host: steady-ram-494.convex.site
Accept: application/json
```

### Curl Example
```bash
curl -s "https://steady-ram-494.convex.site/api/optout/brokers"
```

### Response Schema (`200 OK`)
```json
{
  "ok": true,
  "count": 2,
  "brokers": [
    {
      "brokerId": "spokeo",
      "name": "Spokeo",
      "domain": "spokeo.com",
      "optOutUrl": "https://www.spokeo.com/optout",
      "updatedAt": 1726928400000,
      "createdAt": 1726928400000
    },
    {
      "brokerId": "notreallydatabroker",
      "name": "NotReallyDataBroker",
      "domain": "notreallydatabroker.aka0lisa.dev",
      "optOutUrl": "https://notreallydatabroker.aka0lisa.dev/optout",
      "updatedAt": 1726929000000,
      "createdAt": 1726929000000
    }
  ]
}
```

---

## 2. Get Opt-Out Skill for a Broker

Retrieve the complete step-by-step procedural opt-out guide for a given broker.

### Request
```http
GET /api/optout/skill?broker=spokeo HTTP/1.1
Host: steady-ram-494.convex.site
Accept: application/json
```
*(You can query by `?broker=<broker_id>`, `?domain=<domain>`, or `?name=<broker_name>`)*

### Curl Example
```bash
curl -s "https://steady-ram-494.convex.site/api/optout/skill?broker=notreallydatabroker"
```

### Response Schema (`200 OK`)
```json
{
  "ok": true,
  "brokerId": "notreallydatabroker",
  "name": "NotReallyDataBroker",
  "domain": "notreallydatabroker.aka0lisa.dev",
  "optOutUrl": "https://notreallydatabroker.aka0lisa.dev/optout",
  "skillText": "# Opt-Out Skill: NotReallyDataBroker (notreallydatabroker.aka0lisa.dev)\n\n## Overview\n...",
  "updatedAt": 1726928400000
}
```

### Error Response (`404 Not Found`)
```json
{
  "ok": false,
  "error": "No opt-out skill found for example.com"
}
```

---

## How Agents Should Execute Opt-Out Skills

When an external privacy agent needs to opt out or remove personal data for a user:

1. **Discovery**:
   Query `GET /api/optout/brokers` to verify if procedural instructions exist for the target broker.
2. **Fetch Skill**:
   Query `GET /api/optout/skill?broker=<brokerId>` to fetch the procedural instructions (`skillText`).
3. **Template Parameter Substitution**:
   The `skillText` contains standardized placeholders:
   - `<USER_NAME>`: The user's full legal name.
   - `<USER_EMAIL>`: The user's privacy/inbox email address.
   - `<USER_ADDRESS>`: The user's city, state, or street address.
   - `<CONFIRMATION_CODE>`: Multi-factor or one-time code received in the user's inbox.
   - `<MAGIC_LINK>`: Opt-out verification link received in email.
4. **Execution via Firecrawl or Playwright**:
   - **Using Firecrawl**: Start a browser session via `POST https://api.firecrawl.dev/v2/scrape` with `interactive: true`, then issue interactive actions via `POST /v2/scrape/:id/interact` using the JSON action schemas provided in each step.
   - **Using Playwright**: Run the provided Playwright snippets directly in an automated browser session.
5. **Verification**:
   Inspect the DOM for the confirmation indicator or status notice specified in the **Verification Criteria** section of the skill to ensure the record is officially suppressed or deleted.

---

## TypeScript Agent Integration Example

```typescript
async function removePersonalDataFromBroker(brokerId: string, userProfile: { name: string; email: string }) {
  const baseUrl = "https://steady-ram-494.convex.site";

  // 1. Fetch the opt-out skill
  const res = await fetch(`${baseUrl}/api/optout/skill?broker=${encodeURIComponent(brokerId)}`);
  if (!res.ok) {
    throw new Error(`Opt-out skill not available for ${brokerId}`);
  }

  const data = await res.json();
  const proceduralInstructions = data.skillText;

  console.log(`[Agent] Retrieved procedural opt-out skill for ${data.name}:`);
  console.log(proceduralInstructions);

  // 2. Feed procedural instructions to your automation runner or browser agent
  // e.g., execute Firecrawl interactive actions or Playwright steps
}
```
