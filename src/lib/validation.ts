// Matches IDs like din-001, lod-002, att-003, ven-001
const LISTING_ID_PATTERN = /\b[a-z]{2,4}-\d{3}\b/g;

export interface ValidationResult {
  text: string;
  violations: string[];
}

/**
 * Scans assistant output text for listing ID references.
 * Any ID not present in approvedIds is redacted and logged.
 */
export function validateAndStripListingRefs(
  text: string,
  approvedIds: Set<string>
): ValidationResult {
  const violations: string[] = [];

  const cleaned = text.replace(LISTING_ID_PATTERN, (match) => {
    if (!approvedIds.has(match)) {
      violations.push(match);
      return "[REDACTED]";
    }
    return match;
  });

  if (violations.length > 0) {
    console.warn(
      "[validation] Stripped unapproved listing IDs from response:",
      violations
    );
  }

  return { text: cleaned, violations };
}
