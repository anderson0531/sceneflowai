import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import {
  canShowInstallPrompt,
  shouldShowInstallOffer,
} from '@/lib/pwa/installPromptVisibility'
import { shouldShowAppUpdatePrompt } from '@/lib/pwa/appUpdatePrompt'
import { isCompanionServiceWorker } from '@/lib/pwa/appServiceWorker'

const ROOT = join(process.cwd())

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

describe('shouldShowInstallOffer', () => {
  const base = {
    authStatus: 'authenticated',
    pathname: '/dashboard',
    standalone: false,
    neverAsk: false,
    isIOS: false,
    hasDeferredPrompt: true,
  }

  it('hides when the app is already installed', () => {
    expect(shouldShowInstallOffer({ ...base, surface: 'banner', standalone: true })).toBe(false)
    expect(
      shouldShowInstallOffer({ ...base, surface: 'phone-companion', standalone: true })
    ).toBe(false)
    expect(
      shouldShowInstallOffer({ ...base, surface: 'phone-sign-in', standalone: true })
    ).toBe(false)
  })

  it('offers install on the phone companion and phone sign-in when the app is not installed', () => {
    expect(
      shouldShowInstallOffer({
        ...base,
        surface: 'phone-companion',
        hasDeferredPrompt: false,
        isIOS: false,
      })
    ).toBe(true)
    expect(
      shouldShowInstallOffer({
        ...base,
        surface: 'phone-companion',
        hasDeferredPrompt: true,
      })
    ).toBe(false)
    expect(
      shouldShowInstallOffer({
        surface: 'phone-sign-in',
        authStatus: 'unauthenticated',
        pathname: '/dashboard',
        standalone: false,
        neverAsk: false,
        isIOS: true,
        hasDeferredPrompt: false,
      })
    ).toBe(true)
  })

  it('keeps the floating banner off the landing page and off browsers that cannot install yet', () => {
    expect(
      shouldShowInstallOffer({ ...base, surface: 'banner', pathname: '/', hasDeferredPrompt: true })
    ).toBe(false)
    expect(
      shouldShowInstallOffer({
        ...base,
        surface: 'banner',
        hasDeferredPrompt: false,
        isIOS: false,
      })
    ).toBe(false)
    expect(
      shouldShowInstallOffer({
        ...base,
        surface: 'banner',
        hasDeferredPrompt: false,
        isIOS: true,
      })
    ).toBe(true)
  })
})

describe('app update prompt', () => {
  it('shows only in the installed app while a newer worker is waiting', () => {
    expect(
      shouldShowAppUpdatePrompt({
        hasWaitingWorker: false,
        standalone: true,
        dismissed: false,
      })
    ).toBe(false)
    expect(
      shouldShowAppUpdatePrompt({
        hasWaitingWorker: true,
        standalone: false,
        dismissed: false,
      })
    ).toBe(false)
    expect(
      shouldShowAppUpdatePrompt({
        hasWaitingWorker: true,
        standalone: true,
        dismissed: true,
      })
    ).toBe(false)
    expect(
      shouldShowAppUpdatePrompt({
        hasWaitingWorker: true,
        standalone: true,
        dismissed: false,
      })
    ).toBe(true)
  })

  it('recognizes the old phone worker that must not stay in control', () => {
    expect(
      isCompanionServiceWorker(
        'https://sceneflowai.studio/companion-sw.js'
      )
    ).toBe(true)
    expect(isCompanionServiceWorker('https://sceneflowai.studio/sw.js')).toBe(false)
  })

  it('stacks the install banner above the phone gate and does not register a second worker', () => {
    const install = readFileSync(join(ROOT, 'src/components/pwa/AppInstallCard.tsx'), 'utf8')
    const gate = readFileSync(join(ROOT, 'src/components/layout/MobileAppGate.tsx'), 'utf8')
    const companion = readFileSync(join(ROOT, 'src/components/mobile/MobileCompanion.tsx'), 'utf8')
    const worker = readFileSync(join(ROOT, 'src/sw.ts'), 'utf8')
    const update = readFileSync(join(ROOT, 'src/components/pwa/AppUpdatePrompt.tsx'), 'utf8')
    const nextConfig = readFileSync(join(ROOT, 'next.config.mjs'), 'utf8')
    const swRoute = readFileSync(join(ROOT, 'src/app/serwist/[path]/route.ts'), 'utf8')
    const registration = readFileSync(join(ROOT, 'src/lib/pwa/appServiceWorker.ts'), 'utf8')

    expect(install).toContain('z-[120]')
    expect(gate).toContain('z-[80]')
    expect(gate).toContain('surface="phone-sign-in"')
    expect(companion).toContain('surface="phone-companion"')
    expect(companion).toContain('appServiceWorkerRegistration')
    expect(companion).not.toContain('companion-sw.js')
    expect(worker).toContain('skipWaiting: false')
    expect(update).toContain('messageSkipWaiting')
    expect(update).toContain("addEventListener('waiting'")
    expect(update).toContain('display-mode: standalone')
    expect(update).toContain('Not now')
    expect(update).toContain('APP_UPDATE_DISMISS_KEY')
    expect(nextConfig).toContain('destination: "/serwist/sw.js"')
    expect(swRoute).toContain("swSrc: 'src/sw.ts'")
    expect(registration).toContain("type: 'module'")
    expect(existsSync(join(ROOT, 'public/sw.js'))).toBe(false)

    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    const esbuildPkg = JSON.parse(
      readFileSync(join(ROOT, 'node_modules/esbuild/package.json'), 'utf8')
    ) as { version: string }
    const minor = Number(esbuildPkg.version.split('.')[1])
    expect(pkg.dependencies?.esbuild).toBeTruthy()
    expect(minor).toBeGreaterThanOrEqual(25)
  })
})
