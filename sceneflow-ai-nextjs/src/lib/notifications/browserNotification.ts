/**
 * Best-effort OS-level notification for work that finishes while the tab is in
 * the background. Progressive enhancement only — the database notification and
 * the in-app toast are the guaranteed paths, so every call here can fail
 * silently.
 */

export function canRequestBrowserNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** Asks for permission, but only when the user has not already decided. */
export async function ensureBrowserNotificationPermission(): Promise<boolean> {
  if (!canRequestBrowserNotifications()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

/**
 * Shows a notification only when the tab is hidden — if the user is looking at
 * the page, the in-app toast already told them.
 */
export function notifyIfHidden(input: { title: string; body: string; tag?: string }): void {
  if (!canRequestBrowserNotifications()) return
  if (Notification.permission !== 'granted') return
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return

  try {
    new Notification(input.title, { body: input.body, tag: input.tag })
  } catch {
    // Some browsers require a service worker registration; ignore.
  }
}
