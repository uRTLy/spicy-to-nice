import type { ModelSelectorOption } from "../../ModelSelector";
import { getHostedModels } from "../../ai/hostedModelCatalog";
import { defaultLocalModelId, supportedLocalModels } from "../../ai/localModelCatalog";
import { providerConfigs } from "../../ai/providers";
import type { Provider } from "../../feedbackTypes";
import type { LocalModelAvailability } from "./useLocalModelDownloads";
import type { TranslatorState } from "./translatorState";
import { getSegmentsForGeneration } from "./translatorState";
import { canUseLocalModel, isLocalStatusBusy } from "./useLocalModelDownloads";

export function getProviderDescription(provider: Provider) {
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

export function getLocalGenerationBlocker(
  state: TranslatorState,
  status: LocalModelAvailability | undefined,
) {
  if (state.provider !== "local") {
    return "";
  }

  if (!status) {
    return "Download a local model in AI setup, then select it from the model picker.";
  }

  if (isLocalStatusBusy(status)) {
    return "Finish downloading or preparing the selected local model before generating.";
  }

  if (!canUseLocalModel(status)) {
    return "Download a local model in AI setup, then select it from the model picker.";
  }

  return "";
}

export function getGenerationBlocker(state: TranslatorState) {
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

export function buildModelOptions(
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
        : `${model.estimatedDownloadMB} MB, download in AI setup`,
      status: isUsable ? getModelPickerLocalStatus(status) : "",
      disabled: !isUsable,
      default: model.id === defaultLocalModelId,
    };
  });

  return [...hostedOptions, ...localOptions];
}

export function resizeComposerInput(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 150)}px`;
}

function getModelPickerLocalStatus(status: LocalModelAvailability | undefined) {
  if (canUseLocalModel(status)) {
    return "Offline";
  }

  if (status?.stage === "unavailable") {
    return "Unavailable";
  }

  if (status?.stage === "error") {
    return "Retry in AI setup";
  }

  if (status && isLocalStatusBusy(status)) {
    return "Downloading in AI setup";
  }

  return "Needs download";
}
