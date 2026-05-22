import type {
  GenerateFeedbackInput,
  GenerateFeedbackOutput,
  Provider,
  ProviderConfig,
} from "../feedbackTypes";
import { FeedbackGenerationError } from "./errors";
import {
  localWebLLMAdapter,
  openAIAdapter,
  unavailableAdapter,
  type FeedbackProviderAdapter,
} from "./providerAdapters";

export { FeedbackGenerationError } from "./errors";

export const providerConfigs: ProviderConfig[] = [
  {
    provider: "openai",
    label: "OpenAI",
    requiresApiKey: true,
    implemented: true,
  },
  {
    provider: "local",
    label: "Offline",
    requiresApiKey: false,
    implemented: true,
  },
  {
    provider: "gemini",
    label: "Gemini",
    requiresApiKey: true,
    implemented: false,
  },
  {
    provider: "anthropic",
    label: "Anthropic",
    requiresApiKey: true,
    implemented: false,
  },
];

const adapters: Record<Provider, FeedbackProviderAdapter> = {
  openai: openAIAdapter,
  local: localWebLLMAdapter,
  gemini: unavailableAdapter("Gemini", "gemini"),
  anthropic: unavailableAdapter("Anthropic", "anthropic"),
};

export async function generateFeedback(
  input: GenerateFeedbackInput,
): Promise<GenerateFeedbackOutput> {
  const segments = input.segments.map((segment) => segment.trim()).filter(Boolean);
  const config = providerConfigs.find((item) => item.provider === input.provider);

  if (segments.length === 0) {
    throw new FeedbackGenerationError("Add feedback before generating.");
  }

  if (!config) {
    throw new FeedbackGenerationError(`Unsupported provider: ${input.provider}`);
  }

  if (config.requiresApiKey && !input.apiKey?.trim()) {
    throw new FeedbackGenerationError(`Enter an API key for ${config.label}.`);
  }

  if (!config.implemented) {
    throw new FeedbackGenerationError(
      `${config.label} is planned but not fully wired yet. Use OpenAI for this prototype.`,
    );
  }

  return adapters[input.provider].generate({ ...input, segments });
}
