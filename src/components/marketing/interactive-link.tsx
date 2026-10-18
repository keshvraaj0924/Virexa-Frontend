'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

export function InteractiveLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const reduce = useReducedMotion()
  return <motion.a href={href} className={className} whileHover={reduce ? undefined : { y: -3, scale: 1.025 }} whileTap={reduce ? undefined : { scale: .975 }} transition={{ type: 'spring', stiffness: 350, damping: 24 }}>{children}</motion.a>
}
