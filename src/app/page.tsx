"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });
import type { ListingRef, ListingRefsDataChunk } from "@/types/listing";

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  dining: { icon: "🍽", label: "Dining" },
  lodging: { icon: "🛏", label: "Lodging" },
  attraction: { icon: "🧭", label: "Attraction" },
  venue: { icon: "🎟", label: "Venue" },
};

const SUGGESTIONS = [
  { icon: "🍳", text: "Best breakfast spot in Brookline" },
  { icon: "🌊", text: "Outdoor water activities near the coast" },
  { icon: "🛏", text: "A boutique hotel with a view" },
  { icon: "🌿", text: "Somewhere vegetarian-friendly for dinner" },
];

function extractAllRefs(data: unknown[]): ListingRef[] {
  const refs: ListingRef[] = [];
  for (const item of data) {
    const chunk = item as ListingRefsDataChunk;
    if (chunk?.type === "listing_refs" && Array.isArray(chunk.refs)) {
      refs.push(...chunk.refs);
    }
  }
  return refs.filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);
}

// Only surface cards for listing IDs actually present in the assistant text.
function filterRefsToMentioned(refs: ListingRef[], text: string): ListingRef[] {
  return refs.filter((r) => text.includes(r.id));
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function ListingCards({ refs }: { refs: ListingRef[] }) {
  if (refs.length === 0) return null;
  return (
    <div className="listing-cards">
      {refs.map((ref, i) => {
        const meta = CATEGORY_META[ref.category] ?? { icon: "📍", label: ref.category };
        const inner = (
          <>
            <span className={`card-icon cat-${ref.category}`}>{meta.icon}</span>
            <span className="card-body">
              <span className="card-name">{ref.name}</span>
              <span className="card-meta">
                <span className={`card-tag cat-${ref.category}`}>{meta.label}</span>
                <span className="card-dot">·</span>
                <span>{ref.city}</span>
                {ref.priceTier ? (
                  <>
                    <span className="card-dot">·</span>
                    <span className="card-price">{ref.priceTier}</span>
                  </>
                ) : null}
              </span>
            </span>
            {ref.externalUrl ? (
              <span className="card-arrow"><ArrowIcon /></span>
            ) : (
              <span className="card-nolink">No site</span>
            )}
          </>
        );
        return ref.externalUrl ? (
          <a
            key={ref.id}
            href={ref.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="listing-card"
            style={{ animationDelay: `${i * 55}ms` }}
          >
            {inner}
          </a>
        ) : (
          <div
            key={ref.id}
            className="listing-card no-link"
            style={{ animationDelay: `${i * 55}ms` }}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}

const MD_COMPONENTS = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="md-link">
      {children}
    </a>
  ),
  p: ({ children }: { children?: React.ReactNode }) => <p className="md-p">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="md-strong">{children}</strong>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="md-ol">{children}</ol>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="md-ul">{children}</ul>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="md-li">{children}</li>,
};

function Thinking() {
  return (
    <div className="message-row assistant">
      <div className="avatar bot">◆</div>
      <div className="thinking">
        <span className="thinking-dot" />
        <span className="thinking-label">Searching the listings…</span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, data, setInput } =
    useChat({ api: "/api/chat" });

  const bottomRef = useRef<HTMLDivElement>(null);
  const allRefs = extractAllRefs((data as unknown[]) ?? []);

  const lastMsg = messages[messages.length - 1];
  // "Thinking" = request in flight but the assistant hasn't emitted text yet
  // (model is calling tools / about to stream). Once text arrives we switch to
  // the streaming caret on the bubble itself.
  const isThinking =
    isLoading && (!lastMsg || lastMsg.role === "user" || lastMsg.content.length === 0);
  const streamingId =
    isLoading && lastMsg?.role === "assistant" && lastMsg.content.length > 0
      ? lastMsg.id
      : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="app-wrapper">
      <header className="chat-header">
        <div className="header-mark">◆</div>
        <div className="header-text">
          <h1>Local Listings Assistant</h1>
          <p>Brookline · Cape Vernon · Ridgeway</p>
        </div>
        <div className="header-badge" title="Answers are limited to a verified dataset">
          <span className="badge-dot" />
          Grounded
        </div>
      </header>

      <div className="disclaimer-banner">
        AI can be wrong — verify details before you visit or book.
      </div>

      <main className="messages-area">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-mark">◆</div>
            <h2>Find local gems, honestly</h2>
            <p>
              Ask about dining, lodging, attractions, and venues. Every answer is drawn
              strictly from a verified set of 18 local listings — nothing invented.
            </p>
            <div className="suggestions-grid">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  className="suggestion-btn"
                  onClick={() => setInput(s.text)}
                >
                  <span className="suggestion-icon">{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isAssistant = message.role === "assistant";
            const isStreaming = message.id === streamingId;
            const mentionedRefs = isAssistant
              ? filterRefsToMentioned(allRefs, message.content)
              : [];

            return (
              <div key={message.id} className={`message-row ${message.role}`}>
                <div className={`avatar ${isAssistant ? "bot" : "user"}`}>
                  {isAssistant ? "◆" : "You"}
                </div>

                <div className="message-content">
                  <div className={`bubble ${isAssistant ? "bot" : "user"}`}>
                    {isAssistant ? (
                      <>
                        <ReactMarkdown components={MD_COMPONENTS}>
                          {message.content}
                        </ReactMarkdown>
                        {isStreaming && <span className="stream-caret" />}
                      </>
                    ) : (
                      message.content
                    )}
                  </div>

                  {mentionedRefs.length > 0 && <ListingCards refs={mentionedRefs} />}
                </div>
              </div>
            );
          })
        )}

        {isThinking && <Thinking />}

        <div ref={bottomRef} />
      </main>

      <div className="input-area">
        <form onSubmit={handleSubmit} className="input-form">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about dining, lodging, attractions, venues…"
            disabled={isLoading}
            autoFocus
          />
          <button type="submit" className="send-btn" disabled={isLoading || !input.trim()} aria-label="Send">
            <SendIcon />
          </button>
        </form>
        <p className="input-hint">Grounded in 18 verified listings · links open official venue sites</p>
      </div>
    </div>
  );
}
