// Matches IDs like din-001, lod-002, att-003, ven-001
const LISTING_ID_PATTERN = /\b[a-z]{2,4}-\d{3}\b/g;
// Matches http(s) URLs (stops at whitespace / closing bracket)
const URL_PATTERN = /https?:\/\/[^\s)\]]+/g;

export interface ValidationResult {
  text: string;
  violations: string[];
}

// Strip trailing sentence punctuation the model may glue onto a URL.
function trimUrl(url: string): string {
  return url.replace(/[.,;:!?]+$/, "");
}

/**
 * Scans assistant output for listing ID and URL references and redacts any
 * that are not in the approved tool-result set for the current turn.
 *
 * - Listing IDs not in `approvedIds` are replaced with [REDACTED] and logged.
 * - URLs are only checked when `approvedUrls` is provided; any URL not in the
 *   set is replaced with [REDACTED] and logged. (When omitted, URLs are left
 *   untouched — the model's output may legitimately contain other links.)
 */
export function validateAndStripListingRefs(
  text: string,
  approvedIds: Set<string>,
  approvedUrls?: Set<string>
): ValidationResult {
  const violations: string[] = [];

  let cleaned = text.replace(LISTING_ID_PATTERN, (match) => {
    if (!approvedIds.has(match)) {
      violations.push(match);
      return "[REDACTED]";
    }
    return match;
  });

  if (approvedUrls) {
    cleaned = cleaned.replace(URL_PATTERN, (match) => {
      const url = trimUrl(match);
      if (!approvedUrls.has(url)) {
        violations.push(url);
        const trailer = match.slice(url.length);
        return "[REDACTED]" + trailer;
      }
      return match;
    });
  }

  if (violations.length > 0) {
    console.warn(
      "[validation] Stripped unapproved references from response:",
      violations
    );
  }

  return { text: cleaned, violations };
}
