import type { Audience, FeedbackMode, Tone } from "../feedbackTypes";
import {
  defaultEditableSystemPrompt,
  getAudiencePrompt,
  getTonePrompt,
} from "../config/feedbackConfig";

export function buildFeedbackPrompt({
  segments,
  mode,
  audience,
  systemPrompt,
  tone,
}: {
  segments: string[];
  mode: FeedbackMode;
  audience: Audience;
  systemPrompt?: string;
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
      "Follow these user-editable rewrite preferences unless they conflict with the required output format or factuality rules:",
      systemPrompt?.trim() || defaultEditableSystemPrompt,
      getAudiencePrompt(audience),
      getTonePrompt(tone),
    ].join("\n"),
    input: [
      `Mode: ${mode === "ranting" ? "Ranting Mode with multiple thought segments" : "Standard Mode with one message"}.`,
      "Rewrite these raw segments into sendable feedback variants:",
      cleanedSegments,
    ].join("\n\n"),
  };
}

export function buildTinyLocalFeedbackPrompt({
  segments,
  audience,
  systemPrompt,
  tone,
}: {
  segments: string[];
  audience: Audience;
  systemPrompt?: string;
  tone: Tone;
}) {
  const cleanedSegments = segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("\n");

  return {
    instructions: [
      "Rewrite rude or frustrated feedback into one calm, sendable message.",
      "Return only the rewritten message.",
      "Do not return JSON, XML, tags, labels, explanations, quotes, or bullet points.",
      "Remove profanity, insults, threats, and emotional excess.",
      "Keep the useful concern and requested change.",
      "Do not use the exact insulting words from the original.",
      "Do not invent facts, promises, timelines, or context.",
      systemPrompt?.trim() || defaultEditableSystemPrompt,
      getAudiencePrompt(audience),
      getTonePrompt(tone),
    ].join("\n"),
    input: ["Raw feedback:", cleanedSegments, "Polite rewrite:"].join("\n\n"),
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
