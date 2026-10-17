// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ProductGuide } from './product-guide'
vi.mock('next/navigation', () => ({ usePathname: () => '/register' }))
afterEach(cleanup)
it('opens contextual built-in tips and dismisses with focus restoration', () => {
  render(<ProductGuide />)
  expect(screen.queryByRole('region')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Open product guide' }))
  expect(screen.getByRole('heading').textContent).toBe('A clear start for your team.')
  expect(screen.getByText(/No document access/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Next tip' }))
  expect(screen.getByText(/at least 12 characters/)).toBeTruthy()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('region')).toBeNull()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open product guide' }))
})
it('completes the short guide without navigating or making requests', () => {
  render(<ProductGuide />)
  fireEvent.click(screen.getByRole('button', { name: 'Open product guide' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next tip' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next tip' }))
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
  expect(screen.queryByRole('region')).toBeNull()
})
