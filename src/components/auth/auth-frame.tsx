import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, LockKeyhole, Workflow } from 'lucide-react'
import { VirexaMark } from '@/components/brand/virexa-mark'
import { DocumentOrbit } from './document-orbit'

interface AuthFrameProps {
  heading: string
  description: string
  variant: 'login' | 'register'
  children: ReactNode
}

export function AuthFrame({ heading, description, variant, children }: AuthFrameProps) {
  return (
    <main className="vx-auth-page">
      <section className="vx-auth-content" aria-labelledby="vx-auth-heading">
        <div className="vx-auth-content-inner">
          <div className="vx-auth-header">
            <Link href="/" className="vx-auth-wordmark" aria-label="Virexa home">
              <VirexaMark className="vx-auth-logo" /><span>VIREXA</span>
            </Link>
            <Link href="/" className="vx-auth-back"><ArrowLeft size={15} /> Back to website</Link>
          </div>
          <div className="vx-auth-main">
            <div className="vx-auth-kicker">{variant === 'login' ? 'WELCOME BACK' : 'JOIN VIREXA'}</div>
            <h1 id="vx-auth-heading">{heading}</h1>
            <p className="vx-auth-intro">{description}</p>
            {children}
          </div>
          <p className="vx-auth-trust"><LockKeyhole size={15} /> Your team. Your operational workspace.</p>
        </div>
      </section>
      <aside className="vx-auth-art" aria-label="Virexa platform introduction">
        <DocumentOrbit />
        <div className="vx-auth-art-content">
          <div className="vx-auth-art-label">DOCUMENTS TO DECISIONS</div>
          <h2>{variant === 'login' ? 'Less manual work. More forward motion.' : 'Move your team beyond manual work.'}</h2>
          <p>Bring document intake, extraction and review into one connected flow. Keep your team in control of what happens next.</p>
          <div className="vx-auth-benefits">
            <span><Workflow size={17} /> Governed workflows</span>
            <span><BadgeCheck size={17} /> Human-led review</span>
            <span><LockKeyhole size={17} /> Team-aware access</span>
          </div>
        </div>
        <div className="vx-auth-art-caption">VIREXA <span>BEYOND AUTOMATION</span></div>
      </aside>
    </main>
  )
}

