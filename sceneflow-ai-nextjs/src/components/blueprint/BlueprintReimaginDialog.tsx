'use client'

import { useTranslations } from 'next-intl'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { toast } from 'sonner'
import { useGuideStore } from '@/store/useGuideStore'
import { 
  Loader2, 
  Film,
  Palette,
  Clock,
  Users,
  Layers,
  Upload,
  RefreshCw,
  Zap
} from 'lucide-react'
import {
  resolveContentIntent,
  resolveContentIntentFromMetadata,
  defaultFormatForIntent,
  getIntentLabel,
  type ContentIntent,
} from '@/lib/content/contentIntent'
import {
  BlueprintFoundationFields,
  DEFAULT_ART_STYLE,
  DEFAULT_ASPECT_RATIO,
} from '@/components/blueprint/BlueprintFoundationFields'
import { ConceptDescriptionField } from '@/components/blueprint/ConceptDescriptionField'
import { TreatmentImportDialog } from '@/components/blueprint/TreatmentImportDialog'
import type { TreatmentImportResult } from '@/lib/blueprint/importTreatment'
import { AudienceDescriptionField } from '@/components/audience/AudienceDescriptionField'
import { SeriesSynopsisIdeation } from '@/components/series/SeriesSynopsisIdeation'
import { DEFAULT_SERIES_PRODUCTION_FORMAT } from '@/config/series/productionFormats'
import {
  createAudienceDefinition,
  type AudienceDefinition,
} from '@/lib/types/audienceResonance'
import type { SeriesSynopsisLock } from '@/lib/series/clarifySynopsis'
import {
  type BlueprintAspectRatio,
  resolveVariantArtStyle,
  resolveVariantAspectRatio,
} from '@/lib/treatment/blueprintFoundation'
import { resolveRequiredBlueprintFields } from '@/lib/blueprint/regenerateDefaults'

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

type IdeationConcept = {
  id?: string
  title?: string
  logline: string
  genre?: string
  tone?: string
  synopsis: string
}

type Props = {
  open: boolean
  onClose: () => void
  onGenerate: (input: string, opts?: { 
    genre?: string
    tone?: string
    artStyle?: string
    aspectRatio?: BlueprintAspectRatio
    duration?: string
    targetAudience?: string
    audienceDefinition?: AudienceDefinition
    variantCount?: number
    hasStoryDirections?: boolean
    generateThreeDirections?: boolean
    rigor?: 'fast' | 'balanced' | 'thorough'
    format?: string
    contentIntent?: ContentIntent
  }) => Promise<void>
  existingVariant?: any // For reimagine mode (editing existing)
  initialIdea?: IdeationConcept // Pre-populated from Ideation
  projectId?: string
  focusField?: 'artStyle' | 'aspectRatio'
  /** Series or project values used when the existing Blueprint left a required field empty. */
  fallback?: {
    synopsis?: string
    genre?: string
    tone?: string
    contentIntent?: ContentIntent
  }
}

// Content type maps directly to ContentIntent and is the master switch that
// keeps generation aligned to the user's intent (e.g. a Podcast stays
// non-fiction instead of being coerced into a cinematic storyline).
const CONTENT_TYPE_OPTIONS: { value: ContentIntent; label: string; description: string }[] = [
  { value: 'fiction', label: 'Fiction / Narrative', description: 'Story-driven — drama, comedy, sci-fi, animation' },
  { value: 'informational', label: 'Informational / Non-Fiction', description: 'Documentary, education, training, news' },
  { value: 'commercial', label: 'Commercial / Persuasive', description: 'Product demo, explainer, case study, ad' },
  { value: 'conversational', label: 'Conversational', description: 'Podcast, interview, panel' },
]

// Scope is advisory only. "auto" lets the story/illustration determine its own
// length instead of forcing beats and scenes to hit a fixed duration target.
function productionFormatForIntent(intent: ContentIntent | null): string | null {
  if (intent === 'informational') return 'documentary'
  if (intent === 'commercial') return 'demo'
  if (intent === 'conversational') return 'podcast'
  if (intent === 'fiction') return 'narrative'
  return null
}

const SCOPE_OPTIONS = [
  { value: 'auto', label: 'Auto (let the story decide)' },
  { value: 'micro_short', label: 'Brief (~ under 5 min)' },
  { value: 'short_film', label: 'Short (5-30 min)' },
  { value: 'featurette', label: 'Featurette (30-60 min)' },
  { value: 'feature_length', label: 'Feature (60-120 min)' },
  { value: 'epic', label: 'Epic (120-180 min)' },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BlueprintReimaginDialog({
  open,
  onClose,
  onGenerate,
  existingVariant,
  initialIdea,
  projectId,
  focusField,
  fallback,
}: Props) {
  const t = useTranslations('blueprint.reimagine')
  const tc = useTranslations('common')
  // Form state
  const [synopsis, setSynopsis] = useState('')
  const [contentType, setContentType] = useState<ContentIntent | ''>('')
  const [genre, setGenre] = useState('')
  const [tone, setTone] = useState('')
  const [artStyle, setArtStyle] = useState(DEFAULT_ART_STYLE)
  const [aspectRatio, setAspectRatio] = useState<BlueprintAspectRatio>(DEFAULT_ASPECT_RATIO)
  const [duration, setDuration] = useState('auto')
  const [audienceDef, setAudienceDef] = useState<AudienceDefinition>(() =>
    createAudienceDefinition({ description: '', source: 'blueprint' })
  )
  const [productionFormat, setProductionFormat] = useState(DEFAULT_SERIES_PRODUCTION_FORMAT)
  const [lockedSynopsis, setLockedSynopsis] = useState<SeriesSynopsisLock | null>(null)
  const [synopsisDraft, setSynopsisDraft] = useState('')
  const [ideationSession, setIdeationSession] = useState(0)
  const [treatmentImportOpen, setTreatmentImportOpen] = useState(false)

  // Apply an imported treatment. Create mode confirms the synopsis immediately.
  // Reimagine mode prefills description, content type, genre, and tone.
  const applyTreatmentImport = (result: TreatmentImportResult) => {
    if (result.synopsis) setSynopsis(result.synopsis)
    if (result.contentIntent && !contentType) setContentType(result.contentIntent)
    if (result.genre && !genre.trim()) setGenre(result.genre)
    if (result.tone && !tone.trim()) setTone(result.tone)
    if (!existingVariant && result.synopsis.trim()) {
      const importedFormat = productionFormatForIntent(result.contentIntent)
      if (importedFormat) setProductionFormat(importedFormat)
      setLockedSynopsis({
        synopsis: result.synopsis.trim(),
        genre: result.genre.trim() || undefined,
        tone: result.tone.trim() || undefined,
      })
      setSynopsisDraft('')
      setIdeationSession((session) => session + 1)
    }
    toast.success('Treatment imported — review and generate your Blueprint.')
  }

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)

  // Determine mode
  const isReimaginMode = !!existingVariant

  useEffect(() => {
    if (existingVariant) {
      const required = resolveRequiredBlueprintFields({
        synopsis: existingVariant.synopsis || existingVariant.content || '',
        logline: existingVariant.logline,
        genre: existingVariant.genre,
        tone: existingVariant.tone,
        toneDescription: existingVariant.tone_description,
        contentIntent: existingVariant.contentIntent,
        fallbackSynopsis: fallback?.synopsis,
        fallbackGenre: fallback?.genre,
        fallbackTone: fallback?.tone,
        fallbackIntent: fallback?.contentIntent,
      })
      setSynopsis(required.synopsis)
      setGenre(required.genre)
      setTone(required.tone)
      setContentType(required.contentIntent)
      setArtStyle(resolveVariantArtStyle(existingVariant))
      setAspectRatio(resolveVariantAspectRatio(existingVariant))
      setDuration(existingVariant.duration || 'auto')
      setAudienceDef(
        createAudienceDefinition({
          ...(existingVariant.audienceDefinition || {}),
          description:
            existingVariant.audienceDefinition?.description ||
            existingVariant.target_audience ||
            '',
          source: 'blueprint',
        })
      )
    } else if (initialIdea) {
      const draft = initialIdea.synopsis || initialIdea.logline || ''
      setSynopsis(draft)
      setSynopsisDraft(draft)
      setLockedSynopsis(null)
      setGenre(initialIdea.genre || '')
      setTone(initialIdea.tone || '')
      if (initialIdea.genre) setContentType(resolveContentIntent(initialIdea.genre))
      setIdeationSession((session) => session + 1)
    }
  }, [
    existingVariant,
    initialIdea,
    open,
    fallback?.synopsis,
    fallback?.genre,
    fallback?.tone,
    fallback?.contentIntent,
  ])

  const scopeLabel = SCOPE_OPTIONS.find((option) => option.value === duration)?.label

  // Handle generate
  const handleGenerate = async () => {
    const contentIntent = isReimaginMode
      ? (contentType as ContentIntent)
      : resolveContentIntentFromMetadata({
          format: productionFormat,
          genre: lockedSynopsis?.genre,
        })
    const synopsisText = isReimaginMode
      ? synopsis.trim()
      : lockedSynopsis?.synopsis.trim() || ''
    const resolvedFormat = isReimaginMode ? defaultFormatForIntent(contentIntent) : productionFormat

    if (!synopsisText) {
      toast.error(
        isReimaginMode
          ? 'Please describe your project'
          : 'Confirm the synopsis before creating the blueprint'
      )
      return
    }
    if (isReimaginMode) {
      if (!contentType) {
        toast.error('Please select a content type')
        return
      }
      if (!genre.trim()) {
        toast.error('Please enter a genre')
        return
      }
      if (!tone.trim()) {
        toast.error('Please enter a tone')
        return
      }
    }

    setIsGenerating(true)
    try {
      await onGenerate(synopsisText, {
        genre: isReimaginMode ? genre.trim() : lockedSynopsis?.genre,
        tone: isReimaginMode ? tone.trim() : lockedSynopsis?.tone,
        artStyle,
        aspectRatio,
        duration,
        targetAudience: audienceDef.description?.trim() || undefined,
        audienceDefinition: audienceDef.description?.trim() ? audienceDef : undefined,
        variantCount: 1,
        hasStoryDirections: false,
        generateThreeDirections: false,
        rigor: 'thorough',
        format: resolvedFormat,
        contentIntent,
      })

      toast.success(isReimaginMode ? 'Blueprint reimagined!' : 'Blueprint generated!')
      onClose()
    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Failed to generate blueprint')
    } finally {
      setIsGenerating(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={
          isReimaginMode
            ? 'max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700'
            : 'bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto'
        }
      >
        <DialogHeader>
          {isReimaginMode ? (
            <DialogTitle className="flex items-center gap-2 text-xl">
              <RefreshCw className="w-5 h-5 text-cyan-400" />
              <span>{t('reimagineTitle')}</span>
            </DialogTitle>
          ) : (
            <DialogTitle className="text-xl">{t('startTitle')}</DialogTitle>
          )}
          <DialogDescription className={isReimaginMode ? 'sr-only' : 'text-gray-400'}>
            {isReimaginMode ? 'Form to reimagine an existing blueprint' : t('startDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className={isReimaginMode ? 'space-y-6 py-4' : 'space-y-4 pt-4'}>
          {isReimaginMode ? null : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setTreatmentImportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-600 px-2.5 py-1 text-[11px] font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <Upload className="h-3.5 w-3.5" />
                {t('importTreatment')}
              </button>
            </div>
          )}

          {isReimaginMode ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Film className="w-4 h-4 text-cyan-400" />
                {t('describeProject')}
              </label>
              <button
                type="button"
                onClick={() => setTreatmentImportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Upload className="h-3.5 w-3.5" />
                {t('importTreatment')}
              </button>
            </div>
            <ConceptDescriptionField
              value={synopsis}
              onChange={setSynopsis}
              context={{
                contentIntent: contentType || undefined,
                genre: genre.trim() || undefined,
                tone: tone.trim() || undefined,
                targetAudience: audienceDef.description?.trim() || undefined,
              }}
              projectId={projectId}
              rows={6}
            />
          </div>
          ) : (
            <SeriesSynopsisIdeation
              key={ideationSession}
              format={productionFormat}
              onFormatChange={setProductionFormat}
              audience={audienceDef}
              onAudienceChange={setAudienceDef}
              artStyle={artStyle}
              onArtStyleChange={setArtStyle}
              episodeCount={1}
              surface="project"
              scope={scopeLabel}
              audienceHint="(optional)"
              initialDraft={synopsisDraft}
              initialLock={lockedSynopsis}
              onLockedChange={setLockedSynopsis}
              projectId={projectId}
            />
          )}

          {isReimaginMode ? (
          <>
          {/* Content type — required master switch that keeps intent aligned */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Layers className="w-3 h-3" /> {t('contentType')} <span className="text-red-400">{t('required')}</span>
            </label>
            <Select value={contentType} onValueChange={(v) => setContentType(v as ContentIntent)}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-sm">
                <SelectValue placeholder="Select the kind of project..." />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-[11px] text-gray-400">{opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {contentType && (
              <p className="text-[10px] text-cyan-400/80">{getIntentLabel(contentType)}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Palette className="w-3 h-3" /> {t('genre')} <span className="text-red-400">{t('required')}</span>
              </label>
              <Input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. neo-noir thriller, nature documentary"
                className="bg-slate-800/50 border-slate-700 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">{t('tone')} <span className="text-red-400">{t('required')}</span></label>
              <Input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. suspenseful and gritty, warm and hopeful"
                className="bg-slate-800/50 border-slate-700 text-sm"
              />
            </div>
          </div>

          {/* Target Audience — free-text description (speech or typing) + AI enhance */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Users className="w-3 h-3" /> {t('targetAudience')}
              <span className="text-gray-500">{t('audienceHint')}</span>
            </label>
            <AudienceDescriptionField
              value={audienceDef}
              onChange={setAudienceDef}
              context={{
                genre: genre.trim() || undefined,
                format: contentType ? defaultFormatForIntent(contentType) : undefined,
                contentIntent: contentType || undefined,
              }}
              projectId={projectId}
              rows={3}
            />
          </div>
          </>
          ) : null}

          <div className="space-y-1.5">
            <label
              className={
                isReimaginMode
                  ? 'text-xs text-gray-400 flex items-center gap-1'
                  : 'text-sm font-medium text-gray-300 flex items-center gap-1'
              }
            >
              <Clock className="w-3 h-3" /> {t('scope')} <span className="text-gray-500 text-xs font-normal">{t('optional')}</span>
            </label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger
                className={
                  isReimaginMode
                    ? 'bg-slate-800/50 border-slate-700 text-sm'
                    : 'bg-gray-800 border-gray-700 text-white text-sm'
                }
              >
                <SelectValue placeholder="Auto (let the story decide)" />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {duration === 'auto' && (
              <p className="text-[10px] text-gray-500">{t('autoLengthHint')}</p>
            )}
          </div>
          
          <div className="space-y-2">
            {isReimaginMode ? (
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Palette className="w-4 h-4 text-cyan-400" />
                {t('visualFoundation')}
                <span className="text-xs text-gray-500 font-normal">{t('lockedAtBlueprint')}</span>
              </label>
            ) : null}
            <BlueprintFoundationFields
              artStyle={artStyle}
              aspectRatio={aspectRatio}
              onArtStyleChange={setArtStyle}
              onAspectRatioChange={setAspectRatio}
              highlightArtStyle={focusField === 'artStyle'}
              highlightAspectRatio={focusField === 'aspectRatio'}
              showArtStyle={isReimaginMode}
              surface={isReimaginMode ? 'slate' : 'gray'}
            />
          </div>
        </div>
        
        {isReimaginMode ? (
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
              {tc('actions.cancel')}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !synopsis.trim() || !contentType || !genre.trim() || !tone.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('reimagining')}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  {t('reimagineTitle')}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isGenerating}
              className="flex-1 border-gray-600"
            >
              {tc('actions.cancel')}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !lockedSynopsis?.synopsis.trim()}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {tc('status.generating')}
                </>
              ) : (
                t('generateBlueprint')
              )}
            </Button>
          </div>
        )}
      </DialogContent>

      <TreatmentImportDialog
        open={treatmentImportOpen}
        onOpenChange={setTreatmentImportOpen}
        projectId={projectId}
        onImported={applyTreatmentImport}
      />
    </Dialog>
  )
}

export default BlueprintReimaginDialog
