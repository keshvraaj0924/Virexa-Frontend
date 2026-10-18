'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronRight, X } from 'lucide-react'

const tips = {
  login: { title: 'Let’s get you back in.', steps: ['Choose Individual or Organization, then use the email associated with that account.', 'The eye button lets you check your password before signing in.', 'New here? Create a workspace using the link below the form.'] },
  register: { title: 'A clear start for your work.', steps: ['Choose an individual workspace or an organization workspace, then enter your details.', 'Verify the code emailed to you before choosing a unique password or long passphrase.', 'Your workspace opens only after the server verifies your account. Each email belongs to one workspace.'] },
  documents: { title: 'From intake to review.', steps: ['Your document inbox shows the records returned by your workspace’s API.', 'Open a document to inspect its extraction and review available fields.', 'Check the source before confirming changes. Available actions depend on your role.'] },
  workflows: { title: 'Keep your process in view.', steps: ['Browse the workflows available in your workspace.', 'Check each workflow’s current status before taking action.', 'Creation and management controls depend on your assigned role.'] },
  workspace: { title: 'Find your next step.', steps: ['Use Documents for intake and extraction review.', 'Use Workflows to inspect the processes available to your team.', 'Security shows session controls when supported by your connected backend.'] },
  home: { title: 'Meet your connected workspace.', steps: ['Virexa brings document intake, extraction and review together.', 'Sign in to continue, or create an individual or organization workspace.', 'I’m your built-in product guide. These tips don’t access or change your documents.'] },
}

function guideFor(path: string) {
  if (path === '/login') return tips.login
  if (path === '/register') return tips.register
  if (path.startsWith('/app/documents')) return tips.documents
  if (path.startsWith('/app/workflows')) return tips.workflows
  return path.startsWith('/app') ? tips.workspace : tips.home
}

/** An original orbital-document character with explicit, local product tips. No AI service is implied. */
export function ProductGuide() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [lastPath, setLastPath] = useState(path)
  const button = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const id = useId()
  const tip = guideFor(path)
  if (lastPath !== path) { setLastPath(path); setStep(0); setOpen(false) }
  const close = () => { setOpen(false); button.current?.focus() }
  useEffect(() => {
    if (!open) return
    closeButton.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <div className={open ? 'vx-guide is-open' : 'vx-guide'}>
      {open && <section className="vx-guide-panel" id={id} role="region" aria-labelledby={`${id}-title`}>
        <header><span>VIREXA GUIDE</span><button ref={closeButton} onClick={close} aria-label="Close product guide"><X size={17} /></button></header>
        <h2 id={`${id}-title`}>{tip.title}</h2>
        <p aria-live="polite">{tip.steps[step]}</p>
        <footer><span>Tip {step + 1} of {tip.steps.length}</span><button onClick={() => { if (step + 1 === tip.steps.length) close(); else setStep(step + 1) }}>{step + 1 === tip.steps.length ? 'Got it' : 'Next tip'}<ChevronRight size={15} /></button></footer>
        <small>Built-in guidance. No document access or automated actions.</small>
      </section>}
      <button ref={button} className="vx-guide-launcher" onClick={() => { setOpen(!open); setStep(0) }} aria-label={open ? 'Hide product guide' : 'Open product guide'} aria-expanded={open} aria-controls={open ? id : undefined}>
        <svg viewBox="0 0 80 80" aria-hidden="true" className="vx-guide-character">
          <defs><linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#91d9ff"/><stop offset=".5" stopColor="#418fde"/><stop offset="1" stopColor="#7463d8"/></linearGradient></defs>
          <ellipse className="vx-guide-shadow" cx="40" cy="70" rx="18" ry="4" fill="#418fde" opacity=".15"/>
          <g className="vx-guide-float"><ellipse cx="40" cy="34" rx="32" ry="12" transform="rotate(-25 40 34)" fill="none" stroke="#a2ceff" strokeWidth="2" opacity=".7"/>
            <path d="M20 27Q20 20 27 20H48L60 32V55Q60 62 53 62H27Q20 62 20 55Z" fill={`url(#${id}-body)`}/>
            <path d="M48 20V29Q48 32 51 32H60" fill="#e0f2ff" opacity=".75"/>
            <g className="vx-guide-eyes"><ellipse cx="32" cy="41" rx="3" ry="4" fill="#101c2c"/><ellipse cx="48" cy="41" rx="3" ry="4" fill="#101c2c"/></g>
            <path d="M35 51Q40 55 45 51" stroke="#101c2c" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <circle cx="65" cy="21" r="4" fill="#b9e4ff"/><circle cx="17" cy="54" r="2.5" fill="#b3a2ef"/>
          </g>
        </svg>
        <span>Guide</span>
      </button>
    </div>
  )
}
