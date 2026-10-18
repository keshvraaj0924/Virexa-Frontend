import { proxyDocuments } from '@/lib/auth/document-proxy'
import { proxyAuth } from '@/lib/auth/proxy'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path
  return path[0] === 'documents' ? proxyDocuments(request, path) : proxyAuth(request, path)
}
export { handle as GET, handle as POST, handle as DELETE, handle as PUT, handle as PATCH }
