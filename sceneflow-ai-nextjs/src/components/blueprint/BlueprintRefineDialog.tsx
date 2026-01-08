'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { toast } from 'sonner'
import { useGuideStore } from '@/store/useGuideStore'
import { 
  PencilLine, 
  Wand2, 
  Loader2, 
  FileText,
  MapPin,
  Palette,
  Clock,
  Users,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Save,
  User,
  Target,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

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

type Beat = {
  title: string
  intent?: string
  minutes: number
  synopsis?: string
}

type TreatmentVariant = {
  id: string
  // Core Identifying Information
  title?: string
  logline?: string
  genre?: string
  format_length?: string
  target_audience?: string
  author_writer?: string
  
  // Story Setup
  synopsis?: string
  content?: string
  setting?: string
  protagonist?: string
  antagonist?: string
  act_breakdown?: { act1?: string; act2?: string; act3?: string }
  
  // Tone, Style, Themes
  tone?: string
  tone_description?: string
  style?: string
  visual_style?: string
  themes?: string[] | string
  mood_references?: string[]
  
  // Characters
  character_descriptions?: Character[]
  
  // Beats & Runtime
  beats?: Beat[]
  total_duration_seconds?: number
  estimatedDurationMinutes?: number
}

type Props = {
  open: boolean
  variant: TreatmentVariant | null
  onClose: () => void
  onApply: (patch: Partial<TreatmentVariant>) => void
  projectId?: string
}

// Section-specific instruction templates
const SECTION_TEMPLATES: Record<string, { id: string; label: string; text: string }[]> = {
  core: [
    { id: 'sharpen-logline', label: 'Sharpen Logline', text: 'Make the logline more compelling with a stronger hook and clearer stakes.' },
    { id: 'clarify-genre', label: 'Clarify Genre', text: 'Ensure genre expectations are clear and consistent throughout.' },
    { id: 'refine-title', label: 'Stronger Title', text: 'Suggest a more memorable, evocative title that captures the essence.' },
  ],
  story: [
    { id: 'expand-setting', label: 'Expand Setting', text: 'Add more vivid details to the setting and world-building.' },
    { id: 'deepen-protagonist', label: 'Deepen Protagonist', text: 'Give the protagonist more depth, clearer motivation, and internal conflict.' },
    { id: 'strengthen-antagonist', label: 'Strengthen Antagonist', text: 'Make the antagonist more formidable and their opposition more meaningful.' },
    { id: 'add-conflict', label: 'Add Conflict', text: 'Increase the central conflict and raise the stakes.' },
  ],
  tone: [
    { id: 'unify-tone', label: 'Unify Tone', text: 'Ensure consistent tone throughout all story elements.' },
    { id: 'visual-clarity', label: 'Visual Clarity', text: 'Make visual style directions more specific and actionable.' },
    { id: 'theme-depth', label: 'Deepen Themes', text: 'Explore themes with more nuance and complexity.' },
  ],
  beats: [
    { id: 'improve-pacing', label: 'Improve Pacing', text: 'Adjust beat durations for better pacing and flow.' },
    { id: 'rising-action', label: 'Rising Action', text: 'Strengthen the escalation and rising tension.' },
    { id: 'stronger-climax', label: 'Stronger Climax', text: 'Make the climax more impactful and satisfying.' },
    { id: 'clear-resolution', label: 'Clear Resolution', text: 'Ensure a satisfying and meaningful resolution.' },
  ],
  characters: [
    { id: 'add-depth', label: 'Add Psychological Depth', text: 'Add more internal conflict, wants vs needs, and character flaws.' },
    { id: 'strengthen-arcs', label: 'Strengthen Arcs', text: 'Make character transformations more pronounced and earned.' },
    { id: 'distinct-voices', label: 'Distinct Voices', text: 'Give each character a more unique personality and voice.' },
    { id: 'relationship-dynamics', label: 'Relationship Dynamics', text: 'Enrich the relationships and dynamics between characters.' },
  ],
}

// =============================================================================
// SECTION COMPONENTS
// =============================================================================

function InstructionChips({ 
  section, 
  selected, 
  onToggle 
}: { 
  section: string
  selected: string[]
  onToggle: (id: string) => void 
}) {
  const templates = SECTION_TEMPLATES[section] || []
  
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {templates.map(template => (
        <button
          key={template.id}
          onClick={() => onToggle(template.id)}
          title={template.text}
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg border transition-all',
            selected.includes(template.id)
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
              : 'bg-slate-800/50 border-slate-700 text-gray-400 hover:border-slate-600 hover:text-gray-300'
          )}
        >
          {template.label}
        </button>
      ))}
    </div>
  )
}

function SectionHeader({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType
  title: string
  description: string 
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-cyan-400" />
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  )
}

// Character inline editor
function CharacterEditor({ 
  character, 
  index,
  onChange 
}: { 
  character: Character
  index: number
  onChange: (index: number, field: keyof Character, value: string) => void 
}) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-cyan-400" />
          <span className="font-medium text-white">{character.name || 'Unnamed Character'}</span>
          <span className="text-xs text-gray-500">{character.role}</span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      
      {/* Expanded content */}
      {expanded && (
        <div className="p-4 space-y-4 bg-slate-900/50">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Name</label>
              <Input
                value={character.name || ''}
                onChange={(e) => onChange(index, 'name', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Role</label>
              <Input
                value={character.role || ''}
                onChange={(e) => onChange(index, 'role', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-sm"
              />
            </div>
          </div>
          
          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Description</label>
            <Textarea
              value={character.description || ''}
              onChange={(e) => onChange(index, 'description', e.target.value)}
              className="min-h-[60px] bg-slate-800/50 border-slate-700 text-sm"
            />
          </div>
          
          {/* Appearance */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Appearance</label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Build"
                value={character.build || ''}
                onChange={(e) => onChange(index, 'build', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-xs"
              />
              <Input
                placeholder="Hair Style"
                value={character.hairStyle || ''}
                onChange={(e) => onChange(index, 'hairStyle', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-xs"
              />
              <Input
                placeholder="Hair Color"
                value={character.hairColor || ''}
                onChange={(e) => onChange(index, 'hairColor', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-xs"
              />
              <Input
                placeholder="Eye Color"
                value={character.eyeColor || ''}
                onChange={(e) => onChange(index, 'eyeColor', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-xs"
              />
              <Input
                placeholder="Key Feature"
                value={character.keyFeature || ''}
                onChange={(e) => onChange(index, 'keyFeature', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-xs"
              />
              <Input
                placeholder="Expression"
                value={character.expression || ''}
                onChange={(e) => onChange(index, 'expression', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-xs"
              />
            </div>
          </div>
          
          {/* Psychological Depth */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Psychological Depth</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="External Goal"
                value={character.externalGoal || ''}
                onChange={(e) => onChange(index, 'externalGoal', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-xs"
              />
              <Input
                placeholder="Internal Need"
                value={character.internalNeed || ''}
                onChange={(e) => onChange(index, 'internalNeed', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-xs"
              />
              <Input
                placeholder="Fatal Flaw"
                value={character.fatalFlaw || ''}
                onChange={(e) => onChange(index, 'fatalFlaw', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-xs"
              />
              <Input
                placeholder="Arc Shift"
                value={character.arcShift || ''}
                onChange={(e) => onChange(index, 'arcShift', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BlueprintRefineDialog({
  open,
  variant,
  onClose,
  onApply,
  projectId
}: Props) {
  const [activeTab, setActiveTab] = useState('core')
  const [draft, setDraft] = useState<Partial<TreatmentVariant>>({})
  const [selectedInstructions, setSelectedInstructions] = useState<Record<string, string[]>>({
    core: [],
    story: [],
    tone: [],
    beats: [],
    characters: [],
  })
  const [customInstructions, setCustomInstructions] = useState<Record<string, string>>({
    core: '',
    story: '',
    tone: '',
    beats: '',
    characters: '',
  })
  const [isRefining, setIsRefining] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Initialize draft from variant
  useEffect(() => {
    if (variant) {
      setDraft({
        title: variant.title,
        logline: variant.logline,
        genre: variant.genre,
        target_audience: variant.target_audience,
        synopsis: variant.synopsis || variant.content,
        setting: variant.setting,
        protagonist: variant.protagonist,
        antagonist: variant.antagonist,
        tone_description: variant.tone_description || variant.tone,
        visual_style: variant.visual_style,
        themes: variant.themes,
        character_descriptions: variant.character_descriptions ? [...variant.character_descriptions] : [],
        beats: variant.beats ? [...variant.beats] : [],
      })
      setHasChanges(false)
    }
  }, [variant, open])
  
  // Toggle instruction for a section
  const toggleInstruction = (section: string, id: string) => {
    setSelectedInstructions(prev => ({
      ...prev,
      [section]: prev[section].includes(id)
        ? prev[section].filter(i => i !== id)
        : [...prev[section], id]
    }))
  }
  
  // Update draft field
  const updateDraft = (field: keyof TreatmentVariant, value: any) => {
    setDraft(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }
  
  // Update character field
  const updateCharacter = (index: number, field: keyof Character, value: string) => {
    setDraft(prev => {
      const characters = [...(prev.character_descriptions || [])]
      characters[index] = { ...characters[index], [field]: value }
      return { ...prev, character_descriptions: characters }
    })
    setHasChanges(true)
  }
  
  // Refine section with AI
  const refineSection = async (section: string) => {
    const instructions = selectedInstructions[section] || []
    const custom = customInstructions[section] || ''
    
    if (instructions.length === 0 && !custom.trim()) {
      toast.error('Select at least one refinement or add custom instructions')
      return
    }
    
    setIsRefining(section)
    
    try {
      // Build instruction text
      const templates = SECTION_TEMPLATES[section] || []
      const instructionTexts = instructions
        .map(id => templates.find(t => t.id === id)?.text)
        .filter(Boolean)
      
      const combinedInstructions = [
        ...instructionTexts,
        custom.trim()
      ].filter(Boolean).join('\n')
      
      const response = await fetch('/api/treatment/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant: draft,
          section,
          instructions: combinedInstructions
        })
      })
      
      if (!response.ok) throw new Error('Refinement failed')
      
      const data = await response.json()
      
      if (data.success && data.draft) {
        // Merge refined fields into draft
        setDraft(prev => ({ ...prev, ...data.draft }))
        setHasChanges(true)
        toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} refined!`)
        
        // Clear selected instructions for this section
        setSelectedInstructions(prev => ({ ...prev, [section]: [] }))
        setCustomInstructions(prev => ({ ...prev, [section]: '' }))
      }
    } catch (error) {
      console.error('Refine error:', error)
      toast.error('Failed to refine section')
    } finally {
      setIsRefining(null)
    }
  }
  
  // Apply all changes
  const handleApply = () => {
    onApply(draft)
    toast.success('Blueprint updated!')
    onClose()
  }
  
  if (!variant) return null
  
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-slate-900 border-slate-700 relative">
        {/* Freeze overlay during AI refinement */}
        {isRefining && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
            <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-8 shadow-2xl flex flex-col items-center max-w-sm text-center">
              <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Refining {isRefining.charAt(0).toUpperCase() + isRefining.slice(1)}</h3>
              <p className="text-sm text-gray-400">AI is enhancing your Blueprint section...</p>
              <div className="flex gap-1 mt-3">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PencilLine className="w-5 h-5 text-cyan-400" />
            <span>Refine Blueprint</span>
            {hasChanges && (
              <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                Unsaved Changes
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-5 bg-slate-800/50 mb-4">
            <TabsTrigger value="core" className="text-xs">Core Info</TabsTrigger>
            <TabsTrigger value="story" className="text-xs">Story Setup</TabsTrigger>
            <TabsTrigger value="tone" className="text-xs">Tone & Style</TabsTrigger>
            <TabsTrigger value="beats" className="text-xs">Beats</TabsTrigger>
            <TabsTrigger value="characters" className="text-xs">Characters</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {/* Core Info Tab */}
            <TabsContent value="core" className="space-y-4 mt-0">
              <SectionHeader 
                icon={FileText} 
                title="Core Identifying Information" 
                description="Title, logline, genre, and audience targeting"
              />
              
              <InstructionChips
                section="core"
                selected={selectedInstructions.core}
                onToggle={(id) => toggleInstruction('core', id)}
              />
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Title</label>
                  <Input
                    value={draft.title || ''}
                    onChange={(e) => updateDraft('title', e.target.value)}
                    className="bg-slate-800/50 border-slate-700"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Logline</label>
                  <Textarea
                    value={draft.logline || ''}
                    onChange={(e) => updateDraft('logline', e.target.value)}
                    className="min-h-[80px] bg-slate-800/50 border-slate-700"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Genre</label>
                    <Input
                      value={draft.genre || ''}
                      onChange={(e) => updateDraft('genre', e.target.value)}
                      className="bg-slate-800/50 border-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Target Audience</label>
                    <Input
                      value={draft.target_audience || ''}
                      onChange={(e) => updateDraft('target_audience', e.target.value)}
                      className="bg-slate-800/50 border-slate-700"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Textarea
                  value={customInstructions.core}
                  onChange={(e) => setCustomInstructions(prev => ({ ...prev, core: e.target.value }))}
                  placeholder="Add specific refinement instructions..."
                  className="min-h-[60px] bg-slate-800/50 border-slate-700 text-sm"
                />
                <Button
                  onClick={() => refineSection('core')}
                  disabled={isRefining === 'core'}
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  {isRefining === 'core' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Refine Core Info
                </Button>
              </div>
            </TabsContent>
            
            {/* Story Setup Tab */}
            <TabsContent value="story" className="space-y-4 mt-0">
              <SectionHeader 
                icon={MapPin} 
                title="Story Setup" 
                description="Synopsis, setting, protagonist, and antagonist"
              />
              
              <InstructionChips
                section="story"
                selected={selectedInstructions.story}
                onToggle={(id) => toggleInstruction('story', id)}
              />
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Synopsis</label>
                  <Textarea
                    value={draft.synopsis || ''}
                    onChange={(e) => updateDraft('synopsis', e.target.value)}
                    className="min-h-[100px] bg-slate-800/50 border-slate-700"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Setting</label>
                  <Textarea
                    value={draft.setting || ''}
                    onChange={(e) => updateDraft('setting', e.target.value)}
                    className="min-h-[60px] bg-slate-800/50 border-slate-700"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Protagonist</label>
                  <Textarea
                    value={draft.protagonist || ''}
                    onChange={(e) => updateDraft('protagonist', e.target.value)}
                    className="min-h-[60px] bg-slate-800/50 border-slate-700"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Antagonist / Central Conflict</label>
                  <Textarea
                    value={draft.antagonist || ''}
                    onChange={(e) => updateDraft('antagonist', e.target.value)}
                    className="min-h-[60px] bg-slate-800/50 border-slate-700"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Textarea
                  value={customInstructions.story}
                  onChange={(e) => setCustomInstructions(prev => ({ ...prev, story: e.target.value }))}
                  placeholder="Add specific refinement instructions..."
                  className="min-h-[60px] bg-slate-800/50 border-slate-700 text-sm"
                />
                <Button
                  onClick={() => refineSection('story')}
                  disabled={isRefining === 'story'}
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  {isRefining === 'story' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Refine Story Setup
                </Button>
              </div>
            </TabsContent>
            
            {/* Tone & Style Tab */}
            <TabsContent value="tone" className="space-y-4 mt-0">
              <SectionHeader 
                icon={Palette} 
                title="Tone, Style & Themes" 
                description="Visual style, mood, and thematic elements"
              />
              
              <InstructionChips
                section="tone"
                selected={selectedInstructions.tone}
                onToggle={(id) => toggleInstruction('tone', id)}
              />
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Tone Description</label>
                  <Textarea
                    value={draft.tone_description || ''}
                    onChange={(e) => updateDraft('tone_description', e.target.value)}
                    className="min-h-[80px] bg-slate-800/50 border-slate-700"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Visual Style</label>
                  <Textarea
                    value={draft.visual_style || ''}
                    onChange={(e) => updateDraft('visual_style', e.target.value)}
                    className="min-h-[80px] bg-slate-800/50 border-slate-700"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Themes (comma-separated)</label>
                  <Input
                    value={Array.isArray(draft.themes) ? draft.themes.join(', ') : draft.themes || ''}
                    onChange={(e) => updateDraft('themes', e.target.value.split(',').map(t => t.trim()))}
                    className="bg-slate-800/50 border-slate-700"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Textarea
                  value={customInstructions.tone}
                  onChange={(e) => setCustomInstructions(prev => ({ ...prev, tone: e.target.value }))}
                  placeholder="Add specific refinement instructions..."
                  className="min-h-[60px] bg-slate-800/50 border-slate-700 text-sm"
                />
                <Button
                  onClick={() => refineSection('tone')}
                  disabled={isRefining === 'tone'}
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  {isRefining === 'tone' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Refine Tone & Style
                </Button>
              </div>
            </TabsContent>
            
            {/* Beats Tab */}
            <TabsContent value="beats" className="space-y-4 mt-0">
              <SectionHeader 
                icon={Clock} 
                title="Beats & Runtime" 
                description="Story structure and pacing"
              />
              
              <InstructionChips
                section="beats"
                selected={selectedInstructions.beats}
                onToggle={(id) => toggleInstruction('beats', id)}
              />
              
              <div className="space-y-2">
                {(draft.beats || []).map((beat, index) => (
                  <div key={index} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <Input
                        value={beat.title || ''}
                        onChange={(e) => {
                          const beats = [...(draft.beats || [])]
                          beats[index] = { ...beats[index], title: e.target.value }
                          updateDraft('beats', beats)
                        }}
                        className="bg-transparent border-none text-sm font-medium p-0 h-auto"
                        placeholder="Beat title..."
                      />
                      <span className="text-xs text-gray-500">{beat.minutes} min</span>
                    </div>
                    <Textarea
                      value={beat.synopsis || beat.intent || ''}
                      onChange={(e) => {
                        const beats = [...(draft.beats || [])]
                        beats[index] = { ...beats[index], synopsis: e.target.value }
                        updateDraft('beats', beats)
                      }}
                      className="min-h-[40px] bg-slate-900/50 border-slate-700 text-xs"
                      placeholder="Beat description..."
                    />
                  </div>
                ))}
                
                {(!draft.beats || draft.beats.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No beats defined yet</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Textarea
                  value={customInstructions.beats}
                  onChange={(e) => setCustomInstructions(prev => ({ ...prev, beats: e.target.value }))}
                  placeholder="Add specific refinement instructions..."
                  className="min-h-[60px] bg-slate-800/50 border-slate-700 text-sm"
                />
                <Button
                  onClick={() => refineSection('beats')}
                  disabled={isRefining === 'beats'}
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  {isRefining === 'beats' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Refine Beats
                </Button>
              </div>
            </TabsContent>
            
            {/* Characters Tab */}
            <TabsContent value="characters" className="space-y-4 mt-0">
              <SectionHeader 
                icon={Users} 
                title="Characters" 
                description="Character details and psychological depth"
              />
              
              <InstructionChips
                section="characters"
                selected={selectedInstructions.characters}
                onToggle={(id) => toggleInstruction('characters', id)}
              />
              
              <div className="space-y-3">
                {(draft.character_descriptions || []).map((character, index) => (
                  <CharacterEditor
                    key={index}
                    character={character}
                    index={index}
                    onChange={updateCharacter}
                  />
                ))}
                
                {(!draft.character_descriptions || draft.character_descriptions.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No characters defined yet</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Textarea
                  value={customInstructions.characters}
                  onChange={(e) => setCustomInstructions(prev => ({ ...prev, characters: e.target.value }))}
                  placeholder="Add specific refinement instructions..."
                  className="min-h-[60px] bg-slate-800/50 border-slate-700 text-sm"
                />
                <Button
                  onClick={() => refineSection('characters')}
                  disabled={isRefining === 'characters'}
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  {isRefining === 'characters' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Refine Characters
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
        
        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!hasChanges}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            <Save className="w-4 h-4 mr-2" />
            Apply Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BlueprintRefineDialog
