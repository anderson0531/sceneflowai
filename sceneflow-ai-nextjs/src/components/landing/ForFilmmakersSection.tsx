'use client'

import { useId, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Clapperboard, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export const FOR_FILMMAKERS_SECTION_ID = 'for-filmmakers'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_PATTERN = /^https?:\/\/\S+$/i

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function ForFilmmakersSection() {
  const t = useTranslations('forFilmmakers')
  const emailId = useId()
  const nameId = useId()
  const titleId = useId()
  const loglineId = useId()
  const audienceId = useId()
  const premiereId = useId()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [logline, setLogline] = useState('')
  const [audienceUrl, setAudienceUrl] = useState('')
  const [exclusivePremiere, setExclusivePremiere] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    const trimmedName = name.trim()
    const trimmedTitle = title.trim()
    const trimmedLogline = logline.trim()
    const trimmedAudience = audienceUrl.trim()

    if (!trimmedEmail || !trimmedName || !trimmedTitle || !trimmedLogline || !trimmedAudience) {
      setError(t('errorEmpty'))
      setStatus('error')
      return
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError(t('errorInvalidEmail'))
      setStatus('error')
      return
    }
    if (!URL_PATTERN.test(trimmedAudience)) {
      setError(t('errorInvalidUrl'))
      setStatus('error')
      return
    }

    setError('')
    setStatus('submitting')

    try {
      const response = await fetch('/api/originals-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          name: trimmedName,
          title: trimmedTitle,
          logline: trimmedLogline,
          audienceUrl: trimmedAudience,
          exclusivePremiere,
          source: 'for-filmmakers',
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || t('errorGeneric'))
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : t('errorGeneric'))
    }
  }

  return (
    <section
      id={FOR_FILMMAKERS_SECTION_ID}
      className="bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950 py-20 sm:py-24 scroll-mt-20"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="mb-4 inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2">
            <Clapperboard className="mr-2 h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">{t('badge')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('heading')}</h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-400">{t('subtitle')}</p>
          <p className="mt-3 text-sm text-gray-500">{t('closedNote')}</p>
        </motion.div>

        {status === 'success' ? (
          <div
            role="status"
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-8 text-center"
          >
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {t('successTitle')}
            </p>
            <p className="mt-2 text-sm text-emerald-100/80">{t('successBody')}</p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-left" htmlFor={emailId}>
                <span className="mb-1.5 block text-sm font-medium text-gray-200">{t('fields.email')}</span>
                <input
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t('fields.emailPlaceholder')}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/40 focus:outline-none"
                />
              </label>
              <label className="block text-left" htmlFor={nameId}>
                <span className="mb-1.5 block text-sm font-medium text-gray-200">{t('fields.name')}</span>
                <input
                  id={nameId}
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('fields.namePlaceholder')}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/40 focus:outline-none"
                />
              </label>
            </div>
            <label className="block text-left" htmlFor={titleId}>
              <span className="mb-1.5 block text-sm font-medium text-gray-200">{t('fields.title')}</span>
              <input
                id={titleId}
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('fields.titlePlaceholder')}
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/40 focus:outline-none"
              />
            </label>
            <label className="block text-left" htmlFor={loglineId}>
              <span className="mb-1.5 block text-sm font-medium text-gray-200">{t('fields.logline')}</span>
              <textarea
                id={loglineId}
                rows={3}
                value={logline}
                onChange={(event) => setLogline(event.target.value)}
                placeholder={t('fields.loglinePlaceholder')}
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/40 focus:outline-none"
              />
            </label>
            <label className="block text-left" htmlFor={audienceId}>
              <span className="mb-1.5 block text-sm font-medium text-gray-200">
                {t('fields.audienceUrl')}
              </span>
              <input
                id={audienceId}
                type="url"
                value={audienceUrl}
                onChange={(event) => setAudienceUrl(event.target.value)}
                placeholder={t('fields.audiencePlaceholder')}
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/40 focus:outline-none"
              />
            </label>
            <label className="flex items-start gap-3 text-left text-sm text-gray-300" htmlFor={premiereId}>
              <input
                id={premiereId}
                type="checkbox"
                checked={exclusivePremiere}
                onChange={(event) => setExclusivePremiere(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950"
              />
              <span>{t('fields.exclusivePremiere')}</span>
            </label>
            {status === 'error' && error ? (
              <p role="alert" className="text-sm text-amber-300">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={status === 'submitting'} className="w-full sm:w-auto">
              {status === 'submitting' ? (
                <>
                  <Loader2 className={cn('mr-2 h-4 w-4 animate-spin')} />
                  {t('submitting')}
                </>
              ) : (
                t('submit')
              )}
            </Button>
            <p className="text-xs text-gray-500">{t('privacy')}</p>
          </form>
        )}
      </div>
    </section>
  )
}

export default ForFilmmakersSection
