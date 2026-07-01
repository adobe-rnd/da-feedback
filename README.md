# da-feedback

Cloudflare Worker that accepts feedback submissions from DA (Document Authoring) and EW (Experience Workspace) and forwards them to Slack via an incoming webhook.

## Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)
- A Slack app with an [Incoming Webhook URL](https://api.slack.com/messaging/webhooks)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set the Slack webhook secret

The webhook URL is stored as a Cloudflare Worker secret — it is never committed to source control or placed in `wrangler.toml`.

```bash
# For the default (dev) environment:
wrangler secret put SLACK_WEBHOOK_URL

# For production:
wrangler secret put SLACK_WEBHOOK_URL --env production
```

Paste your Slack Incoming Webhook URL when prompted.

### 3. Configure allowed origins

Edit `wrangler.toml`. The `ALLOWED_ORIGINS` var is a comma-separated list of exact origin strings (no wildcards):

```toml
[vars]
ALLOWED_ORIGINS = "http://localhost:3000"

[env.production.vars]
ALLOWED_ORIGINS = "https://da.live,https://adobe.com"
```

## Development

```bash
npm run dev
```

The worker starts at `http://localhost:8787`. To supply the Slack secret locally without committing it, create a `.dev.vars` file (already gitignored):

```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
```

## Testing

```bash
npm test           # run once
npm run test:watch # watch mode
```

## Deployment

```bash
# Production
npm run deploy
```

## API

### `POST /feedback`

**Request headers:**
- `Content-Type: application/json`
- `Origin: <one of the configured allowed origins>`

**Request body:**

```json
{
  "category": "general | feature-request | bug | question | other",
  "message": "string, required, max 2000 chars",
  "context": {
    "org": "string, required",
    "site": "string, required",
    "path": "string, required"
  },
  "sessionId": "string, optional"
}
```

**Success:** `200 { "ok": true }`

**Error responses:**

| Status | Meaning |
|---|---|
| 400 | Validation failure — `{ "error": "description" }` |
| 403 | Origin not in allowed list |
| 404 | Route or method not found |
| 502 | Slack delivery failed |

### Sample `curl` request

```bash
curl -X POST http://localhost:8787/feedback \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "category": "bug",
    "message": "The publish button does not work when the path contains spaces.",
    "context": {
      "org": "myorg",
      "site": "mysite",
      "path": "/content/my-page"
    },
    "sessionId": "abc-123-optional"
  }'
```

Expected response: `{"ok":true}`
