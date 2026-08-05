'use client'

/**
 * Tracks an in-flight interface-language switch.
 *
 * Switching writes the profile and then reloads, because the message catalogs
 * are resolved on the server. On a heavy screen that reload is seconds of
 * apparently nothing happening, so the overlay needs to be visible from the
 * moment of selection until the new document replaces this one.
 *
 * A module-level store rather than context: the two entry points
 * (`HeaderLocaleSwitcher` and the Settings card) sit in different subtrees, and
 * the state only ever ends by the page being replaced.
 */
export type LocaleSwitchState = { pending: false } | { pending: true; locale: string }

let state: LocaleSwitchState = { pending: false }
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function beginLocaleSwitch(locale: string): void {
  state = { pending: true, locale }
  emit()
}

/** Only needed when a switch fails; a successful one ends with the reload. */
export function endLocaleSwitch(): void {
  state = { pending: false }
  emit()
}

export function subscribeLocaleSwitch(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getLocaleSwitchState(): LocaleSwitchState {
  return state
}

/** Server snapshot for useSyncExternalStore; never pending during SSR. */
const SERVER_STATE: LocaleSwitchState = { pending: false }
export function getLocaleSwitchServerState(): LocaleSwitchState {
  return SERVER_STATE
}
