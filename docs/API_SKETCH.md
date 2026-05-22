# API Sketch

This document captures the planned internal API shape. It is intentionally lightweight and can evolve once the frontend design is clearer.

## Core Types

```ts
export type FeedbackMode = "single" | "ranting";

export type Audience =
  | "manager"
  | "direct_report"
  | "peer"
  | "customer";

export type Tone =
  | "diplomatic"
  | "warm"
  | "firm"
  | "concise";

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
  localModelId?: string;
}

export interface GenerateFeedbackOutput {
  polishedText: string;
  summary?: string;
  actionItems?: string[];
  warnings?: string[];
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

The prompt builder should be separate from both the UI and provider adapters. Local model selection should read from `src/ai/localModels.json`, not hardcoded strings in components.

The first working adapter is OpenAI. Gemini and Anthropic should keep the same interface and can be added without changing UI state shape.

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

## Prompt Builder Responsibilities

The prompt builder should:

- Combine `segments` into one coherent source text.
- Explain whether the user used Standard Mode or Ranting Mode.
- Include the intended audience and tone.
- Ask the model to preserve the core message.
- Ask the model to remove insults, emotional excess, and unclear phrasing.
- Ask the model not to invent facts.

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
