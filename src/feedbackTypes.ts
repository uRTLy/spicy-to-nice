export type FeedbackMode = "single" | "ranting";

export type Audience = "manager" | "direct_report" | "peer" | "customer";

export type Tone = "diplomatic" | "warm" | "firm" | "concise";

export type Provider = "openai" | "gemini" | "anthropic" | "local";

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
