# Conversation Export

This folder contains a sanitized viewer for the Codex conversation used to build Spicy-to-Nice.

- `index.html` is a static viewer.
- `conversation.json` contains visible user/assistant messages only.
- Hidden instructions, reasoning, tool payloads, and secrets are excluded or redacted.

Regenerate with:

```bash
npm run export:conversation
```
