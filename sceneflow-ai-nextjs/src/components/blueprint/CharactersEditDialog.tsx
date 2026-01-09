'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/Input'
import { toast } from 'sonner'
import { Wand2, Loader2, Users, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

const INSTRUCTION_TEMPLATES = [
  { id: 'add-depth', label: 'Add Psychological Depth', text: 'Add more internal conflict, wants vs needs, and character flaws.' },
  { id: 'strengthen-arcs', label: 'Strengthen Arcs', text: 'Make character transformations more pronounced and earned.' },
  { id: 'distinct-voices', label: 'Distinct Voices', text: 'Give each character a more unique personality and voice.' },
  { id: 'relationship-dynamics', label: 'Relationship Dynamics', text: 'Enrich the relationships and dynamics between characters.' },
]

function CharacterEditor({ 
  character, 
  index,
  onChange 
}: { 
  character: Character
  index: number
  onChange: (index: number, field: keyof Character, value: string) => void 
}) {
  return (
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={character.name || ''}
          onChange={(e) => onChange(index, 'name', e.target.value)}
          placeholder="Name"
          className="bg-slate-900/50 border-slate-700 text-sm"
        />
        <Input
          value={character.role || ''}
          onChange={(e) => onChange(index, 'role', e.target.value)}
          placeholder="Role (e.g., protagonist)"
          className="bg-slate-900/50 border-slate-700 text-sm"
        />
      </div>
      <Textarea
        value={character.description || ''}
        onChange={(e) => onChange(index, 'description', e.target.value)}
        placeholder="Character description..."
        className="min-h-[60px] bg-slate-900/50 border-slate-700 text-sm"
      />
      <details className="group">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
          Psychological Depth (optional)
        </summary>
        <div className="mt-2 space-y-2">
          <Input
            value={character.externalGoal || ''}
            onChange={(e) => onChange(index, 'externalGoal', e.target.value)}
            placeholder="External goal"
            className="bg-slate-900/50 border-slate-700 text-xs"
          />
          <Input
            value={character.internalNeed || ''}
            onChange={(e) => onChange(index, 'internalNeed', e.target.value)}
            placeholder="Internal need"
            className="bg-slate-900/50 border-slate-700 text-xs"
          />
          <Input
            value={character.fatalFlaw || ''}
            onChange={(e) => onChange(index, 'fatalFlaw', e.target.value)}
            placeholder="Fatal flaw"
            className="bg-slate-900/50 border-slate-700 text-xs"
          />
        </div>
      </details>
    </div>
  )
}

export function CharactersEditDialog({ open, variant, onClose, onApply, projectId }: Props) {
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

  const updateDraft = (key: string, value: any) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const updateCharacter = (index: number, field: keyof Character, value: string) => {
    const characters = [...(draft.character_descriptions || [])]
    characters[index] = { ...characters[index], [field]: value }
    updateDraft('character_descriptions', characters)
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
      if (data.success && data.refined) {
        setDraft(prev => ({ ...prev, ...data.refined }))
        setHasChanges(true)
        toast.success('Characters refined!')
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
    toast.success('Characters updated!')
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
              <h3 className="text-lg font-semibold text-white mb-2">Refining Characters</h3>
              <p className="text-sm text-gray-400">AI is enhancing character depth...</p>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Edit Characters</span>
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
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Characters</h3>
              <p className="text-xs text-gray-500">Character details and psychological depth</p>
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
              Refine Characters
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
