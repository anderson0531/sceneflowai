'use client'

import type { ReactNode } from 'react'

export type FocusKeyFeaturePayload = {
  trackId: string
  icon: string
}

declare global {
  interface Window {
    __sceneflowPendingKeyFeature?: FocusKeyFeaturePayload | null
  }
}

export function requestFocusKeyFeature(payload: FocusKeyFeaturePayload) {
  if (typeof window === 'undefined') return
  window.__sceneflowPendingKeyFeature = payload
  window.dispatchEvent(
    new CustomEvent<FocusKeyFeaturePayload>('sceneflow:focus-key-feature', { detail: payload })
  )
}

/**
 * Direct pass-through container for `#key-features`.
 * Renders the narrated Studio Capabilities section directly without a collapsible gatekeeper card.
 */
export function FullStudioDirectoryDrawer({ children }: { children: ReactNode }) {
  return <div className="border-t border-slate-800/80 bg-slate-950">{children}</div>
}

export default FullStudioDirectoryDrawer
