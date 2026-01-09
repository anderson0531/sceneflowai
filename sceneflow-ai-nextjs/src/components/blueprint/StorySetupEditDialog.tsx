'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/Input'
import { toast } from 'sonner'
import { Wand2, Loader2, MapPin, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type TreatmentVariant = {
  id: string
  synopsis?: string
  content?: string
  setting?: string
  protagonist?: string
  antagonist?: string
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
  { id: 'expand-setting', label: 'Expand Setting', text: 'Add more vivid details to the setting and world-building.' },
  { id: 'deepen-protagonist', label: 'Deepen Protagonist', text: 'Give the protagonist more depth, clearer motivation, and internal conflict.' },
  { id: 'strengthen-antagonist', label: 'Strengthen Antagonist', text: 'Make the antagonist more formidable and their opposition more meaningful.' },
  { id: 'add-conflict', label: 'Add Conflict', text: 'Increase the central conflict and raise the stakes.' },
]

export function StorySetupEditDialog({ open, variant, onClose, onApply, projectId }: Props) {
  const [draft, setDraft] = useState<Partial<TreatmentVariant>>({})
  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([])
  const [customInstruction, setCustomInstruction] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (variant) {
      setDraft({
        synopsis: variant.synopsis || variant.content,
        setting: variant.setting,
        protagonist: variant.protagonist,
        antagonist: variant.antagonist,
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
          section: 'story',
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
        toast.success('Story setup refined!')
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
    toast.success('Story setup updated!')
    onClose()
  }

  if (!variant) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden bg-slate-900 border-slate-700 relative mx-auto">
        {isRefining && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
            <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-8 shadow-2xl flex flex-col items-center max-w-sm text-center">
              <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Refining Story Setup</h3>
              <p className="text-sm text-gray-400">AI is enhancing your story elements...</p>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="w-5 h-5 text-cyan-400" />
            <span>Edit Story Setup</span>
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
              <MapPin className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Story Setup</h3>
              <p className="text-xs text-gray-500">Synopsis, setting, protagonist, and antagonist</p>
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
              <label className="text-xs text-gray-400">Antagonist / Conflict</label>
              <Textarea
                value={draft.antagonist || ''}
                onChange={(e) => updateDraft('antagonist', e.target.value)}
                className="min-h-[60px] bg-slate-800/50 border-slate-700"
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
              Refine Story Setup
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
