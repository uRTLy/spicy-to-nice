import rawFeedbackConfig from "./feedbackConfig.json";

export type ConfiguredId = string;

export type PromptOption = {
  id: ConfiguredId;
  label: string;
  prompt: string;
};

export type ReasoningOption = {
  id: ConfiguredId;
  label: string;
  description: string;
};

export type FeedbackConfig = {
  defaultAudienceId: ConfiguredId;
  defaultToneId: ConfiguredId;
  defaultReasoningEffortId: ConfiguredId;
  defaultSystemPrompt: string;
  audiences: PromptOption[];
  tones: PromptOption[];
  reasoningEfforts: ReasoningOption[];
};

export const feedbackConfig = validateFeedbackConfig(rawFeedbackConfig);

export const audienceOptions = feedbackConfig.audiences;
export const toneOptions = feedbackConfig.tones;
export const reasoningOptions = feedbackConfig.reasoningEfforts;

export const defaultAudienceId = feedbackConfig.defaultAudienceId;
export const defaultToneId = feedbackConfig.defaultToneId;
export const defaultReasoningEffortId = feedbackConfig.defaultReasoningEffortId;
export const defaultEditableSystemPrompt = feedbackConfig.defaultSystemPrompt;

export function getAudiencePrompt(audienceId: ConfiguredId) {
  return getPromptOption(feedbackConfig.audiences, audienceId, "audience").prompt;
}

export function getTonePrompt(toneId: ConfiguredId) {
  return getPromptOption(feedbackConfig.tones, toneId, "tone").prompt;
}

function getPromptOption(options: PromptOption[], id: ConfiguredId, groupName: string) {
  const option = options.find((item) => item.id === id);

  if (!option) {
    throw new Error(`Unknown ${groupName} id in feedback config: ${id}`);
  }

  return option;
}

function validateFeedbackConfig(value: unknown): FeedbackConfig {
  if (!isRecord(value)) {
    throw new Error("feedbackConfig.json must export an object.");
  }

  const audiences = readPromptOptions(value.audiences, "audiences");
  const tones = readPromptOptions(value.tones, "tones");
  const reasoningEfforts = readReasoningOptions(value.reasoningEfforts);
  const defaultAudienceId = readString(value.defaultAudienceId, "defaultAudienceId");
  const defaultToneId = readString(value.defaultToneId, "defaultToneId");
  const defaultReasoningEffortId = readString(
    value.defaultReasoningEffortId,
    "defaultReasoningEffortId",
  );
  const defaultSystemPrompt = readString(value.defaultSystemPrompt, "defaultSystemPrompt");

  assertIdExists(audiences, defaultAudienceId, "defaultAudienceId");
  assertIdExists(tones, defaultToneId, "defaultToneId");
  assertIdExists(reasoningEfforts, defaultReasoningEffortId, "defaultReasoningEffortId");

  return {
    defaultAudienceId,
    defaultToneId,
    defaultReasoningEffortId,
    defaultSystemPrompt,
    audiences,
    tones,
    reasoningEfforts,
  };
}

function readPromptOptions(value: unknown, fieldName: string): PromptOption[] {
  const options = readArray(value, fieldName).map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${fieldName}[${index}] must be an object.`);
    }

    return {
      id: readString(item.id, `${fieldName}[${index}].id`),
      label: readString(item.label, `${fieldName}[${index}].label`),
      prompt: readString(item.prompt, `${fieldName}[${index}].prompt`),
    };
  });

  assertUniqueIds(options, fieldName);

  return options;
}

function readReasoningOptions(value: unknown): ReasoningOption[] {
  const options = readArray(value, "reasoningEfforts").map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`reasoningEfforts[${index}] must be an object.`);
    }

    return {
      id: readString(item.id, `reasoningEfforts[${index}].id`),
      label: readString(item.label, `reasoningEfforts[${index}].label`),
      description: readString(item.description, `reasoningEfforts[${index}].description`),
    };
  });

  assertUniqueIds(options, "reasoningEfforts");

  return options;
}

function readArray(value: unknown, fieldName: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`feedbackConfig.${fieldName} must be a non-empty array.`);
  }

  return value;
}

function readString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`feedbackConfig.${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function assertUniqueIds(options: Array<{ id: string }>, fieldName: string) {
  const seen = new Set<string>();

  options.forEach((option) => {
    if (seen.has(option.id)) {
      throw new Error(`feedbackConfig.${fieldName} contains a duplicate id: ${option.id}`);
    }

    seen.add(option.id);
  });
}

function assertIdExists(options: Array<{ id: string }>, id: string, fieldName: string) {
  if (!options.some((option) => option.id === id)) {
    throw new Error(`feedbackConfig.${fieldName} points to missing id: ${id}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
