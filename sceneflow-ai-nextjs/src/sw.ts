/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
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
