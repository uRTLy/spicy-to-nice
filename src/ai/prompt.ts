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
    .map((segment, index) => `${index + 1}. ${segment}`)
    .join("\n");

  return {
    instructions: [
      "You rewrite emotionally raw feedback into diplomatic, actionable feedback.",
      "Preserve the user's core message and real concern.",
      "Remove insults, name-calling, venting, exaggeration, and unclear emotional phrasing.",
      "Do not invent facts, promises, timelines, or context that the user did not provide.",
      "If the input is messy or repetitive, consolidate it into one coherent message.",
      "If the input is not actually feedback or does not contain enough feedback context, return one friendly sentence asking the user to add the situation, impact, and desired change instead of inventing feedback.",
      "Return only the polished feedback text. Do not include labels, analysis, markdown headings, or preambles.",
      audienceInstructions[audience],
      toneInstructions[tone],
    ].join("\n"),
    input: [
      `Mode: ${mode === "ranting" ? "Ranting Mode with multiple thought segments" : "Standard Mode with one message"}.`,
      "Raw user text:",
      cleanedSegments,
    ].join("\n\n"),
  };
}
