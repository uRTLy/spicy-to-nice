import localModels from "./localModels.json";

export type LocalModelSizeClass = "tiny" | "small" | "medium" | "large";
export type LocalModelQualityTier = "compatibility" | "default" | "quality";

export type LocalModelRecord = {
  id: string;
  modelId: string;
  label: string;
  family: string;
  sizeClass: LocalModelSizeClass;
  recommendedUse: string;
  qualityTier: LocalModelQualityTier;
  estimatedDownloadMB: number;
  vramRequiredMB: number;
  lowResourceRequired: boolean;
  requiredFeatures: string[];
  urls: {
    model: string;
    modelLib: string;
  };
  overrides: {
    context_window_size: number;
  };
};

export type LocalModelId = string;

const catalog = localModels as LocalModelRecord[];

export const supportedLocalModels: LocalModelRecord[] = catalog;

export const defaultLocalModelId: LocalModelId = "smollm2-360m-instruct-q4f16_1";

export function getLocalModel(modelId: LocalModelId | string): LocalModelRecord | undefined {
  return supportedLocalModels.find((model) => model.id === modelId || model.modelId === modelId);
}

export function getDefaultLocalModel(): LocalModelRecord {
  const model = getLocalModel(defaultLocalModelId);

  if (!model) {
    throw new Error(`Default local model ${defaultLocalModelId} is missing from the catalog.`);
  }

  return model;
}

export function buildWebLLMModelRecord(model: LocalModelRecord) {
  return {
    model: model.urls.model,
    model_id: model.modelId,
    model_lib: model.urls.modelLib,
    vram_required_MB: model.vramRequiredMB,
    low_resource_required: model.lowResourceRequired,
    required_features: model.requiredFeatures.length > 0 ? model.requiredFeatures : undefined,
    overrides: model.overrides,
  };
}

export function buildWebLLMAppConfig(model: LocalModelRecord) {
  return {
    cacheBackend: "cache",
    model_list: [buildWebLLMModelRecord(model)],
  };
}
