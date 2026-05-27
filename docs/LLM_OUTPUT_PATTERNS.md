# LLM Output Patterns

This app should treat model output as product data, not as unstructured prose.

## Patterns To Use

1. Structured output first.
   Ask hosted models for schema-shaped output so the UI can render variants, warnings, and future action items predictably.

2. Direct transformation contract.
   Tell the model to transform the text, not discuss the task. Ban preambles, raw-input labels, and speaker labels like `User 1`.

3. Multiple variants by default.
   Return three choices:
   - Balanced: the default, safest sendable version.
   - Direct: clearer and firmer without being hostile.
   - Concise: shortest useful version.

4. App-side validation.
   Parse the model response, normalize variant IDs, and reject obvious echo failures such as `User 1:` or `I will now`.

5. Context nudges instead of fake confidence.
   If the input is too short or not feedback, return a friendly request for situation, impact, and desired change.

6. Preserve user control.
   Show before/after, let the user choose a variant, and copy the selected text. Do not auto-send.

7. Provider-specific fallback.
   Use strict structured outputs for OpenAI and Gemini when available. For local WebLLM, request JSON and parse defensively because small local models may not follow schemas perfectly.

8. Model-size-aware prompting.
   Tiny local models should get one plain-text rewrite task instead of schema-shaped multi-variant output. Larger local models and hosted models can handle stricter structure.

## Why This Matches Common LLM Product Practice

- OpenAI recommends Structured Outputs when the model response needs to fit a specific schema for the application UI.
- Gemini has the same structured-output pattern for predictable, typed responses.
- Anthropic and OpenAI prompt guidance both emphasize clear, direct instructions, explicit output formats, and concrete constraints.

## Sources

- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI prompt engineering best practices: https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api
- Gemini Structured Outputs: https://ai.google.dev/gemini-api/docs/structured-output
- Anthropic prompting best practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
