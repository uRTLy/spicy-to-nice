import type { TranslatorState } from "./translatorState";

export function getWordCount(segments: string[]) {
  return segments.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

export function getSelectedVariant(state: TranslatorState) {
  return (
    state.variants.find((variant) => variant.id === state.selectedVariantId) ??
    state.variants[0] ??
    null
  );
}

export function getDisplayedOutputText(state: TranslatorState) {
  return getSelectedVariant(state)?.text ?? state.output.text;
}
