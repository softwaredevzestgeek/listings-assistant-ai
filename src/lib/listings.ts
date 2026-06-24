import rawData from "../../data/sample-listings.json";
import type { Listing } from "@/types/listing";

// Dataset is wrapped: { "_note": "...", "listings": [...] }
const LISTINGS: Listing[] = (rawData as { listings: Listing[] }).listings;

export function getAllListings(): Listing[] {
  return LISTINGS;
}

export function getListingById(id: string): Listing | null {
  return LISTINGS.find((l) => l.id === id) ?? null;
}

export interface SearchFilters {
  category?: string;
  maxResults?: number;
}

export function searchListings(
  query: string,
  filters: SearchFilters = {}
): Listing[] {
  const q = query.toLowerCase();
  const { category, maxResults = 5 } = filters;

  const results = LISTINGS.filter((listing) => {
    if (category && listing.category !== category) return false;

    const haystack = [
      listing.name,
      listing.blurb,
      listing.city,
      listing.category,
      ...listing.tags,
    ]
      .join(" ")
      .toLowerCase();

    return q.split(/\s+/).some((term) => haystack.includes(term));
  });

  return results.slice(0, maxResults);
}
