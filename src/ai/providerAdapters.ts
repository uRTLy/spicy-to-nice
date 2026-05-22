import type {
  GenerateFeedbackInput,
  GenerateFeedbackOutput,
  Provider,
} from "../feedbackTypes";
import { FeedbackGenerationError } from "./errors";
import { buildFeedbackPrompt } from "./prompt";
import { generateWithWebLLM } from "./webllmAdapter";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = "gpt-5-mini";

export type NormalizedGenerateFeedbackInput = GenerateFeedbackInput & {
  segments: string[];
};

export interface FeedbackProviderAdapter {
  provider: Provider;
  generate(input: NormalizedGenerateFeedbackInput): Promise<GenerateFeedbackOutput>;
}

export const openAIAdapter: FeedbackProviderAdapter = {
  provider: "openai",
  async generate(input) {
    if (!input.apiKey?.trim()) {
      throw new FeedbackGenerationError("Enter an API key for OpenAI.");
    }

    const prompt = buildFeedbackPrompt(input);

    let response: Response;

    try {
      response = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey.trim()}`,
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
  },
};

export const localWebLLMAdapter: FeedbackProviderAdapter = {
  provider: "local",
  generate: generateWithWebLLM,
};

export function unavailableAdapter(providerName: string, provider: Provider): FeedbackProviderAdapter {
  return {
    provider,
    generate() {
      throw new FeedbackGenerationError(
        `${providerName} is not wired yet. Use OpenAI for this prototype.`,
      );
    },
  };
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
    const message = payload.error.message;
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("quota") || lowerMessage.includes("billing")) {
      return `${providerName} says this key has no remaining quota or billing is not enabled. Try a key from a project with API credits, or lower the project budget after testing.`;
    }

    if (lowerMessage.includes("invalid api key") || lowerMessage.includes("incorrect api key")) {
      return `${providerName} says this API key is invalid. Check that the key was copied fully and belongs to the selected project.`;
    }

    return `${providerName} rejected the request: ${message.replace(/https?:\/\/\S+/g, "").trim()}`;
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
