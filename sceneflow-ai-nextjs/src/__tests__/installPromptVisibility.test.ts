import { describe, it, expect } from 'vitest'
import { canShowInstallPrompt } from '@/lib/pwa/installPromptVisibility'

describe('canShowInstallPrompt', () => {
  it('hides on the landing page even when the user is already logged in', () => {
    expect(canShowInstallPrompt('authenticated', '/')).toBe(false)
    expect(canShowInstallPrompt('authenticated', '/es')).toBe(false)
    expect(canShowInstallPrompt('authenticated', '/pricing')).toBe(false)
    expect(canShowInstallPrompt('authenticated', '/login')).toBe(false)
  })

  it('hides for anonymous visitors on every route', () => {
    expect(canShowInstallPrompt('unauthenticated', '/')).toBe(false)
    expect(canShowInstallPrompt('unauthenticated', '/dashboard')).toBe(false)
    expect(canShowInstallPrompt('loading', '/dashboard')).toBe(false)
  })

  it('shows only after login on app routes', () => {
    expect(canShowInstallPrompt('authenticated', '/dashboard')).toBe(true)
    expect(canShowInstallPrompt('authenticated', '/dashboard/series/abc')).toBe(true)
  })
})
