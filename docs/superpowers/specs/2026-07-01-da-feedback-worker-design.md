# DA/EW Feedback Collector — Worker Design

**Date:** 2026-07-01  
**Status:** Approved  
**Scope:** Single Cloudflare Worker — ingestion endpoint only. No frontend, no storage.

---

## Overview

A lightweight Cloudflare Worker that accepts feedback submissions from DA (Document Authoring) and EW (Experience Workspace) tooling and forwards them to a Slack channel via an incoming webhook. First piece of the feedback pipeline; the UI dialog that calls it will be built separately.

---

## File Structure

```
da-feedback/
├── src/
│   └── index.js       # single Worker export, all logic as named internal functions
├── wrangler.toml      # bare top-level (dev) + [env.production]
└── README.md
```

No external dependencies beyond the Workers runtime `fetch`. No directories, no imports.

Internal functions (not exported):
- `checkCors(request, env)` — validates origin, returns CORS headers or null
- `parseAndValidate(request)` — parses JSON body, returns validated payload or throws
- `formatSlackMessage(payload)` — builds mrkdwn string
- `postToSlack(message, env)` — POSTs to webhook URL from secret

---

## API

### `POST /feedback`

**Request body (JSON):**

```json
{
  "category": "general" | "feature-request" | "bug" | "question" | "other",
  "message": "string, required, max 2000 chars",
  "context": {
    "org": "string, required",
    "site": "string, required",
    "path": "string, required"
  },
  "sessionId": "string, optional"
}
```

**Success response:** `200 { "ok": true }`

---

## Request Flow

```
Incoming request
  │
  ├─ OPTIONS → 204 + CORS headers (preflight)
  │
  ├─ Origin not in ALLOWED_ORIGINS → 403 (no CORS headers leaked)
  │
  ├─ Not POST /feedback → 404
  │
  ├─ Body parse / validation fails → 400 + { "error": "..." }
  │
  ├─ Slack POST fails → 502 + { "error": "Slack delivery failed" }
  │
  └─ Success → 200 + { "ok": true }
```

---

## CORS

- `ALLOWED_ORIGINS` env var: comma-separated, exact match strings (no wildcards), trimmed.
- Every non-OPTIONS response that passes the origin check echoes the caller's specific origin in `Access-Control-Allow-Origin` (not `*`).
- Headers: `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`.
- Requests from unlisted origins get `403` with no CORS headers.

---

## Validation

Rules applied in order; first failure returns `400` with a human-readable `{ "error": "..." }` body:

| Field | Rule |
|---|---|
| `category` | Required; one of `general`, `feature-request`, `bug`, `question`, `other` |
| `message` | Required; non-empty string; max 2000 chars |
| `context.org` | Required; non-empty string |
| `context.site` | Required; non-empty string |
| `context.path` | Required; non-empty string |
| `sessionId` | Optional; if present must be a string; passed through as-is |

---

## Slack Message Format

Plain `mrkdwn` text posted to an incoming webhook. `Session ID` line omitted when `sessionId` is absent.

**Example:**

```
:speech_balloon: *New DA/EW Feedback*

*Category:* bug
*Message:* The publish button doesn't work when the path contains spaces.

*Open in:* <https://da.live/#/org/site/path|DA Live> · <https://main--site--org.aem.page/path|Preview>

*Session ID:* abc-123-def
```

**URL construction:**
- DA Live: `https://da.live/#/{org}/{site}{path}`
- Preview: `https://main--{site}--{org}.aem.page{path}`

Webhook payload: `{ "text": "<formatted string>" }`

---

## Error Handling

| Scenario | Status | Body |
|---|---|---|
| Origin not allowed | 403 | `{ "error": "Origin not allowed" }` |
| Route not found | 404 | `{ "error": "Not found" }` |
| Validation failure | 400 | `{ "error": "<field-specific message>" }` |
| Slack webhook failure | 502 | `{ "error": "Slack delivery failed" }` |
| Unexpected error | 500 | `{ "error": "Internal error" }` |

No retry logic in v1. No silent failures — Slack delivery errors are always surfaced to the caller.

---

## `wrangler.toml` Structure

```toml
name = "da-feedback"
main = "src/index.js"
compatibility_date = "2024-11-11"
keep_vars = true

[vars]
ALLOWED_ORIGINS = "http://localhost:3000"
ENVIRONMENT = "dev"

# SLACK_WEBHOOK_URL — never in vars; set via:
#   wrangler secret put SLACK_WEBHOOK_URL

[env.production]
name = "da-feedback"

[env.production.vars]
ALLOWED_ORIGINS = "https://da.live,https://adobe.com"
ENVIRONMENT = "production"
```

`SLACK_WEBHOOK_URL` is a Worker secret — set via `wrangler secret put`, never committed.

---

## Extension Points (not built in v1)

The internal function structure makes these additions non-breaking:

- **Storage**: add a `persistToKV(payload, env)` call after validation, before Slack post
- **Additional destinations**: add `postToJira(payload, env)` alongside `postToSlack` for `category === "bug"`
- **Auth**: add an `authenticate(request, env)` step before validation if the endpoint needs to be locked down later

---

## Out of Scope (v1)

- Frontend / dialog UI
- Persistence (KV, R2, D1)
- Authentication on the endpoint
- Retry logic
- Rate limiting
