# Local Listings Chatbot

A grounded AI assistant that recommends places **only** from a fixed synthetic dataset of 18 local listings. It cannot invent listings, cannot answer from open-web knowledge, and refuses all out-of-scope requests.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript strict**
- **Vercel AI SDK** (`ai` v4) — `streamText` with tool-calling
- **OpenAI** (`gpt-4o-mini`) via `@ai-sdk/openai`
- **Zod** for typed tool parameter schemas
- **Vitest** for eval/test cases

---

## How to Run

```bash
# 1. Clone / enter the project
git clone git@github.com:softwaredevzestgeek/listings-assistant-ai.git
cd listings-assistant-ai

# 2. Install dependencies
npm install

# 3. Set your API key
cp .env.example .env.local
# Edit .env.local and set OPENAI_API_KEY=sk-proj-...

# 4. Start dev server
npm run dev
# → http://localhost:3000

# 5. Run tests
npm run test

# 6. Production build
npm run build
```

---

## Architecture

```
data/sample-listings.json          ← 18 synthetic listings (source of truth)
src/
  types/listing.ts                 ← Listing, ListingRef, ListingRefsDataChunk types
  lib/
    listings.ts                    ← searchListings(), getListingById(), getAllListings()
    validation.ts                  ← validateAndStripListingRefs() — server-side guardrail
  app/
    api/chat/route.ts              ← POST /api/chat — streamText + tools + validation
    page.tsx                       ← Chat UI (useChat hook, listing chips)
  __tests__/chat.test.ts           ← eval test cases (17, all green)
```

### Guardrail layers

1. **System prompt** — instructs the model to only reference tool results, never invent, never go off-topic.
2. **Tool gating** — the model can only access data via `searchListings` and `getListingById`. No raw dataset in the prompt.
3. **Server-side validation (enforced on the live stream)** — `validateAndStripListingRefs` runs inside an `experimental_transform` on the streamed output. It buffers text to whitespace boundaries (so IDs/URLs are never split across chunks) and redacts, in the bytes the client actually receives, any `xxx-NNN` listing ID **or** `http(s)` URL that is not in the tool-result set for that turn. Every redaction is logged to the server console. The structured `listing_refs` appended to the stream are likewise filtered to approved IDs only — so cards can never reference anything outside the dataset.

---

## Stream Response Contract

`POST /api/chat`

**Request body:**
```json
{ "messages": [{ "role": "user", "content": "..." }] }
```

**Response:** Vercel AI SDK data stream (`Content-Type: text/event-stream`).

The stream delivers two kinds of chunks:

| Chunk type | Description |
|---|---|
| `text` | Conversational assistant text, streamed incrementally |
| `data` | JSON array of `DataChunk` objects appended after tools resolve |

**DataChunk shape:**
```ts
{
  type: "listing_refs";
  refs: Array<{
    id: string;          // e.g. "din-001"
    name: string;        // e.g. "The Mill House Cafe"
    category: "dining" | "lodging" | "attraction" | "venue";
    city: string;        // e.g. "Brookline"
    priceTier: "$" | "$$" | "$$$" | "$$$$" | "free";
    externalUrl: string | null; // verified against dataset; never constructed
  }>;
}
```

Front-end clients use `useChat` from `ai/react` and read `data` from the hook. The `refs` array drives listing card rendering. Only IDs that appeared in tool results for the current turn are included.

---

## Eval / Test Cases

`src/__tests__/chat.test.ts` covers the required scenarios at the data/guardrail layer (no LLM calls needed — fast and deterministic):

| # | Scenario | What is tested |
|---|---|---|
| 1 | Normal recommendation query | `searchListings(...)` returns real dataset members only |
| 2 | Out-of-scope request | Flight/nonsense queries return no listings; dataset is not polluted |
| 3 | Prompt injection | `validateAndStripListingRefs` removes hallucinated IDs not in the approved set |
| 4 | Invented listing | `getListingById("lod-999")` returns null; search never returns non-dataset items |
| 5 | Link handling | Unapproved URLs are redacted (incl. trailing punctuation); approved URLs pass through; all `externalUrl` values are string-or-null |

Run: `npm run test`

---

## Swapping the AI Provider

The provider is isolated to one import in `src/app/api/chat/route.ts`:

```ts
// OpenAI (default)
import { createOpenAI } from "@ai-sdk/openai";
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = openai("gpt-4o-mini");

// Anthropic (swap)
import { createAnthropic } from "@ai-sdk/anthropic";
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = anthropic("claude-sonnet-4-6");
```

Everything else (tools, system prompt, validation) stays the same.

---

## Voice Stack (written answer)

For a phone-based voice version of this same assistant:

**Twilio Media Streams** (WebSocket raw audio in/out) → **Deepgram** streaming STT (~300ms latency) → this same `/api/chat` endpoint unchanged → **Cartesia** TTS (starts synthesizing before full text arrives, matching our streaming backend) → audio back over the Twilio WebSocket.

Why not Vapi: this stack lets us own each layer independently — swap Deepgram for Whisper, swap Cartesia for ElevenLabs, or replace Twilio with a SIP trunk, without touching the core chat logic. Vapi bundles these choices and makes them harder to swap.

**Production hardening I'd add first:**
1. **Rate limiting** — Upstash Redis + `@upstash/ratelimit` on `/api/chat` per IP/session to prevent dataset-exhaustion probing.
2. **Structured violation logging** — Pino JSON logs for every `validateAndStripListingRefs` violation, shipped to a log aggregator, so hallucination drift is auditable over time.

