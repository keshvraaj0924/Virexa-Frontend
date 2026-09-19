'use client'

import { useEffect, useMemo, useState } from 'react'
import type { OrganizationHierarchy as Hierarchy } from '@/contracts/organization'
import { getOrganizationHierarchy } from '@/lib/api/organization'

export default function OrganizationHierarchy() {
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getOrganizationHierarchy({ limit: 100, status: 'active' })
      .then(({ data }) => { if (active) setHierarchy(data) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load organization hierarchy.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const departmentsByBranch = useMemo(() => {
    const grouped = new Map<string, Hierarchy['departments']>()
    for (const department of hierarchy?.departments ?? []) {
      grouped.set(department.branchId, [...(grouped.get(department.branchId) ?? []), department])
    }
    return grouped
  }, [hierarchy])

  const personasByDepartment = useMemo(() => {
    const grouped = new Map<string, Hierarchy['personas']>()
    for (const persona of hierarchy?.personas ?? []) {
      grouped.set(persona.departmentId, [...(grouped.get(persona.departmentId) ?? []), persona])
    }
    return grouped
  }, [hierarchy])

  if (loading) return <section className="panel"><p>Loading organization structure…</p></section>
  if (error) return <section className="panel"><p role="alert">{error}</p></section>
  if (!hierarchy) return null

  return (
    <section className="panel">
      <div className="panel-heading">
        <div><span className="eyebrow">ACTIVE STRUCTURE</span><h2>Branches, departments & personas</h2></div>
        <span className="workspace-pill">{hierarchy.branches.length} branches</span>
      </div>
      {hierarchy.branches.length === 0 ? <p>No active branches are configured for this organization.</p> : hierarchy.branches.map((branch) => (
        <article className="hierarchy-branch" key={branch.id}>
          <div className="hierarchy-title"><div><strong>{branch.name}</strong><span>{branch.code}</span></div><span className="status-chip">{branch.status}</span></div>
          <div className="hierarchy-departments">
            {(departmentsByBranch.get(branch.id) ?? []).map((department) => (
              <div className="hierarchy-department" key={department.id}>
                <div className="hierarchy-title"><div><strong>{department.name}</strong><span>{department.code}</span></div><span>{(personasByDepartment.get(department.id) ?? []).length} personas</span></div>
                <div className="hierarchy-personas">
                  {(personasByDepartment.get(department.id) ?? []).map((persona) => <span className="hierarchy-persona" key={persona.id}>{persona.name}</span>)}
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  )
}
