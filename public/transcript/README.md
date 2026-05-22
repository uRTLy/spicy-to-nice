# Conversation Export

This folder contains sanitized transcript data for the Codex conversation used to build Spicy-to-Nice.

- `index.html` is a static fallback viewer.
- `conversation.json` contains visible user/assistant messages only.
- The primary in-app viewer is the React route at `/conversation`.
- Hidden instructions, reasoning, tool payloads, and secrets are excluded or redacted.

Regenerate with:

```bash
npm run export:conversation
```
