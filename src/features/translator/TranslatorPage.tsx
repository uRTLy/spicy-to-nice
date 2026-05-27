import { useEffect, useState } from "react";
import { supportedLocalModels } from "../../ai/localModelCatalog";
import { AiSetupPopover } from "./components/AiSetupPopover";
import { FeedbackComposer } from "./components/FeedbackComposer";
import { OutputSettingsPanel } from "./components/OutputSettingsPanel";
import { PolishedOutputPanel } from "./components/PolishedOutputPanel";
import { TopBar } from "./components/TopBar";
import { useTranslatorController } from "./useTranslatorController";

type TranslatorPageProps = {
  onOpenConversation: () => void;
};

export function TranslatorPage({ onOpenConversation }: TranslatorPageProps) {
  const translator = useTranslatorController();
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAiSetupOpen, setIsAiSetupOpen] = useState(false);
  const {
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
  } = translator;

  useEffect(() => {
    if (!isModelSelectorOpen && !isSettingsOpen && !isAiSetupOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModelSelectorOpen(false);
        setIsSettingsOpen(false);
        setIsAiSetupOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isAiSetupOpen, isModelSelectorOpen, isSettingsOpen]);

  return (
    <main className="app-shell">
      <section className="workbench" aria-label="Feedback translator">
        <TopBar
          isAiSetupOpen={isAiSetupOpen}
          onOpenConversation={onOpenConversation}
          onToggleAiSetup={() => {
            setIsModelSelectorOpen(false);
            setIsSettingsOpen(false);
            setIsAiSetupOpen((current) => !current);
          }}
          providerLabel={selectedProvider?.label ?? "Provider"}
        >
          <AiSetupPopover
            activeLocalModelId={localDownloads.activeLocalModelId}
            apiKey={state.apiKey}
            canDownloadSelectedLocalModel={localDownloads.canDownloadSelectedLocalModel}
            isGenerating={state.output.status === "loading"}
            localDownloadModel={localDownloads.localDownloadModel}
            localDownloadProgress={localDownloads.localDownloadProgress}
            localDownloadStatus={localDownloads.localDownloadStatus}
            onApiKeyChange={(apiKey) => dispatch({ type: "set_api_key", apiKey })}
            onDownloadLocalModel={(modelId) => void localDownloads.downloadLocalModel(modelId)}
            onLocalDownloadModelChange={localDownloads.setLocalDownloadModelId}
            onProviderChange={(provider) => {
              dispatch({ type: "set_provider", provider });
              setIsModelSelectorOpen(false);
            }}
            provider={state.provider}
            selectedProvider={selectedProvider}
            supportedLocalModels={supportedLocalModels}
            visibleProviderConfigs={visibleProviderConfigs}
          />
        </TopBar>

        {state.mode === "ranting" ? (
          <div className="flow-banner" aria-live="polite">
            <span>{state.segments.length}</span>
            {state.segments.length === 1 ? "thought captured" : "thoughts captured"}
            <strong>Press Enter to keep the flow going.</strong>
          </div>
        ) : null}

        <section className="grid">
          <FeedbackComposer
            canSendDraft={canSendDraft}
            draft={state.draft}
            isGenerating={state.output.status === "loading"}
            mode={state.mode}
            onDraftChange={(draft) => dispatch({ type: "set_draft", draft })}
            onModeChange={(mode) => dispatch({ type: "switch_mode", mode })}
            onRemoveSegment={(id) => dispatch({ type: "remove_segment", id })}
            onSubmitDraft={submitDraft}
            segments={state.segments}
            sendButtonLabel={sendButtonLabel}
            textareaRef={textareaRef}
          />

          <OutputSettingsPanel
            audience={state.audience}
            isGenerating={state.output.status === "loading"}
            isSettingsOpen={isSettingsOpen}
            onAudienceChange={(audience) => dispatch({ type: "set_audience", audience })}
            onReasoningEffortChange={(reasoningEffort) =>
              dispatch({ type: "set_reasoning_effort", reasoningEffort })
            }
            onResetSystemPrompt={() => dispatch({ type: "reset_system_prompt" })}
            onSystemPromptChange={(systemPrompt) =>
              dispatch({ type: "set_system_prompt", systemPrompt })
            }
            onToggleSettings={() => {
              setIsModelSelectorOpen(false);
              setIsAiSetupOpen(false);
              setIsSettingsOpen((current) => !current);
            }}
            onToneChange={(tone) => dispatch({ type: "set_tone", tone })}
            reasoningEffort={state.reasoningEffort}
            systemPrompt={state.systemPrompt}
            tone={state.tone}
          />
        </section>

        <PolishedOutputPanel
          activeModelHint={activeModelHint}
          activeModelLabel={activeModelLabel}
          canCopy={canCopy}
          canGenerate={canGenerate}
          copyStatus={state.copyStatus}
          displayedOutputText={displayedOutputText}
          generationBlocker={generationBlocker}
          isModelSelectorOpen={isModelSelectorOpen}
          lastSourceText={state.lastSourceText}
          mode={state.mode}
          modelSelectorOptions={modelSelectorOptions}
          onCopy={() => void copyOutput()}
          onGenerate={() => void generate()}
          onSelectModel={(modelId) => {
            selectModel(modelId);
            setIsModelSelectorOpen(false);
          }}
          onSelectVariant={(id) => dispatch({ type: "select_variant", id })}
          onToggleModelSelector={() => {
            setIsAiSetupOpen(false);
            setIsSettingsOpen(false);
            setIsModelSelectorOpen((current) => !current);
          }}
          outputErrorMessage={state.output.status === "error" ? state.output.message : ""}
          outputStatus={state.output.status}
          selectedModelId={selectedModelId}
          selectedVariant={selectedVariant}
          shortInputConfirmationPending={state.shortInputConfirmationPending}
          variants={state.variants}
          warnings={state.warnings}
        />
      </section>
    </main>
  );
}
