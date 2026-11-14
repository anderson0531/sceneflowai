/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker'
import type {
  PrecacheEntry,
  RuntimeCaching,
  RouteMatchCallbackOptions,
  SerwistGlobalConfig,
} from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const SOCIAL_OAUTH_PATHS = new Set([
  '/api/publish/youtube/auth',
  '/api/auth/callback/youtube',
  '/api/publish/youtube/callback',
  '/api/publish/facebook/auth',
  '/api/publish/facebook/callback',
  '/api/publish/tiktok/auth',
  '/api/publish/tiktok/callback',
])

function shouldBypassServiceWorker(options: RouteMatchCallbackOptions): boolean {
  const { request, url } = options
  if (SOCIAL_OAUTH_PATHS.has(url.pathname)) return true
  // Never intercept document navigations (prevents Serwist `no-response` crashes on
  // OAuth 302/307 redirects and dynamic `/dashboard/workflow/vision/[id]` SSR loads).
  if (request.mode === 'navigate') return true
  // Never intercept API routes or Next.js App Router RSC flight payloads.
  if (url.pathname.startsWith('/api/')) return true
  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') return true
  return false
}

function wrapMatcher(
  matcher: RuntimeCaching['matcher']
): (options: RouteMatchCallbackOptions) => boolean {
  return (options: RouteMatchCallbackOptions): boolean => {
    if (shouldBypassServiceWorker(options)) return false
    if (typeof matcher === 'function') {
      return Boolean(matcher(options))
    }
    if (matcher instanceof RegExp) {
      return matcher.test(options.url.href)
    }
    if (typeof matcher === 'string') {
      return options.url.href === matcher || options.url.pathname === matcher
    }
    return false
  }
}

const staticAssetRuntimeCaching: RuntimeCaching[] = defaultCache.map((entry) => ({
  ...entry,
  matcher: wrapMatcher(entry.matcher),
}))

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Activate immediately so old workers intercepting navigations/OAuth are replaced right away.
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: staticAssetRuntimeCaching,
})

serwist.addEventListeners()

// A crashed Series Room tab keeps the old JavaScript until the document reloads.
// When this worker takes control, reload that tab onto the current deployment.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      await Promise.all(
        windows.map(async (client) => {
          if (!('navigate' in client)) return
          let pathname = ''
          try {
            pathname = new URL(client.url).pathname
          } catch {
            return
          }
          if (pathname !== '/dashboard/series') return
          try {
            await client.navigate(client.url)
          } catch {
            // The tab can stay put if the browser rejects the navigation.
          }
        })
      )
    })()
  )
})

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
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
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
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if ('focus' in client) {
          try {
            if ('navigate' in client) {
              await client.navigate(url)
            }
            await client.focus()
            return
          } catch {
            // Fall through to openWindow if focus/navigate fails.
          }
        }
      }
      await self.clients.openWindow(url)
    })()
  )
})
