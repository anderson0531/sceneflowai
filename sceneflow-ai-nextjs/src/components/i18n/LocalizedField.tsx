'use client'

import * as React from 'react'
import { Eye, EyeOff, Languages, Loader2, Lock, PenLine } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { getLocaleNativeName } from '@/i18n/locale'
import type { FieldTranslation } from '@/i18n/content/useContentTranslation'

export interface LocalizedFieldRenderProps {
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  readOnly?: boolean
  lang?: string
  dir?: 'ltr' | 'rtl'
  /** Set for machine-kind fields so browser and widget translation leave them alone. */
  translate?: 'no' | 'yes'
}

export interface LocalizedFieldProps {
  label: string
  /** Registry path, e.g. `treatmentVariants[0].logline`. */
  path: string
  /** Text as stored, in the entity's source language. */
  sourceValue: string
  translation: FieldTranslation
  sourceLocale: string
  uiLocale: string
  /** Persist an edit to the source text. */
  onChangeSource: (value: string) => void
  /**
   * Persist a human wording for the reading locale. When omitted, editing a
   * translated value falls back to editing the source.
   */
  onChangeOverride?: (value: string) => void
  children: (props: LocalizedFieldRenderProps) => React.ReactNode
  className?: string
}

/**
 * A content field that knows which language it is showing.
 *
 * Content is entered through dialogs, so the dialogs are where translation has
 * to be handled. Three rules keep it comprehensible:
 *
 *  1. The field always says which language you are looking at and whether a
 *     machine produced it. Silently showing a machine translation is how someone
 *     ships a logline they never approved.
 *  2. Editing a translated value writes an *override* for that locale rather
 *     than overwriting the source, so switching back to the original language
 *     does not reveal someone else's words replaced by yours.
 *  3. Machine-kind fields render locked with the reason stated, rather than
 *     appearing broken or, worse, being helpfully translated.
 */
export function LocalizedField({
  label,
  path,
  sourceValue,
  translation,
  sourceLocale,
  uiLocale,
  onChangeSource,
  onChangeOverride,
  children,
  className,
}: LocalizedFieldProps) {
  const t = useTranslations('common.language')
  const [showingSource, setShowingSource] = React.useState(false)

  const isLocked = translation.kind === 'machine' || translation.kind === 'opaque'
  const isTranslated = translation.state === 'machine' || translation.state === 'override'
  const displaySource = showingSource || !isTranslated

  const value = displaySource ? sourceValue : translation.text
  const valueLocale = displaySource ? sourceLocale : uiLocale
  const dir = /^(ar|he|fa|ur)/.test(valueLocale) ? 'rtl' : 'ltr'

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const next = event.target.value
    if (displaySource || !onChangeOverride) onChangeSource(next)
    else onChangeOverride(next)
  }

  return (
    // Locked styling lives on the wrapper rather than in the render props:
    // call sites pass their own className to the input, which would otherwise
    // silently clobber it.
    <div
      className={cn(
        'space-y-1',
        isLocked && '[&_input]:opacity-70 [&_textarea]:opacity-70 [&_input]:cursor-not-allowed [&_textarea]:cursor-not-allowed',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-400">{label}</label>

        {isLocked ? (
          <LockedChip kind={translation.kind} />
        ) : (
          <>
            {translation.isLoading && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('translating')}
              </span>
            )}

            {isTranslated && !showingSource && (
              <StateChip state={translation.state} sourceLocale={sourceLocale} />
            )}

            {isTranslated && showingSource && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/50 bg-slate-700/30 px-2 py-0.5 text-[11px] text-gray-300">
                {t('originalIn', { language: getLocaleNativeName(sourceLocale) })}
              </span>
            )}

            {isTranslated && (
              <button
                type="button"
                onClick={() => setShowingSource((current) => !current)}
                className="inline-flex items-center gap-1 text-[11px] text-gray-400 underline-offset-2 hover:text-gray-200 hover:underline"
              >
                {showingSource ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    {t('hideOriginal')}
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    {t('viewOriginal')}
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {children({
        value,
        onChange: handleChange,
        readOnly: isLocked,
        lang: valueLocale,
        dir,
        translate: isLocked ? 'no' : undefined,
      })}

      {isLocked && <LockedHint kind={translation.kind} />}

      {isTranslated && !showingSource && onChangeOverride && (
        <p className="text-[11px] text-gray-500">
          {t('overrideHint', { language: getLocaleNativeName(uiLocale) })}
        </p>
      )}
    </div>
  )
}

function StateChip({
  state,
  sourceLocale,
}: {
  state: FieldTranslation['state']
  sourceLocale: string
}) {
  const t = useTranslations('common.language')

  if (state === 'override') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
        <PenLine className="h-3 w-3" />
        {t('yourWording')}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
      <Languages className="h-3 w-3" />
      {t('machineTranslatedFrom', { language: getLocaleNativeName(sourceLocale) })}
    </span>
  )
}

function LockedChip({ kind }: { kind: FieldTranslation['kind'] }) {
  const t = useTranslations('common.language')
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/50 bg-slate-700/30 px-2 py-0.5 text-[11px] text-gray-300">
      <Lock className="h-3 w-3" />
      {kind === 'machine' ? t('englishRequired') : t('notTranslated')}
    </span>
  )
}

function LockedHint({ kind }: { kind: FieldTranslation['kind'] }) {
  const t = useTranslations('common.language')
  if (kind !== 'machine') return null
  return <p className="text-[11px] text-gray-500">{t('machineFieldHint')}</p>
}

/**
 * Action that promotes the reader's language to the entity's source of record.
 *
 * Separate from the field itself because it applies to the whole entity: once
 * the creator starts writing in their own language, every derived translation is
 * stale and the single-master model has to move with them.
 */
export function RewriteInLanguageButton({
  uiLocale,
  onPromote,
  disabled,
  className,
}: {
  uiLocale: string
  onPromote: () => void
  disabled?: boolean
  className?: string
}) {
  const t = useTranslations('common.language')
  return (
    <button
      type="button"
      onClick={onPromote}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-200 transition-colors hover:bg-violet-500/20 disabled:opacity-50',
        className
      )}
      title={t('rewriteInHint', { language: getLocaleNativeName(uiLocale) })}
    >
      <PenLine className="h-3 w-3" />
      {t('rewriteIn', { language: getLocaleNativeName(uiLocale) })}
    </button>
  )
}

/**
 * Banner for a dialog whose content is not in the reader's language, carrying
 * the entity-level promote action.
 */
export function TranslationNotice({
  sourceLocale,
  uiLocale,
  isLoading,
  onPromote,
}: {
  sourceLocale: string
  uiLocale: string
  isLoading?: boolean
  onPromote?: () => void
}) {
  const t = useTranslations('common.language')
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
      <p className="flex items-center gap-2 text-xs text-amber-200/90">
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Languages className="h-3.5 w-3.5" />
        )}
        {t('translationNotice', {
          sourceLanguage: getLocaleNativeName(sourceLocale),
          targetLanguage: getLocaleNativeName(uiLocale),
        })}
      </p>
      {onPromote && <RewriteInLanguageButton uiLocale={uiLocale} onPromote={onPromote} />}
    </div>
  )
}
