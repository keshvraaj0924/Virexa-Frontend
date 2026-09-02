import Link from 'next/link'

const capabilities = [
  ['01', 'Intelligent intake', 'Bring documents, requests, and operational signals into one governed workspace.'],
  ['02', 'Adaptive workflows', 'Turn repetitive processes into controlled, observable automation.'],
  ['03', 'Operational intelligence', 'Give teams a clear view of work, exceptions, outcomes, and performance.'],
]

export default function HomePage() {
  return (
    <main className="marketing-shell">
      <nav className="marketing-nav" aria-label="Primary navigation">
        <Link href="/" className="brand-lockup" aria-label="Virexa home">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span>Virexa</span>
        </Link>
        <div className="marketing-actions">
          <Link href="/login" className="nav-login">Log in</Link>
          <Link href="/register" className="nav-cta">Get started</Link>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">ENTERPRISE OPERATIONS PLATFORM</span>
          <h1>Move operations from manual to <span>intelligent.</span></h1>
          <p>Virexa connects people, processes, documents, and AI into an accountable operating layer built for modern businesses.</p>
          <div className="hero-actions">
            <Link href="/register" className="primary-button">Start with Virexa <span aria-hidden="true">→</span></Link>
            <Link href="#platform" className="secondary-button">Explore the platform</Link>
          </div>
        </div>
        <div className="hero-panel" aria-label="Virexa platform preview">
          <div className="panel-topline"><span className="status-dot" />Operations command center <span>LIVE</span></div>
          <div className="panel-kpis">
            <div><small>Automated work</small><strong>84.6%</strong><span>↑ 12.8%</span></div>
            <div><small>Exceptions</small><strong>18</strong><span>− 31.4%</span></div>
          </div>
          <div className="workflow-card">
            <div className="workflow-header"><span>Invoice processing</span><span className="pill">Healthy</span></div>
            <div className="workflow-line"><span className="node active" /><span /><span className="node active" /><span /><span className="node" /></div>
            <div className="workflow-labels"><span>Ingest</span><span>Validate</span><span>Post</span></div>
          </div>
          <div className="panel-footer">AI orchestration · policy controls · audit trail</div>
        </div>
      </section>

      <section className="capability-section" id="platform">
        <div className="section-heading"><span className="eyebrow">ONE OPERATING LAYER</span><h2>Built to work with the systems you already trust.</h2><p>Virexa is designed to fit around existing applications instead of forcing a business to rebuild its stack.</p></div>
        <div className="capability-grid">
          {capabilities.map(([number, title, text]) => (
            <article key={number} className="capability-card"><span className="capability-number">{number}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <footer className="marketing-footer"><span>Virexa</span><span>Beyond Automation.</span></footer>
    </main>
  )
}
