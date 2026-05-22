import { useEffect, useMemo, useState } from "react";

type ConversationMessage = {
  role: "user" | "assistant" | string;
  text: string;
  timestamp?: string;
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

export function ConversationPage({ onBack }: ConversationPageProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");

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

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return loadState.transcript.messages;
    }

    return loadState.transcript.messages.filter((message) =>
      `${message.role} ${message.text}`.toLowerCase().includes(normalizedQuery),
    );
  }, [loadState, query]);

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

          <div className="conversation-toolbar">
            <label htmlFor="transcript-search">Search transcript</label>
            <input
              id="transcript-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search messages..."
            />
          </div>

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
                    <p>{message.text}</p>
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
