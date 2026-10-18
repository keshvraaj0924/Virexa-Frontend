'use client'

import { useEffect } from 'react'
import { browserAllowsDecorativeMotion } from '@/lib/ui/motion-policy'

/** GSAP enhances the hero without hiding content before hydration. */
export function EntranceMotion() {
  useEffect(() => {
    if (!browserAllowsDecorativeMotion()) return
    let cancelled = false
    let dispose: (() => void) | undefined

    void import('gsap').then(({ gsap }) => {
      const root = document.querySelector('.vx-landing')
      if (cancelled || !root) return
      const elements = root.querySelectorAll('[data-vx-enter]')
      const tween = gsap.fromTo(
        elements,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, stagger: 0.09, duration: 0.75, ease: 'power3.out', clearProps: 'all' },
      )
      dispose = () => tween.kill()
    }).catch(() => {
      // Optional visual motion must not interfere with navigation or authentication.
    })

    return () => {
      cancelled = true
      dispose?.()
    }
  }, [])

  return null
}
