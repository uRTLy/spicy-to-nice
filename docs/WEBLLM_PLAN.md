# WebLLM Offline Provider Plan

## Recommendation

Use WebLLM as the first local/offline provider experiment.

WebLLM is a better fit than Transformers.js for this app because the task is chat-style rewriting, not generic browser ML. It exposes an OpenAI-like chat completions interface, supports Web Workers, caches downloaded model artifacts, and is built around WebGPU browser inference.

## Product Positioning

Offline mode should be explicit:

- Show it as a provider option named `Offline`.
- Do not silently fall back to Offline when OpenAI fails.
- If hosted generation fails and WebGPU exists, offer a clear "Try Offline" path later.
- Explain that the first run downloads a model and can take time.
- Explain that user text stays local during offline generation.

## Provider Shape

Add a provider behind the same abstraction used by hosted models:

```ts
type Provider = "openai" | "gemini" | "anthropic" | "local";
```

Provider config:

```ts
{
  provider: "local",
  label: "Offline",
  requiresApiKey: false,
  implemented: true
}
```

Validation changes:

- Require `apiKey` only when `provider.requiresApiKey` is true.
- Hide or disable the API key field when Offline is selected.
- Check `navigator.gpu` before attempting model initialization.

## Implementation Steps

1. Install and pin `@mlc-ai/web-llm`.
2. Add `src/ai/webllmAdapter.ts`.
3. Dynamically import WebLLM only when the local provider is selected.
4. Initialize a worker-backed engine once and keep it in module state.
5. Reuse `buildFeedbackPrompt()` to create the same rewrite instructions used by hosted providers.
6. Map the prompt to chat messages:

```ts
[
  { role: "system", content: prompt.instructions },
  { role: "user", content: prompt.input }
]
```

7. Use low-temperature generation:

```ts
{
  temperature: 0.3,
  max_tokens: 300,
  stream: false
}
```

8. Add progress states:

- Checking browser support
- Downloading model
- Loading model
- Generating locally
- Model cached
- Offline unavailable

## Model Candidates

Default candidate:

- `Llama-3.2-1B-Instruct-q4f16_1-MLC`
- Practical quality floor for short English rewrite tasks.
- Current WebLLM config lists roughly 879 MB VRAM required.

Lower-end compatibility candidate:

- `SmolLM2-360M-Instruct-q4f16_1-MLC`
- Smaller and more likely to load on constrained devices.
- Lower quality for nuance, tone preservation, and interpersonal context.

Better quality candidates for later:

- `Llama-3.2-3B-Instruct-q4f16_1-MLC`
- `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`

These should be advanced options because they need more memory and patience.

## Risks

- First-run downloads are large.
- WebGPU support varies across browsers and devices.
- GPU memory can be insufficient even when `navigator.gpu` exists.
- Small models may over-soften, omit details, or miss tone nuance.
- WebLLM model IDs and compiled artifacts are version-coupled, so dependency and model versions should be pinned together.
- Browser cache eviction can force re-downloads.

## Rollout Plan

Phase 1:

- Keep BYOK OpenAI as the reliable demo path.
- Document Offline as planned.

Phase 2:

- Add Offline provider behind a feature flag or visible experimental label.
- Load one pinned small model.
- Add support/progress UI.

Phase 3:

- Add a small model selector.
- Add quality guidance: "Fastest" vs "Better rewrite."
- Add a manual "Try Offline" recovery button for quota or billing errors from hosted providers.

## Sources

- [WebLLM README](https://github.com/mlc-ai/web-llm)
- [WebLLM API reference](https://webllm.mlc.ai/docs/user/api_reference.html)
- [Hugging Face Transformers.js WebGPU guide](https://huggingface.co/docs/transformers.js/guides/webgpu)
- [Chrome WebGPU overview](https://developer.chrome.com/docs/web-platform/webgpu/overview)
