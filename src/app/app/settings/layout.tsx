import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
export default function SettingsLayout({ children }: { children: ReactNode }) {
  if (process.env.VIREXA_AUTH_CANDIDATE === '1' && process.env.VIREXA_SESSION_CONTROLS !== '1') redirect('/app')
  return children
}
