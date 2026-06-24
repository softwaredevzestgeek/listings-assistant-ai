"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });
import type { ListingRef, ListingRefsDataChunk } from "@/types/listing";

const CATEGORY_ICONS: Record<string, string> = {
  dining: "🍽️",
  lodging: "🏨",
  attraction: "🎯",
  venue: "🎪",
};

const CATEGORY_LABELS: Record<string, string> = {
  dining: "Dining",
  lodging: "Lodging",
  attraction: "Attraction",
  venue: "Venue",
};

const SUGGESTIONS = [
  "🍳 Best breakfast in Brookline",
  "🏨 Boutique hotel with great views",
  "🌊 Outdoor water activities",
  "🌿 Vegetarian friendly dinner",
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

// Only return refs whose ID appears in the assistant message text
function filterRefsToMentioned(refs: ListingRef[], text: string): ListingRef[] {
  return refs.filter((r) => text.includes(r.id));
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ListingCards({ refs }: { refs: ListingRef[] }) {
  if (refs.length === 0) return null;
  return (
    <div className="listing-cards">
      {refs.map((ref) =>
        ref.externalUrl ? (
          <a
            key={ref.id}
            href={ref.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="listing-card"
          >
            <div className="card-icon">{CATEGORY_ICONS[ref.category] ?? "📍"}</div>
            <div className="card-body">
              <div className="card-name">{ref.name}</div>
              <div className="card-meta">
                {CATEGORY_LABELS[ref.category] ?? ref.category} · Click to visit site
              </div>
            </div>
            <div className="card-arrow">↗</div>
          </a>
        ) : (
          <div key={ref.id} className="listing-card no-link">
            <div className="card-icon">{CATEGORY_ICONS[ref.category] ?? "📍"}</div>
            <div className="card-body">
              <div className="card-name">{ref.name}</div>
              <div className="card-meta">
                {CATEGORY_LABELS[ref.category] ?? ref.category} · No website available
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, data, setInput } =
    useChat({ api: "/api/chat" });

  const bottomRef = useRef<HTMLDivElement>(null);
  const allRefs = extractAllRefs((data as unknown[]) ?? []);

  const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === "assistant");
  const lastAssistantMessageIdx =
    lastAssistantIdx === -1 ? -1 : messages.length - 1 - lastAssistantIdx;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSuggestion(text: string) {
    const clean = text.replace(/^[\p{Emoji}\s]+/u, "").trim();
    setInput(clean);
  }

  return (
    <div className="app-wrapper">
      <div className="disclaimer-banner">
        ⚠️ AI can be wrong — verify details before visiting.
      </div>

      <div className="chat-header">
        <div className="header-icon">🗺️</div>
        <div className="header-text">
          <h1>Local Listings Assistant</h1>
          <p>Brookline · Cape Vernon · Ridgeway</p>
        </div>
        <div className="header-badge">Online</div>
      </div>

      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <h2>Find local gems</h2>
            <p>Ask me about dining, lodging, attractions, and venues — I only recommend from our verified dataset.</p>
            <div className="suggestions-grid">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion-btn" onClick={() => handleSuggestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, idx) => {
            const isLastAssistant = message.role === "assistant" && idx === lastAssistantMessageIdx;
            // Only show cards for IDs actually mentioned in this message
            const mentionedRefs = isLastAssistant
              ? filterRefsToMentioned(allRefs, message.content)
              : [];

            return (
              <div key={message.id} className={`message-row ${message.role}`}>
                <div className={`avatar ${message.role === "assistant" ? "bot" : "user"}`}>
                  {message.role === "assistant" ? "AI" : "You"}
                </div>

                <div className="message-content">
                  <div className={`bubble ${message.role === "assistant" ? "bot" : "user"}`}>
                    {message.role === "assistant" ? (
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="md-link">
                              {children}
                            </a>
                          ),
                          p: ({ children }) => <p className="md-p">{children}</p>,
                          strong: ({ children }) => <strong className="md-strong">{children}</strong>,
                          ol: ({ children }) => <ol className="md-ol">{children}</ol>,
                          ul: ({ children }) => <ul className="md-ul">{children}</ul>,
                          li: ({ children }) => <li className="md-li">{children}</li>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      message.content
                    )}
                  </div>

                  {/* Cards only for listings actually mentioned in this message */}
                  {mentionedRefs.length > 0 && (
                    <ListingCards refs={mentionedRefs} />
                  )}
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="message-row assistant">
            <div className="avatar bot">AI</div>
            <div className="typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="input-area">
        <form onSubmit={handleSubmit} className="input-form">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about dining, lodging, attractions, venues…"
            disabled={isLoading}
            autoFocus
          />
          <button type="submit" className="send-btn" disabled={isLoading || !input.trim()}>
            <SendIcon />
          </button>
        </form>
        <p className="input-hint">Only recommends from our verified local dataset · 18 listings</p>
      </div>
    </div>
  );
}
