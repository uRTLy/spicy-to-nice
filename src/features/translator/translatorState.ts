import { defaultHostedModelId } from "../../ai/hostedModelCatalog";
import { defaultLocalModelId } from "../../ai/localModelCatalog";
import {
  defaultAudienceId,
  defaultEditableSystemPrompt,
  defaultReasoningEffortId,
  defaultToneId,
} from "../../config/feedbackConfig";
import type {
  Audience,
  FeedbackMode,
  FeedbackVariant,
  Provider,
  ReasoningEffort,
  Tone,
} from "../../feedbackTypes";

export type Segment = {
  id: string;
  text: string;
};

export type OutputState =
  | { status: "idle"; text: string }
  | { status: "loading"; text: string }
  | { status: "success"; text: string }
  | { status: "error"; text: string; message: string };

export type TranslatorState = {
  mode: FeedbackMode;
  audience: Audience;
  tone: Tone;
  provider: Provider;
  hostedModelId: string;
  localModelId: string;
  reasoningEffort: ReasoningEffort;
  systemPrompt: string;
  apiKey: string;
  draft: string;
  segments: Segment[];
  output: OutputState;
  variants: FeedbackVariant[];
  selectedVariantId: string;
  warnings: string[];
  shortInputConfirmationPending: boolean;
  lastSourceText: string;
  copyStatus: "idle" | "copied" | "failed";
};

export type TranslatorAction =
  | { type: "switch_mode"; mode: FeedbackMode }
  | { type: "set_audience"; audience: Audience }
  | { type: "set_tone"; tone: Tone }
  | { type: "set_provider"; provider: Provider }
  | { type: "set_hosted_model"; hostedModelId: string }
  | { type: "set_local_model"; localModelId: string }
  | { type: "set_reasoning_effort"; reasoningEffort: ReasoningEffort }
  | { type: "set_system_prompt"; systemPrompt: string }
  | { type: "reset_system_prompt" }
  | { type: "set_api_key"; apiKey: string }
  | { type: "set_draft"; draft: string }
  | { type: "add_segment"; segment: Segment }
  | { type: "remove_segment"; id: string }
  | { type: "short_input_confirmation_requested" }
  | { type: "generation_started" }
  | { type: "generation_succeeded"; text: string; variants: FeedbackVariant[]; warnings: string[] }
  | { type: "generation_failed"; message: string }
  | { type: "select_variant"; id: string }
  | { type: "copy_succeeded" }
  | { type: "copy_failed" }
  | { type: "copy_reset" };

export const initialOutputText = "Your polished feedback will appear here.";

export const initialTranslatorState: TranslatorState = {
  mode: "single",
  audience: defaultAudienceId,
  tone: defaultToneId,
  provider: "openai",
  hostedModelId: defaultHostedModelId,
  localModelId: defaultLocalModelId,
  reasoningEffort: defaultReasoningEffortId,
  systemPrompt: defaultEditableSystemPrompt,
  apiKey: "",
  draft: "",
  segments: [],
  output: { status: "idle", text: initialOutputText },
  variants: [],
  selectedVariantId: "",
  warnings: [],
  shortInputConfirmationPending: false,
  lastSourceText: "",
  copyStatus: "idle",
};

export function makeSegment(text: string): Segment {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    text,
  };
}

export function getSegmentsForGeneration(state: TranslatorState) {
  if (state.mode === "ranting") {
    return [...state.segments.map((segment) => segment.text), state.draft.trim()].filter(Boolean);
  }

  return state.draft.trim() ? [state.draft.trim()] : [];
}

export function translatorReducer(
  state: TranslatorState,
  action: TranslatorAction,
): TranslatorState {
  if (state.output.status === "loading") {
    switch (action.type) {
      case "switch_mode":
      case "set_audience":
      case "set_tone":
      case "set_provider":
      case "set_hosted_model":
      case "set_local_model":
      case "set_reasoning_effort":
      case "set_system_prompt":
      case "reset_system_prompt":
      case "set_api_key":
      case "set_draft":
      case "add_segment":
      case "remove_segment":
        return state;
    }
  }

  switch (action.type) {
    case "switch_mode": {
      if (action.mode === state.mode || state.output.status === "loading") {
        return state;
      }

      if (state.mode === "single" && action.mode === "ranting") {
        const draft = state.draft.trim();

        return {
          ...state,
          mode: "ranting",
          draft: "",
          segments: draft ? [makeSegment(draft)] : [],
          output: clearError(state.output),
        };
      }

      if (state.mode === "ranting" && action.mode === "single") {
        const combinedDraft = [
          ...state.segments.map((segment) => segment.text),
          state.draft.trim(),
        ]
          .filter(Boolean)
          .join("\n\n");

        return {
          ...state,
          mode: "single",
          draft: combinedDraft,
          segments: [],
          output: clearError(state.output),
        };
      }

      return { ...state, mode: action.mode, output: clearError(state.output) };
    }
    case "set_audience":
      return {
        ...state,
        audience: action.audience,
        shortInputConfirmationPending: false,
        output: clearError(state.output),
      };
    case "set_tone":
      return {
        ...state,
        tone: action.tone,
        shortInputConfirmationPending: false,
        output: clearError(state.output),
      };
    case "set_provider":
      return {
        ...state,
        provider: action.provider,
        shortInputConfirmationPending: false,
        output: clearError(state.output),
      };
    case "set_hosted_model":
      return {
        ...state,
        hostedModelId: action.hostedModelId,
        shortInputConfirmationPending: false,
        output: clearError(state.output),
      };
    case "set_local_model":
      return {
        ...state,
        localModelId: action.localModelId,
        shortInputConfirmationPending: false,
        output: clearError(state.output),
      };
    case "set_reasoning_effort":
      return {
        ...state,
        reasoningEffort: action.reasoningEffort,
        output: clearError(state.output),
      };
    case "set_system_prompt":
      return {
        ...state,
        systemPrompt: action.systemPrompt,
        output: clearError(state.output),
      };
    case "reset_system_prompt":
      return {
        ...state,
        systemPrompt: defaultEditableSystemPrompt,
        output: clearError(state.output),
      };
    case "set_api_key":
      return {
        ...state,
        apiKey: action.apiKey,
        output: clearError(state.output),
      };
    case "set_draft":
      return {
        ...state,
        draft: action.draft,
        shortInputConfirmationPending: false,
        output: clearError(state.output),
      };
    case "add_segment":
      return {
        ...state,
        draft: "",
        segments: [...state.segments, action.segment],
        shortInputConfirmationPending: false,
        output: clearError(state.output),
      };
    case "remove_segment":
      return {
        ...state,
        segments: state.segments.filter((segment) => segment.id !== action.id),
        shortInputConfirmationPending: false,
        output: clearError(state.output),
      };
    case "short_input_confirmation_requested":
      return { ...state, shortInputConfirmationPending: true, output: clearError(state.output) };
    case "generation_started":
      if (state.output.status === "loading") {
        return state;
      }

      return {
        ...state,
        shortInputConfirmationPending: false,
        copyStatus: "idle",
        warnings: [],
        output: { status: "loading", text: state.output.text },
      };
    case "generation_succeeded":
      return {
        ...state,
        lastSourceText: getSegmentsForGeneration(state).join("\n\n"),
        variants: action.variants,
        selectedVariantId: action.variants[0]?.id ?? "",
        warnings: action.warnings,
        output: { status: "success", text: action.text },
      };
    case "generation_failed":
      return {
        ...state,
        output: {
          status: "error",
          text: state.output.text,
          message: action.message,
        },
      };
    case "select_variant":
      return { ...state, selectedVariantId: action.id, copyStatus: "idle" };
    case "copy_succeeded":
      return { ...state, copyStatus: "copied" };
    case "copy_failed":
      return { ...state, copyStatus: "failed" };
    case "copy_reset":
      return { ...state, copyStatus: "idle" };
    default:
      return state;
  }
}

function clearError(output: OutputState): OutputState {
  if (output.status !== "error") {
    return output;
  }

  return { status: "idle", text: output.text };
}
