/** Server-only configuration: never derive an upstream or redirect from request input. */
function configuredOrigin(value: string | undefined): URL | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null
    return url
  } catch { return null }
}
export function candidateOrigin(): URL | null {
  if (process.env.NEXT_PUBLIC_API_URL !== '/api/v1') return null
  return configuredOrigin(process.env.AUTH_API_ORIGIN)
}
