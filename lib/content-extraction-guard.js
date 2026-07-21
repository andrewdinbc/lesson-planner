// lib/content-extraction-guard.js
//
// Global solution (2026-07-21), not a one-off patch. Found via the
// steering-documents web-scrape bug: web-source/route.js saved an AI's
// own "no substantive content" failure report as if it were real data,
// because nothing checked the extracted/generated content before
// insert. Auditing every ingestion route in this app turned up the same
// missing guard in two more places (activity-notes/route.js's PDF
// upload into forge_resources + subject_activity_notes, and
// calendar-events/extract/route.js's PDF-to-AI-parse into
// staff_document_notes) -- both silently trusting extractPdfText's
// output with no length check, even though upload/route.js and
// upload-from-url/route.js already had one. One canonical check now,
// used everywhere content gets extracted before being persisted or
// handed to another AI call, so this can't quietly drift back to four
// different inline copies of the same threshold.

const MIN_SUBSTANTIVE_LENGTH = 50;

/**
 * True if extracted/scraped text has enough real content to be worth
 * persisting or feeding into a downstream AI call. Deliberately a low
 * bar (50 chars) -- this catches the "empty/near-empty extraction"
 * failure mode (scanned-image PDFs, JS-rendered pages), not a judgment
 * on quality beyond that. Use isLikelyFailedWebScrape for the stronger,
 * scrape-specific check.
 */
export function isSubstantiveText(text, minLength = MIN_SUBSTANTIVE_LENGTH) {
  return !!text && text.trim().length >= minLength;
}

/**
 * Stronger check specific to web scrapes, where the failure mode isn't
 * "empty" but "just boilerplate" (nav links, legal footer, a few hundred
 * characters that pass a naive length check but contain nothing real).
 * Pair with a higher length threshold (400+ has worked well in practice
 * for filtering YouTube channel pages and similar JS-rendered sites).
 */
export function isLikelyFailedWebScrape(rawPageText, minLength = 400) {
  return !rawPageText || rawPageText.trim().length < minLength;
}

/**
 * Checks an AI-generated summary for the SCRAPE_INSUFFICIENT sentinel
 * (see web-source/route.js) -- used when the AI itself is in the best
 * position to judge whether the raw material it was given was usable,
 * rather than a keyword/length heuristic on the AI's output after the
 * fact.
 */
export function extractScrapeFailureReason(aiSummary) {
  const trimmed = (aiSummary || '').trim();
  if (!trimmed.startsWith('SCRAPE_INSUFFICIENT')) return null;
  return trimmed.replace(/^SCRAPE_INSUFFICIENT:\s*/, '');
}
