import type {
  InitProgressCallback,
  MLCEngineInterface,
} from "@mlc-ai/web-llm";
import type { GenerateFeedbackOutput } from "../feedbackTypes";
import { FeedbackGenerationError } from "./errors";
import { createSingleVariantOutput, parseFeedbackResponseText } from "./feedbackResponse";
import { llmDownloader } from "./llmDownloader";
import {
  buildFeedbackPrompt,
  buildTinyLocalFeedbackPrompt,
  feedbackResponseSchema,
} from "./prompt";
import type { NormalizedGenerateFeedbackInput } from "./providerAdapters";

const MAX_LOCAL_OUTPUT_TOKENS = 620;
const MAX_TINY_LOCAL_OUTPUT_TOKENS = 220;
const LOCAL_TEMPERATURE = 0.3;

type EngineEntry = {
  modelId: string;
  promise: Promise<MLCEngineInterface>;
};

let engineEntry: EngineEntry | null = null;

export async function generateWithWebLLM(
  input: NormalizedGenerateFeedbackInput,
): Promise<GenerateFeedbackOutput> {
  const { engine, model } = await getLocalEngine(input.localModelId);

  if (model.sizeClass === "tiny") {
    return generateTinyLocalFeedback(engine, input);
  }

  const prompt = buildFeedbackPrompt(input);
  const localInstructions = [
    prompt.instructions,
    "Return only valid JSON, with no markdown fences.",
    `Use this JSON schema: ${JSON.stringify(feedbackResponseSchema)}`,
  ].join("\n");

  try {
    const response = await engine.chat.completions.create({
      messages: [
        { role: "system", content: localInstructions },
        { role: "user", content: prompt.input },
      ],
      temperature: LOCAL_TEMPERATURE,
      max_tokens: MAX_LOCAL_OUTPUT_TOKENS,
      stream: false,
    });

    const responseText = response.choices[0]?.message.content?.trim() ?? "";

    if (!responseText) {
      throw new FeedbackGenerationError(
        "The local model returned an empty response. Try again with more context or use OpenAI.",
      );
    }

    return parseFeedbackResponseText(responseText);
  } catch (error) {
    throw normalizeLocalGenerationError(error);
  }
}

async function generateTinyLocalFeedback(
  engine: MLCEngineInterface,
  input: NormalizedGenerateFeedbackInput,
): Promise<GenerateFeedbackOutput> {
  const prompt = buildTinyLocalFeedbackPrompt(input);

  try {
    const response = await engine.chat.completions.create({
      messages: [
        { role: "system", content: prompt.instructions },
        { role: "user", content: prompt.input },
      ],
      temperature: 0.2,
      max_tokens: MAX_TINY_LOCAL_OUTPUT_TOKENS,
      stream: false,
    });

    const responseText = response.choices[0]?.message.content?.trim() ?? "";

    if (!responseText) {
      throw new FeedbackGenerationError(
        "The local model returned an empty response. Try again with more context or use OpenAI.",
      );
    }

    if (responseText.split(/\s+/).filter(Boolean).length < 6) {
      throw new FeedbackGenerationError(
        "The tiny local model returned too little usable feedback. Try a larger local model or switch to OpenAI.",
      );
    }

    const output = createSingleVariantOutput(responseText);

    return {
      ...output,
      warnings: [
        ...(output.warnings ?? []),
        "Tiny offline models return one balanced draft. Use OpenAI or a larger local model for stronger nuance and variants.",
      ],
    };
  } catch (error) {
    throw normalizeLocalGenerationError(error);
  }
}

export async function preloadWebLLMModel(modelId?: string) {
  await getLocalEngine(modelId);
}

async function getLocalEngine(modelId?: string) {
  const plan = await llmDownloader.prepare(modelId);

  if (engineEntry?.modelId === plan.model.modelId) {
    const engine = await engineEntry.promise;
    llmDownloader.markReady(plan.model);
    return { engine, model: plan.model };
  }

  if (engineEntry) {
    await unloadPreviousEngine(engineEntry);
    engineEntry = null;
  }

  const initProgressCallback: InitProgressCallback = (progress) => {
    llmDownloader.mapWebLLMProgress(progress, plan.model);
  };

  const promise = createEngine(plan.model.modelId, plan.model.id, initProgressCallback);
  engineEntry = { modelId: plan.model.modelId, promise };

  try {
    const engine = await promise;
    llmDownloader.markReady(plan.model);
    return { engine, model: plan.model };
  } catch (error) {
    engineEntry = null;
    const message = getLocalErrorMessage(error);
    llmDownloader.markError(message, plan.model);
    throw new FeedbackGenerationError(message);
  }
}

async function unloadPreviousEngine(entry: EngineEntry) {
  try {
    const engine = await entry.promise;
    await engine.unload();
  } catch {
    // Best effort: a failed previous load should not block loading the newly selected model.
  }
}

async function createEngine(
  modelId: string,
  catalogModelId: string,
  initProgressCallback: InitProgressCallback,
): Promise<MLCEngineInterface> {
  const webllm = await import("@mlc-ai/web-llm");
  const worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), {
    type: "module",
  });

  return webllm.CreateWebWorkerMLCEngine(worker, modelId, {
    appConfig: llmDownloader.createAppConfig(catalogModelId),
    initProgressCallback,
  });
}

function normalizeLocalGenerationError(error: unknown): FeedbackGenerationError {
  if (error instanceof FeedbackGenerationError) {
    return error;
  }

  return new FeedbackGenerationError(getLocalErrorMessage(error));
}

function getLocalErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const message = rawMessage.toLowerCase();

  if (message.includes("webgpu") || message.includes("gpu")) {
    return "Offline mode could not use this browser's GPU. Try Chrome or Edge with WebGPU enabled, select a smaller local model, or switch to OpenAI.";
  }

  if (
    message.includes("out of memory") ||
    message.includes("oom") ||
    message.includes("device lost") ||
    message.includes("allocation")
  ) {
    return "The local model ran out of GPU memory. Try the smallest model option or switch to OpenAI.";
  }

  if (message.includes("network") || message.includes("fetch") || message.includes("download")) {
    return "The local model could not download. Check your connection, then try Offline again.";
  }

  return "Offline generation failed. Try again, choose a smaller local model, or switch to OpenAI.";
}
