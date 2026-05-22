import type { Audience, FeedbackMode, Tone } from "../feedbackTypes";

const audienceInstructions: Record<Audience, string> = {
  manager:
    "The recipient is the user's manager. Keep it respectful, concise, and framed around impact, blockers, and requested support.",
  direct_report:
    "The recipient is the user's direct report. Keep it clear, fair, specific, and oriented toward coaching and expectations.",
  peer:
    "The recipient is the user's peer. Keep it collaborative, direct, and focused on shared outcomes.",
  customer:
    "The recipient is a customer. Keep it professional, service-minded, calm, and careful with accountability.",
};

const toneInstructions: Record<Tone, string> = {
  diplomatic:
    "Use a diplomatic tone: tactful, balanced, and respectful without dodging the core issue.",
  warm: "Use a warm tone: human, generous, and encouraging while still being specific.",
  firm: "Use a firm tone: direct, boundaried, and clear without sounding hostile.",
  concise: "Use a concise tone: short, specific, and free of unnecessary framing.",
};

export function buildFeedbackPrompt({
  segments,
  mode,
  audience,
  tone,
}: {
  segments: string[];
  mode: FeedbackMode;
  audience: Audience;
  tone: Tone;
}) {
  const cleanedSegments = segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment, index) => `<segment index="${index + 1}">\n${segment}\n</segment>`)
    .join("\n\n");

  return {
    instructions: [
      "You transform one person's emotionally raw feedback into diplomatic, actionable feedback.",
      "The raw segments are chronological notes from the same user. They are not separate people, speakers, or chat participants.",
      "Preserve the user's core message and real concern.",
      "Remove insults, name-calling, venting, exaggeration, and unclear emotional phrasing.",
      "Do not invent facts, promises, timelines, or context that the user did not provide.",
      "If the input is messy or repetitive, consolidate it into one coherent message.",
      "Write text that can be sent directly to the selected audience.",
      "Never restate, quote, enumerate, or label the raw input.",
      "Never write meta commentary such as 'I will now', 'Here is', 'User 1', 'User 2', 'raw text', 'segments', or 'thoughts'.",
      "Return exactly three variants: balanced, direct, and concise.",
      "The balanced variant is the default recommendation and should be broadly usable.",
      "If the input is not actually feedback or does not contain enough feedback context, each variant should be one friendly sentence asking the user to add the situation, impact, and desired change instead of inventing feedback.",
      audienceInstructions[audience],
      toneInstructions[tone],
    ].join("\n"),
    input: [
      `Mode: ${mode === "ranting" ? "Ranting Mode with multiple thought segments" : "Standard Mode with one message"}.`,
      "Rewrite these raw segments into sendable feedback variants:",
      cleanedSegments,
    ].join("\n\n"),
  };
}

export const feedbackResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    variants: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      description: "Three polished feedback variants for the user to choose from.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: {
            type: "string",
            enum: ["balanced", "direct", "concise"],
            description: "Stable identifier for the variant.",
          },
          label: {
            type: "string",
            description: "Short human-readable label for the variant.",
          },
          text: {
            type: "string",
            description:
              "The polished feedback text. It must be directly sendable and must not include preambles, raw input labels, or meta commentary.",
          },
          useCase: {
            type: "string",
            description: "Short explanation of when this variant is useful.",
          },
        },
        required: ["id", "label", "text", "useCase"],
      },
    },
    warnings: {
      type: "array",
      description:
        "Short user-facing warnings, such as missing context. Empty when there are no warnings.",
      items: {
        type: "string",
      },
    },
  },
  required: ["variants", "warnings"],
} as const;
