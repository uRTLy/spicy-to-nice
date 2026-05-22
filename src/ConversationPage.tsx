import { useEffect, useMemo, useState } from "react";

type ConversationMessage = {
  role: "user" | "assistant" | string;
  text: string;
  timestamp?: string;
  attachments?: ConversationAttachment[];
};

type ConversationAttachment = {
  type: "image" | string;
  label: string;
  src?: string;
  mimeType?: string;
  sizeBytes?: number;
  detail?: string;
  dimensions?: {
    width: number;
    height: number;
  };
};

type ConversationTranscript = {
  title: string;
  exportedAt: string;
  source: string;
  note: string;
  stats: {
    hiddenMessagesSkipped: number;
    toolEventsSkipped: number;
    reasoningEventsSkipped: number;
    redactionsApplied: number;
    attachmentsExported?: number;
    messageCount: number;
  };
  messages: ConversationMessage[];
};

type LoadState =
  | { status: "loading" }
  | { status: "success"; transcript: ConversationTranscript }
  | { status: "error"; message: string };

type ConversationPageProps = {
  onBack: () => void;
};

const conversationJsonUrl = `${import.meta.env.BASE_URL}transcript/conversation.json`;
const transcriptAssetBase = `${import.meta.env.BASE_URL}transcript/`;
type RoleFilter = "all" | "user" | "assistant";
type MediaFilter = "all" | "with-media" | "text-only";

export function ConversationPage({ onBack }: ConversationPageProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");

  const queryTerms = useMemo(() => tokenizeQuery(query), [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadTranscript() {
      try {
        const response = await fetch(conversationJsonUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const transcript = (await response.json()) as ConversationTranscript;

        if (!cancelled) {
          setLoadState({ status: "success", transcript });
        }
      } catch {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message:
              "Could not load the bundled transcript. Re-run npm run export:conversation, then rebuild.",
          });
        }
      }
    }

    void loadTranscript();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleMessages = useMemo(() => {
    if (loadState.status !== "success") {
      return [];
    }

    return loadState.transcript.messages.filter((message) => {
      if (roleFilter !== "all" && message.role !== roleFilter) {
        return false;
      }

      const hasAttachments = Boolean(message.attachments?.length);

      if (mediaFilter === "with-media" && !hasAttachments) {
        return false;
      }

      if (mediaFilter === "text-only" && hasAttachments) {
        return false;
      }

      return messageMatchesQuery(message, queryTerms);
    });
  }, [loadState, mediaFilter, queryTerms, roleFilter]);

  const userMessageCount =
    loadState.status === "success"
      ? loadState.transcript.messages.filter((message) => message.role === "user").length
      : 0;
  const assistantMessageCount =
    loadState.status === "success"
      ? loadState.transcript.messages.filter((message) => message.role === "assistant").length
      : 0;
  const attachmentMessageCount =
    loadState.status === "success"
      ? loadState.transcript.messages.filter((message) => message.attachments?.length).length
      : 0;

  return (
    <main className="conversation-page">
      <header className="conversation-header">
        <button type="button" className="back-button" onClick={onBack}>
          Back to app
        </button>
        <div>
          <p className="eyebrow">Project notes</p>
          <h1>Prototype collaboration log</h1>
          <p>
            A reviewer-friendly record of the planning, tradeoffs, and build decisions behind
            this prototype.
          </p>
        </div>
      </header>

      {loadState.status === "loading" ? (
        <section className="conversation-empty" aria-live="polite">
          Loading transcript...
        </section>
      ) : null}

      {loadState.status === "error" ? (
        <section className="conversation-empty conversation-error" aria-live="polite">
          {loadState.message}
        </section>
      ) : null}

      {loadState.status === "success" ? (
        <>
          <section className="conversation-meta" aria-label="Transcript metadata">
            <div>
              <span>{loadState.transcript.stats.messageCount}</span>
              messages
            </div>
            <div>
              <span>{loadState.transcript.stats.redactionsApplied}</span>
              redactions
            </div>
            <div>
              <span>{loadState.transcript.stats.toolEventsSkipped}</span>
              tool events omitted
            </div>
            <div>
              <span>{loadState.transcript.stats.attachmentsExported ?? 0}</span>
              screenshots
            </div>
            <div>
              <span>{new Date(loadState.transcript.exportedAt).toLocaleDateString()}</span>
              exported
            </div>
          </section>

          <section className="conversation-note">
            <p>{loadState.transcript.note}</p>
            <p>
              Source: <code>{loadState.transcript.source}</code>
            </p>
          </section>

          <section className="conversation-toolbar" aria-label="Search and filters">
            <div className="conversation-search-row">
              <label htmlFor="transcript-search">Search notes</label>
              <input
                id="transcript-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try: offline model, screenshot, API key"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")}>
                  Clear
                </button>
              ) : null}
            </div>
            <div className="conversation-filter-row">
              <div className="filter-group" aria-label="Role filter">
                {[
                  ["all", `All (${loadState.transcript.messages.length})`],
                  ["user", `User (${userMessageCount})`],
                  ["assistant", `Assistant (${assistantMessageCount})`],
                ].map(([value, label]) => (
                  <button
                    className={roleFilter === value ? "active" : ""}
                    key={value}
                    type="button"
                    onClick={() => setRoleFilter(value as RoleFilter)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="filter-group" aria-label="Media filter">
                {[
                  ["all", "All content"],
                  ["with-media", `Screenshots (${attachmentMessageCount})`],
                  ["text-only", "Text only"],
                ].map(([value, label]) => (
                  <button
                    className={mediaFilter === value ? "active" : ""}
                    key={value}
                    type="button"
                    onClick={() => setMediaFilter(value as MediaFilter)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p>
              Showing {visibleMessages.length} of {loadState.transcript.messages.length} messages.
              Search matches all typed words across text, role, timestamp, and screenshot labels.
            </p>
          </section>

          <section className="conversation-timeline" aria-label="Conversation messages">
            {visibleMessages.length > 0 ? (
              visibleMessages.map((message, index) => {
                const roleClass =
                  message.role === "user"
                    ? "message-user"
                    : message.role === "assistant"
                      ? "message-assistant"
                      : "message-other";

                return (
                  <article
                    className={`conversation-message ${roleClass}`}
                    key={`${message.role}-${message.timestamp ?? index}-${index}`}
                  >
                    <div className="message-meta">
                      <span>{message.role}</span>
                      {message.timestamp ? (
                        <time dateTime={message.timestamp}>
                          {new Date(message.timestamp).toLocaleString()}
                        </time>
                    ) : null}
                  </div>
                  <p>{renderHighlightedText(message.text, queryTerms)}</p>
                  {message.attachments?.length ? (
                    <div className="message-attachments">
                      {message.attachments.map((attachment, attachmentIndex) => (
                        <figure key={`${attachment.label}-${attachmentIndex}`}>
                          {attachment.src ? (
                            <img
                              alt={attachment.label}
                              loading="lazy"
                              src={`${transcriptAssetBase}${attachment.src}`}
                            />
                          ) : (
                            <div className="attachment-placeholder">Image unavailable</div>
                          )}
                          <figcaption>
                            <span>{attachment.label}</span>
                            {attachment.dimensions ? (
                              <span>
                                {attachment.dimensions.width} x {attachment.dimensions.height}
                              </span>
                            ) : null}
                            {attachment.sizeBytes ? (
                              <span>{formatBytes(attachment.sizeBytes)}</span>
                            ) : null}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })
            ) : (
              <div className="conversation-empty">No messages match that search.</div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

function tokenizeQuery(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function messageMatchesQuery(message: ConversationMessage, terms: string[]) {
  if (terms.length === 0) {
    return true;
  }

  const searchable = [
    message.role,
    message.text,
    message.timestamp ?? "",
    ...(message.attachments ?? []).flatMap((attachment) => [
      attachment.label,
      attachment.mimeType ?? "",
      attachment.src ?? "",
      attachment.detail ?? "",
    ]),
  ]
    .join(" ")
    .toLowerCase();

  return terms.every((term) => searchable.includes(term));
}

function renderHighlightedText(text: string, terms: string[]) {
  const uniqueTerms = [...new Set(terms)].filter((term) => term.length > 1);

  if (uniqueTerms.length === 0) {
    return text;
  }

  const pattern = new RegExp(`(${uniqueTerms.map(escapeRegExp).join("|")})`, "gi");

  return text.split(pattern).map((part, index) =>
    uniqueTerms.some((term) => part.toLowerCase() === term) ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      part
    ),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
