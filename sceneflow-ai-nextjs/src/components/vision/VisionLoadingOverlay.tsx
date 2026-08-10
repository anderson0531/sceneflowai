'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

type VisionLoadingOverlayProps = {
  visible?: boolean
  title?: string
  messages?: string[]
}

export function VisionLoadingOverlay({
  visible = true,
  title,
  messages,
}: VisionLoadingOverlayProps) {
  const t = useTranslations('production.studio')
  const defaultMessages = useMemo(
    () => [
      t('loadingMessages.message1'),
      t('loadingMessages.message2'),
      t('loadingMessages.message3'),
      t('loadingMessages.message4'),
      t('loadingMessages.message5'),
    ],
    [t]
  )
  const resolvedTitle = title ?? t('openingShort')
  const resolvedMessages = messages ?? defaultMessages

  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(8)

  useEffect(() => {
    if (!visible) return

    const messageTimer = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % resolvedMessages.length)
    }, 2500)

    const progressTimer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev
        const step = prev < 40 ? 6 : prev < 75 ? 3 : 1
        return Math.min(92, prev + step)
      })
    }, 400)

    return () => {
      window.clearInterval(messageTimer)
      window.clearInterval(progressTimer)
    }
  }, [visible, resolvedMessages.length])

  if (!visible) return null

  const subtext = resolvedMessages[messageIndex] ?? resolvedMessages[0]

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
      <div className="w-[min(92vw,520px)] rounded-lg border border-gray-800 bg-gray-950/90 shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <svg className="w-5 h-5 text-sf-primary animate-spin shrink-0" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
            <path
              d="M22 12a10 10 0 0 1-10 10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <div className="text-base font-semibold text-gray-100">{resolvedTitle}</div>
        </div>
        <div className="text-sm text-gray-400 mb-4 min-h-[1.25rem]" aria-live="polite">
          {subtext}
        </div>
        <div className="h-2 w-full rounded bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded bg-gradient-to-r from-[#22c55e] via-[#06b6d4] to-[#60a5fa] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-right text-xs text-gray-500">{t('settingUpWorkspace')}</div>
      </div>
    </div>
  )
}

export default VisionLoadingOverlay
