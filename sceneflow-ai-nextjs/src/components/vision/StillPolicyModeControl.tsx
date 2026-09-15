'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { StillPolicyMode } from '@/lib/generation/stillPolicy'

export interface StillPolicyModeControlProps {
  value: StillPolicyMode
  onChange: (mode: StillPolicyMode) => void
  disabled?: boolean
  className?: string
}

export function StillPolicyModeControl({
  value,
  onChange,
  disabled = false,
  className,
}: StillPolicyModeControlProps) {
  const t = useTranslations('production.direction.stillPolicy')
  const [creativeAvailable, setCreativeAvailable] = useState<boolean | null>(null)
  const [creativeHint, setCreativeHint] = useState(t('creativeDisabled'))

  useEffect(() => {
    let cancelled = false
    fetch('/api/kling/config-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        const available = Boolean(data?.stillCreativeAvailable)
        setCreativeAvailable(available)
        if (!available) {
          setCreativeHint(
            typeof data?.hint === 'string' && data.hint.trim()
              ? data.hint
              : t('creativeDisabled')
          )
        }
      })
      .catch(() => {
        if (cancelled) return
        setCreativeAvailable(false)
        setCreativeHint(t('creativeDisabled'))
      })
    return () => {
      cancelled = true
    }
  }, [t])

  const creativeDisabled = disabled || creativeAvailable === false

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex rounded-lg border border-slate-700 p-1 w-fit">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('safety')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            value === 'safety' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
          )}
        >
          {t('safety')}
        </button>
        <button
          type="button"
          disabled={creativeDisabled}
          title={creativeDisabled ? creativeHint : t('creativeHint')}
          onClick={() => onChange('creative')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            value === 'creative' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white',
            creativeDisabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {t('creative')}
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        {value === 'creative' ? t('creativeHint') : t('safetyHint')}
      </p>
      {creativeAvailable === false && (
        <p className="text-[11px] text-amber-300/90">{creativeHint}</p>
      )}
    </div>
  )
}
