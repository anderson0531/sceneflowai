'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { toast } from 'sonner'
import { useGuideStore } from '@/store/useGuideStore'
import { 
  Sparkles, 
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
import {
  createAudienceDefinition,
  type AudienceDefinition,
} from '@/lib/types/audienceResonance'
import {
  type BlueprintAspectRatio,
  resolveVariantArtStyle,
  resolveVariantAspectRatio,
} from '@/lib/treatment/blueprintFoundation'

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
}: Props) {
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
  const [treatmentImportOpen, setTreatmentImportOpen] = useState(false)

  // Apply an imported treatment: set the description and prefill content type /
  // genre / tone only when the user has not already provided them.
  const applyTreatmentImport = (result: TreatmentImportResult) => {
    if (result.synopsis) setSynopsis(result.synopsis)
    if (result.contentIntent && !contentType) setContentType(result.contentIntent)
    if (result.genre && !genre.trim()) setGenre(result.genre)
    if (result.tone && !tone.trim()) setTone(result.tone)
    toast.success('Treatment imported — review and generate your Blueprint.')
  }

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)

  // Determine mode
  const isReimaginMode = !!existingVariant

  useEffect(() => {
    if (existingVariant) {
      setSynopsis(existingVariant.synopsis || existingVariant.content || '')
      setGenre(existingVariant.genre || '')
      setTone(existingVariant.tone_description || existingVariant.tone || '')
      setContentType(
        (existingVariant.contentIntent as ContentIntent | undefined) ||
          resolveContentIntent(existingVariant.genre)
      )
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
      setSynopsis(initialIdea.synopsis || initialIdea.logline)
      setGenre(initialIdea.genre || '')
      setTone(initialIdea.tone || '')
      if (initialIdea.genre) setContentType(resolveContentIntent(initialIdea.genre))
    }
  }, [existingVariant, initialIdea, open])

  // Handle generate
  const handleGenerate = async () => {
    if (!synopsis.trim()) {
      toast.error('Please describe your project')
      return
    }
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

    const contentIntent = contentType as ContentIntent
    const format = defaultFormatForIntent(contentIntent)

    setIsGenerating(true)
    try {
      await onGenerate(synopsis.trim(), {
        genre: genre.trim(),
        tone: tone.trim(),
        artStyle,
        aspectRatio,
        duration,
        targetAudience: audienceDef.description?.trim() || undefined,
        audienceDefinition: audienceDef.description?.trim() ? audienceDef : undefined,
        variantCount: 1,
        hasStoryDirections: false,
        generateThreeDirections: false,
        rigor: 'thorough',
        format,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isReimaginMode ? (
              <>
                <RefreshCw className="w-5 h-5 text-cyan-400" />
                <span>Reimagine Blueprint</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Start Project</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isReimaginMode ? 'Form to reimagine an existing blueprint' : 'Form to create a new blueprint'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Main Input — project description with AI validate/enhance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Film className="w-4 h-4 text-cyan-400" />
                Describe Your Project
              </label>
              <button
                type="button"
                onClick={() => setTreatmentImportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Upload className="h-3.5 w-3.5" />
                Import treatment
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

          {/* Content type — required master switch that keeps intent aligned */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Content Type <span className="text-red-400">*</span>
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

          {/* Genre / Tone (free-form, required) + Scope */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Palette className="w-3 h-3" /> Genre <span className="text-red-400">*</span>
              </label>
              <Input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. neo-noir thriller, nature documentary"
                className="bg-slate-800/50 border-slate-700 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Tone <span className="text-red-400">*</span></label>
              <Input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. suspenseful and gritty, warm and hopeful"
                className="bg-slate-800/50 border-slate-700 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Scope <span className="text-gray-500">(optional)</span>
              </label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-sm">
                  <SelectValue placeholder="Auto (let the story decide)" />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {duration === 'auto' && (
                <p className="text-[10px] text-gray-500">Length follows the story; no fixed runtime is forced.</p>
              )}
            </div>
          </div>

          {/* Target Audience — free-text description (speech or typing) + AI enhance */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Users className="w-3 h-3" /> Target Audience
              <span className="text-gray-500">(describe in your own words)</span>
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
          
          {/* Visual Foundation — art style + aspect ratio */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Palette className="w-4 h-4 text-cyan-400" />
              Visual Foundation
              <span className="text-xs text-gray-500 font-normal">(locked at Blueprint)</span>
            </label>
            <BlueprintFoundationFields
              artStyle={artStyle}
              aspectRatio={aspectRatio}
              onArtStyleChange={setArtStyle}
              onAspectRatioChange={setAspectRatio}
              highlightArtStyle={focusField === 'artStyle'}
              highlightAspectRatio={focusField === 'aspectRatio'}
            />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !synopsis.trim() || !contentType || !genre.trim() || !tone.trim()}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isReimaginMode ? 'Reimagining...' : 'Creating...'}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {isReimaginMode ? 'Reimagine Blueprint' : 'Create Blueprint'}
              </>
            )}
          </Button>
        </div>
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
