'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/textarea'
import { toast } from 'sonner'
import { Wand2, Loader2, Palette, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type TreatmentVariant = {
  id: string
  tone?: string
  tone_description?: string
  visual_style?: string
  themes?: string[] | string
  [key: string]: any
}

type Props = {
  open: boolean
  variant: TreatmentVariant | null
  onClose: () => void
  onApply: (patch: Partial<TreatmentVariant>) => void
  projectId?: string
}

const INSTRUCTION_TEMPLATES = [
  { id: 'unify-tone', label: 'Unify Tone', text: 'Ensure consistent tone throughout all story elements.' },
  { id: 'visual-clarity', label: 'Visual Clarity', text: 'Make visual style directions more specific and actionable.' },
  { id: 'theme-depth', label: 'Deepen Themes', text: 'Explore themes with more nuance and complexity.' },
]

export function ToneStyleEditDialog({ open, variant, onClose, onApply, projectId }: Props) {
  const [draft, setDraft] = useState<Partial<TreatmentVariant>>({})
  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([])
  const [customInstruction, setCustomInstruction] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (variant) {
      setDraft({
        tone_description: variant.tone_description || variant.tone,
        visual_style: variant.visual_style,
        themes: variant.themes,
      })
      setHasChanges(false)
    }
  }, [variant, open])

  const toggleInstruction = (id: string) => {
    setSelectedInstructions(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const updateDraft = (key: string, value: any) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
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
          section: 'tone',
          variant: { ...variant, ...draft },
          instructions: instructions.join('\n'),
          projectId,
        }),
      })

      if (!res.ok) throw new Error('Refinement failed')
      const data = await res.json()
      if (data.success && data.refined) {
        setDraft(prev => ({ ...prev, ...data.refined }))
        setHasChanges(true)
        toast.success('Tone & style refined!')
      }
    } catch (error) {
      console.error('Refine error:', error)
      toast.error('Failed to refine')
    } finally {
      setIsRefining(false)
    }
  }

  const handleApply = () => {
    onApply(draft)
    toast.success('Tone & style updated!')
    onClose()
  }

  if (!variant) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden bg-slate-900 border-slate-700 relative">
        {isRefining && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
            <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-8 shadow-2xl flex flex-col items-center max-w-sm text-center">
              <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Refining Tone & Style</h3>
              <p className="text-sm text-gray-400">AI is enhancing your creative direction...</p>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Palette className="w-5 h-5 text-cyan-400" />
            <span>Edit Tone & Style</span>
            {hasChanges && (
              <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                Unsaved Changes
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <Palette className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Tone, Style & Themes</h3>
              <p className="text-xs text-gray-500">Visual style, mood, and thematic elements</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {INSTRUCTION_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => toggleInstruction(template.id)}
                title={template.text}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg border transition-all',
                  selectedInstructions.includes(template.id)
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-800/50 border-slate-700 text-gray-400 hover:border-slate-600 hover:text-gray-300'
                )}
              >
                {template.label}
              </button>
            ))}
          </div>

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
              <Textarea
                value={Array.isArray(draft.themes) ? draft.themes.join(', ') : draft.themes || ''}
                onChange={(e) => updateDraft('themes', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                className="min-h-[60px] bg-slate-800/50 border-slate-700"
                placeholder="e.g., Redemption, Family bonds, Technology vs humanity"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="Add specific refinement instructions..."
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
              Refine Tone & Style
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700 flex-shrink-0">
          <Button onClick={onClose} variant="outline" className="border-slate-700">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!hasChanges}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Apply Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
