'use client'

import { useCallback, useEffect, useState } from 'react'
import { Globe, Languages, Loader, PenLine, Volume2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LocalePicker } from '@/components/i18n/LocalePicker'
import { DEFAULT_LOCALE, getLocaleNativeName, isLocale } from '@/i18n/locale'
import { applyDocumentLocale, writeUiLocaleCookie } from '@/i18n/useUiLocale'

type LocalePreferences = {
  uiLocale: string
  storyLocale: string
}

/**
 * The three language controls, kept deliberately separate.
 *
 * Collapsing them into one switch is wrong for a production tool: a creator may
 * read the interface in Spanish, write a story in English because that is the
 * market they are selling into, and deliver dubs in eight more languages. Each
 * row states what it actually affects.
 */
export function LanguageSettingsCard() {
  const t = useTranslations('settings.languages')
  const [prefs, setPrefs] = useState<LocalePreferences>({
    uiLocale: DEFAULT_LOCALE,
    storyLocale: DEFAULT_LOCALE,
  })
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<keyof LocalePreferences | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch('/api/user/locale')
        if (!response.ok) return
        const data = await response.json()
        if (cancelled) return
        setPrefs({
          uiLocale: isLocale(data.uiLocale) ? data.uiLocale : DEFAULT_LOCALE,
          storyLocale: isLocale(data.storyLocale) ? data.storyLocale : DEFAULT_LOCALE,
        })
      } catch {
        // Keep the defaults; the picker still works and will persist on change.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(
    async (patch: Partial<LocalePreferences>, key: keyof LocalePreferences) => {
      setSavingKey(key)
      const previous = prefs
      setPrefs((current) => ({ ...current, ...patch }))

      try {
        const response = await fetch('/api/user/locale', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (!response.ok) throw new Error('Save failed')

        if (patch.uiLocale) {
          writeUiLocaleCookie(patch.uiLocale)
          applyDocumentLocale(patch.uiLocale)
          toast.success(t('interfaceSet', { language: getLocaleNativeName(patch.uiLocale) }))
          // Message catalogs are resolved on the server, so the new language
          // only appears after a re-render from the server.
          setTimeout(() => window.location.reload(), 600)
        } else {
          toast.success(t('saved'))
        }
      } catch {
        setPrefs(previous)
        toast.error(t('saveFailed'))
      } finally {
        setSavingKey(null)
      }
    },
    [prefs, t]
  )

  if (loading) {
    return (
      <Card className="bg-gray-800/60 border-gray-700/60 text-white">
        <CardContent className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-sf-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800/60 border-gray-700/60 text-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sf-primary/20 rounded-lg flex items-center justify-center">
            <Languages className="w-5 h-5 text-sf-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
            <CardDescription className="text-gray-400">{t('description')}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <SettingRow
          icon={<Globe className="w-4 h-4 text-cyan-400" />}
          title={t('interfaceTitle')}
          description={t('interfaceDescription')}
          busy={savingKey === 'uiLocale'}
          control={
            <LocalePicker
              value={prefs.uiLocale}
              onValueChange={(locale) => save({ uiLocale: locale }, 'uiLocale')}
              size="md"
              disabled={savingKey !== null}
              ariaLabel={t('interfaceTitle')}
            />
          }
        />

        <SettingRow
          icon={<PenLine className="w-4 h-4 text-violet-400" />}
          title={t('storyTitle')}
          description={t('storyDescription')}
          busy={savingKey === 'storyLocale'}
          control={
            <LocalePicker
              value={prefs.storyLocale}
              onValueChange={(locale) => save({ storyLocale: locale }, 'storyLocale')}
              size="md"
              disabled={savingKey !== null}
              ariaLabel={t('storyTitle')}
            />
          }
        />

        <SettingRow
          icon={<Volume2 className="w-4 h-4 text-emerald-400" />}
          title={t('deliveryTitle')}
          description={t('deliveryDescription')}
          busy={false}
          control={
            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              <span className="text-xs text-gray-300">
                {t('deliveryStartsFrom', { language: getLocaleNativeName(prefs.storyLocale) })}
              </span>
              <a
                href="/dashboard/projects"
                className="text-xs font-medium text-emerald-400 underline-offset-2 hover:underline"
              >
                {t('deliverySetInProduction')}
              </a>
            </div>
          }
        />

        <p className="text-xs text-gray-500 border-t border-gray-700/60 pt-4">
          {t('promptsStayEnglish')}
        </p>
      </CardContent>
    </Card>
  )
}

function SettingRow({
  icon,
  title,
  description,
  control,
  busy,
}: {
  icon: React.ReactNode
  title: string
  description: string
  control: React.ReactNode
  busy: boolean
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 sm:pe-6">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-100">{title}</span>
          {busy && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
        </div>
        <p className="mt-1 text-xs text-gray-400 max-w-prose">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}
