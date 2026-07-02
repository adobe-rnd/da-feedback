# DA/EW Feedback — Add User Identity Fields

**Date:** 2026-07-01  
**Status:** Approved  
**Scope:** Additive change to existing feedback worker — add `user.email` and `user.imsId` to payload, validation, and Slack message.

---

## Change Summary

Add a required `user` object to the feedback payload containing `email` and `imsId`. Both sub-fields are required. The Slack message gains two new lines below the "Open in" links.

---

## Updated Payload

```json
{
  "category": "general | feature-request | bug | question | other",
  "message": "string, required, max 2000 chars",
  "context": {
    "org": "string, required",
    "site": "string, required",
    "path": "string, required"
  },
  "user": {
    "email": "string, required",
    "imsId": "string, required"
  },
  "sessionId": "string, optional"
}
```

---

## Validation Additions

New rules appended after existing context validation, before sessionId check:

| Field | Rule |
|---|---|
| `user` | Required; must be a plain object (not array, not null) |
| `user.email` | Required; non-empty string |
| `user.imsId` | Required; non-empty string |

Error shape unchanged: `{ "error": "<field-specific message>" }` with `400` status.

---

## Updated Slack Message Format

`*User:*` and `*IMS ID:*` lines are always present (both required). `*Session ID:*` line remains optional.

```
:speech_balloon: *New DA/EW Feedback*

*Category:* bug
*Message:* The publish button doesn't work when the path contains spaces.

*Open in:* <https://da.live/#/org/site/path|DA Live> · <https://main--site--org.aem.page/path|Preview>

*User:* user@adobe.com
*IMS ID:* abc123xyz

*Session ID:* abc-123-def
```

---

## Files Changed

- `src/index.js` — `parseAndValidate` (new user checks), `formatSlackMessage` (two new lines)
- `test/validate.test.js` — new tests for `user`, `user.email`, `user.imsId`
- `test/slack-format.test.js` — new tests for user/imsId lines in output
- `test/handler.test.js` — update `validBody` fixture to include `user`

---

## Out of Scope

- No email format validation (just non-empty string check)
- No IMS ID format validation (just non-empty string check)
- No server-side user lookup — values come from client
