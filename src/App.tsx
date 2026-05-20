import { useMemo, useState } from "react";
import { FeedbackGenerationError, generateFeedback, providerConfigs } from "./ai/providers";
import type { Audience, FeedbackMode, Provider, Tone } from "./feedbackTypes";

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

export function App() {
  const [mode, setMode] = useState<FeedbackMode>("single");
  const [audience, setAudience] = useState<Audience>("manager");
  const [tone, setTone] = useState<Tone>("diplomatic");
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [draft, setDraft] = useState("");
  const [segments, setSegments] = useState<string[]>([]);
  const [generatedOutput, setGeneratedOutput] = useState(
    "Your polished feedback will appear here.",
  );
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const activeSegments = useMemo(() => {
    if (mode === "ranting") {
      return segments;
    }

    return draft.trim() ? [draft.trim()] : [];
  }, [draft, mode, segments]);

  const canAddSegment = draft.trim().length > 0;
  const hasApiKey = apiKey.trim().length > 0;
  const canGenerate =
    (mode === "ranting" ? segments.length > 0 || canAddSegment : activeSegments.length > 0) &&
    hasApiKey &&
    status !== "loading";
  const selectedProvider = providerConfigs.find((item) => item.provider === provider);

  function switchMode(nextMode: FeedbackMode) {
    if (nextMode === mode) {
      return;
    }

    if (mode === "single" && nextMode === "ranting" && draft.trim()) {
      setSegments([draft.trim()]);
      setDraft("");
    }

    if (mode === "ranting" && nextMode === "single") {
      setDraft(segments.join("\n\n"));
      setSegments([]);
    }

    setMode(nextMode);
  }

  function addSegment() {
    if (!canAddSegment) {
      return;
    }

    setSegments((current) => [...current, draft.trim()]);
    setDraft("");
  }

  function removeSegment(index: number) {
    setSegments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function generate() {
    const nextSegments =
      mode === "ranting"
        ? [...segments, draft.trim()].filter(Boolean)
        : activeSegments;

    if (nextSegments.length === 0 || !hasApiKey || status === "loading") {
      return;
    }

    if (mode === "ranting" && draft.trim()) {
      setSegments(nextSegments);
      setDraft("");
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const result = await generateFeedback({
        segments: nextSegments,
        mode,
        audience,
        tone,
        provider,
        apiKey,
      });

      setGeneratedOutput(result.polishedText);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof FeedbackGenerationError
          ? error.message
          : "Something went wrong while generating feedback.",
      );
    }
  }

  function submitDraft() {
    if (mode === "ranting") {
      addSegment();
      return;
    }

    void generate();
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
                value={provider}
                onChange={(event) => {
                  setProvider(event.target.value as Provider);
                  setErrorMessage("");
                  setStatus("idle");
                }}
              >
                {providerConfigs.map((item) => (
                  <option key={item.provider} value={item.provider}>
                    {item.label}
                    {item.implemented ? "" : " (soon)"}
                  </option>
                ))}
              </select>
            </div>
            <div className="api-key-field">
              <label htmlFor="api-key">API key</label>
              <input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setErrorMessage("");
                  setStatus("idle");
                }}
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
              />
              <p>
                Key is kept in memory only and never saved. Use a restricted or
                revocable key when possible.
              </p>
            </div>
          </div>
        </header>

        <div className="mode-switch" aria-label="Writing mode">
          <button
            className={mode === "single" ? "active" : ""}
            type="button"
            onClick={() => switchMode("single")}
          >
            Standard
          </button>
          <button
            className={mode === "ranting" ? "active" : ""}
            type="button"
            onClick={() => switchMode("ranting")}
          >
            Ranting
          </button>
        </div>

        <section className="grid">
          <div className="input-panel">
            <label className="field-label" htmlFor="raw-feedback">
              {mode === "ranting" ? "Rant segment" : "Raw feedback"}
            </label>
            <textarea
              id="raw-feedback"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
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
                mode === "ranting"
                  ? "Write one thought, add it, then keep going..."
                  : "Paste the spicy version here..."
              }
            />

            {mode === "ranting" ? (
              <div className="rant-actions">
                <button type="button" onClick={addSegment} disabled={!canAddSegment}>
                  Add segment
                </button>
                <span>{segments.length} saved</span>
              </div>
            ) : null}

            {mode === "ranting" && segments.length > 0 ? (
              <ol className="segment-list" aria-label="Saved rant segments">
                {segments.map((segment, index) => (
                  <li key={`${segment}-${index}`}>
                    <p>{segment}</p>
                    <button type="button" onClick={() => removeSegment(index)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>

          <aside className="settings-panel" aria-label="Output settings">
            <div>
              <span className="field-label">Audience</span>
              <div className="choice-grid">
                {audiences.map((item) => (
                  <button
                    className={audience === item.value ? "active" : ""}
                    key={item.value}
                    type="button"
                    onClick={() => setAudience(item.value)}
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
                    className={tone === item.value ? "active" : ""}
                    key={item.value}
                    type="button"
                    onClick={() => setTone(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="output-panel" aria-label="Polished feedback">
          <div className="output-header">
            <div>
              <p className="eyebrow">Polished draft</p>
              <h2>{mode === "ranting" ? "Final combined feedback" : "Ready to send"}</h2>
            </div>
            <button type="button" onClick={() => void generate()} disabled={!canGenerate}>
              {status === "loading" ? "Generating..." : "Generate"}
            </button>
          </div>
          {!hasApiKey ? (
            <p className="notice">Enter an API key to generate with {selectedProvider?.label}.</p>
          ) : null}
          {selectedProvider && !selectedProvider.implemented ? (
            <p className="notice">
              {selectedProvider.label} is planned but not wired yet. OpenAI works first.
            </p>
          ) : null}
          {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
          <pre>{generatedOutput}</pre>
        </section>
      </section>
    </main>
  );
}
