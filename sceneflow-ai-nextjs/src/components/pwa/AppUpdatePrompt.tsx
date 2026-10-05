'use client'

import { useEffect, useRef, useState } from 'react'
import { Serwist } from '@serwist/window'
import type { SerwistLifecycleWaitingEvent } from '@serwist/window'
import {
  APP_UPDATE_DISMISS_KEY,
  isAppUpdateDismissed,
  shouldShowAppUpdatePrompt,
} from '@/lib/pwa/appUpdatePrompt'
import { APP_SERVICE_WORKER_URL, isCompanionServiceWorker } from '@/lib/pwa/appServiceWorker'

function readStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

export default function AppUpdatePrompt() {
  const [waiting, setWaiting] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [workerUrl, setWorkerUrl] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const serwistRef = useRef<Serwist | null>(null)
  const reloadOnControl = useRef(false)

  useEffect(() => {
    setStandalone(readStandalone())
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let cancelled = false
    const serwist = new Serwist(APP_SERVICE_WORKER_URL, { scope: '/', type: 'module' })
    serwistRef.current = serwist

    const onWaiting = (_event: SerwistLifecycleWaitingEvent) => {
      if (cancelled) return
      void navigator.serviceWorker.getRegistration().then((registration) => {
        if (cancelled) return
        const url = registration?.waiting?.scriptURL ?? 'waiting'
        const stored = window.localStorage.getItem(APP_UPDATE_DISMISS_KEY)
        setWorkerUrl(url)
        setDismissed(isAppUpdateDismissed(url, stored))
        setWaiting(true)
      })
    }
    const onControlling = () => {
      if (!reloadOnControl.current) return
      window.location.reload()
    }

    serwist.addEventListener('waiting', onWaiting)
    serwist.addEventListener('controlling', onControlling)

    const start = async () => {
      const controller = navigator.serviceWorker.controller
      if (isCompanionServiceWorker(controller?.scriptURL)) {
        await navigator.serviceWorker.register(APP_SERVICE_WORKER_URL, {
          scope: '/',
          type: 'module',
        })
      }
      if (!cancelled) await serwist.register()
    }
    void start()

    return () => {
      cancelled = true
      serwist.removeEventListener('waiting', onWaiting)
      serwist.removeEventListener('controlling', onControlling)
    }
  }, [])

  if (!shouldShowAppUpdatePrompt({ hasWaitingWorker: waiting, standalone, dismissed })) return null

  return (
    <div className="fixed top-4 left-1/2 z-[130] w-[92%] max-w-xl -translate-x-1/2">
      <div className="rounded-xl border border-sf-border bg-sf-surface p-3 text-sf-text-primary shadow-lg sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-semibold">A new version of SceneFlow is ready</div>
            <div className="text-sf-text-secondary">Update to get the latest app, including the new icon.</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (workerUrl) {
                  window.localStorage.setItem(APP_UPDATE_DISMISS_KEY, workerUrl)
                }
                setDismissed(true)
              }}
              className="rounded-md px-3 py-1.5 text-sm text-sf-text-secondary transition-colors hover:text-sf-text-primary"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => {
                reloadOnControl.current = true
                serwistRef.current?.messageSkipWaiting()
              }}
              className="rounded-md bg-sf-gradient px-3 py-1.5 text-sm text-sf-background transition-opacity hover:opacity-90"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}