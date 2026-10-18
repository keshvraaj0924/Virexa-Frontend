'use client'

import { useEffect } from 'react'
import { browserAllowsDecorativeMotion } from '@/lib/ui/motion-policy'

/** Content is visible without JS; motion is a progressively enhanced layer. */
export function EntranceMotion() {
  useEffect(() => {
    if (!browserAllowsDecorativeMotion()) return
    let cancelled = false
    let dispose: (() => void) | undefined
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      const root = document.querySelector('.vx-landing')
      if (cancelled || !root) return
      gsap.registerPlugin(ScrollTrigger)
      const context = gsap.context(() => {
        gsap.fromTo(root.querySelectorAll('[data-vx-enter]'),
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, stagger: .1, duration: .9, ease: 'power3.out', clearProps: 'all' })
        root.querySelectorAll('[data-vx-reveal]').forEach((element) => {
          gsap.fromTo(element, { y: 30 }, { y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 92%', once: true }, clearProps: 'transform' })
        })
        gsap.to('.vx-orbital-lines', { rotation: 12, y: -35, ease: 'none', scrollTrigger: { trigger: '.vx-hero', start: 'top top', end: 'bottom top', scrub: 1 } })
      }, root)
      dispose = () => context.revert()
    }).catch(() => { /* Optional motion must never block content or navigation. */ })
    return () => { cancelled = true; dispose?.() }
  }, [])
  return null
}
