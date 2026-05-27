import { useReducer, useRef } from "react";
import { getHostedModel, defaultHostedModelId } from "../../ai/hostedModelCatalog";
import { FeedbackGenerationError, generateFeedback, providerConfigs } from "../../ai/providers";
import {
  getDisplayedOutputText,
  getSelectedVariant,
  getWordCount,
} from "./translatorSelectors";
import {
  getSegmentsForGeneration,
  initialTranslatorState,
  makeSegment,
  translatorReducer,
} from "./translatorState";
import {
  buildModelOptions,
  getGenerationBlocker,
  getLocalGenerationBlocker,
} from "./translatorUtils";
import {
  getLocalModelControlHint,
  getLocalModelControlLabel,
  useLocalModelDownloads,
} from "./useLocalModelDownloads";

export function useTranslatorController() {
  const [state, dispatch] = useReducer(translatorReducer, initialTranslatorState);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedProvider = providerConfigs.find((item) => item.provider === state.provider);
  const selectedHostedModel =
    getHostedModel(state.hostedModelId) ?? getHostedModel(defaultHostedModelId);
  const localDownloads = useLocalModelDownloads({
    isGenerating: state.output.status === "loading",
    localModelId: state.localModelId,
    onLocalModelReady: (modelId) => dispatch({ type: "set_local_model", localModelId: modelId }),
  });
  const visibleProviderConfigs = providerConfigs.filter((item) => item.implemented);
  const generationBlocker =
    getGenerationBlocker(state) ||
    getLocalGenerationBlocker(state, localDownloads.selectedLocalStatus);
  const selectedVariant = getSelectedVariant(state);
  const displayedOutputText = getDisplayedOutputText(state);
  const activeModelLabel =
    state.provider === "local"
      ? getLocalModelControlLabel(
          localDownloads.selectedLocalModel.label,
          localDownloads.selectedLocalStatus,
        )
      : (selectedHostedModel?.label ?? state.hostedModelId);
  const activeModelHint =
    state.provider === "local"
      ? getLocalModelControlHint(localDownloads.selectedLocalStatus)
      : (selectedHostedModel?.description ?? "Hosted model");
  const modelSelectorOptions = buildModelOptions(
    localDownloads.localModelStatuses,
    state.apiKey.trim().length > 0,
  );
  const selectedModelId = state.provider === "local" ? state.localModelId : state.hostedModelId;
  const canAddSegment = state.draft.trim().length > 0 && state.output.status !== "loading";
  const canGenerate = !generationBlocker;
  const canSendDraft = state.mode === "ranting" ? canAddSegment : canGenerate;
  const sendButtonLabel =
    state.mode === "ranting" ? "Capture thought" : "Generate polished feedback";
  const canCopy = state.output.status === "success" && displayedOutputText.trim().length > 0;

  function addSegment() {
    const text = state.draft.trim();

    if (!text || state.output.status === "loading") {
      return;
    }

    dispatch({ type: "add_segment", segment: makeSegment(text) });
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    });
  }

  async function generate() {
    const segments = getSegmentsForGeneration(state);
    const pendingRantSegment = state.mode === "ranting" ? state.draft.trim() : "";

    if (generationBlocker || segments.length === 0) {
      return;
    }

    if (getWordCount(segments) < 8 && !state.shortInputConfirmationPending) {
      dispatch({ type: "short_input_confirmation_requested" });
      return;
    }

    if (pendingRantSegment) {
      dispatch({ type: "add_segment", segment: makeSegment(pendingRantSegment) });
    }

    dispatch({ type: "generation_started" });

    try {
      const result = await generateFeedback({
        segments,
        mode: state.mode,
        audience: state.audience,
        tone: state.tone,
        provider: state.provider,
        apiKey: state.apiKey,
        localModelId: state.localModelId,
        modelId: state.hostedModelId,
        reasoningEffort: state.reasoningEffort,
        systemPrompt: state.systemPrompt,
      });

      dispatch({
        type: "generation_succeeded",
        text: result.polishedText,
        variants: result.variants ?? [],
        warnings: result.warnings ?? [],
      });
    } catch (error) {
      dispatch({
        type: "generation_failed",
        message:
          error instanceof FeedbackGenerationError
            ? error.message
            : "Something went wrong while generating feedback.",
      });
    }
  }

  async function copyOutput() {
    if (!canCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(displayedOutputText);
      dispatch({ type: "copy_succeeded" });
      window.setTimeout(() => dispatch({ type: "copy_reset" }), 1800);
    } catch {
      dispatch({ type: "copy_failed" });
    }
  }

  function submitDraft() {
    if (state.mode === "ranting") {
      addSegment();
      return;
    }

    void generate();
  }

  function selectModel(modelId: string) {
    if (getHostedModel(modelId)) {
      dispatch({ type: "set_provider", provider: "openai" });
      dispatch({ type: "set_hosted_model", hostedModelId: modelId });
    } else {
      dispatch({ type: "set_provider", provider: "local" });
      localDownloads.selectLocalModel(modelId);
    }
  }

  return {
    activeModelHint,
    activeModelLabel,
    canCopy,
    canGenerate,
    canSendDraft,
    copyOutput,
    dispatch,
    displayedOutputText,
    generate,
    generationBlocker,
    localDownloads,
    modelSelectorOptions,
    selectedModelId,
    selectedProvider,
    selectedVariant,
    selectModel,
    sendButtonLabel,
    state,
    submitDraft,
    textareaRef,
    visibleProviderConfigs,
  };
}
