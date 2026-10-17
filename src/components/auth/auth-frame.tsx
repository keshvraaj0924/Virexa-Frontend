import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, LockKeyhole, Workflow } from 'lucide-react'
import { VirexaMark } from '@/components/brand/virexa-mark'
import { SilkWave } from '@/components/visual/silk-wave'
import { DocumentOrbit } from './document-orbit'

interface AuthFrameProps { heading: string; description: string; variant: 'login' | 'register'; children: ReactNode }
export function AuthFrame({ heading, description, variant, children }: AuthFrameProps) {
  return <main className={`vx-auth-page vx-auth-${variant}`}>
    <SilkWave />
    <header className="vx-auth-topbar"><Link href="/" className="vx-wordmark" aria-label="Virexa home"><VirexaMark className="vx-wordmark-icon"/><span>VIREXA</span></Link><Link href="/" className="vx-auth-back"><ArrowLeft size={14}/> Back to website</Link></header>
    <div className="vx-auth-card">
      <section className="vx-auth-content" aria-labelledby="vx-auth-heading">
        <div className="vx-auth-content-inner"><div className="vx-auth-main">
          <div className="vx-auth-kicker"><span/> {variant === 'login' ? 'YOUR WORKSPACE AWAITS' : 'A NEW WAY FORWARD'}</div>
          <h1 id="vx-auth-heading">{heading}</h1><p className="vx-auth-intro">{description}</p>{children}
        </div><p className="vx-auth-trust"><LockKeyhole size={13}/> Your team. Your operational workspace.</p></div>
      </section>
      <aside className="vx-auth-art" aria-label="Virexa platform introduction">
        <SilkWave/><div className="vx-auth-art-content"><span className="vx-auth-art-label">INTELLIGENCE IN MOTION</span><h2>From everyday documents.<br/><span>To extraordinary clarity.</span></h2><p>A calmer place to manage the work that moves your business.</p></div>
        <DocumentOrbit/>
        <div className="vx-auth-benefits"><span><Workflow size={16}/> Connected workflows</span><span><BadgeCheck size={16}/> Human-led review</span></div>
        <div className="vx-auth-art-caption">VIREXA <span>BEYOND AUTOMATION</span></div>
      </aside>
    </div>
    <footer className="vx-auth-footer"><span>Documents. Decisions. Forward.</span><span>© {new Date().getFullYear()} Virexa</span></footer>
  </main>
}
