'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/Input'
import { toast } from 'sonner'
import { Wand2, Loader2, FileText, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

const INSTRUCTION_TEMPLATES = [
  { id: 'sharpen-logline', label: 'Sharpen Logline', text: 'Make the logline more compelling with a stronger hook and clearer stakes.' },
  { id: 'clarify-genre', label: 'Clarify Genre', text: 'Ensure genre expectations are clear and consistent throughout.' },
  { id: 'refine-title', label: 'Stronger Title', text: 'Suggest a more memorable, evocative title that captures the essence.' },
]

export function CoreInfoEditDialog({ open, variant, onClose, onApply, projectId }: Props) {
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
          section: 'core',
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
        toast.success('Core info refined!')
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
    toast.success('Core info updated!')
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
              <h3 className="text-lg font-semibold text-white mb-2">Refining Core Info</h3>
              <p className="text-sm text-gray-400">AI is enhancing your core information...</p>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span>Edit Core Info</span>
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
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Core Identifying Information</h3>
              <p className="text-xs text-gray-500">Title, logline, genre, and audience targeting</p>
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
              Refine Core Info
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
