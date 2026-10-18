'use client'
import { Check, LockKeyhole, ShieldCheck } from 'lucide-react'
import { CAPABILITIES, type Capability } from '@/contracts/capabilities'
import { AccessDenied, useAccess } from './access-provider'

const labels: Record<Capability, { title: string; description: string }> = {
  'workflow:read': { title: 'Read workflow records', description: 'View workflow definitions and recorded status.' },
  'workflow:create': { title: 'Create workflow records', description: 'Create definitions and update your own records.' },
  'workflow:manage': { title: 'Manage workflow records', description: 'Update authorized records in your workspace.' },
  'audit:read': { title: 'Read audit events', description: 'View recorded activity in your current workspace.' },
  'usage:read': { title: 'Review your usage', description: 'See your own recorded AI and operation usage.' },
  'usage:organization:read': { title: 'Review organization usage', description: 'See usage across your current organization only.' },
  'document:read': { title: 'View documents', description: 'Read document records within your authorized scope.' },
  'document:create': { title: 'Create intake records', description: 'Register new documents for private intake.' },
  'document:upload': { title: 'Upload document files', description: 'Send and confirm files in private quarantine.' },
  'session:read': { title: 'Review your sessions', description: 'See active sign-ins for your own account.' },
  'session:revoke': { title: 'Revoke your sessions', description: 'Sign out your own current or other sessions.' },
  'organization:read': { title: 'Read organization details', description: 'Read authorized organization information through the API.' },
}
export function EffectivePermissions() {
  const access = useAccess()
  if (!access) return null
  return <section className="vx-access-panel" aria-labelledby="effective-permissions-title">
    <header><div><span className="eyebrow">ROLE + RESOURCE POLICY</span><h2 id="effective-permissions-title">Your effective permissions</h2><p>Current capabilities verified by the server. This view is read-only.</p></div><ShieldCheck aria-hidden="true"/></header>
    {!access.permissions ? <AccessDenied subject="Permissions"/> : <>
      <div className="vx-access-grid">{CAPABILITIES.map(capability => {
        const allowed = access.allows(capability)
        return <article key={capability} className="vx-access-item"><span className={allowed ? 'vx-access-state is-allowed' : 'vx-access-state'}>{allowed ? <Check size={16} aria-hidden="true"/> : <LockKeyhole size={16} aria-hidden="true"/>}{allowed ? 'Allowed' : 'Restricted'}</span><h3>{labels[capability].title}</h3><p>{labels[capability].description}</p></article>
      })}</div>
      <p>Each request is also checked against your workspace, resource ownership and current state. An allowed capability does not grant access to every record. Workflow execution, scanning, extraction and administration are not available here.</p>
      <button className="text-button" onClick={() => void access.refresh()}>Refresh permissions</button>
    </>}
  </section>
}
