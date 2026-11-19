'use client'

const STORAGE_KEY = 'sf_active_workspace_owner'
const CHANGE_EVENT = 'sf-workspace-changed'

/**
 * Returns the active workspace scope selected in the Workspace Switcher:
 * - `'all'` (default): personal + all accessible team workspaces
 * - `'personal'`: personal studio only
 * - `<ownerUserId>`: specific agency workspace only
 */
export function getActiveWorkspaceOwnerId(): string {
  if (typeof window === 'undefined') return 'all'
  try {
    return window.localStorage.getItem(STORAGE_KEY) || 'all'
  } catch {
    return 'all'
  }
}

export function setActiveWorkspaceOwnerId(ownerId: string): void {
  if (typeof window === 'undefined') return
  const clean = (ownerId || 'all').trim() || 'all'
  try {
    window.localStorage.setItem(STORAGE_KEY, clean)
  } catch {
    // ignore storage quota errors
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { workspaceOwnerId: clean } }))
}

export function subscribeActiveWorkspace(callback: (workspaceOwnerId: string) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onEvent = (evt: Event) => {
    const custom = evt as CustomEvent<{ workspaceOwnerId?: string }>
    callback(custom.detail?.workspaceOwnerId || getActiveWorkspaceOwnerId())
  }
  const onStorage = (evt: StorageEvent) => {
    if (evt.key === STORAGE_KEY) {
      callback(evt.newValue || 'all')
    }
  }
  window.addEventListener(CHANGE_EVENT, onEvent)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onEvent)
    window.removeEventListener('storage', onStorage)
  }
}
