# Technical Plan

## Core Stack

Use Vite + React + TypeScript as the frontend baseline.

Reasons:

- Fast local setup.
- Lightweight static output.
- Easy deployment to CDN-style hosts.
- Strong enough structure for a focused app without requiring a full framework.

Styling should start with plain CSS or CSS modules. Avoid adding a heavy component framework until the frontend direction is clearer.

## Deployment Target

The app should be deployable as a static site.

Good candidates:

- GitHub Pages
- Netlify
- Vercel static hosting
- Cloudflare Pages

## AI Strategy

Version 1 uses browser bring-your-own-key hosted AI calls. This avoids building a backend or managing server-side secrets during the earliest prototype.

Provider priority:

1. OpenAI as the primary candidate.
2. Google Gemini as a low-cost alternative.
3. Anthropic as a later candidate, depending on browser/API constraints.

Important security note:

- Do not commit API keys.
- Do not hard-code API keys.
- Store keys in React memory only.
- Do not use localStorage, sessionStorage, cookies, IndexedDB, or URL parameters for keys.
- If persistent browser storage is added later, make it explicit and user-controlled.
- Avoid third-party analytics and remote scripts while browser BYOK is active.

## Future Backend Option

A later version can add a small serverless proxy to protect app-owned API keys.

Possible deployment surfaces:

- Vercel Functions
- Netlify Functions
- Cloudflare Workers

The proxy should expose a narrow generation endpoint and keep provider-specific secrets outside the client bundle.

## Future Local Model Option

Local browser inference is a research track, not v1 scope. See `docs/WEBLLM_PLAN.md` for the dedicated implementation plan.

Candidate technology:

- WebLLM with WebGPU.

Why it is interesting:

- Runs in the browser.
- Keeps user text local.
- Offers an OpenAI-compatible interface.
- Supports web workers for heavy model work.

Risks:

- Large first-load model downloads.
- Browser and device compatibility.
- Quality may be weaker than hosted commercial models for nuanced rewriting.
- More complexity than needed for the first repo milestone.

Recommended first implementation shape:

- Add an explicit Offline/WebLLM provider rather than a silent fallback.
- Dynamically import WebLLM only when Offline is selected.
- Use a worker-backed singleton so model loading and generation do not freeze the UI.
- Start with a small pinned model and clear first-run download messaging.
- Fall back gently to BYOK providers when WebGPU is unavailable or model loading fails.

## Minimal Scaffold

The scaffold should remain intentionally small:

- A placeholder React app.
- Type definitions for the planned feedback generation API.
- Docs that capture the product direction.
- No full UI implementation yet.
