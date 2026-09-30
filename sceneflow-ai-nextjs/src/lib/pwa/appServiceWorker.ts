/** App service worker. Phone alerts must use this registration, not a second script. */
export const APP_SERVICE_WORKER_URL = '/sw.js'

export function isCompanionServiceWorker(scriptURL: string | null | undefined): boolean {
  if (!scriptURL) return false
  try {
    return new URL(scriptURL).pathname.endsWith('/companion-sw.js')
  } catch {
    return scriptURL.includes('companion-sw.js')
  }
}

/**
 * The installed app worker. If phone alerts previously registered companion-sw.js
 * at the same scope, register the app worker so it can take that scope back.
 */
export async function appServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('serviceWorker unavailable')
  }
  const controller = navigator.serviceWorker.controller
  const missing = !controller
  const foreign = isCompanionServiceWorker(controller?.scriptURL)
  if (missing || foreign) {
    await navigator.serviceWorker.register(APP_SERVICE_WORKER_URL, {
      scope: '/',
      type: 'module',
    })
  }
  return navigator.serviceWorker.ready
}