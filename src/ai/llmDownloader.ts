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

  subscribe(listener: ProgressListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
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

  assertWebGPUSupport() {
    this.emit({
      stage: "checking-support",
      message: "Checking whether this browser supports local WebGPU inference.",
    });

    if (!("gpu" in navigator)) {
      this.emit({
        stage: "unavailable",
        message: "Offline mode needs a browser with WebGPU support.",
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
    this.assertWebGPUSupport();

    this.emit({
      stage: "ready-to-download",
      message: `${plan.model.label} needs about ${plan.estimatedDownloadMB} MB downloaded on first use and about ${Math.round(
        plan.vramRequiredMB,
      )} MB GPU memory while running.`,
    });

    return plan;
  }

  mapWebLLMProgress(progress: InitProgressReport) {
    const message = progress.text || "Loading local model.";
    const lowerMessage = message.toLowerCase();

    this.emit({
      stage: lowerMessage.includes("download") ? "downloading" : "loading",
      message,
      progress: progress.progress,
    });
  }

  markReady(model: LocalModelRecord) {
    this.emit({
      stage: "ready",
      message: `${model.label} is ready for offline generation.`,
      progress: 1,
    });
  }

  markError(message: string) {
    this.emit({ stage: "error", message });
  }

  private emit(progress: LLMDownloadProgress) {
    for (const listener of this.listeners) {
      listener(progress);
    }
  }
}

export const llmDownloader = new LLMDownloader();
