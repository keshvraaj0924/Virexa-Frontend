import Link from 'next/link'
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Check, FileCheck2,
  Files, LockKeyhole, ScanLine, ShieldCheck, Sparkles, Workflow,
} from 'lucide-react'
import { VirexaMark } from '@/components/brand/virexa-mark'
import { SilkWave } from '@/components/visual/silk-wave'
import { InteractiveLink } from '@/components/marketing/interactive-link'
import { DocumentField } from '@/components/visual/document-field'
import { EntranceMotion } from '@/components/marketing/entrance-motion'

const capabilities = [
  {
    icon: Files,
    number: '01',
    title: 'One intelligent intake',
    description: 'Bring invoices and supporting documents into a structured, searchable workspace with clear ownership.',
  },
  {
    icon: Workflow,
    number: '02',
    title: 'Automation with control',
    description: 'Route exceptions, reviews, and approvals through governed workflows—not black-box decisions.',
  },
  {
    icon: ShieldCheck,
    number: '03',
    title: 'Accountability by design',
    description: 'Give authorized teams traceable decisions and permissions tailored to their organization.',
  },
]

const steps = [
  { label: 'Receive', detail: 'Document intake', icon: Files },
  { label: 'Extract', detail: 'Structured fields', icon: ScanLine },
  { label: 'Review', detail: 'Human validation', icon: BadgeCheck },
  { label: 'Act', detail: 'Approved workflow', icon: Check },
]

export default function HomePage() {
  return (
    <main className="vx-landing">
      <EntranceMotion />
      <div className="vx-dark-stage">
        <SilkWave />
        <div className="vx-stage-texture" aria-hidden="true" />
        <nav className="vx-site-nav" aria-label="Primary navigation">
          <Link href="/" className="vx-wordmark" aria-label="Virexa home">
            <VirexaMark className="vx-wordmark-icon" />
            <span>VIREXA</span>
          </Link>
          <div className="vx-site-links">
            <a href="#platform">Platform</a>
            <a href="#process">How it works</a>
            <a href="#security">Security</a>
          </div>
          <div className="vx-site-actions">
            <Link href="/login" className="vx-nav-signin">Sign in</Link>
            <Link href="/register" className="vx-button vx-button-blue vx-nav-get-started">Register <ArrowUpRight size={16} /></Link>
          </div>
        </nav>

        <section className="vx-hero" aria-labelledby="vx-hero-heading">
          <div className="vx-hero-content">
            <div className="vx-eyebrow vx-eyebrow-light" data-vx-enter>
              <Sparkles size={13} aria-hidden="true" /> INTELLIGENCE IN MOTION
            </div>
            <h1 id="vx-hero-heading" data-vx-enter>Documents in.<br /><span>Possibilities out.</span></h1>
            <p data-vx-enter>Turn the paperwork into the way forward. Intelligent document operations, connected workflows, and people firmly in control.</p>
            <div className="vx-hero-actions" data-vx-enter>
              <InteractiveLink href="/register" className="vx-button vx-button-blue">Create your workspace <ArrowRight size={17} aria-hidden="true" /></InteractiveLink>
              <InteractiveLink href="#platform" className="vx-button vx-button-outline">Explore Virexa <ArrowUpRight size={16} aria-hidden="true" /></InteractiveLink>
            </div>
            <div className="vx-hero-assurances" data-vx-enter>
              <span><ShieldCheck size={16} aria-hidden="true" /> Human-in-control workflows</span>
              <span><LockKeyhole size={16} aria-hidden="true" /> Tenant-aware access</span>
            </div>
          </div>

          <div className="vx-hero-visual" aria-label="Illustration of an invoice moving through a controlled processing workflow" data-vx-enter>
            <DocumentField />
            <div className="vx-orbital-lines" aria-hidden="true"><i /><i /><i /></div>
            <div className="vx-visual-halo" aria-hidden="true" />
            <div className="vx-scene-label"><span className="vx-preview-dot" /> LIVE IN YOUR WORKSPACE <span>PRODUCT PREVIEW</span></div>
            <div className="vx-document vx-document-back" aria-hidden="true">
              <span className="vx-doc-overline">DOCUMENT</span><span className="vx-doc-line" /><span className="vx-doc-line short" />
            </div>
            <div className="vx-document vx-document-mid" aria-hidden="true">
              <span className="vx-doc-overline">INVOICE</span><span className="vx-doc-line" /><span className="vx-doc-line short" /><span className="vx-doc-line" />
            </div>
            <div className="vx-document vx-document-front" aria-hidden="true">
              <div className="vx-doc-head"><FileCheck2 size={24} /><strong>Invoice</strong></div>
              <span className="vx-doc-sub">DOCUMENT INTELLIGENCE</span>
              <div className="vx-doc-divider" />
              <span className="vx-doc-line" /><span className="vx-doc-line short" /><span className="vx-doc-line" />
              <div className="vx-doc-table"><i /><i /><i /></div>
              <div className="vx-doc-total"><span>Structured. Ready to review.</span><strong>↗</strong></div>
            </div>
            <div className="vx-process-glass">
              <div className="vx-process-top"><span>Intelligence at work</span><span className="vx-process-badge">Preview</span></div>
              <div className="vx-process-row"><span className="vx-process-icon"><Check size={13} /></span><span>Document received</span></div>
              <div className="vx-process-row"><span className="vx-process-icon"><Check size={13} /></span><span>Fields extracted</span></div>
              <div className="vx-process-row"><span className="vx-process-icon"><Check size={13} /></span><span>Validation requested</span></div>
              <div className="vx-process-row vx-process-pending"><span className="vx-process-icon">4</span><span>Your team takes it from here</span></div>
            </div>
          </div>
        </section>
        <div className="vx-stage-bottom" aria-label="Platform principles">
          <span><BadgeCheck size={19} /> Governed approvals</span>
          <span><Workflow size={19} /> Configurable workflows</span>
          <span><ShieldCheck size={19} /> Auditable operations</span>
          <span><LockKeyhole size={19} /> Role-aware access</span>
        </div>
      </div>

      <section id="platform" className="vx-platform-section" aria-labelledby="vx-platform-title">
        <div className="vx-section-intro">
          <div><span className="vx-section-kicker">01 / MADE FOR THE WAY YOU WORK</span><h2 id="vx-platform-title">A clear path through<br /><span>the complexity.</span></h2></div>
          <p>Bring document operations into focus with intelligent extraction, structured workflows, and the people who make the final call.</p>
        </div>
        <div className="vx-capability-grid">
          {capabilities.map(({ icon: Icon, number, title, description }) => (
            <article className="vx-capability-card" data-vx-reveal key={number}>
              <div className="vx-capability-top"><span className="vx-capability-icon"><Icon size={23} /></span><span>{number} / 03</span></div>
              <h3>{title}</h3><p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="process" className="vx-process-section" aria-labelledby="vx-process-title">
        <div className="vx-process-copy">
          <span className="vx-section-kicker">02 / FROM FIRST FILE TO FINAL CALL</span>
          <h2 id="vx-process-title">Every step visible.<br /><span>Every decision owned.</span></h2>
          <p>Virexa organizes the flow of work from intake to approved action. Automation assists your team; it does not replace authorized review.</p>
          <Link href="/register" className="vx-text-link">Create your workspace <ArrowRight size={18} /></Link>
        </div>
        <div className="vx-process-preview" data-vx-reveal>
          <div className="vx-preview-header"><span><span className="vx-preview-dot" /> Invoice workflow</span><span>PROCESS OVERVIEW</span></div>
          <div className="vx-preview-steps">
            {steps.map(({ label, detail, icon: Icon }, index) => (
              <div className="vx-preview-step" key={label}>
                <div className="vx-step-icon"><Icon size={21} /></div><strong>{label}</strong><span>{detail}</span>
                {index < steps.length - 1 && <ArrowRight className="vx-step-arrow" size={16} aria-hidden="true" />}
              </div>
            ))}
          </div>
          <div className="vx-preview-note"><ShieldCheck size={16} /> Preview of the workflow concept. No live customer or invoice data is shown.</div>
        </div>
      </section>

      <section id="security" className="vx-security-banner">
        <div className="vx-security-icon"><ShieldCheck size={30} /></div>
        <div><span className="vx-section-kicker">03 / CONFIDENCE, BUILT IN</span><h2>Designed around security, accountability, and human oversight.</h2></div>
        <Link href="/register" className="vx-button vx-button-blue">Get started <ArrowUpRight size={16} /></Link>
      </section>
      <footer className="vx-site-footer">
        <Link href="/" className="vx-wordmark"><VirexaMark className="vx-wordmark-icon" /><span>VIREXA</span></Link>
        <span>Beyond Automation.</span><span>© {new Date().getFullYear()} Virexa</span>
      </footer>
    </main>
  )
}

