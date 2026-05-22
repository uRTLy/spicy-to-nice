import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_SOURCE =
  path.join(
    process.env.HOME ?? "~",
    ".codex/sessions/2026/05/18/rollout-2026-05-18T15-14-20-019e3b39-220f-7882-a4a8-dbb908a0ce24.jsonl",
  );
const DEFAULT_OUT_DIR = "public/transcript";

const args = new Map(
  process.argv.slice(2).flatMap((arg, index, allArgs) => {
    if (!arg.startsWith("--")) {
      return [];
    }

    const [key, inlineValue] = arg.slice(2).split("=");
    const value = inlineValue ?? allArgs[index + 1] ?? "";
    return [[key, value]];
  }),
);

const sourcePath = args.get("input") || DEFAULT_SOURCE;
const outDir = args.get("out-dir") || DEFAULT_OUT_DIR;
const title = args.get("title") || "Spicy-to-Nice Codex Build Conversation";
const mediaDir = path.join(outDir, "media");

const source = await readFile(sourcePath, "utf8");
const messages = [];
const stats = {
  hiddenMessagesSkipped: 0,
  toolEventsSkipped: 0,
  reasoningEventsSkipped: 0,
  redactionsApplied: 0,
  attachmentsExported: 0,
};

await mkdir(outDir, { recursive: true });
await rm(mediaDir, { force: true, recursive: true });
await mkdir(mediaDir, { recursive: true });

for (const line of source.split(/\n/).filter(Boolean)) {
  const entry = JSON.parse(line);

  if (entry.type !== "response_item") {
    continue;
  }

  const payload = entry.payload;

  if (payload?.type === "message") {
    if (payload.role !== "user" && payload.role !== "assistant") {
      stats.hiddenMessagesSkipped += 1;
      continue;
    }

    const messageIndex = messages.length + 1;
    const attachments = await extractAttachments(payload.content, messageIndex);
    const text = extractText(payload.content, attachments);

    if ((!text.trim() && attachments.length === 0) || shouldSkipMessage(text)) {
      continue;
    }

    const redacted = redact(text);
    stats.redactionsApplied += redacted.count;

    messages.push({
      role: payload.role,
      text: redacted.text,
      timestamp: entry.timestamp,
      attachments,
    });
    stats.attachmentsExported += attachments.length;
    continue;
  }

  if (payload?.type === "reasoning") {
    stats.reasoningEventsSkipped += 1;
    continue;
  }

  stats.toolEventsSkipped += 1;
}

const exportPayload = {
  title,
  exportedAt: new Date().toISOString(),
  source: redactPath(sourcePath),
  note:
    "Sanitized export of visible user and assistant messages only. Hidden system/developer instructions, reasoning, tool payloads, and secrets are intentionally omitted or redacted.",
  stats: {
    ...stats,
    messageCount: messages.length,
  },
  messages,
};

await writeFile(path.join(outDir, "conversation.json"), `${JSON.stringify(exportPayload, null, 2)}\n`);
await writeFile(path.join(outDir, "index.html"), buildViewerHtml(title));
await writeFile(
  path.join(outDir, "README.md"),
  [
    "# Conversation Export",
    "",
    "This folder contains sanitized transcript data for the Codex conversation used to build Spicy-to-Nice.",
    "",
    "- `index.html` is a static fallback viewer.",
    "- `conversation.json` contains visible user/assistant messages only.",
    "- `media/` contains exported screenshots referenced by visible messages.",
    "- The primary in-app viewer is the React route at `/conversation`.",
    "- Hidden instructions, reasoning, tool payloads, and secrets are excluded or redacted.",
    "",
    "Regenerate with:",
    "",
    "```bash",
    "npm run export:conversation",
    "```",
    "",
  ].join("\n"),
);

console.log(`Exported ${messages.length} visible messages to ${outDir}`);

function extractText(content = [], attachments = []) {
  return content
    .map((item) => {
      if (item.type === "input_text" || item.type === "output_text" || item.type === "text") {
        return item.text ?? "";
      }

      if (item.type === "input_image" || item.type === "image") {
        return attachments.length > 0 ? "[Screenshot attached]" : "[Image omitted]";
      }

      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

async function extractAttachments(content = [], messageIndex) {
  const attachments = [];
  let imageIndex = 0;

  for (const item of content) {
    if (item.type !== "input_image" && item.type !== "image") {
      continue;
    }

    imageIndex += 1;
    const dataUrl = item.image_url ?? item.url ?? "";
    const parsed = parseDataUrl(dataUrl);

    if (!parsed) {
      attachments.push({
        type: "image",
        label: `Screenshot ${imageIndex}`,
        detail: item.detail,
      });
      continue;
    }

    const extension = extensionForMime(parsed.mimeType);
    const filename = `message-${String(messageIndex).padStart(3, "0")}-image-${imageIndex}.${extension}`;
    const outputPath = path.join(mediaDir, filename);

    await writeFile(outputPath, parsed.buffer);

    attachments.push({
      type: "image",
      label: `Screenshot ${imageIndex}`,
      src: `media/${filename}`,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.buffer.byteLength,
      detail: item.detail,
      dimensions: readImageDimensions(parsed.buffer, parsed.mimeType),
    });
  }

  return attachments;
}

function parseDataUrl(value) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(value);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function extensionForMime(mimeType) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "png";
}

function readImageDimensions(buffer, mimeType) {
  if (
    mimeType === "image/png" &&
    buffer.length >= 24 &&
    buffer.toString("ascii", 12, 16) === "IHDR"
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  return undefined;
}

function redact(value) {
  let count = 0;
  let text = value;

  const replacements = [
    [/sk-proj-[A-Za-z0-9_-]+/g, "[REDACTED_OPENAI_PROJECT_KEY]"],
    [/sk-[A-Za-z0-9_-]{20,}/g, "[REDACTED_API_KEY]"],
    [/\bOPENAI_API_KEY\b/g, "[REDACTED_OPENAI_ENV_VAR]"],
    [/\bGEMINI_API_KEY\b/g, "[REDACTED_GEMINI_ENV_VAR]"],
    [/\bANTHROPIC_API_KEY\b/g, "[REDACTED_ANTHROPIC_ENV_VAR]"],
    [/Authorization:\s*Bearer/gi, "Authorization: [REDACTED_BEARER_HEADER]"],
    [/`sk-`/g, "`[REDACTED_API_KEY_PREFIX]`"],
    [/\bsk-\b/g, "[REDACTED_API_KEY_PREFIX]"],
    [/Bearer\s+[A-Za-z0-9._~+/=-]{20,}/g, "Bearer [REDACTED_TOKEN]"],
    [/gh[pousr]_[A-Za-z0-9_]{20,}/g, "[REDACTED_GITHUB_TOKEN]"],
    [/file:\/\/\/Users\/patrick/g, "file://~"],
    [/\/Users\/patrick/g, "~"],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, (...match) => {
      count += 1;
      return typeof replacement === "function" ? replacement(...match) : replacement;
    });
  }

  return { text, count };
}

function shouldSkipMessage(text) {
  const trimmed = text.trim();
  return (
    trimmed.startsWith("<environment_context>") ||
    trimmed.startsWith("<subagent_notification>") ||
    trimmed.startsWith("<developer") ||
    trimmed.startsWith("<permissions instructions>")
  );
}

function redactPath(value) {
  return value.replaceAll("/Users/patrick", "~");
}

function buildViewerHtml(pageTitle) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(pageTitle)}</title>
    <style>
      :root {
        color: #20201f;
        background: #f4f7f5;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
      }

      main {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 28px 0 48px;
      }

      header {
        display: grid;
        gap: 12px;
        padding-bottom: 18px;
        border-bottom: 1px solid #d7dfdc;
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 4vw, 3rem);
        line-height: 1.05;
      }

      .meta {
        display: grid;
        gap: 6px;
        color: #6d6257;
        line-height: 1.5;
      }

      .toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        margin: 18px 0;
      }

      input,
      button {
        min-height: 42px;
        border: 1px solid #cbd8d4;
        border-radius: 8px;
        background: #fff;
        color: #20201f;
        font: inherit;
      }

      input {
        width: 100%;
        padding: 0 12px;
      }

      button {
        padding: 0 16px;
        cursor: pointer;
      }

      .timeline {
        display: grid;
        gap: 14px;
      }

      article {
        display: grid;
        gap: 8px;
        padding: 16px;
        border: 1px solid #d7dfdc;
        border-radius: 8px;
        background: #fff;
      }

      article.assistant {
        border-color: #b7d8d1;
        background: #f8fbfa;
      }

      .role {
        color: #e2573f;
        font-size: 0.78rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      article.assistant .role {
        color: #0f766e;
      }

      .timestamp {
        color: #7a736c;
        font-size: 0.82rem;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        line-height: 1.55;
        font-family: inherit;
      }

      .empty {
        padding: 24px;
        color: #6d6257;
        text-align: center;
      }

      @media (max-width: 700px) {
        .toolbar {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>${escapeHtml(pageTitle)}</h1>
        <div class="meta" id="meta">Loading conversation...</div>
      </header>
      <section class="toolbar" aria-label="Conversation controls">
        <input id="search" type="search" placeholder="Search conversation" />
        <button id="toggle-assistant" type="button">Hide assistant</button>
      </section>
      <section class="timeline" id="timeline" aria-live="polite"></section>
    </main>
    <script>
      const state = {
        messages: [],
        query: "",
        showAssistant: true,
      };

      const meta = document.querySelector("#meta");
      const timeline = document.querySelector("#timeline");
      const search = document.querySelector("#search");
      const toggleAssistant = document.querySelector("#toggle-assistant");

      fetch("./conversation.json")
        .then((response) => response.json())
        .then((data) => {
          state.messages = data.messages || [];
          meta.innerHTML = [
            "<span>" + escapeHtml(data.note || "") + "</span>",
            "<span>" + escapeHtml(String(data.stats?.messageCount || 0)) + " visible messages exported from " + escapeHtml(data.source || "Codex") + ".</span>",
            "<span>Exported at " + escapeHtml(new Date(data.exportedAt).toLocaleString()) + ".</span>",
          ].join("");
          render();
        })
        .catch((error) => {
          meta.textContent = "Could not load conversation.json.";
          timeline.innerHTML = '<div class="empty">' + escapeHtml(error.message) + '</div>';
        });

      search.addEventListener("input", (event) => {
        state.query = event.target.value.toLowerCase();
        render();
      });

      toggleAssistant.addEventListener("click", () => {
        state.showAssistant = !state.showAssistant;
        toggleAssistant.textContent = state.showAssistant ? "Hide assistant" : "Show assistant";
        render();
      });

      function render() {
        const messages = state.messages.filter((message) => {
          if (!state.showAssistant && message.role === "assistant") {
            return false;
          }

          if (!state.query) {
            return true;
          }

          return message.text.toLowerCase().includes(state.query);
        });

        if (messages.length === 0) {
          timeline.innerHTML = '<div class="empty">No messages match the current filters.</div>';
          return;
        }

        timeline.innerHTML = messages.map((message) => {
          const when = message.timestamp ? new Date(message.timestamp).toLocaleString() : "";
          return '<article class="' + escapeHtml(message.role) + '">' +
            '<div class="role">' + escapeHtml(message.role) + '</div>' +
            '<div class="timestamp">' + escapeHtml(when) + '</div>' +
            '<pre>' + escapeHtml(message.text) + '</pre>' +
          '</article>';
        }).join("");
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }
    </script>
  </body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
