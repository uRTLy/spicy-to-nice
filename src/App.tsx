import { useEffect, useReducer, useRef, useState } from "react";
import { ConversationPage } from "./ConversationPage";
import { ModelSelector, type ModelSelectorOption } from "./ModelSelector";
import {
  defaultHostedModelId,
  getHostedModel,
  getHostedModels,
} from "./ai/hostedModelCatalog";
import { llmDownloader, type LLMDownloadProgress } from "./ai/llmDownloader";
import {
  defaultLocalModelId,
  getDefaultLocalModel,
  getLocalModel,
  supportedLocalModels,
} from "./ai/localModelCatalog";
import { FeedbackGenerationError, generateFeedback, providerConfigs } from "./ai/providers";
import { preloadWebLLMModel } from "./ai/webllmAdapter";
import {
  audienceOptions,
  defaultAudienceId,
  defaultEditableSystemPrompt,
  defaultReasoningEffortId,
  defaultToneId,
  reasoningOptions,
  toneOptions,
} from "./config/feedbackConfig";
import type {
  Audience,
  FeedbackMode,
  FeedbackVariant,
  Provider,
  ReasoningEffort,
  Tone,
} from "./feedbackTypes";

type Segment = {
  id: string;
  text: string;
};

type OutputState =
  | { status: "idle"; text: string }
  | { status: "loading"; text: string }
  | { status: "success"; text: string }
  | { status: "error"; text: string; message: string };

type LocalModelAvailabilityStage =
  | "checking"
  | "not-downloaded"
  | "preparing"
  | "downloading"
  | "loading"
  | "downloaded"
  | "ready"
  | "unavailable"
  | "error";

type LocalModelAvailability = {
  stage: LocalModelAvailabilityStage;
  message: string;
  progress?: number;
};

type AppState = {
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

type AppAction =
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

const initialOutputText = "Your polished feedback will appear here.";
const initialState: AppState = {
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

function clearError(output: OutputState): OutputState {
  if (output.status !== "error") {
    return output;
  }

  return { status: "idle", text: output.text };
}

function makeSegment(text: string): Segment {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    text,
  };
}

function reducer(state: AppState, action: AppAction): AppState {
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

function getSegmentsForGeneration(state: AppState) {
  if (state.mode === "ranting") {
    return [...state.segments.map((segment) => segment.text), state.draft.trim()].filter(Boolean);
  }

  return state.draft.trim() ? [state.draft.trim()] : [];
}

function getWordCount(segments: string[]) {
  return segments.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

function getSelectedVariant(state: AppState) {
  return (
    state.variants.find((variant) => variant.id === state.selectedVariantId) ??
    state.variants[0] ??
    null
  );
}

function getDisplayedOutputText(state: AppState) {
  return getSelectedVariant(state)?.text ?? state.output.text;
}

function canUseLocalModel(status: LocalModelAvailability | undefined) {
  return status?.stage === "downloaded" || status?.stage === "ready";
}

function isLocalStatusBusy(status: LocalModelAvailability | undefined) {
  return (
    status?.stage === "checking" ||
    status?.stage === "preparing" ||
    status?.stage === "downloading" ||
    status?.stage === "loading"
  );
}

function mapDownloadProgressToAvailability(
  progress: LLMDownloadProgress,
): LocalModelAvailability {
  switch (progress.stage) {
    case "checking-support":
      return {
        stage: "checking",
        message: progress.message,
        progress: progress.progress,
      };
    case "ready-to-download":
      return {
        stage: "preparing",
        message: progress.message,
        progress: progress.progress,
      };
    case "downloading":
    case "loading":
    case "ready":
    case "unavailable":
    case "error":
      return {
        stage: progress.stage,
        message: progress.message,
        progress: progress.progress,
      };
    case "idle":
    default:
      return {
        stage: "not-downloaded",
        message: "Not downloaded in this browser yet.",
      };
  }
}

function getLocalGenerationBlocker(
  state: AppState,
  status: LocalModelAvailability | undefined,
) {
  if (state.provider !== "local") {
    return "";
  }

  if (!status) {
    return "Download a local model in the top bar, then select it from the model picker before generating offline.";
  }

  if (isLocalStatusBusy(status)) {
    return "Finish downloading or preparing the selected local model before generating.";
  }

  if (!canUseLocalModel(status)) {
    return "Download a local model in the top bar, then select it from the model picker before generating offline.";
  }

  return "";
}

function getProviderDescription(provider: Provider) {
  switch (provider) {
    case "openai":
      return "Hosted BYOK";
    case "local":
      return "Browser local";
    case "gemini":
      return "Provider key";
    case "anthropic":
      return "Provider key";
    default:
      return "";
  }
}

function getLocalModelControlLabel(
  modelLabel: string,
  status: LocalModelAvailability | undefined,
) {
  if (status?.stage === "ready") {
    return `${modelLabel} ready`;
  }

  if (status?.stage === "downloaded") {
    return modelLabel;
  }

  return modelLabel;
}

function getLocalModelControlHint(status: LocalModelAvailability | undefined) {
  if (status?.stage === "ready") {
    return "Ready in this tab";
  }

  if (status?.stage === "downloaded") {
    return "Downloaded";
  }

  if (status?.stage === "downloading" && typeof status.progress === "number") {
    return `${Math.round(status.progress * 100)}%`;
  }

  if (status?.stage === "unavailable") {
    return "WebGPU needed";
  }

  return "Download from Local models above";
}

function getLocalModelPhaseLabel(status: LocalModelAvailability | undefined) {
  if (!status) {
    return "Ready to download";
  }

  switch (status.stage) {
    case "checking":
      return "Checking model";
    case "preparing":
      return "Preparing download";
    case "downloading":
      return typeof status.progress === "number"
        ? `Downloading ${Math.round(status.progress * 100)}%`
        : "Downloading model";
    case "loading":
      return "Preparing model";
    case "downloaded":
      return "Downloaded";
    case "ready":
      return "Ready";
    case "unavailable":
      return "Unavailable";
    case "error":
      return "Needs retry";
    case "not-downloaded":
    default:
      return "Ready to download";
  }
}

function getLocalModelProgress(status: LocalModelAvailability | undefined) {
  if (!status || !isLocalStatusBusy(status)) {
    return undefined;
  }

  if (typeof status.progress === "number") {
    return status.progress;
  }

  switch (status.stage) {
    case "checking":
      return 0.04;
    case "preparing":
      return 0.08;
    case "loading":
      return 0.92;
    default:
      return undefined;
  }
}

function getLocalModelProgressHint(status: LocalModelAvailability) {
  const percent =
    typeof status.progress === "number" ? `${Math.round(status.progress * 100)}% - ` : "";

  return `${percent}${status.message}`;
}

function getModelPickerLocalStatus(status: LocalModelAvailability | undefined) {
  if (canUseLocalModel(status)) {
    return "Offline";
  }

  if (status?.stage === "unavailable") {
    return "Unavailable";
  }

  if (status?.stage === "error") {
    return "Retry above";
  }

  if (status && isLocalStatusBusy(status)) {
    return "Downloading above";
  }

  return "Needs download";
}

function getLocalDownloadButtonLabel(status: LocalModelAvailability | undefined) {
  if (status?.stage === "ready" || status?.stage === "downloaded") {
    return "Downloaded";
  }

  if (status?.stage === "checking") {
    return "Checking";
  }

  if (status?.stage === "preparing") {
    return "Preparing";
  }

  if (status?.stage === "downloading") {
    return "Downloading...";
  }

  if (status?.stage === "loading") {
    return "Loading...";
  }

  if (status?.stage === "unavailable") {
    return "Unavailable";
  }

  if (status?.stage === "error") {
    return "Retry";
  }

  return "Download";
}

function canDownloadLocalModel(
  status: LocalModelAvailability | undefined,
  activeLocalModelId: string | null,
  modelId: string,
  isGenerating: boolean,
) {
  if (isGenerating || (activeLocalModelId !== null && activeLocalModelId !== modelId)) {
    return false;
  }

  return (
    !status ||
    status.stage === "not-downloaded" ||
    status.stage === "error"
  );
}

function getTopbarLocalStatus(
  modelLabel: string,
  status: LocalModelAvailability | undefined,
) {
  if (!status) {
    return `${modelLabel} is not downloaded in this browser yet.`;
  }

  if (isLocalStatusBusy(status)) {
    return getLocalModelProgressHint(status);
  }

  return status.message;
}

function buildModelOptions(
  statuses: Record<string, LocalModelAvailability>,
  hasOpenAIKey: boolean,
): ModelSelectorOption[] {
  const hostedOptions = getHostedModels("openai").map((model) => ({
    id: model.id,
    label: model.label,
    description: hasOpenAIKey
      ? model.description
      : "Enter an OpenAI API key above to use hosted BYOK models.",
    status: hasOpenAIKey ? "OpenAI" : "Needs API key",
    disabled: !hasOpenAIKey,
    default: model.default,
  }));

  const localOptions = supportedLocalModels.map((model) => {
    const status = statuses[model.id];
    const isUsable = canUseLocalModel(status);

    return {
      id: model.id,
      label: model.label,
      description: isUsable
        ? `${model.estimatedDownloadMB} MB browser-local model`
        : `${model.estimatedDownloadMB} MB, download in Local models above`,
      status: isUsable ? getModelPickerLocalStatus(status) : "",
      disabled: !isUsable,
      default: model.id === defaultLocalModelId,
    };
  });

  return [...hostedOptions, ...localOptions];
}

function getGenerationBlocker(state: AppState) {
  const selectedProvider = providerConfigs.find((item) => item.provider === state.provider);
  const hasInput = getSegmentsForGeneration(state).length > 0;

  if (state.output.status === "loading") {
    return "Generation is already in progress.";
  }

  if (!hasInput) {
    return "Add feedback before generating.";
  }

  if (selectedProvider && !selectedProvider.implemented) {
    return `${selectedProvider.label} is planned but not wired yet. OpenAI works first.`;
  }

  if (selectedProvider?.requiresApiKey && !state.apiKey.trim()) {
    return `Enter an API key to generate with ${selectedProvider.label}.`;
  }

  return "";
}

function resizeComposerInput(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 150)}px`;
}

type AppRoute = "translator" | "conversation";

function readRoute(): AppRoute {
  return window.location.pathname.replace(/\/+$/, "").endsWith("/conversation")
    ? "conversation"
    : "translator";
}

function buildRoutePath(route: AppRoute) {
  const base = import.meta.env.BASE_URL || "/";

  if (route === "translator") {
    return base;
  }

  return `${base}${base.endsWith("/") ? "" : "/"}conversation`;
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => readRoute());

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute());

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(routeName: AppRoute) {
    window.history.pushState({ route: routeName }, "", buildRoutePath(routeName));
    setRoute(routeName);
    window.scrollTo({ top: 0 });
  }

  if (route === "conversation") {
    return <ConversationPage onBack={() => navigate("translator")} />;
  }

  return <TranslatorApp onOpenConversation={() => navigate("conversation")} />;
}

type TranslatorAppProps = {
  onOpenConversation: () => void;
};

function TranslatorApp({ onOpenConversation }: TranslatorAppProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [localModelStatuses, setLocalModelStatuses] = useState<
    Record<string, LocalModelAvailability>
  >({});
  const [activeLocalModelId, setActiveLocalModelId] = useState<string | null>(null);
  const [localDownloadModelId, setLocalDownloadModelId] = useState(defaultLocalModelId);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedProvider = providerConfigs.find((item) => item.provider === state.provider);
  const selectedHostedModel =
    getHostedModel(state.hostedModelId) ?? getHostedModel(defaultHostedModelId);
  const selectedLocalModel = getLocalModel(state.localModelId) ?? getDefaultLocalModel();
  const selectedLocalStatus = localModelStatuses[selectedLocalModel.id];
  const localDownloadModel = getLocalModel(localDownloadModelId) ?? getDefaultLocalModel();
  const localDownloadStatus = localModelStatuses[localDownloadModel.id];
  const localDownloadProgress = getLocalModelProgress(localDownloadStatus);
  const visibleProviderConfigs = providerConfigs.filter((item) => item.implemented);
  const generationBlocker =
    getGenerationBlocker(state) || getLocalGenerationBlocker(state, selectedLocalStatus);
  const selectedVariant = getSelectedVariant(state);
  const displayedOutputText = getDisplayedOutputText(state);
  const localModelControlLabel = getLocalModelControlLabel(
    selectedLocalModel.label,
    selectedLocalStatus,
  );
  const localModelControlHint = getLocalModelControlHint(selectedLocalStatus);
  const activeModelLabel =
    state.provider === "local"
      ? localModelControlLabel
      : (selectedHostedModel?.label ?? state.hostedModelId);
  const activeModelHint =
    state.provider === "local"
      ? localModelControlHint
      : (selectedHostedModel?.description ?? "Hosted model");
  const modelSelectorOptions = buildModelOptions(
    localModelStatuses,
    state.apiKey.trim().length > 0,
  );
  const selectedModelId = state.provider === "local" ? state.localModelId : state.hostedModelId;
  const canDownloadSelectedLocalModel = canDownloadLocalModel(
    localDownloadStatus,
    activeLocalModelId,
    localDownloadModel.id,
    state.output.status === "loading",
  );
  const canAddSegment = state.draft.trim().length > 0 && state.output.status !== "loading";
  const canGenerate = !generationBlocker;
  const canSendDraft = state.mode === "ranting" ? canAddSegment : canGenerate;
  const sendButtonLabel =
    state.mode === "ranting" ? "Capture thought" : "Generate polished feedback";
  const canCopy = state.output.status === "success" && displayedOutputText.trim().length > 0;

  useEffect(() => {
    const unsubscribe = llmDownloader.subscribe((progress) => {
      if (!progress.modelId) {
        return;
      }

      setLocalModelStatuses((current) => ({
        ...current,
        [progress.modelId as string]: mapDownloadProgressToAvailability(progress),
      }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isModelSelectorOpen && !isSettingsOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModelSelectorOpen(false);
        setIsSettingsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModelSelectorOpen, isSettingsOpen]);

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

  async function downloadLocalModel(modelId: string) {
    const status = localModelStatuses[modelId];

    if (
      activeLocalModelId ||
      state.output.status === "loading" ||
      status?.stage === "ready" ||
      status?.stage === "downloaded"
    ) {
      return;
    }

    setActiveLocalModelId(modelId);
    setLocalModelStatuses((current) => ({
      ...current,
      [modelId]: {
        stage: "preparing",
        message: "Preparing the browser download.",
      },
    }));

    try {
      await preloadWebLLMModel(modelId);
      dispatch({ type: "set_local_model", localModelId: modelId });
    } catch {
      // The downloader owns user-facing progress and error messages.
    } finally {
      setActiveLocalModelId(null);
    }
  }

  function selectLocalModel(modelId: string) {
    const status = localModelStatuses[modelId];

    if (!canUseLocalModel(status) || state.output.status === "loading") {
      return;
    }

    dispatch({ type: "set_local_model", localModelId: modelId });
  }

  function submitDraft() {
    if (state.mode === "ranting") {
      addSegment();
      return;
    }

    void generate();
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

  return (
    <main className="app-shell">
      <section className="workbench" aria-label="Feedback translator">
        <header className="topbar">
          <div>
            <p className="eyebrow">Spicy-to-Nice</p>
            <h1>Feedback without the flames.</h1>
          </div>
        </header>

        <section className="provider-toolbar" aria-label="Provider setup">
          <div className="ai-control-group">
            <span className="field-label">Provider</span>
            <div className="provider-picker" role="group" aria-label="AI provider">
              {visibleProviderConfigs.map((item) => (
                <button
                  className={state.provider === item.provider ? "active" : ""}
                  key={item.provider}
                  type="button"
                  disabled={state.output.status === "loading" || activeLocalModelId !== null}
                  onClick={() => {
                    dispatch({ type: "set_provider", provider: item.provider });
                    setIsModelSelectorOpen(false);
                  }}
                >
                  <span>{item.label}</span>
                  <small>{getProviderDescription(item.provider)}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="provider-detail">
            {selectedProvider?.requiresApiKey ? (
              <div className="api-key-field compact">
                <label htmlFor="api-key">API key</label>
                <input
                  id="api-key"
                  type="password"
                  value={state.apiKey}
                  disabled={state.output.status === "loading"}
                  onChange={(event) =>
                    dispatch({ type: "set_api_key", apiKey: event.target.value })
                  }
                  placeholder="sk-..."
                  autoComplete="off"
                  spellCheck={false}
                />
                <p>Memory only. Never saved.</p>
              </div>
            ) : (
              <div className="local-download-control">
                <span className="field-label">Local models</span>
                <div className="local-download-row">
                  <select
                    aria-label="Local model to download"
                    value={localDownloadModel.id}
                    disabled={state.output.status === "loading" || activeLocalModelId !== null}
                    onChange={(event) => setLocalDownloadModelId(event.target.value)}
                  >
                    {supportedLocalModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label} - {model.estimatedDownloadMB} MB
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!canDownloadSelectedLocalModel}
                    onClick={() => void downloadLocalModel(localDownloadModel.id)}
                  >
                    {getLocalDownloadButtonLabel(localDownloadStatus)}
                  </button>
                </div>
                <p>{getTopbarLocalStatus(localDownloadModel.label, localDownloadStatus)}</p>
                {typeof localDownloadProgress === "number" ? (
                  <progress
                    aria-label={`${localDownloadModel.label} download progress`}
                    value={localDownloadProgress}
                    max={1}
                  />
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section className="transcript-card" aria-label="Project notes">
          <div>
            <p className="eyebrow">Project notes</p>
            <h2>How this prototype came together</h2>
            <p>
              Review the sanitized planning and build conversation for product decisions,
              tradeoffs, and implementation checkpoints.
            </p>
          </div>
          <dl>
            <div>
              <dt>Includes</dt>
              <dd>
                Planning notes and visible collaboration
              </dd>
            </div>
            <div>
              <dt>Privacy</dt>
              <dd>
                Tool output, hidden context, and secrets omitted
              </dd>
            </div>
          </dl>
          <button className="transcript-button" type="button" onClick={onOpenConversation}>
            Open notes
          </button>
        </section>

        {state.mode === "ranting" ? (
          <div className="flow-banner" aria-live="polite">
            <span>{state.segments.length}</span>
            {state.segments.length === 1 ? "thought captured" : "thoughts captured"}
            <strong>Press Enter to keep the flow going.</strong>
          </div>
        ) : null}

        <section className="grid">
          <div className={`input-panel ${state.mode === "ranting" ? "ranting-panel" : ""}`}>
            <div className="mode-switch" aria-label="Writing mode">
              <button
                className={state.mode === "single" ? "active" : ""}
                type="button"
                disabled={state.output.status === "loading"}
                onClick={() => dispatch({ type: "switch_mode", mode: "single" })}
              >
                Standard
              </button>
              <button
                className={state.mode === "ranting" ? "active" : ""}
                type="button"
                disabled={state.output.status === "loading"}
                onClick={() => dispatch({ type: "switch_mode", mode: "ranting" })}
              >
                Ranting
              </button>
            </div>

            <div className="input-heading">
              <span className="field-label">
                {state.mode === "ranting" ? "Rant stream" : "Raw feedback"}
              </span>
              {state.mode === "ranting" ? <span>{state.segments.length} saved</span> : null}
            </div>

            <div className="message-surface">
              {state.mode === "ranting" ? (
                state.segments.length > 0 ? (
                  <ol className="segment-list" aria-label="Saved rant segments">
                    {state.segments.map((segment, index) => (
                      <li key={segment.id}>
                        <span>{index + 1}</span>
                        <p>{segment.text}</p>
                        <button
                          type="button"
                          aria-label={`Remove thought ${index + 1}`}
                          disabled={state.output.status === "loading"}
                          onClick={() => dispatch({ type: "remove_segment", id: segment.id })}
                        >
                          x
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="empty-rant">
                    Start typing like a message thread. Enter captures each thought.
                  </div>
                )
              ) : state.draft.trim() ? null : (
                <div className="standard-empty">
                  Drop the spicy version here, then send it for polish.
                </div>
              )}

              <div className="composer" data-mode={state.mode}>
                <label className="sr-only" htmlFor="raw-feedback">
                  {state.mode === "ranting" ? "Rant segment" : "Raw feedback"}
                </label>
                <textarea
                  id="raw-feedback"
                  ref={textareaRef}
                  rows={1}
                  value={state.draft}
                  disabled={state.output.status === "loading"}
                  onChange={(event) => {
                    resizeComposerInput(event.currentTarget);
                    dispatch({ type: "set_draft", draft: event.target.value });
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      submitDraft();
                    }
                  }}
                  placeholder={
                    state.mode === "ranting"
                      ? "Rant here. Enter sends this thought..."
                      : "Paste the spicy version here..."
                  }
                />
                <button
                  type="button"
                  aria-label={sendButtonLabel}
                  title={sendButtonLabel}
                  disabled={!canSendDraft}
                  onClick={submitDraft}
                >
                  ↑
                </button>
              </div>
              <p className="composer-hint">
                Enter to send. Shift+Enter for a new line.
              </p>
            </div>
          </div>

          <aside className="settings-panel" aria-label="Output settings">
            <div className="settings-panel-toolbar">
              <span className="field-label">Output settings</span>
              <div className="settings-menu">
                <button
                  aria-expanded={isSettingsOpen}
                  aria-label="Generation settings"
                  className="settings-button"
                  type="button"
                  onClick={() => {
                    setIsModelSelectorOpen(false);
                    setIsSettingsOpen((current) => !current);
                  }}
                >
                  ⚙
                </button>
                {isSettingsOpen ? (
                  <div className="settings-popover">
                    <p>Settings</p>
                    <section>
                      <div className="settings-section-header">
                        <span>System prompt</span>
                        <button
                          type="button"
                          disabled={
                            state.output.status === "loading" ||
                            state.systemPrompt === defaultEditableSystemPrompt
                          }
                          onClick={() => dispatch({ type: "reset_system_prompt" })}
                        >
                          Reset
                        </button>
                      </div>
                      <textarea
                        className="prompt-editor"
                        value={state.systemPrompt}
                        disabled={state.output.status === "loading"}
                        rows={5}
                        onChange={(event) =>
                          dispatch({
                            type: "set_system_prompt",
                            systemPrompt: event.target.value,
                          })
                        }
                      />
                      <small>
                        These rewrite preferences are sent with the prompt. The app still enforces
                        the output format and factuality rules.
                      </small>
                    </section>
                    <section>
                      <span>OpenAI reasoning</span>
                      <small>Used for hosted OpenAI models. Local models ignore this.</small>
                      <div className="reasoning-grid">
                        {reasoningOptions.map((option) => (
                          <button
                            className={state.reasoningEffort === option.id ? "active" : ""}
                            disabled={state.output.status === "loading"}
                            key={option.id}
                            title={option.description}
                            type="button"
                            onClick={() =>
                              dispatch({
                                type: "set_reasoning_effort",
                                reasoningEffort: option.id,
                              })
                            }
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <span className="field-label">Audience</span>
              <div className="choice-grid">
                {audienceOptions.map((item) => (
                  <button
                    className={state.audience === item.id ? "active" : ""}
                    key={item.id}
                    type="button"
                    disabled={state.output.status === "loading"}
                    onClick={() => dispatch({ type: "set_audience", audience: item.id })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="field-label">Tone</span>
              <div className="choice-grid">
                {toneOptions.map((item) => (
                  <button
                    className={state.tone === item.id ? "active" : ""}
                    key={item.id}
                    type="button"
                    disabled={state.output.status === "loading"}
                    onClick={() => dispatch({ type: "set_tone", tone: item.id })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section
          className={`output-panel output-${state.output.status}`}
          aria-label="Polished feedback"
        >
          <div className="output-header">
            <div>
              <p className="eyebrow">Polished draft</p>
              <h2>{state.mode === "ranting" ? "Final combined feedback" : "Ready to send"}</h2>
            </div>
            <div className="generation-controls">
              <ModelSelector
                disabled={state.output.status === "loading" || modelSelectorOptions.length === 0}
                hint={activeModelHint}
                isOpen={isModelSelectorOpen}
                label={activeModelLabel}
                options={modelSelectorOptions}
                selectedId={selectedModelId}
                onSelect={(modelId) => {
                  if (getHostedModel(modelId)) {
                    dispatch({ type: "set_provider", provider: "openai" });
                    dispatch({ type: "set_hosted_model", hostedModelId: modelId });
                  } else {
                    dispatch({ type: "set_provider", provider: "local" });
                    selectLocalModel(modelId);
                  }

                  setIsModelSelectorOpen(false);
                }}
                onToggle={() => {
                  setIsSettingsOpen(false);
                  setIsModelSelectorOpen((current) => !current);
                }}
              />
              <button type="button" onClick={() => void generate()} disabled={!canGenerate}>
                {state.output.status === "loading" ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
          {generationBlocker && state.output.status !== "loading" ? (
            <p className="notice">{generationBlocker}</p>
          ) : null}
          {state.shortInputConfirmationPending ? (
            <p className="notice">
              This is pretty short. Add a little more context for a useful rewrite, or press
              Generate again to use it as-is.
            </p>
          ) : null}
          {state.output.status === "error" ? (
            <p className="error-message">{state.output.message}</p>
          ) : null}
          {state.warnings.map((warning) => (
            <p className="notice" key={warning}>
              {warning}
            </p>
          ))}
          {state.output.status === "loading" ? (
            <div className="thinking" aria-live="polite">
              <span />
              Reading the spice, finding the useful signal...
            </div>
          ) : null}
          <div className="output-grid">
            <article className="output-card before-card">
              <div className="card-label">Before</div>
              <p>
                {state.lastSourceText ||
                  "Your original feedback will be captured here after generation."}
              </p>
            </article>
            <article className="output-card after-card">
              <div className="card-toolbar">
                <span className="card-label">
                  After{selectedVariant ? ` - ${selectedVariant.label}` : ""}
                </span>
                <button type="button" onClick={() => void copyOutput()} disabled={!canCopy}>
                  {state.copyStatus === "copied" ? "Copied" : "Copy"}
                </button>
              </div>
              {state.variants.length > 1 ? (
                <div className="variant-picker" aria-label="Output variants">
                  {state.variants.map((variant) => (
                    <button
                      className={selectedVariant?.id === variant.id ? "active" : ""}
                      key={variant.id}
                      type="button"
                      onClick={() => dispatch({ type: "select_variant", id: variant.id })}
                    >
                      {variant.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <p>{displayedOutputText}</p>
              {selectedVariant?.useCase ? (
                <span className="variant-use-case">{selectedVariant.useCase}</span>
              ) : null}
              {state.copyStatus === "failed" ? (
                <span className="copy-error">Copy failed. Select the text manually.</span>
              ) : null}
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
