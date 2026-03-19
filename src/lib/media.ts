/**
 * Media URL utilities
 *
 * Handles converting relative paths to full URLs for cross-project image loading.
 * Uses NEXT_PUBLIC_MEDIA_URL or falls back to NEXT_PUBLIC_API_BASE_URL.
 */

const MEDIA_BASE_URL =
  process.env.NEXT_PUBLIC_MEDIA_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://localhost:7000";

/**
 * Convert a relative path to a full media URL
 *
 * @example
 * getMediaUrl("/uploads/image.jpg") => "https://admin-api.example.com/uploads/image.jpg"
 * getMediaUrl("https://cdn.example.com/image.jpg") => "https://cdn.example.com/image.jpg"
 * getMediaUrl(null) => ""
 */
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return "";

  // Already a full URL - return as is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Data URL (base64) - return as is
  if (path.startsWith("data:")) {
    return path;
  }

  // Relative path - prepend base URL
  // Handle paths like "../upload/..." by stripping the "../" prefix
  let normalizedPath = path;
  while (normalizedPath.startsWith("../")) {
    normalizedPath = normalizedPath.slice(3);
  }
  normalizedPath = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
  return `${MEDIA_BASE_URL}${normalizedPath}`;
}

/**
 * Convert a relative path to a full media URL (same as getMediaUrl)
 * Alias for convenience
 */
export const toMediaUrl = getMediaUrl;

/**
 * Check if a URL is a relative path that needs the media base URL
 */
export function isRelativeMediaPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return !path.startsWith("http://") && !path.startsWith("https://") && !path.startsWith("data:");
}

/**
 * Get the configured media base URL
 */
export function getMediaBaseUrl(): string {
  return MEDIA_BASE_URL;
}

/**
 * Convert all relative image URLs in HTML to full URLs (for display)
 */
export function expandMediaUrls(html: string): string {
  if (!html || !MEDIA_BASE_URL) return html;

  // Match src="/uploads/..." or src='/uploads/...' (relative paths)
  return html.replace(
    /src=(["'])(\/uploads\/[^"']+)\1/g,
    (_, quote, path) => `src=${quote}${MEDIA_BASE_URL}${path}${quote}`
  );
}

/**
 * Convert all full media URLs in HTML back to relative paths (for save)
 */
export function collapseMediaUrls(html: string): string {
  if (!html || !MEDIA_BASE_URL) return html;

  // Replace full URLs with relative paths
  return html.replaceAll(`${MEDIA_BASE_URL}/uploads/`, "/uploads/");
}
