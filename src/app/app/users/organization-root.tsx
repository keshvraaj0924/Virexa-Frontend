'use client'
import { useEffect, useState } from 'react'
import { useAccess } from '@/components/access/access-provider'
import { teamApi, type OrganizationRoot as Root } from '@/lib/api/team'
export default function OrganizationRoot() {
  const allowed = useAccess()?.allows('organization:hierarchy:read') ?? false
  const [root, setRoot] = useState<Root | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setRoot(null); setError(false)
    if (allowed) void teamApi.hierarchy(controller.signal).then(value => { if (!controller.signal.aborted) setRoot(value) }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [allowed, attempt])
  if (!allowed) return null
  return <section className="panel"><span className="eyebrow">ORGANIZATION STRUCTURE</span><h2>{root ? root.name : 'Organization structure'}</h2>{error ? <><p role="alert">The organization structure could not be loaded.</p><button className="text-button" onClick={() => setAttempt(value => value + 1)}>Retry structure</button></> : root ? <><p>Organization workspace · Verified organization root</p><p>Branches, departments and personas are not implemented in this backend. This page manages existing members only. Invitations and account creation are not available here.</p></> : <p>Loading organization structure…</p>}</section>
}
