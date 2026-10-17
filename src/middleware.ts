import { NextRequest, NextResponse } from 'next/server'

// This is feature gating only. Session and tenant authorization stay on the backend.
export function middleware(request: NextRequest) {
  if (process.env.VIREXA_AUTH_CANDIDATE === '1') {
    return NextResponse.redirect(new URL('/app', request.url))
  }
  return NextResponse.next()
}
export const config = { matcher: ['/app/:path+'] }
