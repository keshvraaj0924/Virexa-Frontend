import { expect, test } from 'vitest'
import { shouldEnableDecorativeMotion } from './motion-policy'

test('decorative animation respects reduced motion and data saver', () => {
  expect(shouldEnableDecorativeMotion(false, false)).toBe(true)
  expect(shouldEnableDecorativeMotion(true, false)).toBe(false)
  expect(shouldEnableDecorativeMotion(false, true)).toBe(false)
  expect(shouldEnableDecorativeMotion(true, true)).toBe(false)
})
