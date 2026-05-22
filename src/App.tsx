import { useEffect, useReducer, useRef, useState } from "react";
import { ConversationPage } from "./ConversationPage";
import { llmDownloader, type LLMDownloadProgress } from "./ai/llmDownloader";
import {
  defaultLocalModelId,
  getDefaultLocalModel,
  getLocalModel,
  supportedLocalModels,
} from "./ai/localModelCatalog";
import { FeedbackGenerationError, generateFeedback, providerConfigs } from "./ai/providers";
import type { Audience, FeedbackMode, FeedbackVariant, Provider, Tone } from "./feedbackTypes";

const audiences: Array<{ label: string; value: Audience }> = [
  { label: "Manager", value: "manager" },
  { label: "Direct report", value: "direct_report" },
  { label: "Peer", value: "peer" },
  { label: "Customer", value: "customer" },
];

const tones: Array<{ label: string; value: Tone }> = [
  { label: "Diplomatic", value: "diplomatic" },
  { label: "Warm", value: "warm" },
  { label: "Firm", value: "firm" },
  { label: "Concise", value: "concise" },
];

type Segment = {
  id: string;
  text: string;
};

type OutputState =
  | { status: "idle"; text: string }
  | { status: "loading"; text: string }
  | { status: "success"; text: string }
  | { status: "error"; text: string; message: string };

type AppState = {
  mode: FeedbackMode;
  audience: Audience;
  tone: Tone;
  provider: Provider;
  localModelId: string;
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
  | { type: "set_local_model"; localModelId: string }
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
  audience: "manager",
  tone: "diplomatic",
  provider: "openai",
  localModelId: defaultLocalModelId,
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
      case "set_local_model":
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
    case "set_local_model":
      return {
        ...state,
        localModelId: action.localModelId,
        shortInputConfirmationPending: false,
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
  const [localProgress, setLocalProgress] = useState<LLMDownloadProgress | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedProvider = providerConfigs.find((item) => item.provider === state.provider);
  const defaultLocalModel = getDefaultLocalModel();
  const selectedLocalModel = getLocalModel(state.localModelId) ?? defaultLocalModel;
  const generationBlocker = getGenerationBlocker(state);
  const selectedVariant = getSelectedVariant(state);
  const displayedOutputText = getDisplayedOutputText(state);
  const canAddSegment = state.draft.trim().length > 0 && state.output.status !== "loading";
  const canGenerate = !generationBlocker;
  const canSendDraft = state.mode === "ranting" ? canAddSegment : canGenerate;
  const sendButtonLabel =
    state.mode === "ranting" ? "Capture thought" : "Generate polished feedback";
  const canCopy = state.output.status === "success" && displayedOutputText.trim().length > 0;

  useEffect(() => {
    const unsubscribe = llmDownloader.subscribe(setLocalProgress);
    return () => {
      unsubscribe();
    };
  }, []);

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
          <div className="provider-controls">
            <div className="provider-field">
              <label htmlFor="provider">Provider</label>
              <select
                id="provider"
                value={state.provider}
                disabled={state.output.status === "loading"}
                onChange={(event) =>
                  dispatch({ type: "set_provider", provider: event.target.value as Provider })
                }
              >
                {providerConfigs.map((item) => (
                  <option key={item.provider} value={item.provider}>
                    {item.label}
                    {item.implemented ? "" : " (soon)"}
                  </option>
                ))}
              </select>
            </div>
            {selectedProvider?.requiresApiKey ? (
              <div className="api-key-field">
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
                <p>
                  Key is kept in memory only and never saved. Use a restricted or
                  revocable key when possible.
                </p>
              </div>
            ) : (
              <div className="api-key-field">
                <label htmlFor="local-model">Local model</label>
                <select
                  id="local-model"
                  value={selectedLocalModel.id}
                  disabled={state.output.status === "loading"}
                  onChange={(event) =>
                    dispatch({ type: "set_local_model", localModelId: event.target.value })
                  }
                >
                  {supportedLocalModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label} - {model.estimatedDownloadMB} MB
                    </option>
                  ))}
                </select>
                <p>
                  Default: {defaultLocalModel.label}. Selected model downloads about{" "}
                  {selectedLocalModel.estimatedDownloadMB} MB and needs about{" "}
                  {Math.round(selectedLocalModel.vramRequiredMB)} MB VRAM.
                </p>
                {state.provider === "local" && localProgress ? (
                  <div className="local-progress" aria-live="polite">
                    <span>{localProgress.message}</span>
                    {typeof localProgress.progress === "number" ? (
                      <progress value={localProgress.progress} max={1} />
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </header>

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
            <div>
              <span className="field-label">Audience</span>
              <div className="choice-grid">
                {audiences.map((item) => (
                  <button
                    className={state.audience === item.value ? "active" : ""}
                    key={item.value}
                    type="button"
                    disabled={state.output.status === "loading"}
                    onClick={() => dispatch({ type: "set_audience", audience: item.value })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="field-label">Tone</span>
              <div className="choice-grid">
                {tones.map((item) => (
                  <button
                    className={state.tone === item.value ? "active" : ""}
                    key={item.value}
                    type="button"
                    disabled={state.output.status === "loading"}
                    onClick={() => dispatch({ type: "set_tone", tone: item.value })}
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
            <button type="button" onClick={() => void generate()} disabled={!canGenerate}>
              {state.output.status === "loading" ? "Generating..." : "Generate"}
            </button>
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
