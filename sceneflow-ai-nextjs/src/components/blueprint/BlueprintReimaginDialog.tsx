'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
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
    visualStyle?: string
    duration?: string
    targetAudience?: string
  }) => Promise<void>
  existingVariant?: any // For reimagine mode (editing existing)
  initialIdea?: IdeationConcept // Pre-populated from Ideation
  projectId?: string
}

// Genre options
const GENRE_OPTIONS = [
  { value: 'drama', label: 'Drama' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'horror', label: 'Horror' },
  { value: 'scifi', label: 'Sci-Fi' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'action', label: 'Action' },
  { value: 'romance', label: 'Romance' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'animation', label: 'Animation' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'adventure', label: 'Adventure' },
]

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

const VISUAL_STYLE_OPTIONS = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'noir', label: 'Film Noir' },
  { value: 'vibrant', label: 'Vibrant & Colorful' },
  { value: 'muted', label: 'Muted & Desaturated' },
  { value: 'stylized', label: 'Stylized' },
  { value: 'realistic', label: 'Hyper-Realistic' },
  { value: 'vintage', label: 'Vintage/Retro' },
  { value: 'neon', label: 'Neon/Cyberpunk' },
  { value: 'minimalist', label: 'Minimalist' },
]

const DURATION_OPTIONS = [
  { value: 'micro_short', label: 'Micro (< 5 min)' },
  { value: 'short_film', label: 'Short (5-30 min)' },
  { value: 'featurette', label: 'Featurette (30-60 min)' },
  { value: 'feature_length', label: 'Feature (60-120 min)' },
  { value: 'epic', label: 'Epic (120-180 min)' },
]

const AUDIENCE_OPTIONS = [
  { value: 'general', label: 'General Audience' },
  { value: 'family', label: 'Family Friendly' },
  { value: 'teens', label: 'Teens & Young Adults' },
  { value: 'adults', label: 'Adults' },
  { value: 'mature', label: 'Mature Audience' },
  { value: 'niche', label: 'Niche/Specialized' },
]

// Instruction templates for the guided prompt builder
const STORY_INSTRUCTION_TEMPLATES = [
  { id: 'more-conflict', label: 'Add More Conflict', text: 'Increase the central conflict and stakes for the protagonist.' },
  { id: 'deeper-motivation', label: 'Deepen Motivation', text: 'Give the protagonist a stronger, more compelling motivation.' },
  { id: 'twist-ending', label: 'Add a Twist', text: 'Include an unexpected plot twist that recontextualizes the story.' },
  { id: 'emotional-depth', label: 'Emotional Depth', text: 'Amplify the emotional journey and character connections.' },
  { id: 'faster-pacing', label: 'Faster Pacing', text: 'Tighten the narrative with quicker scene progression.' },
  { id: 'world-building', label: 'Expand World', text: 'Add richer world-building details and setting atmosphere.' },
  { id: 'moral-dilemma', label: 'Moral Dilemma', text: 'Introduce a challenging moral choice for the main character.' },
  { id: 'relationship-focus', label: 'Focus on Relationships', text: 'Emphasize interpersonal dynamics between characters.' },
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

  const quickTags = ['drama', 'thriller', 'documentary', 'sci-fi', 'comedy', 'mystery']

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
  projectId
}: Props) {
  const { setTreatmentVariants } = useGuideStore()
  
  // Form state
  const [synopsis, setSynopsis] = useState('')
  const [genre, setGenre] = useState('')
  const [tone, setTone] = useState('')
  const [visualStyle, setVisualStyle] = useState('')
  const [duration, setDuration] = useState('short_film')
  const [targetAudience, setTargetAudience] = useState('')
  
  // Instruction builder state
  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([])
  const [customInstruction, setCustomInstruction] = useState('')
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showIdeation, setShowIdeation] = useState(!existingVariant)
  
  // Determine mode
  const isReimaginMode = !!existingVariant
  
  // Initialize from existing variant or initial idea
  useEffect(() => {
    if (existingVariant) {
      setSynopsis(existingVariant.synopsis || existingVariant.content || '')
      setGenre(existingVariant.genre || '')
      setTone(existingVariant.tone_description || existingVariant.tone || '')
      setVisualStyle(existingVariant.visual_style || '')
      setDuration(existingVariant.duration || 'short_film')
      setTargetAudience(existingVariant.target_audience || '')
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
      .map(id => STORY_INSTRUCTION_TEMPLATES.find(t => t.id === id)?.text)
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
      toast.error('Please enter a story concept or synopsis')
      return
    }
    
    setIsGenerating(true)
    try {
      await onGenerate(buildInput(), {
        genre,
        tone,
        visualStyle,
        duration,
        targetAudience
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
              Your Story Concept
            </label>
            <Textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Describe your film or video concept. Include the main story, characters, and what you want the audience to feel..."
              className="min-h-[140px] bg-slate-800/50 border-slate-700 focus:ring-cyan-500/50"
            />
          </div>
          
          {/* Quick Settings Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Palette className="w-3 h-3" /> Genre
              </label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {GENRE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Users className="w-3 h-3" /> Audience
              </label>
              <Select value={targetAudience} onValueChange={setTargetAudience}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAdvanced ? 'Hide' : 'Show'} Visual Style Options
          </button>
          
          {showAdvanced && (
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Visual Style</label>
              <Select value={visualStyle} onValueChange={setVisualStyle}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-sm">
                  <SelectValue placeholder="Select visual style..." />
                </SelectTrigger>
                <SelectContent>
                  {VISUAL_STYLE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Story Direction Templates */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Target className="w-4 h-4 text-purple-400" />
              Story Direction
              <span className="text-xs text-gray-500">(optional - click to select)</span>
            </label>
            
            <div className="flex flex-wrap gap-2">
              {STORY_INSTRUCTION_TEMPLATES.map(template => (
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
