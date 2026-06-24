export interface Listing {
  id: string;
  name: string;
  category: "dining" | "lodging" | "attraction" | "venue";
  city: string;
  blurb: string;
  priceTier: "$" | "$$" | "$$$" | "$$$$" | "free";
  tags: string[];
  externalUrl: string | null;
}

export interface ListingRef {
  id: string;
  name: string;
  category: Listing["category"];
  externalUrl: string | null;
}

/**
 * Stream response contract
 *
 * POST /api/chat returns a Vercel AI SDK data stream.
 * Two chunk types arrive on the client via useChat's `data` array:
 *
 *   { type: "listing_refs", refs: ListingRef[] }
 *
 * Each ref has: id, name, category, externalUrl (may be null — render as
 * "no link available" rather than a broken anchor).
 * Only IDs that appeared in tool results for the current turn are included.
 */
export interface ListingRefsDataChunk {
  type: "listing_refs";
  refs: ListingRef[];
}
