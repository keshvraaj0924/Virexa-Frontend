import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { redirect } from 'next/navigation'
import { AccessProvider } from '@/components/access/access-provider'
import { getServerSession, getServerEffectivePermissions } from '@/lib/auth/server'

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession()
  if (!session) redirect('/login')
  const candidate = process.env.VIREXA_AUTH_CANDIDATE === '1'
  const workspace = <WorkspaceFrame session={session} authOnly={process.env.VIREXA_AUTH_CANDIDATE === '1'} sessionControls={process.env.VIREXA_SESSION_CONTROLS === '1'} documentIntake={process.env.VIREXA_DOCUMENT_INTAKE === '1'}>{children}</WorkspaceFrame>
  return candidate ? <AccessProvider initial={await getServerEffectivePermissions()}>{workspace}</AccessProvider> : workspace
}

