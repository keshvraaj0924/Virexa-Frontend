import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
export default function WorkflowLayout({ children }: { children: ReactNode }) {
  if (process.env.VIREXA_AUTH_CANDIDATE === '1' && process.env.VIREXA_WORKFLOW_RECORDS !== '1') redirect('/app')
  return children
}
