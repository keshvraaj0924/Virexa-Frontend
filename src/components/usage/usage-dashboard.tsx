'use client'
import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowDownToLine, Building2, CircleUserRound, RefreshCw } from 'lucide-react'
import { AccessDenied, useAccess } from '@/components/access/access-provider'
import { METER_LABELS, USAGE_METERS, type UsageHistory, type UsageScope, type UsageSummary } from '@/contracts/usage'
import { usageApi } from '@/lib/api/usage'
import { ApiError } from '@/lib/api/client'
const number = (value: number) => value.toLocaleString('en-US')
const date = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
function range(days: number) { const end = new Date(); return { start: new Date(end.getTime() - days * 86400000).toISOString(), end: end.toISOString() } }

export function UsageDashboard() {
  const access = useAccess()
  const [scope, setScope] = useState<UsageScope>('me')
  if (!access?.allows('usage:read')) return <AccessDenied subject="Usage records"/>
  const organizationAllowed = access.allows('usage:organization:read')
  // A revoked permission unmounts tenant data immediately. Never retain it behind a disabled tab.
  const effectiveScope = scope === 'organization' && organizationAllowed ? 'organization' : 'me'
  return <div className="vx-usage">
    <div className="vx-usage-scope" role="group" aria-label="Usage scope">
      <button aria-pressed={effectiveScope === 'me'} onClick={() => setScope('me')}><CircleUserRound size={17} aria-hidden="true"/>My usage</button>
      {organizationAllowed && <button aria-pressed={effectiveScope === 'organization'} onClick={() => setScope('organization')}><Building2 size={17} aria-hidden="true"/>Organization usage</button>}
    </div>
    <UsageView key={effectiveScope} scope={effectiveScope}/>
  </div>
}
function UsageView({ scope }: { scope: UsageScope }) {
  const [days, setDays] = useState(30)
  const [window, setWindow] = useState(() => range(30))
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [history, setHistory] = useState<UsageHistory | null>(null)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [state, setState] = useState('')
  const [operation, setOperation] = useState('')
  const [userId, setUserId] = useState('')
  const [cursors, setCursors] = useState<string[]>([])
  const [refresh, setRefresh] = useState(0)
  const paging = useRef(false)
  const cursor = cursors.at(-1) ?? ''
  useEffect(() => {
    const request = new AbortController()
    setSummary(null); setError('')
    usageApi.summary(scope, new URLSearchParams(window), AbortSignal.any([request.signal, AbortSignal.timeout(15000)]))
      .then(data => { if (!request.signal.aborted) setSummary(data) })
      .catch(reason => { if (!request.signal.aborted) setError(reason instanceof ApiError && reason.status === 403 ? 'Your access has changed. This usage view is no longer available.' : 'Usage could not be loaded. No totals are shown until they can be verified.') })
    return () => request.abort()
  }, [scope, window, refresh])
  useEffect(() => {
    const request = new AbortController()
    paging.current = true
    setHistory(null); setHistoryError('')
    const filters = new URLSearchParams({ ...window, limit: '25' })
    if (cursor) filters.set('cursor', cursor)
    if (state) filters.set('state', state)
    if (operation) filters.set('operation', operation)
    if (scope === 'organization' && userId) filters.set('userId', userId)
    usageApi.history(scope, filters, AbortSignal.any([request.signal, AbortSignal.timeout(15000)]))
      .then(data => { if (!request.signal.aborted) setHistory(data) })
      .catch(() => { if (!request.signal.aborted) setHistoryError('Operation history could not be loaded. Try refreshing this view.') })
      .finally(() => { if (!request.signal.aborted) paging.current = false })
    return () => request.abort()
  }, [scope, window, cursor, state, operation, userId, refresh])
  function resetFilters() { setState(''); setOperation(''); setUserId(''); setCursors([]) }
  return <>
    <header className="vx-usage-toolbar"><div><h2>{scope === 'me' ? 'Your activity' : 'Organization activity'}</h2><p>{scope === 'me' ? 'Only operations attributed to your account.' : 'All recorded operations in your current organization. No cross-tenant data.'}</p></div><div className="vx-usage-controls"><label>Reporting window<select value={days} onChange={event => { const value = Number(event.target.value); setDays(value); setWindow(range(value)); setCursors([]) }}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label><button className="text-button" onClick={() => { setWindow(range(days)); setCursors([]); setRefresh(value => value + 1) }}><RefreshCw size={15} aria-hidden="true"/>Refresh usage</button></div></header>
    {error ? <div className="vx-usage-message" role="alert">{error}</div> : !summary ? <p role="status">Loading verified usage…</p> : <>
      <p className="vx-usage-period">{date(summary.start)} – {date(summary.end)} · UTC · {scope === 'me' ? 'Personal totals' : 'Tenant-wide totals'}</p>
      <div className="vx-usage-meters">{USAGE_METERS.map(meter => { const item = summary.meters[meter]; return <article className="vx-usage-meter" key={meter} aria-label={METER_LABELS[meter]}><span className="vx-usage-meter-icon">{meter === 'document_uploads' ? <ArrowDownToLine size={19} aria-hidden="true"/> : <Activity size={19} aria-hidden="true"/>}</span><h3>{METER_LABELS[meter]}</h3><strong>{item.available && item.used !== null ? number(item.used) : 'Not available'}</strong><p>{item.available ? `${item.reserved === null ? 'Unknown' : number(item.reserved)} reserved · completed usage above` : 'Not instrumented. No usage inferred.'}</p></article> })}</div>
      <div className="vx-usage-states" aria-label="Operation status totals">{Object.entries(summary.states).map(([name, total]) => <span key={name}><strong>{number(total)}</strong> {name}</span>)}<span>Cost: {summary.cost.available && summary.cost.amount !== null && summary.cost.currency && summary.cost.pricingVersion ? `${summary.cost.amount} ${summary.cost.currency}` : 'Not available'}</span></div>
      <section className="vx-usage-plan" aria-labelledby="usage-plan-title"><div><span className="eyebrow">ORGANIZATION ENTITLEMENT · READ-ONLY</span><h2 id="usage-plan-title">{summary.subscription.plan.replaceAll('_', ' ')}</h2><p>Status: {summary.subscription.status} · {date(summary.subscription.periodStart)} – {date(summary.subscription.periodEnd)} (UTC)</p><p>This allowance is shared by your organization, not a personal allocation. It resets at the period end and is separate from the reporting window.</p></div><div className="vx-usage-allowance">{USAGE_METERS.filter(meter => summary.subscription.limits[meter] !== null).map(meter => { const limit = summary.subscription.limits[meter]!; return <div key={meter}><strong>{number(limit.remaining)} remaining</strong><span>{METER_LABELS[meter]} · {number(limit.usedAndReserved)} used or reserved of {number(limit.limit)}</span><progress aria-label={`${METER_LABELS[meter]} organization allowance consumed`} value={Math.min(limit.usedAndReserved, limit.limit)} max={Math.max(1, limit.limit)}/></div>})}<p>Other limits: not configured.</p></div><p className="vx-usage-billing">{summary.subscription.billingAvailable ? 'Billing status is provided by your organization. Payment changes are not available in this view.' : 'Payments are not configured. No paid subscription, checkout or upgrade is available.'}</p></section>
      {scope === 'organization' && <section className="vx-usage-panel" aria-labelledby="usage-breakdown-title"><h2 id="usage-breakdown-title">People & operations</h2><p>Groups for the selected reporting window. Select a group to filter its history below.</p>{summary.groups.length === 0 ? <p>No recorded operations in this window.</p> : <ul className="vx-usage-groups">{summary.groups.map((group, index) => <li key={`${group.userId}-${group.operation}-${group.meter}-${group.state}-${index}`}><button onClick={() => { setUserId(group.userId); setOperation(group.operation); setState(group.state); setCursors([]) }}><span className="vx-usage-identity">Account {group.userId}</span><span>{group.operation} · {METER_LABELS[group.meter]} · {group.state}</span><strong>{number(group.quantity)} units · {number(group.events)} events</strong></button></li>)}</ul>}{summary.groupsTruncated && <p role="status">Showing the first 100 groups. Narrow the reporting window to inspect more activity.</p>}</section>}
    </>}
    <section className="vx-usage-panel" aria-labelledby="usage-history-title"><header><h2 id="usage-history-title">Operation history</h2><p>Recorded events only. Uninstrumented AI, OCR and workflows will not appear here.</p></header><div className="vx-usage-filters"><label>Operation<select value={operation} onChange={event => { setOperation(event.target.value); setCursors([]) }}><option value="">All operations</option><option value="document_intake">Document upload</option>{operation && operation !== 'document_intake' && <option value={operation}>{operation}</option>}</select></label><label>Status<select value={state} onChange={event => { setState(event.target.value); setCursors([]) }}><option value="">All statuses</option>{['reserved', 'succeeded', 'failed', 'released'].map(value => <option key={value}>{value}</option>)}</select></label><button className="text-button" onClick={resetFilters}>Clear filters</button></div>{userId && <p className="vx-usage-identity">Filtered account: {userId}</p>}
      {historyError ? <p role="alert">{historyError}</p> : !history ? <p role="status">Loading operation history…</p> : <>{history.items.length === 0 ? <div className="vx-usage-empty"><Activity size={25} aria-hidden="true"/><h3>No recorded events</h3><p>No operations match this scope, window and filters.</p></div> : <ol className="vx-usage-history">{history.items.map(item => <li key={item.id}><div><strong>{item.operation.replaceAll('_', ' ')}</strong><p>{METER_LABELS[item.meter]} · {number(item.quantity)} units</p>{scope === 'organization' && <p className="vx-usage-identity">Account {item.userId}</p>}</div><div><span className={`vx-usage-status is-${item.state}`}>{item.state}</span><p>{new Date(item.createdAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC</p>{item.errorCode && <p role="note">Error: {item.errorCode}</p>}</div></li>)}</ol>}<div className="vx-usage-pagination"><button className="text-button" disabled={cursors.length === 0} onClick={() => { if (!paging.current) { paging.current = true; setCursors(values => values.slice(0, -1)) } }}>Newer events</button><span>Page {cursors.length + 1}</span><button className="text-button" disabled={!history.nextCursor} onClick={() => { if (!paging.current && history.nextCursor) { paging.current = true; setCursors(values => [...values, history.nextCursor!]) } }}>Older events</button></div></>}
    </section>
  </>
}
