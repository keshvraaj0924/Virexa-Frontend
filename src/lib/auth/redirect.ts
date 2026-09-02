/**
 * Accept only same-origin application paths for post-authentication redirects.
 * Absolute URLs and protocol-relative URLs are rejected to prevent open redirects.
 */
export function safePostAuthPath(value: string | null | undefined, fallback = '/app'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  return value
}
