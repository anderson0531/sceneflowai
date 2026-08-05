'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/Input'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Wand2, Loader2, FileText, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LocalizedField, TranslationNotice } from '@/components/i18n/LocalizedField'
import { useLocalizedFields } from '@/i18n/content/useLocalizedFields'
import type { EntityI18n } from '@/i18n/content/entityI18n'

type TreatmentVariant = {
  id: string
  title?: string
  logline?: string
  genre?: string
  format_length?: string
  target_audience?: string
  author_writer?: string
  [key: string]: any
}

type Props = {
  open: boolean
  variant: TreatmentVariant | null
  onClose: () => void
  onApply: (patch: Partial<TreatmentVariant>) => void
  projectId?: string
  /**
   * Localization state for the project. When omitted the dialog behaves exactly
   * as it did before: every field reads as its own source language.
   */
  entityI18n?: EntityI18n
  onEntityI18nChange?: (next: EntityI18n) => void
}

const INSTRUCTION_TEMPLATES = [
  { id: 'sharpen-logline', labelKey: 'refine.sharpenLogline', text: 'Make the logline more compelling with a stronger hook and clearer stakes.' },
  { id: 'clarify-genre', labelKey: 'refine.clarifyGenre', text: 'Ensure genre expectations are clear and consistent throughout.' },
  { id: 'refine-title', labelKey: 'refine.strongerTitle', text: 'Suggest a more memorable, evocative title that captures the essence.' },
]

export function CoreInfoEditDialog({
  open,
  variant,
  onClose,
  onApply,
  projectId,
  entityI18n,
  onEntityI18nChange,
}: Props) {
  const t = useTranslations('blueprint')
  const tc = useTranslations('common')
  const [draft, setDraft] = useState<Partial<TreatmentVariant>>({})
  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([])
  const [customInstruction, setCustomInstruction] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (variant) {
      setDraft({
        title: variant.title,
        logline: variant.logline,
        genre: variant.genre,
        target_audience: variant.target_audience,
      })
      setHasChanges(false)
    }
  }, [variant, open])

  const toggleInstruction = (id: string) => {
    setSelectedInstructions(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // Immediately refine with a specific instruction
  const refineWithInstruction = async (instruction: string, actionId: string) => {
    if (!variant || isRefining) return
    setIsRefining(true)
    try {
      const res = await fetch('/api/treatment/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'core',
          variant: { ...variant, ...draft },
          instructions: instruction,
          projectId,
        }),
      })
      if (!res.ok) throw new Error('Refinement failed')
      const data = await res.json()
      if (data.success && data.draft) {
        setDraft(prev => ({ ...prev, ...data.draft }))
        setHasChanges(true)
        toast.success(t('refine.fieldsRefined', { count: data.fieldsUpdated?.length || 0 }))
      } else {
        throw new Error(data.message || 'Refinement failed')
      }
    } catch (error) {
      console.error('Refine error:', error)
      toast.error(t('refine.failed'))
    } finally {
      setIsRefining(false)
    }
  }

  const updateDraft = (key: string, value: any) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const localized = useLocalizedFields({
    pathPrefix: `treatmentVariants[${variant?.id ?? 'current'}]`,
    values: {
      title: draft.title,
      logline: draft.logline,
      genre: draft.genre,
      target_audience: draft.target_audience,
    },
    i18n: entityI18n,
    onI18nChange: onEntityI18nChange,
    enabled: open,
  })

  const bindField = (name: string) => {
    const binding = localized.bind(name)
    return {
      path: binding.path,
      sourceValue: binding.sourceValue,
      translation: binding.translation,
      sourceLocale: localized.sourceLocale,
      uiLocale: localized.uiLocale,
      onChangeSource: (value: string) => updateDraft(name, value),
      onChangeOverride: localized.canOverride
        ? (value: string) => binding.setOverride(value)
        : undefined,
    }
  }

  const refineSection = async () => {
    if (!variant) return
    setIsRefining(true)
    try {
      const instructions = selectedInstructions
        .map(id => INSTRUCTION_TEMPLATES.find(t => t.id === id)?.text)
        .filter(Boolean)
      if (customInstruction.trim()) instructions.push(customInstruction.trim())

      const res = await fetch('/api/treatment/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'core',
          variant: { ...variant, ...draft },
          instructions: instructions.join('\n'),
          projectId,
        }),
      })

      if (!res.ok) throw new Error('Refinement failed')
      const data = await res.json()
      if (data.success && data.draft) {
        setDraft(prev => ({ ...prev, ...data.draft }))
        setHasChanges(true)
        toast.success(t('refine.fieldsRefined', { count: data.fieldsUpdated?.length || 0 }))
      } else {
        throw new Error(data.message || 'Refinement failed')
      }
    } catch (error) {
      console.error('Refine error:', error)
      toast.error(t('refine.failed'))
    } finally {
      setIsRefining(false)
    }
  }

  const handleApply = () => {
    onApply(draft)
    toast.success(t('toast.coreInfoUpdated'))
    onClose()
  }

  if (!variant) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden bg-slate-900 border-slate-700">
        {isRefining && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
            <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-8 shadow-2xl flex flex-col items-center max-w-sm text-center">
              <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{t('refine.refiningTitle', { section: t('sections.coreInfo') })}</h3>
              <p className="text-sm text-gray-400">{t('refine.bodyCore')}</p>
            </div>
          </div>
        )}

        <DialogHeader className="pb-3 border-b border-slate-700">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span>{tc('actions.edit')}</span>
            <span className="text-gray-500 font-normal">· {t('sections.coreInfo')}</span>
            {hasChanges && (
              <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                {t('dialog.unsavedChanges')}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{t('sections.coreInfoTitle')}</h3>
              <p className="text-xs text-gray-500">{t('sections.coreInfoDescription')}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {INSTRUCTION_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => refineWithInstruction(template.text, template.id)}
                disabled={isRefining}
                title={template.text}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg border transition-all flex items-center gap-1.5',
                  isRefining
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-slate-800/50 border-slate-700 text-gray-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300'
                )}
              >
                <Wand2 className="w-3 h-3" />
                {t(template.labelKey)}
              </button>
            ))}
          </div>

          {localized.needsTranslation && (
            <TranslationNotice
              sourceLocale={localized.sourceLocale}
              uiLocale={localized.uiLocale}
              isLoading={localized.isLoading}
              pendingCount={localized.pendingCount}
              onPromote={onEntityI18nChange ? localized.promoteToSourceLocale : undefined}
            />
          )}

          <div className="space-y-3">
            <LocalizedField label={t('fields.title')} {...bindField('title')}>
              {(p) => <Input {...p} className="bg-slate-800/50 border-slate-700" />}
            </LocalizedField>

            <LocalizedField label={t('fields.logline')} {...bindField('logline')}>
              {(p) => (
                <Textarea {...p} className="min-h-[80px] bg-slate-800/50 border-slate-700" />
              )}
            </LocalizedField>

            <LocalizedField label={t('fields.genre')} {...bindField('genre')}>
              {(p) => <Input {...p} className="bg-slate-800/50 border-slate-700" />}
            </LocalizedField>

            <LocalizedField label={t('fields.targetAudience')} {...bindField('target_audience')}>
              {(p) => <Input {...p} className="bg-slate-800/50 border-slate-700" />}
            </LocalizedField>
          </div>

          <div className="space-y-2">
            <Textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder={t('fields.customInstruction')}
              className="min-h-[60px] bg-slate-800/50 border-slate-700 text-sm"
            />
            <Button
              onClick={refineSection}
              disabled={isRefining}
              variant="outline"
              size="sm"
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            >
              {isRefining ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {t('refine.refineSection', { section: t('sections.coreInfo') })}
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700 flex-shrink-0">
          <Button onClick={onClose} variant="outline" className="border-slate-700">
            <X className="w-4 h-4 mr-2" />
            {tc('actions.cancel')}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!hasChanges}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {tc('actions.applyChanges')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
