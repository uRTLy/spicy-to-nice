import type { LocalModelRecord } from "../../../ai/localModelCatalog";
import type { ProviderConfig } from "../../../feedbackTypes";
import type { LocalModelAvailability } from "../useLocalModelDownloads";
import {
  getLocalDownloadButtonLabel,
  getTopbarLocalStatus,
} from "../useLocalModelDownloads";
import { getProviderDescription } from "../translatorUtils";

type AiSetupPopoverProps = {
  activeLocalModelId: string | null;
  apiKey: string;
  canDownloadSelectedLocalModel: boolean;
  isGenerating: boolean;
  localDownloadModel: LocalModelRecord;
  localDownloadProgress: number | undefined;
  localDownloadStatus: LocalModelAvailability | undefined;
  onApiKeyChange: (apiKey: string) => void;
  onDownloadLocalModel: (modelId: string) => void;
  onLocalDownloadModelChange: (modelId: string) => void;
  onProviderChange: (provider: ProviderConfig["provider"]) => void;
  provider: ProviderConfig["provider"];
  selectedProvider: ProviderConfig | undefined;
  supportedLocalModels: LocalModelRecord[];
  visibleProviderConfigs: ProviderConfig[];
};

export function AiSetupPopover({
  activeLocalModelId,
  apiKey,
  canDownloadSelectedLocalModel,
  isGenerating,
  localDownloadModel,
  localDownloadProgress,
  localDownloadStatus,
  onApiKeyChange,
  onDownloadLocalModel,
  onLocalDownloadModelChange,
  onProviderChange,
  provider,
  selectedProvider,
  supportedLocalModels,
  visibleProviderConfigs,
}: AiSetupPopoverProps) {
  return (
    <div className="ai-setup-popover">
      <div className="ai-setup-header">
        <p>AI setup</p>
        <span>Keys stay in memory only. Local models stay in this browser.</span>
      </div>

      <section className="ai-setup-section">
        <span className="field-label">Provider</span>
        <div className="provider-picker" role="group" aria-label="AI provider">
          {visibleProviderConfigs.map((item) => (
            <button
              className={provider === item.provider ? "active" : ""}
              key={item.provider}
              type="button"
              disabled={isGenerating || activeLocalModelId !== null}
              onClick={() => onProviderChange(item.provider)}
            >
              <span>{item.label}</span>
              <small>{getProviderDescription(item.provider)}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="ai-setup-section">
        {selectedProvider?.requiresApiKey ? (
          <div className="api-key-field compact">
            <label htmlFor="api-key">API key</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              disabled={isGenerating}
              onChange={(event) => onApiKeyChange(event.target.value)}
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
                disabled={isGenerating || activeLocalModelId !== null}
                onChange={(event) => onLocalDownloadModelChange(event.target.value)}
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
                onClick={() => onDownloadLocalModel(localDownloadModel.id)}
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
      </section>
    </div>
  );
}
