import type { RefObject } from "react";
import type { FeedbackMode } from "../../../feedbackTypes";
import type { Segment } from "../translatorState";
import { resizeComposerInput } from "../translatorUtils";

type FeedbackComposerProps = {
  canSendDraft: boolean;
  draft: string;
  isGenerating: boolean;
  mode: FeedbackMode;
  onDraftChange: (draft: string) => void;
  onModeChange: (mode: FeedbackMode) => void;
  onRemoveSegment: (id: string) => void;
  onSubmitDraft: () => void;
  segments: Segment[];
  sendButtonLabel: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function FeedbackComposer({
  canSendDraft,
  draft,
  isGenerating,
  mode,
  onDraftChange,
  onModeChange,
  onRemoveSegment,
  onSubmitDraft,
  segments,
  sendButtonLabel,
  textareaRef,
}: FeedbackComposerProps) {
  return (
    <div className={`input-panel ${mode === "ranting" ? "ranting-panel" : ""}`}>
      <div className="mode-switch" aria-label="Writing mode">
        <button
          className={mode === "single" ? "active" : ""}
          type="button"
          disabled={isGenerating}
          onClick={() => onModeChange("single")}
        >
          Standard
        </button>
        <button
          className={mode === "ranting" ? "active" : ""}
          type="button"
          disabled={isGenerating}
          onClick={() => onModeChange("ranting")}
        >
          Ranting
        </button>
      </div>

      <div className="input-heading">
        <span className="field-label">{mode === "ranting" ? "Rant stream" : "Raw feedback"}</span>
        {mode === "ranting" ? <span>{segments.length} saved</span> : null}
      </div>

      <div className="message-surface">
        {mode === "ranting" ? (
          segments.length > 0 ? (
            <ol className="segment-list" aria-label="Saved rant segments">
              {segments.map((segment, index) => (
                <li key={segment.id}>
                  <span>{index + 1}</span>
                  <p>{segment.text}</p>
                  <button
                    type="button"
                    aria-label={`Remove thought ${index + 1}`}
                    disabled={isGenerating}
                    onClick={() => onRemoveSegment(segment.id)}
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
        ) : draft.trim() ? null : (
          <div className="standard-empty">
            Drop the spicy version here, then send it for polish.
          </div>
        )}

        <div className="composer" data-mode={mode}>
          <label className="sr-only" htmlFor="raw-feedback">
            {mode === "ranting" ? "Rant segment" : "Raw feedback"}
          </label>
          <textarea
            id="raw-feedback"
            ref={textareaRef}
            rows={1}
            value={draft}
            disabled={isGenerating}
            onChange={(event) => {
              resizeComposerInput(event.currentTarget);
              onDraftChange(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                onSubmitDraft();
              }
            }}
            placeholder={
              mode === "ranting"
                ? "Rant here. Enter sends this thought..."
                : "Paste the spicy version here..."
            }
          />
          <button
            type="button"
            aria-label={sendButtonLabel}
            title={sendButtonLabel}
            disabled={!canSendDraft}
            onClick={onSubmitDraft}
          >
            ↑
          </button>
        </div>
        <p className="composer-hint">Enter to send. Shift+Enter for a new line.</p>
      </div>
    </div>
  );
}
