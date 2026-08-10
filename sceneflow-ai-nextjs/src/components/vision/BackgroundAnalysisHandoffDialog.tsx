'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, Clock, Loader2, PencilLine, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const SUPPRESS_KEY = 'sceneflow.analysisHandoffAcknowledged'

export function hasAcknowledgedAnalysisHandoff(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SUPPRESS_KEY) === '1'
}

function acknowledgeAnalysisHandoff(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SUPPRESS_KEY, '1')
}

/**
 * Sets expectations before a long analysis moves to the background.
 *
 * Analysis used to run behind a full-screen overlay, which told the user work
 * was happening and stopped them editing at the same time. With the work in a
 * background job neither is implicit any more, so this states plainly that they
 * can keep working and will be notified.
 */
export function BackgroundAnalysisHandoffDialog({
  open,
  sceneCount,
  estimatedSeconds,
  starting,
  onConfirm,
  onCancel,
}: {
  open: boolean
  sceneCount: number
  estimatedSeconds?: number
  starting?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useTranslations('production.foundation.analysisHandoff')
  const tc = useTranslations('common.actions')
  const [dontRemind, setDontRemind] = useState(false)

  if (!open) return null

  const formatDuration = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return t('durationFewMinutes')
    if (seconds < 90) return t('durationAboutMinute')
    return t('durationAboutMinutes', { count: Math.round(seconds / 60) })
  }

  const confirm = () => {
    if (dontRemind) acknowledgeAnalysisHandoff()
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
              <Sparkles className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('title', { count: sceneCount })}</h2>
              <p className="text-sm text-slate-400">{t('subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-sm text-slate-300">
              {t('takesTime', { duration: formatDuration(estimatedSeconds) })}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <PencilLine className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-sm text-slate-300">
              {t('keepEditing')}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
            <p className="text-sm text-slate-300">
              <span className="font-medium text-white">{t('notifyReady')}</span>{' '}
              {t('notifyDetail')}
            </p>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 pt-1 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={dontRemind}
              onChange={(e) => setDontRemind(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800"
            />
            {t('dontRemind')}
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 p-4">
          <Button variant="ghost" onClick={onCancel} disabled={starting}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={confirm}
            disabled={starting}
            className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white"
          >
            {starting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('starting')}
              </>
            ) : (
              t('startAnalysis')
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
