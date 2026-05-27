import { ModelSelector, type ModelSelectorOption } from "../../../ModelSelector";
import type { FeedbackMode, FeedbackVariant } from "../../../feedbackTypes";
import type { OutputState } from "../translatorState";

type PolishedOutputPanelProps = {
  activeModelHint: string;
  activeModelLabel: string;
  canCopy: boolean;
  canGenerate: boolean;
  copyStatus: "idle" | "copied" | "failed";
  displayedOutputText: string;
  generationBlocker: string;
  isModelSelectorOpen: boolean;
  lastSourceText: string;
  mode: FeedbackMode;
  modelSelectorOptions: ModelSelectorOption[];
  onCopy: () => void;
  onGenerate: () => void;
  onSelectModel: (modelId: string) => void;
  onSelectVariant: (variantId: string) => void;
  onToggleModelSelector: () => void;
  outputErrorMessage: string;
  outputStatus: OutputState["status"];
  selectedModelId: string;
  selectedVariant: FeedbackVariant | null;
  shortInputConfirmationPending: boolean;
  variants: FeedbackVariant[];
  warnings: string[];
};

export function PolishedOutputPanel({
  activeModelHint,
  activeModelLabel,
  canCopy,
  canGenerate,
  copyStatus,
  displayedOutputText,
  generationBlocker,
  isModelSelectorOpen,
  lastSourceText,
  mode,
  modelSelectorOptions,
  onCopy,
  onGenerate,
  onSelectModel,
  onSelectVariant,
  onToggleModelSelector,
  outputErrorMessage,
  outputStatus,
  selectedModelId,
  selectedVariant,
  shortInputConfirmationPending,
  variants,
  warnings,
}: PolishedOutputPanelProps) {
  return (
    <section className={`output-panel output-${outputStatus}`} aria-label="Polished feedback">
      <div className="output-header">
        <div>
          <p className="eyebrow">Polished draft</p>
          <h2>{mode === "ranting" ? "Final combined feedback" : "Ready to send"}</h2>
        </div>
        <div className="generation-controls">
          <ModelSelector
            disabled={outputStatus === "loading" || modelSelectorOptions.length === 0}
            hint={activeModelHint}
            isOpen={isModelSelectorOpen}
            label={activeModelLabel}
            options={modelSelectorOptions}
            selectedId={selectedModelId}
            onSelect={onSelectModel}
            onToggle={onToggleModelSelector}
          />
          <button type="button" onClick={onGenerate} disabled={!canGenerate}>
            {outputStatus === "loading" ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
      {generationBlocker && outputStatus !== "loading" ? (
        <p className="notice">{generationBlocker}</p>
      ) : null}
      {shortInputConfirmationPending ? (
        <p className="notice">
          This is pretty short. Add a little more context for a useful rewrite, or press Generate
          again to use it as-is.
        </p>
      ) : null}
      {outputStatus === "error" ? (
        <p className="error-message">{outputErrorMessage}</p>
      ) : null}
      {warnings.map((warning) => (
        <p className="notice" key={warning}>
          {warning}
        </p>
      ))}
      {outputStatus === "loading" ? (
        <div className="thinking" aria-live="polite">
          <span />
          Reading the spice, finding the useful signal...
        </div>
      ) : null}
      <div className="output-grid">
        <article className="output-card before-card">
          <div className="card-label">Before</div>
          <p>{lastSourceText || "Your original feedback will be captured here after generation."}</p>
        </article>
        <article className="output-card after-card">
          <div className="card-toolbar">
            <span className="card-label">
              After{selectedVariant ? ` - ${selectedVariant.label}` : ""}
            </span>
            <button type="button" onClick={onCopy} disabled={!canCopy}>
              {copyStatus === "copied" ? "Copied" : "Copy"}
            </button>
          </div>
          {variants.length > 1 ? (
            <div className="variant-picker" aria-label="Output variants">
              {variants.map((variant) => (
                <button
                  className={selectedVariant?.id === variant.id ? "active" : ""}
                  key={variant.id}
                  type="button"
                  onClick={() => onSelectVariant(variant.id)}
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
          {copyStatus === "failed" ? (
            <span className="copy-error">Copy failed. Select the text manually.</span>
          ) : null}
        </article>
      </div>
    </section>
  );
}
