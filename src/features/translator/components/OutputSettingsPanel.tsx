import {
  audienceOptions,
  defaultEditableSystemPrompt,
  reasoningOptions,
  toneOptions,
} from "../../../config/feedbackConfig";
import type { Audience, ReasoningEffort, Tone } from "../../../feedbackTypes";

type OutputSettingsPanelProps = {
  audience: Audience;
  isGenerating: boolean;
  isSettingsOpen: boolean;
  onAudienceChange: (audience: Audience) => void;
  onReasoningEffortChange: (reasoningEffort: ReasoningEffort) => void;
  onResetSystemPrompt: () => void;
  onSystemPromptChange: (systemPrompt: string) => void;
  onToggleSettings: () => void;
  onToneChange: (tone: Tone) => void;
  reasoningEffort: ReasoningEffort;
  systemPrompt: string;
  tone: Tone;
};

export function OutputSettingsPanel({
  audience,
  isGenerating,
  isSettingsOpen,
  onAudienceChange,
  onReasoningEffortChange,
  onResetSystemPrompt,
  onSystemPromptChange,
  onToggleSettings,
  onToneChange,
  reasoningEffort,
  systemPrompt,
  tone,
}: OutputSettingsPanelProps) {
  return (
    <aside className="settings-panel" aria-label="Output settings">
      <div className="settings-panel-toolbar">
        <span className="field-label">Output settings</span>
        <div className="settings-menu">
          <button
            aria-expanded={isSettingsOpen}
            aria-label="Generation settings"
            className="settings-button"
            type="button"
            onClick={onToggleSettings}
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
                    disabled={isGenerating || systemPrompt === defaultEditableSystemPrompt}
                    onClick={onResetSystemPrompt}
                  >
                    Reset
                  </button>
                </div>
                <textarea
                  className="prompt-editor"
                  value={systemPrompt}
                  disabled={isGenerating}
                  rows={5}
                  onChange={(event) => onSystemPromptChange(event.target.value)}
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
                      className={reasoningEffort === option.id ? "active" : ""}
                      disabled={isGenerating}
                      key={option.id}
                      title={option.description}
                      type="button"
                      onClick={() => onReasoningEffortChange(option.id)}
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
              className={audience === item.id ? "active" : ""}
              key={item.id}
              type="button"
              disabled={isGenerating}
              onClick={() => onAudienceChange(item.id)}
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
              className={tone === item.id ? "active" : ""}
              key={item.id}
              type="button"
              disabled={isGenerating}
              onClick={() => onToneChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
