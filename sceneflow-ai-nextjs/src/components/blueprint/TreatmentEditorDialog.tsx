'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { toast } from 'sonner'
import { useGuideStore } from '@/store/useGuideStore'
import { 
  PencilLine, 
  Wand2, 
  X, 
  Check, 
  Loader2, 
  Sparkles,
  Clock,
  Palette,
  Users,
  Film,
  RefreshCw
} from 'lucide-react'

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

type Variant = {
  id: string
  label?: string
  title?: string
  logline?: string
  synopsis?: string
  content?: string
  tone_description?: string
  style?: string
  visual_style?: string
  target_audience?: string
  genre?: string
  duration?: string
}

type Props = {
  open: boolean
  variant: Variant | null
  onClose: () => void
  onApply: (patch: Partial<Variant>) => void
}

// Preset options for dropdowns
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
  { value: 'micro_short', label: 'Micro (< 5 min)', description: 'Social media, quick narratives' },
  { value: 'short_film', label: 'Short (5-30 min)', description: 'Festival shorts, web series' },
  { value: 'featurette', label: 'Featurette (30-60 min)', description: 'Mid-length content' },
  { value: 'feature_length', label: 'Feature (60-120 min)', description: 'Full-length films' },
  { value: 'epic', label: 'Epic (120-180 min)', description: 'Extended features' },
]

const AUDIENCE_OPTIONS = [
  { value: 'general', label: 'General Audience' },
  { value: 'family', label: 'Family Friendly' },
  { value: 'teens', label: 'Teens & Young Adults' },
  { value: 'adults', label: 'Adults' },
  { value: 'mature', label: 'Mature Audience' },
  { value: 'niche', label: 'Niche/Specialized' },
]

const QUICK_EDITS = [
  { id: 'darker', label: 'Make Darker', instruction: 'Make the tone darker and more intense, add tension' },
  { id: 'lighter', label: 'Add Humor', instruction: 'Add comedic elements while keeping the story intact' },
  { id: 'shorter', label: 'Condense', instruction: 'Shorten the synopsis, make it punchier and more concise' },
  { id: 'emotional', label: 'More Emotional', instruction: 'Amplify the emotional beats and character depth' },
  { id: 'action', label: 'Add Action', instruction: 'Increase the action and pacing, add dynamic sequences' },
  { id: 'mystery', label: 'Add Mystery', instruction: 'Introduce mysterious elements, create intrigue' },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TreatmentEditorDialog({ open, variant, onClose, onApply }: Props) {
  const [mode, setMode] = useState<'guided' | 'expert'>('guided')
  const [draft, setDraft] = useState<Partial<Variant> | null>(null)
  const [aiInstr, setAiInstr] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [regenerate, setRegenerate] = useState(false)
  const [appliedMessage, setAppliedMessage] = useState('')
  const dirtyRef = useRef(false)
  const { markJustApplied } = useGuideStore() as any

  // Initialize draft when dialog opens
  useEffect(() => {
    if (!open) return
    setMode('guided')
    setAiInstr('')
    setProgress(0)
    setAiLoading(false)
    setRegenerate(false)
    setDraft(variant ? { 
      ...variant, 
      content: variant.synopsis || variant.content,
      genre: variant.genre || '',
      tone_description: variant.tone_description || '',
      visual_style: variant.visual_style || '',
      target_audience: variant.target_audience || '',
      duration: variant.duration || 'short_film'
    } : null)
    dirtyRef.current = false
  }, [open, variant])

  // Progress animation
  const startProgress = () => {
    setProgress(5)
    const id = setInterval(() => setProgress(p => (p < 90 ? p + Math.ceil(Math.random() * 5) : p)), 600)
    return () => clearInterval(id)
  }

  // Handle AI refinement
  const handleRefine = async (instruction?: string) => {
    if (!variant) return
    const stop = startProgress()
    setAiLoading(true)
    try {
      const res = await fetch('/api/ideation/refine-treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          variant: draft || variant, 
          instructions: instruction || aiInstr || 'Improve clarity and concision; keep style consistent' 
        })
      })
      const json = await res.json().catch(() => null)
      if (json?.success && json?.draft) {
        setDraft(d => ({ ...(d || {}), ...json.draft }))
        dirtyRef.current = true
        toast.success('Treatment refined')
      }
    } catch (e) {
      console.error('Refine failed:', e)
      toast.error('Failed to refine treatment')
    }
    stop()
    setProgress(100)
    setTimeout(() => {
      setAiLoading(false)
      setProgress(0)
    }, 300)
  }

  // Handle quick edit button
  const handleQuickEdit = (instruction: string) => {
    setAiInstr(instruction)
    handleRefine(instruction)
  }

  // Mark as dirty on any change
  const onAnyChange = () => { dirtyRef.current = true }

  // Prevent accidental close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // Keyboard shortcut: Cmd+Enter to apply
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      const isCmd = e.metaKey || e.ctrlKey
      if (isCmd && e.key === 'Enter') {
        e.preventDefault()
        handleApply()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, draft, variant, regenerate])

  // Handle apply/regenerate
  const handleApply = async () => {
    if (!draft || !variant) return

    if (regenerate) {
      // Dispatch event for regeneration with new parameters
      window.dispatchEvent(new CustomEvent('sf:regenerate-treatment', { 
        detail: { 
          filmType: draft.duration,
          genre: draft.genre,
          tone: draft.tone_description,
          visualStyle: draft.visual_style,
          targetAudience: draft.target_audience,
          title: draft.title,
          logline: draft.logline
        } 
      }))
      toast.success('Regenerating blueprint...')
      onClose()
    } else {
      // Apply changes directly
      onApply(draft)
      markJustApplied?.(variant.id)
      setAppliedMessage('Treatment updated')
      setTimeout(() => setAppliedMessage(''), 1500)
      dirtyRef.current = false
      toast.success('Treatment updated', { 
        action: { 
          label: 'Undo', 
          onClick: () => (useGuideStore.getState() as any).undoLastEdit() 
        } 
      })
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        if (dirtyRef.current && !confirm('Discard unsaved changes?')) return
        onClose()
      }
    }}>
      <DialogContent className="fixed right-0 left-auto top-0 bottom-0 translate-x-0 translate-y-0 ml-auto w-[min(100vw,900px)] max-w-full overflow-hidden rounded-none border-l bg-gray-950 pr-[env(safe-area-inset-right)]">
        <DialogHeader className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/60 pb-4">
          <DialogTitle className="text-xl font-bold text-white">
            {variant?.title ? `Refine "${variant.title}"` : 'Refine Treatment'}
          </DialogTitle>
          <div className="text-sm text-gray-400 mt-1">
            Polish your concept with guided editing or expert mode
          </div>
          {appliedMessage && (
            <div className="mt-2 text-xs text-emerald-300" role="status" aria-live="polite">{appliedMessage}</div>
          )}
        </DialogHeader>

        <div className="flex flex-col h-[calc(100dvh-80px)]">
          {/* Mode Tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-6 mb-4 grid w-auto grid-cols-2">
              <TabsTrigger value="guided" className="flex items-center gap-2">
                <PencilLine className="w-4 h-4" />
                Guided Mode
              </TabsTrigger>
              <TabsTrigger value="expert" className="flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                Expert Mode
              </TabsTrigger>
            </TabsList>

            {/* Progress Bar */}
            {progress > 0 && progress < 100 && (
              <div className="mx-6 mb-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-xs text-blue-300 font-medium">Refining… {progress}%</span>
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Guided Mode Content */}
            <TabsContent value="guided" className="flex-1 overflow-y-auto px-6 pb-4 mt-0">
              <div className="space-y-5">
                {/* Core Fields */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Film className="w-4 h-4 text-blue-400" />
                    Core Details
                  </h3>
                  
                  {/* Title */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Title</label>
                    <input
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Enter a compelling title..."
                      value={draft?.title || ''}
                      onChange={e => { onAnyChange(); setDraft(d => ({ ...d, title: e.target.value })) }}
                    />
                  </div>

                  {/* Logline */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Logline</label>
                    <textarea
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                      rows={2}
                      placeholder="One sentence that hooks the reader..."
                      value={draft?.logline || ''}
                      onChange={e => { onAnyChange(); setDraft(d => ({ ...d, logline: e.target.value })) }}
                    />
                  </div>
                </div>

                {/* Style & Format */}
                <div className="space-y-4 p-4 rounded-xl bg-gray-900/50 border border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-400" />
                    Style & Format
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Genre */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1.5 block">Genre</label>
                      <Select 
                        value={draft?.genre || ''} 
                        onValueChange={v => { onAnyChange(); setDraft(d => ({ ...d, genre: v })) }}
                      >
                        <SelectTrigger className="w-full border-gray-600 bg-gray-900 text-white">
                          <SelectValue placeholder="Select genre..." />
                        </SelectTrigger>
                        <SelectContent>
                          {GENRE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tone */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1.5 block">Tone</label>
                      <Select 
                        value={draft?.tone_description || ''} 
                        onValueChange={v => { onAnyChange(); setDraft(d => ({ ...d, tone_description: v })) }}
                      >
                        <SelectTrigger className="w-full border-gray-600 bg-gray-900 text-white">
                          <SelectValue placeholder="Select tone..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TONE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Visual Style */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1.5 block">Visual Style</label>
                      <Select 
                        value={draft?.visual_style || ''} 
                        onValueChange={v => { onAnyChange(); setDraft(d => ({ ...d, visual_style: v })) }}
                      >
                        <SelectTrigger className="w-full border-gray-600 bg-gray-900 text-white">
                          <SelectValue placeholder="Select style..." />
                        </SelectTrigger>
                        <SelectContent>
                          {VISUAL_STYLE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Target Audience */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1.5 block">Target Audience</label>
                      <Select 
                        value={draft?.target_audience || ''} 
                        onValueChange={v => { onAnyChange(); setDraft(d => ({ ...d, target_audience: v })) }}
                      >
                        <SelectTrigger className="w-full border-gray-600 bg-gray-900 text-white">
                          <SelectValue placeholder="Select audience..." />
                        </SelectTrigger>
                        <SelectContent>
                          {AUDIENCE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Duration - Full Width */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Duration / Film Type
                    </label>
                    <Select 
                      value={draft?.duration || 'short_film'} 
                      onValueChange={v => { onAnyChange(); setDraft(d => ({ ...d, duration: v })) }}
                    >
                      <SelectTrigger className="w-full border-gray-600 bg-gray-900 text-white">
                        <SelectValue placeholder="Select duration..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div>
                              <div className="font-medium">{opt.label}</div>
                              <div className="text-xs text-gray-400">{opt.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Synopsis */}
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Synopsis</label>
                  <textarea
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    rows={8}
                    placeholder="Tell the story of your project..."
                    value={draft?.synopsis || draft?.content || ''}
                    onChange={e => { onAnyChange(); setDraft(d => ({ ...d, synopsis: e.target.value, content: e.target.value })) }}
                  />
                </div>

                {/* Quick Edits */}
                <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Quick AI Edits
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_EDITS.map(edit => (
                      <button
                        key={edit.id}
                        onClick={() => handleQuickEdit(edit.instruction)}
                        disabled={aiLoading}
                        className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 hover:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {edit.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Expert Mode Content */}
            <TabsContent value="expert" className="flex-1 overflow-y-auto px-6 pb-4 mt-0">
              <div className="space-y-5">
                {/* Direct Edit Fields */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Direct Editing</h3>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Title</label>
                    <input
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={draft?.title || ''}
                      onChange={e => { onAnyChange(); setDraft(d => ({ ...d, title: e.target.value })) }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Logline</label>
                    <textarea
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                      rows={3}
                      value={draft?.logline || ''}
                      onChange={e => { onAnyChange(); setDraft(d => ({ ...d, logline: e.target.value })) }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Synopsis</label>
                    <textarea
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                      rows={10}
                      value={draft?.synopsis || draft?.content || ''}
                      onChange={e => { onAnyChange(); setDraft(d => ({ ...d, synopsis: e.target.value, content: e.target.value })) }}
                    />
                  </div>
                </div>

                {/* AI Refinement Section */}
                <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Wand2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1">AI Refinement</h3>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Describe changes and let AI refine your treatment while preserving its essence.
                      </p>
                    </div>
                  </div>

                  <textarea
                    className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                    rows={4}
                    placeholder={`Examples:
• Make tone darker and more suspenseful
• Shorten to 80 words, keep emotional core
• Target Gen Z with modern references`}
                    value={aiInstr}
                    onChange={e => setAiInstr(e.target.value)}
                  />

                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      💡 Be specific about what to change and preserve
                    </div>
                    <Button
                      onClick={() => handleRefine()}
                      disabled={aiLoading || !aiInstr.trim()}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg disabled:opacity-50 px-5"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Refining...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Refine
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700 bg-gradient-to-t from-gray-950 via-gray-950 to-gray-950/80 backdrop-blur-sm">
            {/* Regenerate Toggle */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-gray-900/50 border border-gray-800">
              <input
                type="checkbox"
                id="regenerate"
                checked={regenerate}
                onChange={e => setRegenerate(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <label htmlFor="regenerate" className="flex-1 cursor-pointer">
                <div className="text-sm font-medium text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  Regenerate Blueprint
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Generate a completely new treatment with AI using your edits as guidance
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  if (dirtyRef.current && !confirm('Discard unsaved changes?')) return
                  onClose()
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
              <div className="flex items-center gap-3">
                {dirtyRef.current && (
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Unsaved changes
                  </div>
                )}
                <Button
                  onClick={handleApply}
                  disabled={aiLoading}
                  className={`px-6 shadow-lg transition-all hover:scale-105 ${
                    regenerate 
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-purple-500/20' 
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                  } text-white`}
                  title="Cmd/Ctrl+Enter"
                >
                  {regenerate ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate New Blueprint
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Apply Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
