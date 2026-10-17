'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DocumentRecord } from '@/contracts/documents'
import type { UserRole } from '@/contracts/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { intakeError, listIntake, sendIntake, validateIntakeFile, type IntakeProgress } from '@/lib/api/intake'

export function IntakePanel({ role }: { role: UserRole }) {
  const [items, setItems] = useState<DocumentRecord[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [listError, setListError] = useState('')
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const active = useRef<AbortController | null>(null)
  const progress = useRef<IntakeProgress>({ key: '' })
  const mounted = useRef(true)
  const listController = useRef<AbortController | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const refresh = useCallback(async (next?: string) => {
    listController.current?.abort()
    const controller = new AbortController()
    listController.current = controller
    setLoading(true); setListError('')
    try {
      const response = await listIntake(next, controller.signal)
      if (!mounted.current || controller.signal.aborted) return
      setItems(previous => next ? [...previous, ...response.data.items.filter(item => !previous.some(old => old.id === item.id))] : response.data.items)
      setCursor(response.data.nextCursor)
    } catch (err) { if (mounted.current && !controller.signal.aborted) setListError(intakeError(err)) }
    finally { if (mounted.current && !controller.signal.aborted) setLoading(false) }
  }, [])
  useEffect(() => {
    mounted.current = true
    void refresh()
    return () => { mounted.current = false; active.current?.abort(); listController.current?.abort() }
  }, [refresh])
  function choose(selected: File | null) {
    if (active.current) return
    setError(''); setMessage(''); setFile(null)
    progress.current = { key: crypto.randomUUID() }
    if (!selected) return
    try { validateIntakeFile(selected); setFile(selected) }
    catch (err) { setError((err as Error).message) }
  }
  async function upload() {
    if (active.current || !file) return
    const controller = new AbortController()
    active.current = controller
    setBusy(true); setError('')
    try {
      const document = await sendIntake(file, progress.current, controller.signal, text => { if (mounted.current && !controller.signal.aborted) setMessage(text) })
      if (!mounted.current || controller.signal.aborted) return
      setMessage(document.scanStatus === 'pending_scan' ? 'Received in private quarantine. Pending scan.' : 'Receipt requires confirmation. Refresh the document list.')
      setFile(null)
      if (input.current) input.current.value = ''
      await refresh()
    } catch (err) {
      if (!mounted.current) return
      setMessage('')
      setError(controller.signal.aborted ? 'Upload stopped. A private intake record or bytes may already exist. Refresh the list before retrying.' : intakeError(err))
      await refresh()
    } finally { if (mounted.current) setBusy(false); active.current = null }
  }
  const uncertain = progress.current.metadataUncertain
  return <>
    <section className="vx-workspace-note"><h2>Private document intake</h2><p>Files remain in quarantine. Malware scanning, extraction, review, downloads and ERP delivery are unavailable. Pending scan does not mean safe or processed.</p></section>
    {hasPermission(role, 'document:create') && <section className="vx-dashboard-panel" aria-label="Upload a document" style={{ padding: 24 }}>
      <h2>Upload a document</h2>
      <p>PDF, PNG or JPEG. One file at a time, up to 25 MiB. Use synthetic, non-sensitive files for this preview.</p>
      <label htmlFor="intake-file">Choose a document</label><br/>
      <input ref={input} id="intake-file" style={{ maxWidth: '100%' }} type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={event => choose(event.target.files?.[0] ?? null)} />
      {file && <p>{file.name} · {(file.size / 1024).toFixed(1)} KiB</p>}
      <div className="workflow-actions" style={{ marginTop: 16, flexWrap: 'wrap' }}><button className="primary-button" disabled={!file || busy || uncertain} onClick={upload}>{busy ? 'Uploading…' : progress.current.document ? 'Retry upload' : 'Upload to quarantine'}</button>{busy && <button className="text-button" onClick={() => active.current?.abort()}>Cancel upload</button>}</div>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {uncertain && !busy && <p role="status">The metadata response was interrupted. It may have created a record. Refresh the list and choose the file again only if you want a new intake record.</p>}
    </section>}
    <section className="vx-dashboard-panel" aria-label="Quarantine records" style={{ padding: 24, marginTop: 24 }}>
      <header><h2>Quarantine records</h2><button onClick={() => void refresh()} disabled={loading}>Refresh records</button></header>
      {listError && <p role="alert">{listError}</p>}
      {loading && <p role="status">Loading records…</p>}
      {!loading && !listError && items.length === 0 && <p>No documents received yet.</p>}
      <ul style={{ paddingLeft: 20 }}>{items.map(item => <li key={item.id} style={{ margin: '16px 0', overflowWrap: 'anywhere' }}><strong>{item.originalFileName}</strong><br/><span>{item.scanStatus === 'pending_scan' ? 'Pending scan · private quarantine' : 'Awaiting upload confirmation'} · {(item.sizeBytes / 1024).toFixed(1)} KiB</span></li>)}</ul>
      {cursor && <button disabled={loading} onClick={() => void refresh(cursor)}>Load more records</button>}
    </section>
  </>
}
