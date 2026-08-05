'use client'

import { useTranslations } from 'next-intl'

import React, { useMemo } from 'react'
import { X, GitCompare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useContentTranslation } from '@/i18n/content/useContentTranslation'
import { buildRefineDiffDisplayFields } from '@/i18n/content/buildBlueprintDisplayFields'
import { EMPTY_ENTITY_I18N, type EntityI18n } from '@/i18n/content/entityI18n'

export interface RefineDiffSummary {
  label: string
  before?: string
  after?: string
}

interface BlueprintRefineDiffBannerProps {
  diffs: RefineDiffSummary[]
  onDismiss: () => void
  className?: string
  contentI18n?: EntityI18n
}

export function BlueprintRefineDiffBanner({
  diffs,
  onDismiss,
  className,
  contentI18n,
}: BlueprintRefineDiffBannerProps) {
  const t = useTranslations('blueprint.refine')
  const fields = useMemo(() => buildRefineDiffDisplayFields(diffs), [diffs])
  const { resolve } = useContentTranslation({
    fields,
    i18n: contentI18n ?? EMPTY_ENTITY_I18N,
    enabled: diffs.length > 0,
  })

  if (diffs.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-cyan-200 font-medium text-xs uppercase tracking-wide">
          <GitCompare className="w-4 h-4" />
          {t('blueprintUpdated')}
        </div>
        <button type="button" onClick={onDismiss} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="space-y-1.5 text-xs text-gray-300">
        {diffs.slice(0, 6).map((d, index) => {
          const after =
            resolve(`refineDiff[${index}].after`).text || d.after || ''
          return (
            <li key={d.label}>
              <span className="text-cyan-300">{d.label}</span>
              {after
                ? `: ${String(after).slice(0, 80)}${String(after).length > 80 ? '…' : ''}`
                : ' changed'}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
