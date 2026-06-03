/**
 * XSS sanitization utilities.
 * Use these helpers whenever rendering user-supplied or AI-generated text
 * in contexts where injection could occur.
 */

/**
 * Strip all HTML/XML tags from a string.
 * Safe to use as text content; does NOT produce HTML output.
 */
export function sanitizeText(str: string): string {
  if (typeof str !== "string") return "";
  // Remove any tag-like constructs
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Validate and sanitize a URL.
 * Returns the original URL if it uses a safe protocol (http/https/mailto),
 * otherwise returns "#" to neutralise dangerous schemes such as javascript:.
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== "string") return "#";
  const trimmed = url.trim();
  // Allow only safe protocols
  if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  // Reject javascript:, data:, vbscript:, etc.
  return "#";
}
