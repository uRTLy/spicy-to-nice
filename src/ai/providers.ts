import type {
  GenerateFeedbackInput,
  GenerateFeedbackOutput,
  Provider,
  ProviderConfig,
} from "../feedbackTypes";
import { buildFeedbackPrompt } from "./prompt";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = "gpt-5-mini";

export class FeedbackGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackGenerationError";
  }
}

export const providerConfigs: ProviderConfig[] = [
  {
    provider: "openai",
    label: "OpenAI",
    requiresApiKey: true,
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

export async function generateFeedback(
  input: GenerateFeedbackInput,
): Promise<GenerateFeedbackOutput> {
  const segments = input.segments.map((segment) => segment.trim()).filter(Boolean);

  if (segments.length === 0) {
    throw new FeedbackGenerationError("Add feedback before generating.");
  }

  if (!input.apiKey?.trim()) {
    throw new FeedbackGenerationError("Enter an API key for the selected provider.");
  }

  switch (input.provider) {
    case "openai":
      return openaiAdapter({ ...input, segments, apiKey: input.apiKey.trim() });
    case "gemini":
      return unavailableAdapter("Gemini");
    case "anthropic":
      return unavailableAdapter("Anthropic");
    default:
      return assertNever(input.provider);
  }
}

async function openaiAdapter(
  input: GenerateFeedbackInput & { apiKey: string },
): Promise<GenerateFeedbackOutput> {
  const prompt = buildFeedbackPrompt(input);

  let response: Response;

  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: prompt.instructions,
        input: prompt.input,
      }),
    });
  } catch {
    throw new FeedbackGenerationError(
      "Could not reach OpenAI. Check your connection and try again.",
    );
  }

  const payload = await safeJson(response);

  if (!response.ok) {
    throw new FeedbackGenerationError(readProviderError(payload, "OpenAI"));
  }

  const polishedText = extractOpenAIText(payload);

  if (!polishedText) {
    throw new FeedbackGenerationError(
      "OpenAI returned an empty response. Try again with more specific input.",
    );
  }

  return { polishedText };
}

function unavailableAdapter(providerName: string): Promise<GenerateFeedbackOutput> {
  throw new FeedbackGenerationError(
    `${providerName} is not wired yet. Use OpenAI for this prototype.`,
  );
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readProviderError(payload: unknown, providerName: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return `${providerName} rejected the request: ${payload.error.message}`;
  }

  return `${providerName} rejected the request. Check the key and try again.`;
}

function extractOpenAIText(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "output_text" in payload &&
    typeof payload.output_text === "string"
  ) {
    return payload.output_text.trim();
  }

  if (!payload || typeof payload !== "object" || !("output" in payload)) {
    return "";
  }

  const { output } = payload;

  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object" || !("content" in item)) {
        return [];
      }

      const { content } = item;

      if (!Array.isArray(content)) {
        return [];
      }

      return content
        .map((contentItem) => {
          if (
            contentItem &&
            typeof contentItem === "object" &&
            "text" in contentItem &&
            typeof contentItem.text === "string"
          ) {
            return contentItem.text;
          }

          return "";
        })
        .filter(Boolean);
    })
    .join("\n")
    .trim();
}

function assertNever(value: never): never {
  throw new FeedbackGenerationError(`Unsupported provider: ${value}`);
}
