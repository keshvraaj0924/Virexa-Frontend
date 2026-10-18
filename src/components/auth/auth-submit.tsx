'use client'

import type { ReactNode } from 'react'
import { LazyMotion, m, useReducedMotion } from 'framer-motion'

const loadFeatures = () => import('framer-motion').then((module) => module.domAnimation)

/** Small interaction feedback; authentication never depends on animation completion. */
export function AuthSubmit({ disabled, children }: { disabled: boolean; children: ReactNode }) {
  const reduced = useReducedMotion()
  return <LazyMotion features={loadFeatures}><m.button type="submit" className="vx-auth-button" disabled={disabled} whileTap={reduced || disabled ? undefined : { scale: 0.985 }} transition={{ duration: 0.12 }}>{children}</m.button></LazyMotion>
}
