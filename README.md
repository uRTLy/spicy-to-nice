# Spicy-to-Nice

Spicy-to-Nice is a lightweight web app concept for turning raw, frustrated, emotionally messy feedback into diplomatic, actionable feedback.

The core idea: people often have useful feedback buried inside a rant. The app helps preserve the real message while removing the heat, insults, and ambiguity.

## Product Direction

The first version should stay intentionally simple:

- Paste or write raw feedback.
- Choose the audience and tone.
- Generate a polished feedback draft.
- Support a special Ranting Mode for collecting multiple stream-of-thought messages before generating one final response.

The frontend design is still intentionally open. This repository starts with the technical foundation and product docs, not a finished UI.

## Planned Stack

- Vite
- React
- TypeScript
- Plain CSS or CSS modules
- Static CDN deployment
- Bring-your-own-key AI provider calls for the first prototype

Hosted AI providers under consideration:

- OpenAI as the primary candidate.
- Google Gemini as a low-cost alternative.
- Anthropic as a later candidate depending on browser/API constraints.

Future options:

- Serverless proxy for app-owned protected API keys.
- More local browser inference options after the first WebLLM/WebGPU path.

## Repository Structure

```text
docs/
  AI-team-take-home-test.pdf
  API_SKETCH.md
  LLM_OUTPUT_PATTERNS.md
  PRODUCT_IDEA.md
  PRODUCT_REVIEW.md
  TECH_PLAN.md
  WEBLLM_PLAN.md
src/
  App.tsx
  main.tsx
```

## Local Development

```bash
npm install
npm run dev
```

For local testing, open the Vite URL, paste a temporary provider key into the API key field, and try both Standard Mode and Ranting Mode. The app keeps the key in memory only, so refreshing the page clears it.

## Current Prototype

- OpenAI browser BYOK generation is wired.
- Gemini and Anthropic are documented placeholders behind the same provider abstraction.
- Standard Mode supports Enter to generate and Shift+Enter for multiline text.
- Ranting Mode behaves like a message composer: Enter captures each thought, then Generate combines the saved thread.
- Output shows before and after drafts with a copy button.
- Generation returns balanced, direct, and concise variants for the user to choose from.
- Very short input asks for confirmation before generating, so terse tests still work when intentional.
- Offline generation is wired through WebLLM/WebGPU with a worker-backed local adapter and typed model catalog.
- Sanitized project notes are available at `/conversation` inside the running app.

## Conversation Export

This repo includes a sanitized transcript export for the in-app project notes page.

```bash
npm run export:conversation
```

The exporter keeps visible user/assistant messages and omits hidden instructions, reasoning, tool payloads, and raw command output. See `docs/CONVERSATION_EXPORT.md` for the privacy checklist and optional third-party transcript tools.

## Notes on API Keys

The prototype uses browser BYOK: the user pastes an API key into the app and the app sends requests directly to the selected provider.

Current safety rules:

- Keys are kept in React memory only.
- Keys are not saved to `localStorage`, `sessionStorage`, cookies, or URL parameters.
- Refreshing or closing the tab clears the key.
- Keys must never be committed to this repository.
- Use restricted, revocable, low-budget keys when possible.

Browser BYOK is convenient for a static prototype, but it cannot truly hide the key from the page runtime. Avoid adding third-party analytics, remote scripts, or unnecessary dependencies while this mode is active.
