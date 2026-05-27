# WebLLM Offline Provider Plan

## Recommendation

Use WebLLM as the first local/offline provider experiment.

WebLLM is a better fit than Transformers.js for this app because the task is chat-style rewriting, not generic browser ML. It exposes an OpenAI-like chat completions interface, supports Web Workers, caches downloaded model artifacts, and is built around WebGPU browser inference.

## Product Positioning

Offline mode should be explicit:

- Show it as a provider option named `Offline`.
- Do not silently fall back to Offline when OpenAI fails.
- If hosted generation fails and WebGPU exists, offer a clear "Try Offline" path later.
- Keep local model downloads in the top provider bar with clear `Download`, `Downloaded`, progress, and error states.
- Keep the Generate-adjacent model picker focused on selecting hosted models or already downloaded local models.
- Explain that the first run downloads a model into browser-managed cache and can take time.
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

The codebase now has the first abstraction layer in place:

- `src/ai/localModels.json`: extendable model catalog with URLs, download estimates, VRAM estimates, and model metadata.
- `src/ai/hostedModels.json`: extendable hosted-model catalog for OpenAI models shown in the same model picker.
- `src/ai/localModelCatalog.ts`: typed helpers for reading the catalog and building WebLLM app config records.
- `src/ai/llmDownloader.ts`: local-model download/support/progress planning layer.
- `src/ai/providerAdapters.ts`: hosted/local provider adapter seam.

## Implementation Status

The app now has a first working Offline provider path:

- `@mlc-ai/web-llm` is pinned to `0.2.83`.
- `src/ai/webllm.worker.ts` hosts WebLLM in a module worker.
- `src/ai/webllmAdapter.ts` dynamically imports WebLLM, initializes the selected model, and calls the same prompt builder used by OpenAI.
- `src/ai/llmDownloader.ts` emits support, download, load, ready, and error progress for the React UI.
- The provider selector includes Offline as an implemented option; the UI now requires a model to be downloaded before it can be selected for Offline generation.
- `src/ModelSelector.tsx` presents hosted and local models together for selection; local download actions and progress live in the top provider bar.
- Tiny local models use a simpler plain-text rewrite prompt and return one balanced draft, because they are not reliable enough for strict JSON and three variants.

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
- Downloaded in browser cache
- Selected for Offline generation
- Offline unavailable

## Model Candidates

Default smallest candidate:

- `SmolLM2-360M-Instruct-q4f16_1-MLC`
- Best first-run UX for Offline mode: roughly 198 MB downloaded and 376 MB VRAM required.
- Lower quality for nuance, tone preservation, and interpersonal context, so present larger models as easy upgrade choices.

Quality-balanced candidate:

- `Llama-3.2-1B-Instruct-q4f16_1-MLC`
- Practical quality floor for short English rewrite tasks.
- Current WebLLM config lists roughly 879 MB VRAM required.
- Hugging Face file metadata totals roughly 672 MB downloaded.

Better quality candidates for later:

- `Llama-3.2-3B-Instruct-q4f16_1-MLC`
- `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`

`Qwen2.5-1.5B-Instruct-q4f16_1-MLC` is an especially interesting quality candidate: roughly 840 MB downloaded and 1.63 GB VRAM required. `Llama-3.2-3B-Instruct-q4f16_1-MLC` is heavier at roughly 1.73 GB downloaded and 2.26 GB VRAM required. These should be advanced options because they need more memory and patience.

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
- Document Offline as experimental because browser/device support still varies.

Phase 2:

- Done: add Offline provider, load one pinned small model by default, and add support/progress UI.

Phase 3:

- Done: add a compact active-model selector beside Generate, with hosted models and downloaded local selection, while downloads stay in the top provider bar.
- Done: adapt local generation by model size: tiny models get a simpler single-draft task, while larger local models keep the structured variant task.
- Add quality guidance: "Fastest" vs "Better rewrite."
- Add a manual "Try Offline" recovery button for quota or billing errors from hosted providers.

## Sources

- [WebLLM README](https://github.com/mlc-ai/web-llm)
- [WebLLM API reference](https://webllm.mlc.ai/docs/user/api_reference.html)
- [Hugging Face Transformers.js WebGPU guide](https://huggingface.co/docs/transformers.js/guides/webgpu)
- [Chrome WebGPU overview](https://developer.chrome.com/docs/web-platform/webgpu/overview)
