import { useMemo, useState } from "react";
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

const providers: Array<{ label: string; value: Provider }> = [
  { label: "OpenAI", value: "openai" },
  { label: "Gemini", value: "gemini" },
  { label: "Anthropic", value: "anthropic" },
];

function polishPreview(
  segments: string[],
  audience: Audience,
  tone: Tone,
): string {
  const text = segments.join(" ").trim();

  if (!text) {
    return "Your polished feedback will appear here.";
  }

  const audienceLabel = audiences.find((item) => item.value === audience)?.label;
  const toneLabel = tones.find((item) => item.value === tone)?.label;

  return [
    `${audienceLabel}, I want to share feedback in a ${toneLabel?.toLowerCase()} way.`,
    "The current situation is creating friction, and I think it would help to address the underlying issue directly.",
    `Core concern: ${text}`,
    "Could we agree on a clearer next step so this is easier to handle going forward?",
  ].join("\n\n");
}

export function App() {
  const [mode, setMode] = useState<FeedbackMode>("single");
  const [audience, setAudience] = useState<Audience>("manager");
  const [tone, setTone] = useState<Tone>("diplomatic");
  const [provider, setProvider] = useState<Provider>("openai");
  const [draft, setDraft] = useState("");
  const [segments, setSegments] = useState<string[]>([]);
  const [generatedOutput, setGeneratedOutput] = useState(
    "Your polished feedback will appear here.",
  );

  const activeSegments = useMemo(() => {
    if (mode === "ranting") {
      return segments;
    }

    return draft.trim() ? [draft.trim()] : [];
  }, [draft, mode, segments]);

  const canAddSegment = draft.trim().length > 0;
  const canGenerate =
    mode === "ranting" ? segments.length > 0 || canAddSegment : activeSegments.length > 0;

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

  function generate() {
    const nextSegments =
      mode === "ranting"
        ? [...segments, draft.trim()].filter(Boolean)
        : activeSegments;

    if (nextSegments.length === 0) {
      return;
    }

    if (mode === "ranting" && draft.trim()) {
      setSegments(nextSegments);
      setDraft("");
    }

    setGeneratedOutput(polishPreview(nextSegments, audience, tone));
  }

  return (
    <main className="app-shell">
      <section className="workbench" aria-label="Feedback translator">
        <header className="topbar">
          <div>
            <p className="eyebrow">Spicy-to-Nice</p>
            <h1>Feedback without the flames.</h1>
          </div>
          <div className="provider-field">
            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value as Provider)}
            >
              {providers.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
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
                if (mode === "ranting" && event.metaKey && event.key === "Enter") {
                  event.preventDefault();
                  addSegment();
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
            <button type="button" onClick={generate} disabled={!canGenerate}>
              Generate
            </button>
          </div>
          <pre>{generatedOutput}</pre>
        </section>
      </section>
    </main>
  );
}
