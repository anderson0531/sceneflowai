'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../ui/select'
import { toast } from 'sonner'
import { useGuideStore } from '@/store/useGuideStore'
import { 
  Sparkles, 
  Wand2, 
  X, 
  Loader2, 
  Lightbulb,
  Film,
  Palette,
  Clock,
  Users,
  Target,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Check,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  resolveContentIntent,
  resolveProductionFormat,
  getIntentLabel,
  type ContentIntent,
} from '@/lib/content/contentIntent'
import {
  BlueprintFoundationFields,
  DEFAULT_ART_STYLE,
  DEFAULT_ASPECT_RATIO,
} from '@/components/blueprint/BlueprintFoundationFields'
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
  id: string
  title: string
  logline: string
  genre: string
  tone: string
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

// Genre options with category grouping for better UX
const GENRE_OPTIONS = [
  // Fiction/Narrative (story-based)
  { value: 'drama', label: 'Drama', category: 'Fiction' },
  { value: 'comedy', label: 'Comedy', category: 'Fiction' },
  { value: 'thriller', label: 'Thriller', category: 'Fiction' },
  { value: 'horror', label: 'Horror', category: 'Fiction' },
  { value: 'scifi', label: 'Sci-Fi', category: 'Fiction' },
  { value: 'fantasy', label: 'Fantasy', category: 'Fiction' },
  { value: 'action', label: 'Action', category: 'Fiction' },
  { value: 'romance', label: 'Romance', category: 'Fiction' },
  { value: 'mystery', label: 'Mystery', category: 'Fiction' },
  { value: 'adventure', label: 'Adventure', category: 'Fiction' },
  { value: 'animation', label: 'Animation', category: 'Fiction' },
  // Non-Fiction/Informational
  { value: 'documentary', label: 'Documentary', category: 'Non-Fiction' },
  { value: 'education', label: 'Education', category: 'Non-Fiction' },
  { value: 'training', label: 'Training', category: 'Non-Fiction' },
  { value: 'news', label: 'News', category: 'Non-Fiction' },
  // Commercial/Business
  { value: 'product-demo', label: 'Product Demonstration', category: 'Commercial' },
  { value: 'explainer', label: 'Explainer Video', category: 'Commercial' },
  { value: 'case-study', label: 'Case Study', category: 'Commercial' },
  { value: 'advertisement', label: 'Advertisement', category: 'Commercial' },
  // Conversational
  { value: 'podcast', label: 'Podcast', category: 'Conversational' },
  { value: 'interview', label: 'Interview', category: 'Conversational' },
]

// Group genres by category for the dropdown
const GENRE_CATEGORIES = ['Fiction', 'Non-Fiction', 'Commercial', 'Conversational'] as const

const TONE_OPTIONS = [
  { value: 'dark', label: 'Dark & Gritty' },
  { value: 'light', label: 'Light & Uplifting' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'comedic', label: 'Comedic' },
  { value: 'suspenseful', label: 'Suspenseful' },
  { value: 'melancholic', label: 'Melancholic' },
  { value: 'whimsical', label: 'Whimsical' },
  { value: 'intense', label: 'Intense' },
  { value: 'hopeful', label: 'Hopeful' },
  { value: 'nostalgic', label: 'Nostalgic' },
]

const DURATION_OPTIONS = [
  { value: 'micro_short', label: 'Micro (< 5 min)' },
  { value: 'short_film', label: 'Short (5-30 min)' },
  { value: 'featurette', label: 'Featurette (30-60 min)' },
  { value: 'feature_length', label: 'Feature (60-120 min)' },
  { value: 'epic', label: 'Epic (120-180 min)' },
]

// Instruction templates for the guided prompt builder
const CREATIVE_INSTRUCTION_TEMPLATES = [
  { id: 'more-conflict', label: 'Add More Conflict', text: 'Increase the central conflict and stakes for the protagonist.', intents: ['fiction'] as ContentIntent[] },
  { id: 'educational-focus', label: 'Educational Focus', text: 'Structure as a clear, step-by-step educational lesson or tutorial.', intents: ['informational', 'commercial'] as ContentIntent[] },
  { id: 'investigative', label: 'Investigative', text: 'Structure as a deep-dive investigative report or documentary.', intents: ['informational'] as ContentIntent[] },
  { id: 'emotional-depth', label: 'Emotional Depth', text: 'Amplify the emotional journey and connections.', intents: ['fiction', 'informational', 'commercial'] as ContentIntent[] },
  { id: 'faster-pacing', label: 'Faster Pacing', text: 'Tighten the structure with quicker progression.', intents: ['fiction', 'informational', 'commercial', 'conversational'] as ContentIntent[] },
  { id: 'world-building', label: 'Expand Context', text: 'Add richer context, background, and supporting details.', intents: ['fiction', 'informational'] as ContentIntent[] },
  { id: 'conversational', label: 'Conversational', text: 'Structure as an engaging interview or podcast format.', intents: ['conversational'] as ContentIntent[] },
  { id: 'relationship-focus', label: 'Focus on Relationships', text: 'Emphasize interpersonal dynamics between subjects or characters.', intents: ['fiction', 'conversational'] as ContentIntent[] },
  { id: 'strengthen-problem', label: 'Strengthen Core Problem', text: 'Clarify the audience pain point and why it matters now.', intents: ['commercial'] as ContentIntent[] },
  { id: 'clarify-objective', label: 'Clarify Learning Objective', text: 'Make the learning outcome and audience takeaway explicit.', intents: ['informational'] as ContentIntent[] },
]

// =============================================================================
// IDEATION SECTION COMPONENT
// =============================================================================

function IdeationSection({ 
  onSelectConcept 
}: { 
  onSelectConcept: (concept: IdeationConcept) => void 
}) {
  const [keyword, setKeyword] = useState('')
  const [concepts, setConcepts] = useState<IdeationConcept[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const generateConcepts = async () => {
    if (!keyword.trim()) return
    
    setIsGenerating(true)
    try {
      const res = await fetch('/api/inspiration/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim(), count: 4 })
      })
      
      const data = await res.json()
      
      if (data.success && data.variants?.length > 0) {
        // Transform text variants into structured concepts
        const generatedConcepts: IdeationConcept[] = data.variants.map((text: string, i: number) => ({
          id: `concept-${Date.now()}-${i}`,
          title: `Concept ${i + 1}`,
          logline: text,
          genre: '',
          tone: '',
          synopsis: text
        }))
        setConcepts(generatedConcepts)
      }
    } catch (error) {
      console.error('Ideation error:', error)
      toast.error('Failed to generate ideas')
    } finally {
      setIsGenerating(false)
    }
  }

  const quickTags = ['commercial', 'educational', 'explainer', 'tutorial', 'documentary', 'drama', 'comedy']

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-amber-400">
        <Lightbulb className="w-5 h-5" />
        <h3 className="font-semibold">Ideation</h3>
        <span className="text-xs text-gray-500">Get inspired with story concepts</span>
      </div>
      
      {/* Quick tags */}
      <div className="flex flex-wrap gap-2">
        {quickTags.map(tag => (
          <button
            key={tag}
            onClick={() => {
              setKeyword(tag)
              generateConcepts()
            }}
            className="px-3 py-1 text-xs rounded-full bg-slate-800 text-gray-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>
      
      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generateConcepts()}
          placeholder="Enter a theme, topic, or idea..."
          className="flex-1 px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50"
        />
        <Button
          onClick={generateConcepts}
          disabled={isGenerating || !keyword.trim()}
          variant="outline"
          size="sm"
          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </Button>
      </div>
      
      {/* Generated concepts */}
      {concepts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
          {concepts.map(concept => (
            <button
              key={concept.id}
              onClick={() => onSelectConcept(concept)}
              className="p-3 text-left bg-slate-800/50 rounded-lg border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 transition-all group"
            >
              <p className="text-sm text-gray-300 line-clamp-3 group-hover:text-white">
                {concept.logline}
              </p>
              <div className="flex items-center gap-1 mt-2 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Check className="w-3 h-3" />
                <span className="text-xs">Use this</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
  const { setTreatmentVariants } = useGuideStore()
  
  // Form state
  const [synopsis, setSynopsis] = useState('')
  const [genre, setGenre] = useState('')
  const [tone, setTone] = useState('')
  const [artStyle, setArtStyle] = useState(DEFAULT_ART_STYLE)
  const [aspectRatio, setAspectRatio] = useState<BlueprintAspectRatio>(DEFAULT_ASPECT_RATIO)
  const [duration, setDuration] = useState('short_film')
  const [audienceDef, setAudienceDef] = useState<AudienceDefinition>(() =>
    createAudienceDefinition({ description: '', source: 'blueprint' })
  )
  
  // Instruction builder state
  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([])
  const [customInstruction, setCustomInstruction] = useState('')
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showIdeation, setShowIdeation] = useState(!existingVariant)
  const [generateThreeDirections, setGenerateThreeDirections] = useState(false)
  const [rigor, setRigor] = useState<'fast' | 'balanced' | 'thorough'>('thorough')
  
  // Determine mode
  const isReimaginMode = !!existingVariant
  const contentIntent = resolveContentIntent(genre)
  const visibleCreativeTemplates = CREATIVE_INSTRUCTION_TEMPLATES.filter(
    (t) => !genre || t.intents.includes(contentIntent)
  )
  useEffect(() => {
    if (existingVariant) {
      setSynopsis(existingVariant.synopsis || existingVariant.content || '')
      setGenre(existingVariant.genre || '')
      setTone(existingVariant.tone_description || existingVariant.tone || '')
      setArtStyle(resolveVariantArtStyle(existingVariant))
      setAspectRatio(resolveVariantAspectRatio(existingVariant))
      setDuration(existingVariant.duration || 'short_film')
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
    }
  }, [existingVariant, initialIdea, open])
  
  // Handle ideation concept selection
  const handleSelectConcept = (concept: IdeationConcept) => {
    setSynopsis(concept.synopsis || concept.logline)
    if (concept.genre) setGenre(concept.genre)
    if (concept.tone) setTone(concept.tone)
    setShowIdeation(false)
    toast.success('Concept loaded! Customize and generate.')
  }
  
  // Toggle instruction template
  const toggleInstruction = (id: string) => {
    setSelectedInstructions(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    )
  }
  
  // Build combined input
  const buildInput = () => {
    let input = synopsis
    
    // Add selected instruction templates
    const instructionTexts = selectedInstructions
      .map(id => CREATIVE_INSTRUCTION_TEMPLATES.find(t => t.id === id)?.text)
      .filter(Boolean)
    
    if (instructionTexts.length > 0 || customInstruction.trim()) {
      input += '\n\n--- Creative Direction ---\n'
      input += instructionTexts.join('\n')
      if (customInstruction.trim()) {
        input += '\n' + customInstruction.trim()
      }
    }
    
    return input
  }
  
  // Handle generate
  const handleGenerate = async () => {
    if (!synopsis.trim()) {
      toast.error('Please enter a project concept or synopsis')
      return
    }
    
    const hasStoryDirections = selectedInstructions.length > 0 || customInstruction.trim().length > 0
    const variantCount = hasStoryDirections ? 1 : (generateThreeDirections ? 3 : 1)
    
    if (hasStoryDirections) {
      console.log('[BlueprintDialog] Story directions selected - using single variant mode to prevent OOM')
    } else if (generateThreeDirections) {
      console.log('[BlueprintDialog] Generating 3 creative directions')
    }
    
    const format = resolveProductionFormat(genre)
    
    setIsGenerating(true)
    try {
      await onGenerate(buildInput(), {
        genre,
        tone,
        artStyle,
        aspectRatio,
        duration,
        targetAudience: audienceDef.description?.trim() || undefined,
        audienceDefinition: audienceDef.description?.trim() ? audienceDef : undefined,
        variantCount,
        hasStoryDirections,
        generateThreeDirections,
        rigor,
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
                <span>Create Blueprint</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isReimaginMode ? 'Form to reimagine an existing blueprint' : 'Form to create a new blueprint'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Ideation Section (only for new blueprints) */}
          {!isReimaginMode && showIdeation && (
            <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
              <IdeationSection onSelectConcept={handleSelectConcept} />
              <button
                onClick={() => setShowIdeation(false)}
                className="mt-3 text-xs text-gray-500 hover:text-gray-400"
              >
                Skip ideation, I know what I want
              </button>
            </div>
          )}
          
          {/* Main Input */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Film className="w-4 h-4 text-cyan-400" />
              Your Concept
            </label>
            <Textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Describe your concept. Include the main topic, subjects or characters, and what you want the audience to take away..."
              className="min-h-[140px] bg-slate-800/50 border-slate-700 focus:ring-cyan-500/50"
            />
          </div>
          
          {/* Quick Settings Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Palette className="w-3 h-3" /> Format / Genre
              </label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {GENRE_CATEGORIES.map(category => (
                    <SelectGroup key={category}>
                      <SelectLabel className="text-xs text-gray-500 font-semibold px-2 py-1.5">{category}</SelectLabel>
                      {GENRE_OPTIONS.filter(opt => opt.category === category).map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {genre && (
                <p className="text-[10px] text-cyan-400/80">{getIntentLabel(contentIntent)}</p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Duration
              </label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                genre: genre || undefined,
                format: resolveProductionFormat(genre),
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

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>
          
          {showAdvanced && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Generation Quality</label>
                <Select value={rigor} onValueChange={(v) => setRigor(v as 'fast' | 'balanced' | 'thorough')}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thorough">Thorough (default, highest quality)</SelectItem>
                    <SelectItem value="balanced">Balanced (faster, full quality checklist)</SelectItem>
                    <SelectItem value="fast">Fast (lighter blueprint, fastest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateThreeDirections}
                  onChange={(e) => setGenerateThreeDirections(e.target.checked)}
                  disabled={selectedInstructions.length > 0 || customInstruction.trim().length > 0}
                  className="mt-0.5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
                />
                <span className="text-xs text-gray-400">
                  Generate 3 creative directions (A/B/C style variants)
                  {(selectedInstructions.length > 0 || customInstruction.trim().length > 0) && (
                    <span className="block text-gray-500 mt-0.5">Unavailable when creative direction templates are selected</span>
                  )}
                </span>
              </label>
            </div>
          )}
          
          {/* Creative Direction Templates */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Target className="w-4 h-4 text-purple-400" />
              Creative Direction
              <span className="text-xs text-gray-500">(optional - click to select)</span>
            </label>
            
            <div className="flex flex-wrap gap-2">
              {visibleCreativeTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => toggleInstruction(template.id)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-lg border transition-all',
                    selectedInstructions.includes(template.id)
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'bg-slate-800/50 border-slate-700 text-gray-400 hover:border-slate-600 hover:text-gray-300'
                  )}
                >
                  {template.label}
                </button>
              ))}
            </div>
            
            {/* Custom instruction */}
            <Textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="Add any specific creative direction..."
              className="min-h-[60px] bg-slate-800/50 border-slate-700 text-sm"
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
            disabled={isGenerating || !synopsis.trim()}
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
    </Dialog>
  )
}

export default BlueprintReimaginDialog
