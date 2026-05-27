import type { FeedbackVariant, GenerateFeedbackOutput } from "../feedbackTypes";
import { FeedbackGenerationError } from "./errors";

const expectedVariantIds = ["balanced", "direct", "concise"];

type RawVariant = {
  id?: unknown;
  label?: unknown;
  text?: unknown;
  useCase?: unknown;
};

type RawFeedbackResponse = {
  variants?: unknown;
  warnings?: unknown;
};

export function parseFeedbackResponseText(text: string): GenerateFeedbackOutput {
  const parsed = parseJsonObject(text);

  if (!parsed) {
    return createSingleVariantOutput(text);
  }

  return normalizeFeedbackResponse(parsed);
}

export function createSingleVariantOutput(text: string): GenerateFeedbackOutput {
  const polishedText = cleanGeneratedText(text);

  assertDirectRewrite(polishedText);

  return {
    polishedText,
    variants: [
      {
        id: "balanced",
        label: "Balanced",
        text: polishedText,
        useCase: "Best default option.",
      },
    ],
    warnings: [],
  };
}

export function normalizeFeedbackResponse(raw: RawFeedbackResponse): GenerateFeedbackOutput {
  if (!Array.isArray(raw.variants)) {
    throw new FeedbackGenerationError(
      "The model did not return usable feedback variants. Try generating again.",
    );
  }

  const variants = raw.variants
    .map((variant, index) => normalizeVariant(variant as RawVariant, index))
    .filter((variant): variant is FeedbackVariant => Boolean(variant));

  if (variants.length === 0) {
    throw new FeedbackGenerationError(
      "The model did not return usable feedback text. Try generating again.",
    );
  }

  variants.forEach((variant) => assertDirectRewrite(variant.text));

  const warnings = Array.isArray(raw.warnings)
    ? raw.warnings.filter((warning): warning is string => typeof warning === "string")
    : [];

  return {
    polishedText: variants[0].text,
    variants,
    warnings,
  };
}

function normalizeVariant(variant: RawVariant, index: number): FeedbackVariant | null {
  if (!variant || typeof variant.text !== "string") {
    return null;
  }

  const id = expectedVariantIds[index] ?? `variant-${index + 1}`;
  const fallbackLabel = titleCase(id);
  const label =
    typeof variant.label === "string" && variant.label.trim() ? variant.label : fallbackLabel;
  const useCase =
    typeof variant.useCase === "string" && variant.useCase.trim()
      ? variant.useCase
      : "Alternative wording.";

  return {
    id,
    label,
    text: cleanGeneratedText(variant.text),
    useCase,
  };
}

function parseJsonObject(text: string): RawFeedbackResponse | null {
  const trimmed = stripCodeFence(text.trim());
  const direct = safeParse(trimmed);

  if (direct) {
    return direct;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return safeParse(trimmed.slice(start, end + 1));
}

function safeParse(value: string): RawFeedbackResponse | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as RawFeedbackResponse) : null;
  } catch {
    return null;
  }
}

function stripCodeFence(value: string) {
  return value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function cleanGeneratedText(text: string) {
  return text
    .trim()
    .replace(/^(?:here(?:'s| is)|sure[:,]?|polite rewrite:|rewrite:)\s+/i, "")
    .trim();
}

function assertDirectRewrite(text: string) {
  const badPatterns = [
    /<\s*segment\b/i,
    /\b(?:text|label|useCase)\s*=\s*["']/i,
    /\bI will now\b/i,
    /\braw (?:text|input|segments?)\b/i,
    /\bUser\s*\d+\s*:/i,
    /\bsegment\s*\d+\s*:/i,
    /\b(?:fuck(?:er|ing)?|shit|bullshit|asshole|idiot)\b/i,
  ];

  if (badPatterns.some((pattern) => pattern.test(text))) {
    throw new FeedbackGenerationError(
      "The model echoed the raw input instead of rewriting it. Try generating again or switch to OpenAI for a stronger rewrite.",
    );
  }
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
