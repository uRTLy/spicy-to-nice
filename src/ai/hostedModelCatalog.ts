import type { Provider } from "../feedbackTypes";
import hostedModels from "./hostedModels.json";

export type HostedModelRecord = {
  id: string;
  label: string;
  provider: Provider;
  description: string;
  default?: boolean;
};

export const hostedModelCatalog = hostedModels as HostedModelRecord[];
export const defaultHostedModelId =
  hostedModelCatalog.find((model) => model.default)?.id ?? hostedModelCatalog[0].id;

export function getHostedModels(provider: Provider) {
  return hostedModelCatalog.filter((model) => model.provider === provider);
}

export function getHostedModel(modelId: string) {
  return hostedModelCatalog.find((model) => model.id === modelId);
}
