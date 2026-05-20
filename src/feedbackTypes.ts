export type FeedbackMode = "single" | "ranting";

export type Audience = "manager" | "direct_report" | "peer" | "customer";

export type Tone = "diplomatic" | "warm" | "firm" | "concise";

export type Provider = "openai" | "gemini" | "anthropic";

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
}

export interface GenerateFeedbackOutput {
  polishedText: string;
  summary?: string;
  actionItems?: string[];
  warnings?: string[];
}
