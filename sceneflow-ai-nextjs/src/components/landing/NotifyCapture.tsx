'use client'

import { useId, useState, type FormEvent } from 'react'
import { CheckCircle2, Loader2, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function NotifyCapture({
  source,
  className,
  align = 'center',
}: {
  source: string
  className?: string
  align?: 'center' | 'start'
}) {
  const t = useTranslations('notify')
  const inputId = useId()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = email.trim()

    if (!trimmed) {
      setError(t('errorEmpty'))
      setStatus('error')
      return
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError(t('errorInvalid'))
      setStatus('error')
      return
    }

    setError('')
    setStatus('submitting')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || t('errorGeneric'))
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : t('errorGeneric'))
    }
  }

  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left'

  if (status === 'success') {
    return (
      <div
        role="status"
        className={cn(
          'flex flex-col gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4',
          alignment,
          className
        )}
      >
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {t('successTitle')}
        </p>
        <p className="text-sm text-emerald-100/80">{t('successBody')}</p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', alignment, className)}>
      <label htmlFor={inputId} className="text-sm font-semibold text-white">
        {t('heading')}
      </label>
      <p className="max-w-md text-sm text-gray-400">{t('description')}</p>
      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-1 flex w-full max-w-md flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            aria-hidden
          />
          <input
            id={inputId}
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (status === 'error') {
                setStatus('idle')
                setError('')
              }
            }}
            placeholder={t('placeholder')}
            autoComplete="email"
            aria-invalid={status === 'error'}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="h-11 w-full rounded-md border border-white/15 bg-slate-900/70 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={status === 'submitting'}
          className="h-11 shrink-0 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:opacity-90"
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              {t('submitting')}
            </>
          ) : (
            t('submit')
          )}
        </Button>
      </form>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : (
        <p className="text-xs text-gray-500">{t('privacy')}</p>
      )}
    </div>
  )
}

export default NotifyCapture
