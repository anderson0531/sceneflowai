'use client'

import { useSyncExternalStore } from 'react'
import { Loader2 } from 'lucide-react'

import { getLocaleNativeName } from '@/i18n/locale'
import {
  getLocaleSwitchServerState,
  getLocaleSwitchState,
  subscribeLocaleSwitch,
} from '@/i18n/localeSwitchStatus'

/**
 * Covers the gap between choosing an interface language and the reloaded page
 * appearing in it.
 *
 * The label is the target language's own endonym rather than translated copy:
 * the catalog in memory is still the language being left, so anything drawn
 * from it would name the wrong one. An endonym plus a spinner reads correctly
 * whichever direction the switch goes.
 */
export function LocaleSwitchOverlay() {
  const state = useSyncExternalStore(
    subscribeLocaleSwitch,
    getLocaleSwitchState,
    getLocaleSwitchServerState
  )

  if (!state.pending) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/90 px-8 py-6 shadow-2xl">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        <p className="text-base font-semibold text-white" lang={state.locale}>
          {getLocaleNativeName(state.locale)}
        </p>
      </div>
    </div>
  )
}
