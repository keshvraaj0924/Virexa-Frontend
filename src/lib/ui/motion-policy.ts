/** Decorative animation never overrides accessibility or data-saving preferences. */
export function shouldEnableDecorativeMotion(reducedMotion: boolean, saveData: boolean): boolean {
  return !reducedMotion && !saveData
}

export function browserAllowsDecorativeMotion(): boolean {
  if (typeof window === 'undefined') return false
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const connection = navigator as Navigator & { connection?: { saveData?: boolean } }
  return shouldEnableDecorativeMotion(reducedMotion, connection.connection?.saveData === true)
}
