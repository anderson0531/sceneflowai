'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

export function useStillCreativeAvailable() {
  const t = useTranslations('production.direction.stillPolicy')
  const [available, setAvailable] = useState<boolean | null>(null)
  const [hint, setHint] = useState(t('creativeDisabled'))

  useEffect(() => {
    let cancelled = false
    fetch('/api/kling/config-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        const nextAvailable = Boolean(data?.stillCreativeAvailable)
        setAvailable(nextAvailable)
        if (!nextAvailable) {
          setHint(
            typeof data?.hint === 'string' && data.hint.trim()
              ? data.hint
              : t('creativeDisabled')
          )
        }
      })
      .catch(() => {
        if (cancelled) return
        setAvailable(false)
        setHint(t('creativeDisabled'))
      })
    return () => {
      cancelled = true
    }
  }, [t])

  return {
    available,
    hint,
    disabled: available === false,
  }
}
