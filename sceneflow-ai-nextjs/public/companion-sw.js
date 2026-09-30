/* Phone alerts. Keep in step with the push listeners in src/sw.ts. */
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { message: event.data ? event.data.text() : '' }
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
    event.notification.data && typeof event.notification.data.url === 'string'
      ? event.notification.data.url
      : '/dashboard?companion=inbox'
  event.waitUntil(self.clients.openWindow(url))
})
