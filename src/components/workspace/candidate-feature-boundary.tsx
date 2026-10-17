import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

/** Capability gate, not authorization. Backend session/tenant checks remain required. */
export function CandidateFeatureBoundary({ children }: { children: ReactNode }) {
  if (process.env.VIREXA_AUTH_CANDIDATE === '1') redirect('/app')
  return children
}
