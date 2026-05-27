import { useEffect, useState } from "react";
import { llmDownloader, type LLMDownloadProgress } from "../../ai/llmDownloader";
import {
  defaultLocalModelId,
  getDefaultLocalModel,
  getLocalModel,
} from "../../ai/localModelCatalog";

export type LocalModelAvailabilityStage =
  | "checking"
  | "not-downloaded"
  | "preparing"
  | "downloading"
  | "loading"
  | "downloaded"
  | "ready"
  | "unavailable"
  | "error";

export type LocalModelAvailability = {
  stage: LocalModelAvailabilityStage;
  message: string;
  progress?: number;
};

type UseLocalModelDownloadsOptions = {
  isGenerating: boolean;
  localModelId: string;
  onLocalModelReady: (modelId: string) => void;
};

export function useLocalModelDownloads({
  isGenerating,
  localModelId,
  onLocalModelReady,
}: UseLocalModelDownloadsOptions) {
  const [localModelStatuses, setLocalModelStatuses] = useState<
    Record<string, LocalModelAvailability>
  >({});
  const [activeLocalModelId, setActiveLocalModelId] = useState<string | null>(null);
  const [localDownloadModelId, setLocalDownloadModelId] = useState(defaultLocalModelId);
  const selectedLocalModel = getLocalModel(localModelId) ?? getDefaultLocalModel();
  const selectedLocalStatus = localModelStatuses[selectedLocalModel.id];
  const localDownloadModel = getLocalModel(localDownloadModelId) ?? getDefaultLocalModel();
  const localDownloadStatus = localModelStatuses[localDownloadModel.id];
  const localDownloadProgress = getLocalModelProgress(localDownloadStatus);
  const canDownloadSelectedLocalModel = canDownloadLocalModel(
    localDownloadStatus,
    activeLocalModelId,
    localDownloadModel.id,
    isGenerating,
  );

  useEffect(() => {
    const unsubscribe = llmDownloader.subscribe((progress) => {
      if (!progress.modelId) {
        return;
      }

      setLocalModelStatuses((current) => ({
        ...current,
        [progress.modelId as string]: mapDownloadProgressToAvailability(progress),
      }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  async function downloadLocalModel(modelId: string) {
    const status = localModelStatuses[modelId];

    if (
      activeLocalModelId ||
      isGenerating ||
      status?.stage === "ready" ||
      status?.stage === "downloaded"
    ) {
      return;
    }

    setActiveLocalModelId(modelId);
    setLocalModelStatuses((current) => ({
      ...current,
      [modelId]: {
        stage: "preparing",
        message: "Preparing the browser download.",
      },
    }));

    try {
      const { preloadWebLLMModel } = await import("../../ai/webllmAdapter");

      await preloadWebLLMModel(modelId);
      onLocalModelReady(modelId);
    } catch {
      // The downloader owns user-facing progress and error messages.
    } finally {
      setActiveLocalModelId(null);
    }
  }

  function selectLocalModel(modelId: string) {
    const status = localModelStatuses[modelId];

    if (!canUseLocalModel(status) || isGenerating) {
      return;
    }

    onLocalModelReady(modelId);
  }

  return {
    activeLocalModelId,
    canDownloadSelectedLocalModel,
    downloadLocalModel,
    localDownloadModel,
    localDownloadModelId,
    localDownloadProgress,
    localDownloadStatus,
    localModelStatuses,
    selectLocalModel,
    selectedLocalModel,
    selectedLocalStatus,
    setLocalDownloadModelId,
  };
}

export function canUseLocalModel(status: LocalModelAvailability | undefined) {
  return status?.stage === "downloaded" || status?.stage === "ready";
}

export function isLocalStatusBusy(status: LocalModelAvailability | undefined) {
  return (
    status?.stage === "checking" ||
    status?.stage === "preparing" ||
    status?.stage === "downloading" ||
    status?.stage === "loading"
  );
}

export function getLocalModelControlLabel(
  modelLabel: string,
  status: LocalModelAvailability | undefined,
) {
  if (status?.stage === "ready") {
    return `${modelLabel} ready`;
  }

  if (status?.stage === "downloaded") {
    return modelLabel;
  }

  return modelLabel;
}

export function getLocalModelControlHint(status: LocalModelAvailability | undefined) {
  if (status?.stage === "ready") {
    return "Ready in this tab";
  }

  if (status?.stage === "downloaded") {
    return "Downloaded";
  }

  if (status?.stage === "downloading" && typeof status.progress === "number") {
    return `${Math.round(status.progress * 100)}%`;
  }

  if (status?.stage === "unavailable") {
    return "WebGPU needed";
  }

  return "Download in AI setup";
}

export function getLocalDownloadButtonLabel(status: LocalModelAvailability | undefined) {
  if (status?.stage === "ready" || status?.stage === "downloaded") {
    return "Downloaded";
  }

  if (status?.stage === "checking") {
    return "Checking";
  }

  if (status?.stage === "preparing") {
    return "Preparing";
  }

  if (status?.stage === "downloading") {
    return "Downloading...";
  }

  if (status?.stage === "loading") {
    return "Loading...";
  }

  if (status?.stage === "unavailable") {
    return "Unavailable";
  }

  if (status?.stage === "error") {
    return "Retry";
  }

  return "Download";
}

export function getTopbarLocalStatus(
  modelLabel: string,
  status: LocalModelAvailability | undefined,
) {
  if (!status) {
    return `${modelLabel} is not downloaded in this browser yet.`;
  }

  if (isLocalStatusBusy(status)) {
    return getLocalModelProgressHint(status);
  }

  return status.message;
}

function mapDownloadProgressToAvailability(
  progress: LLMDownloadProgress,
): LocalModelAvailability {
  switch (progress.stage) {
    case "checking-support":
      return {
        stage: "checking",
        message: progress.message,
        progress: progress.progress,
      };
    case "ready-to-download":
      return {
        stage: "preparing",
        message: progress.message,
        progress: progress.progress,
      };
    case "downloading":
    case "loading":
    case "ready":
    case "unavailable":
    case "error":
      return {
        stage: progress.stage,
        message: progress.message,
        progress: progress.progress,
      };
    case "idle":
    default:
      return {
        stage: "not-downloaded",
        message: "Not downloaded in this browser yet.",
      };
  }
}

function getLocalModelProgress(status: LocalModelAvailability | undefined) {
  if (!status || !isLocalStatusBusy(status)) {
    return undefined;
  }

  if (typeof status.progress === "number") {
    return status.progress;
  }

  switch (status.stage) {
    case "checking":
      return 0.04;
    case "preparing":
      return 0.08;
    case "loading":
      return 0.92;
    default:
      return undefined;
  }
}

function getLocalModelProgressHint(status: LocalModelAvailability) {
  const percent =
    typeof status.progress === "number" ? `${Math.round(status.progress * 100)}% - ` : "";

  return `${percent}${status.message}`;
}

function canDownloadLocalModel(
  status: LocalModelAvailability | undefined,
  activeLocalModelId: string | null,
  modelId: string,
  isGenerating: boolean,
) {
  if (isGenerating || (activeLocalModelId !== null && activeLocalModelId !== modelId)) {
    return false;
  }

  return !status || status.stage === "not-downloaded" || status.stage === "error";
}
