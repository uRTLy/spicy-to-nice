import type { InitProgressReport } from "@mlc-ai/web-llm";
import { FeedbackGenerationError } from "./errors";
import {
  buildWebLLMAppConfig,
  getDefaultLocalModel,
  getLocalModel,
  type LocalModelId,
  type LocalModelRecord,
} from "./localModelCatalog";

export type LLMDownloadStage =
  | "idle"
  | "checking-support"
  | "ready-to-download"
  | "downloading"
  | "loading"
  | "ready"
  | "unavailable"
  | "error";

export type LLMDownloadProgress = {
  stage: LLMDownloadStage;
  message: string;
  modelId?: string;
  progress?: number;
};

export type LLMDownloadPlan = {
  model: LocalModelRecord;
  estimatedDownloadMB: number;
  vramRequiredMB: number;
  cacheBackend: "cache";
  urls: LocalModelRecord["urls"];
};

type ProgressListener = (progress: LLMDownloadProgress) => void;

export class LLMDownloader {
  private listeners = new Set<ProgressListener>();
  private currentProgress: LLMDownloadProgress = {
    stage: "idle",
    message: "Local model is not loaded yet.",
  };

  subscribe(listener: ProgressListener) {
    this.listeners.add(listener);
    listener(this.currentProgress);
    return () => this.listeners.delete(listener);
  }

  getCurrentProgress() {
    return this.currentProgress;
  }

  getPlan(modelId: LocalModelId | string = getDefaultLocalModel().id): LLMDownloadPlan {
    const model = getLocalModel(modelId);

    if (!model) {
      throw new FeedbackGenerationError(`Unsupported local model: ${modelId}`);
    }

    return {
      model,
      estimatedDownloadMB: model.estimatedDownloadMB,
      vramRequiredMB: model.vramRequiredMB,
      cacheBackend: "cache",
      urls: model.urls,
    };
  }

  assertWebGPUSupport(model?: LocalModelRecord) {
    this.emit({
      stage: "checking-support",
      message: "Checking whether this browser supports local WebGPU inference.",
      modelId: model?.id,
    });

    if (!("gpu" in navigator)) {
      this.emit({
        stage: "unavailable",
        message: "Offline mode needs a browser with WebGPU support.",
        modelId: model?.id,
      });

      throw new FeedbackGenerationError(
        "Offline mode needs WebGPU. Try Chrome, Edge, or another WebGPU-capable browser, or use OpenAI BYOK.",
      );
    }
  }

  createAppConfig(modelId?: LocalModelId | string) {
    const { model } = this.getPlan(modelId);
    return buildWebLLMAppConfig(model);
  }

  async prepare(modelId?: LocalModelId | string) {
    const plan = this.getPlan(modelId);
    this.assertWebGPUSupport(plan.model);

    this.emit({
      stage: "ready-to-download",
      message: `${plan.model.label} needs about ${plan.estimatedDownloadMB} MB downloaded on first use and about ${Math.round(
        plan.vramRequiredMB,
      )} MB GPU memory while running.`,
      modelId: plan.model.id,
    });

    return plan;
  }

  mapWebLLMProgress(progress: InitProgressReport, model?: LocalModelRecord) {
    const message = progress.text || "Loading local model.";
    const lowerMessage = message.toLowerCase();

    this.emit({
      stage: lowerMessage.includes("download") ? "downloading" : "loading",
      message,
      modelId: model?.id,
      progress: progress.progress,
    });
  }

  markReady(model: LocalModelRecord) {
    this.emit({
      stage: "ready",
      message: `${model.label} is ready for offline generation.`,
      modelId: model.id,
      progress: 1,
    });
  }

  markError(message: string, model?: LocalModelRecord) {
    this.emit({ stage: "error", message, modelId: model?.id });
  }

  private emit(progress: LLMDownloadProgress) {
    this.currentProgress = progress;

    for (const listener of this.listeners) {
      listener(progress);
    }
  }
}

export const llmDownloader = new LLMDownloader();
