import WorkspaceDashboard from './WorkspaceDashboard'
import ProtectedWorkspace from './ProtectedWorkspace'
import { SessionProvider } from '@/lib/auth/session-provider'

export default function AppShellPage() {
  return (
    <SessionProvider>
      <ProtectedWorkspace>
        <WorkspaceDashboard />
      </ProtectedWorkspace>
    </SessionProvider>
  )
}
