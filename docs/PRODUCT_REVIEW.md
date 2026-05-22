# Product Review And Cleanup Plan

## Current Product Shape

Spicy-to-Nice is now a focused prototype with three clear pieces:

- Input capture: Standard Mode and Ranting Mode.
- Rewrite settings: audience, tone, and provider.
- Output review: before/after draft with copy action.

That is enough to answer the core take-home concept without turning the app into a generic chat client.

## What Is Working

- Ranting Mode has a distinct mental model: fast message capture first, rewrite later.
- The provider abstraction keeps hosted AI separate from React UI code.
- Browser BYOK is memory-only and keeps the app static/CDN-friendly.
- Before/after output makes the transformation easier to evaluate.
- Short-input confirmation avoids blocking terse intentional tests.

## Cleanup Priorities

1. Keep the React component focused on UI state only.
2. Move model/provider complexity into `src/ai`.
3. Treat Offline/WebLLM as a provider with its own loading states, not as a special case inside the UI.
4. Keep supported local models in `src/ai/localModels.json` so they are easy to extend or remove.
5. Avoid adding model downloads, SDKs, analytics, or proxy logic to the initial page load.

## Proposed AI Architecture

```text
App.tsx
  -> generateFeedback()
    -> provider config validation
    -> provider adapter
      -> OpenAI adapter
      -> Gemini adapter later
      -> Anthropic adapter later
      -> Local WebLLM adapter later

Local WebLLM adapter
  -> LLMDownloader
    -> localModels.json
    -> WebGPU support check
    -> WebLLM app config
    -> progress events
```

## UX Gaps To Close Next

- Add an explicit Offline provider loading panel.
- Add a local-model picker only after the first Offline model works.
- Add a demo/sample-rant button for recruiters who do not have an API key ready.
- Add clearer quota/billing guidance for OpenAI key errors.
- Add a small model bakeoff set with saved examples and expected qualities.

## Local Model Decision

Default to `Llama-3.2-1B-Instruct-q4f16_1-MLC` first because it has the best balance for this task:

- Good enough instruction following for feedback rewriting.
- Lower VRAM than Qwen2.5 1.5B and Llama 3.2 3B.
- Better likely nuance than the tiny compatibility models.
- Supported by WebLLM's prebuilt model config.

Keep `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` as the first quality challenger.
