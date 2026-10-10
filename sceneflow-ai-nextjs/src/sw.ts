/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker'
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist'
import { NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/** Document navigations. NetworkFirst on /api/* turns OAuth redirects into no-response. */
const youtubeOAuthNavigation: RuntimeCaching = {
  matcher: ({ sameOrigin, url: { pathname } }) =>
    sameOrigin &&
    (pathname === '/api/publish/youtube/auth' ||
      pathname === '/api/auth/callback/youtube' ||
      pathname === '/api/publish/youtube/callback'),
  handler: new NetworkOnly(),
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Activate immediately so the YouTube OAuth NetworkOnly rule is not stuck behind an old worker.
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [youtubeOAuthNavigation, ...defaultCache],
})

serwist.addEventListeners()

self.addEventListener('push', (event) => {
  let payload: { title?: string; message?: string; url?: string } = {}
  try {
    payload = event.data?.json() ?? {}
  } catch {
    payload = { message: event.data?.text() }
  }
  const title = payload.title || 'SceneFlow'
  const url = payload.url || '/dashboard?companion=inbox'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.message || '',
      data: { url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url =
    typeof event.notification.data?.url === 'string'
      ? event.notification.data.url
      : '/dashboard?companion=inbox'
  event.waitUntil(self.clients.openWindow(url))
})
