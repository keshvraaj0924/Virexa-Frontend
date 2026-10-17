import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/server'

export default async function AppShellLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession()
  if (!session) redirect('/login')

  return <WorkspaceFrame session={session}>{children}</WorkspaceFrame>
}

