# API Sketch

This document captures the planned internal API shape. It is intentionally lightweight and can evolve once the frontend design is clearer.

## Core Types

```ts
export type FeedbackMode = "single" | "ranting";

export type Audience = string;

export type Tone = string;

export type Provider =
  | "openai"
  | "gemini"
  | "anthropic"
  | "local";

export interface ProviderConfig {
  provider: Provider;
  label: string;
  requiresApiKey: boolean;
  implemented: boolean;
}

export interface GenerateFeedbackInput {
  segments: string[];
  mode: FeedbackMode;
  audience: Audience;
  tone: Tone;
  provider: Provider;
  apiKey?: string;
  modelId?: string;
  reasoningEffort?: string;
  systemPrompt?: string;
  localModelId?: string;
}

export interface GenerateFeedbackOutput {
  polishedText: string;
  variants?: FeedbackVariant[];
  summary?: string;
  actionItems?: string[];
  warnings?: string[];
}

export interface FeedbackVariant {
  id: string;
  label: string;
  text: string;
  useCase: string;
}
```

## Provider Abstraction

The UI should call one internal function:

```ts
generateFeedback(input: GenerateFeedbackInput): Promise<GenerateFeedbackOutput>
```

Provider-specific implementation details should live behind adapters:

- `openaiAdapter`
- `geminiAdapter`
- `anthropicAdapter`
- `localWebLLMAdapter`

The prompt builder should be separate from both the UI and provider adapters. Audience, tone, default rewrite preferences, and OpenAI reasoning controls should read from `src/config/feedbackConfig.json`. Local model selection should read from `src/ai/localModels.json`, not hardcoded strings in components.

The first hosted working adapter is OpenAI. Offline WebLLM also uses this interface. Gemini and Anthropic should keep the same interface and can be added without changing UI state shape.

## Feedback Configuration

Rewrite controls are config-driven:

- `src/config/feedbackConfig.json` stores audience IDs, tone IDs, labels, prompt snippets, reasoning options, and defaults.
- `src/config/feedbackConfig.ts` validates the JSON once at module load and exports safe option arrays for React.
- `Audience`, `Tone`, and `ReasoningEffort` stay conservative `string` IDs for now, because the app reads them from runtime JSON. Literal types can be generated later if config stability becomes more important than editability.

## Local Model Download Abstraction

Offline generation should flow through an explicit downloader/planner:

```ts
const plan = llmDownloader.getPlan("llama-3.2-1b-instruct-q4f16_1");
await llmDownloader.prepare(plan.model.id);
```

The downloader is responsible for:

- Checking WebGPU support.
- Exposing estimated download and VRAM requirements.
- Building the WebLLM app config from the typed model catalog.
- Emitting download/loading progress for React.
- Keeping model URLs and model-library URLs out of the UI.

The runtime path lives in `src/ai/webllmAdapter.ts` and uses a worker-backed WebLLM engine so model loading and generation do not block the React UI thread.

## Prompt Builder Responsibilities

The prompt builder should:

- Combine `segments` into one coherent source text.
- Explain whether the user used Standard Mode or Ranting Mode.
- Include the configured prompt snippets for the intended audience and tone.
- Ask the model to preserve the core message.
- Ask the model to remove insults, emotional excess, and unclear phrasing.
- Ask the model not to invent facts.
- Ask for direct sendable output, not commentary about the transformation.
- Treat Ranting Mode segments as one user's chronological notes, not multiple speakers.
- Return balanced, direct, and concise variants.

## Ranting Mode Handling

For Ranting Mode, the app should pass all collected segments in order.

The model should receive instructions to:

- Merge repeated points.
- Identify the central complaint.
- Turn emotion into concrete observations.
- Produce one final polished response.

## Error Cases

Expected client-side errors:

- Empty `segments`.
- Missing API key for a hosted provider.
- Unsupported provider.
- Provider request failure.
- Provider response missing usable text.

## Browser BYOK Rules

- Keep API keys in memory-only React state.
- Do not save keys to localStorage, sessionStorage, cookies, IndexedDB, or URLs.
- Do not log keys.
- Do not include keys in displayed errors.
- Keep provider request code isolated in adapter modules for easier review.
