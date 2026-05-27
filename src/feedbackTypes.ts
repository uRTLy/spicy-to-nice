export type FeedbackMode = "single" | "ranting";

export type Audience = string;

export type Tone = string;

export type Provider = "openai" | "gemini" | "anthropic" | "local";

export type ReasoningEffort = string;

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
  reasoningEffort?: ReasoningEffort;
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
