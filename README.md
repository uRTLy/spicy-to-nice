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
- Local browser inference via WebLLM/WebGPU as an experimental privacy mode.

## Repository Structure

```text
docs/
  AI-team-take-home-test.pdf
  API_SKETCH.md
  PRODUCT_IDEA.md
  TECH_PLAN.md
src/
  App.tsx
  main.tsx
```

## Local Development

```bash
npm install
npm run dev
```

## Notes on API Keys

The initial direction is bring-your-own-key. No provider keys should be committed to this repository. If the prototype stores a key locally later, the UI should clearly disclose where and how it is stored.
