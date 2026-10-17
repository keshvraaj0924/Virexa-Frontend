import { NextResponse } from 'next/server'

// This is feature gating only. Session and tenant authorization stay on the backend.
export function middleware() {
  if (process.env.VIREXA_AUTH_CANDIDATE === '1') {
    // Relative Location preserves the browser's exact host behind Next/proxies.
    // request.url may use Next's canonical localhost and drop host-only cookies.
    return new NextResponse(null, { status: 307, headers: { Location: '/app', 'Cache-Control': 'no-store' } })
  }
  return NextResponse.next()
}
export const config = { matcher: ['/app/:path+'] }
