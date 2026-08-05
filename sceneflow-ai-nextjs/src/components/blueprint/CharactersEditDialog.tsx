'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/Input'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Wand2, Loader2, Users, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LocalizedField, TranslationNotice } from '@/components/i18n/LocalizedField'
import { useLocalizedFields } from '@/i18n/content/useLocalizedFields'
import type { EntityI18n } from '@/i18n/content/entityI18n'

type Character = {
  name: string
  role: string
  subject: string
  ethnicity: string
  keyFeature: string
  hairStyle: string
  hairColor: string
  eyeColor: string
  expression: string
  build: string
  description: string
  externalGoal?: string
  internalNeed?: string
  fatalFlaw?: string
  arcStartingState?: string
  arcShift?: string
  arcEndingState?: string
}

type TreatmentVariant = {
  id: string
  character_descriptions?: Character[]
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
  { id: 'add-depth', labelKey: 'refine.addDepth', text: 'Add more internal conflict, wants vs needs, and character flaws.' },
  { id: 'strengthen-arcs', labelKey: 'refine.strengthenArcs', text: 'Make character transformations more pronounced and earned.' },
  { id: 'distinct-voices', labelKey: 'refine.distinctVoices', text: 'Give each character a more unique personality and voice.' },
  { id: 'relationship-dynamics', labelKey: 'refine.relationshipDynamics', text: 'Enrich the relationships and dynamics between characters.' },
]

type CharacterFieldBinding = React.ComponentProps<typeof LocalizedField>

function CharacterEditor({
  character,
  index,
  onChange,
  bindField,
}: {
  character: Character
  index: number
  onChange: (index: number, field: keyof Character, value: string) => void
  /** Supplies translation state for the prose fields. */
  bindField: (
    index: number,
    field: 'description' | 'externalGoal' | 'internalNeed' | 'fatalFlaw'
  ) => Omit<CharacterFieldBinding, 'label' | 'children'>
}) {
  const t = useTranslations('blueprint')
  return (
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {/* Names anchor continuity with the character library, reference images
            and locked prompt tokens, so they are never translated. */}
        <Input
          value={character.name || ''}
          onChange={(e) => onChange(index, 'name', e.target.value)}
          placeholder={t('fields.name')}
          translate="no"
          className="bg-slate-900/50 border-slate-700 text-sm"
        />
        <Input
          value={character.role || ''}
          onChange={(e) => onChange(index, 'role', e.target.value)}
          placeholder={t('fields.role')}
          className="bg-slate-900/50 border-slate-700 text-sm"
        />
      </div>
      <LocalizedField label={t('fields.description')} {...bindField(index, 'description')}>
        {(p) => (
          <Textarea
            {...p}
            placeholder={t('fields.characterDescription')}
            className="min-h-[60px] bg-slate-900/50 border-slate-700 text-sm"
          />
        )}
      </LocalizedField>
      <details className="group">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
          {t('fields.psychologicalDepth')}
        </summary>
        <div className="mt-2 space-y-2">
          <LocalizedField label={t('fields.externalGoal')} {...bindField(index, 'externalGoal')}>
            {(p) => (
              <Input
                {...p}
                placeholder={t('fields.externalGoal')}
                className="bg-slate-900/50 border-slate-700 text-xs"
              />
            )}
          </LocalizedField>
          <LocalizedField label={t('fields.internalNeed')} {...bindField(index, 'internalNeed')}>
            {(p) => (
              <Input
                {...p}
                placeholder={t('fields.internalNeed')}
                className="bg-slate-900/50 border-slate-700 text-xs"
              />
            )}
          </LocalizedField>
          <LocalizedField label={t('fields.fatalFlaw')} {...bindField(index, 'fatalFlaw')}>
            {(p) => (
              <Input
                {...p}
                placeholder={t('fields.fatalFlaw')}
                className="bg-slate-900/50 border-slate-700 text-xs"
              />
            )}
          </LocalizedField>
        </div>
      </details>
    </div>
  )
}

export function CharactersEditDialog({
  open, variant, onClose, onApply, projectId,
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
        character_descriptions: variant.character_descriptions ? [...variant.character_descriptions] : [],
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
          section: 'characters',
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

  const updateCharacter = (index: number, field: keyof Character, value: string) => {
    const characters = [...(draft.character_descriptions || [])]
    characters[index] = { ...characters[index], [field]: value }
    updateDraft('character_descriptions', characters)
  }

  const PROSE_FIELDS = ['description', 'externalGoal', 'internalNeed', 'fatalFlaw'] as const

  const localized = useLocalizedFields({
    pathPrefix: `treatmentVariants[${variant?.id ?? 'current'}]`,
    values: Object.fromEntries(
      (draft.character_descriptions || []).flatMap((character, index) =>
        PROSE_FIELDS.map((field) => [
          `character_descriptions[${index}].${field}`,
          character[field],
        ])
      )
    ),
    i18n: entityI18n,
    onI18nChange: onEntityI18nChange,
    // Character names must reach the translator verbatim so descriptions keep
    // referring to them correctly.
    glossary: (draft.character_descriptions || [])
      .map((character) => character.name)
      .filter((name): name is string => Boolean(name)),
    enabled: open,
  })

  const bindCharacterField = (
    index: number,
    field: (typeof PROSE_FIELDS)[number]
  ) => {
    const binding = localized.bind(`character_descriptions[${index}].${field}`)
    return {
      path: binding.path,
      sourceValue: binding.sourceValue,
      translation: binding.translation,
      sourceLocale: localized.sourceLocale,
      uiLocale: localized.uiLocale,
      onChangeSource: (value: string) => updateCharacter(index, field, value),
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
          section: 'characters',
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
    toast.success(t('toast.charactersUpdated'))
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
              <h3 className="text-lg font-semibold text-white mb-2">{t('refine.refiningTitle', { section: t('sections.characters') })}</h3>
              <p className="text-sm text-gray-400">{t('refine.bodyCharacters')}</p>
            </div>
          </div>
        )}

        <DialogHeader className="pb-3 border-b border-slate-700">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>{tc('actions.edit')}</span>
            <span className="text-gray-500 font-normal">· {t('sections.characters')}</span>
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
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{t('sections.characters')}</h3>
              <p className="text-xs text-gray-500">{t('sections.charactersDescription')}</p>
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
              onPromote={onEntityI18nChange ? localized.promoteToSourceLocale : undefined}
            />
          )}

          <div className="space-y-3">
            {(draft.character_descriptions || []).map((character, index) => (
              <CharacterEditor
                key={index}
                character={character}
                index={index}
                onChange={updateCharacter}
                bindField={bindCharacterField}
              />
            ))}
            
            {(!draft.character_descriptions || draft.character_descriptions.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">{t('empty.noCharacters')}</p>
            )}
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
              {t('refine.refineSection', { section: t('sections.characters') })}
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
