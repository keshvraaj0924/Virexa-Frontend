/** Server-only configuration: never derive an upstream from request input. */
export function candidateOrigin(): URL | null {
  if (process.env.NEXT_PUBLIC_API_URL !== '/api/v1' || !process.env.AUTH_API_ORIGIN) return null
  try {
    const url = new URL(process.env.AUTH_API_ORIGIN)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null
    return url
  } catch { return null }
}
