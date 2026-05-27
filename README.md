# Spicy-to-Nice

Spicy-to-Nice is a lightweight web app concept for turning raw, frustrated, emotionally messy feedback into diplomatic, actionable feedback.

The core idea: people often have useful feedback buried inside a rant. The app helps preserve the real message while removing the heat, insults, and ambiguity.

## Product Direction

The first version should stay intentionally simple:

- Paste or write raw feedback.
- Choose the audience and tone.
- Generate a polished feedback draft.
- Support a special Ranting Mode for collecting multiple stream-of-thought messages before generating one final response.

The current prototype is a working static app with a polished input flow, real OpenAI BYOK generation, and an experimental browser-local WebLLM mode.

## Live Demo

- App: https://urtly.github.io/spicy-to-nice/
- Project notes / sanitized build transcript: https://urtly.github.io/spicy-to-nice/#/conversation
- Repository: https://github.com/uRTLy/spicy-to-nice

The hosted demo does not include an API key. To test hosted generation, paste a temporary OpenAI API key into **AI setup**. The key is held in memory only and clears on refresh.

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
.github/workflows/
  deploy-pages.yml
docs/
  AI-team-take-home-test.pdf
  API_SKETCH.md
  CONVERSATION_EXPORT.md
  LLM_OUTPUT_PATTERNS.md
  PRODUCT_IDEA.md
  PRODUCT_REVIEW.md
  TECH_PLAN.md
  WEBLLM_PLAN.md
public/
  transcript/
src/
  App.tsx
  ai/
  config/
    feedbackConfig.json
    feedbackConfig.ts
  features/translator/
  main.tsx
```

## Local Development

```bash
npm ci
npm run dev -- --host 127.0.0.1
```

For local testing, open the Vite URL, paste a temporary provider key into the API key field, and try both Standard Mode and Ranting Mode. The app keeps the key in memory only, so refreshing the page clears it.

## Demo Script

1. Open the app and choose **Standard** mode.
2. Paste a frustrated feedback message.
3. Open **AI setup**, keep **OpenAI** selected, and paste a temporary API key.
4. Choose an audience and tone.
5. Generate, compare the Before/After cards, switch variants, and copy the result.
6. Switch to **Ranting** mode, press Enter after each thought, then Generate once to combine the thread.
7. Open **How this was built** to review the sanitized collaboration log.

Example input:

```text
This launch process is a mess. We keep finding blockers at the last minute because nobody is writing down owners or deadlines. I need the team to stop treating QA feedback like an interruption and actually close the loop before launch week.
```

Offline mode can be tested without a provider key, but it requires a WebGPU-capable browser and a first-run model download.

## Current Prototype

- OpenAI browser BYOK generation is wired.
- Gemini and Anthropic are documented placeholders behind the same provider abstraction.
- Standard Mode supports Enter to generate and Shift+Enter for multiline text.
- Ranting Mode behaves like a message composer: Enter captures each thought, then Generate combines the saved thread.
- Output shows before and after drafts with a copy button.
- Generation returns balanced, direct, and concise variants for the user to choose from.
- Very short input asks for confirmation before generating, so terse tests still work when intentional.
- Offline generation is wired through WebLLM/WebGPU with a worker-backed local adapter and typed model catalog.
- Local model downloads live in the top provider bar, with status labels and progress shown there.
- The model picker sits next to Generate and stays focused on selection: hosted models plus downloaded local models.
- Tiny local models use a simpler one-draft prompt; larger local or hosted models can return multiple variants.
- Audience, tone, reasoning options, and default rewrite preferences are loaded from `src/config/feedbackConfig.json`.
- Hosted model options live in `src/ai/hostedModels.json`; browser-local model options live in `src/ai/localModels.json`.
- Sanitized project notes are available at `#/conversation` inside the running app.

## Deployment

The app deploys to GitHub Pages from `main` through `.github/workflows/deploy-pages.yml`.

```bash
npm run build
```

Production builds use Vite's `/spicy-to-nice/` base path for GitHub Pages. Local dev keeps `/` as the base path.

## Conversation Export

This repo includes a sanitized transcript export for the in-app project notes page.

```bash
npm run export:conversation
```

The exporter keeps visible user/assistant messages and exported screenshots, while omitting hidden instructions, reasoning, tool payloads, and raw command output. See `docs/CONVERSATION_EXPORT.md` for the privacy checklist and optional third-party transcript tools.

## Notes on API Keys

The prototype uses browser BYOK: the user pastes an API key into the app and the app sends requests directly to the selected provider.

Current safety rules:

- Keys are kept in React memory only.
- Keys are not saved to `localStorage`, `sessionStorage`, cookies, or URL parameters.
- Refreshing or closing the tab clears the key.
- Keys must never be committed to this repository.
- Use restricted, revocable, low-budget keys when possible.

Browser BYOK is convenient for a static prototype, but it cannot truly hide the key from the page runtime. Avoid adding third-party analytics, remote scripts, or unnecessary dependencies while this mode is active.
