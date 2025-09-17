'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/Button'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  seedText: string
  onApply: (text: string) => void
}

function extractBlock(name: string, text: string): string | null {
  const re = new RegExp(`<<<${name}>>>[\\s\\S]*?(?=<<<|$)`, 'm')
  const m = text.match(re)
  if (!m) return null
  return m[0].replace(`<<<${name}>>>`, '').trim()
}

export function FlowRefineModal({ open, onOpenChange, seedText, onApply }: Props) {
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const refine = async () => {
    setLoading(true)
    setResult('')
    try {
      const inst = (instruction && instruction.trim()) ? instruction.trim() : 'Improve this description while preserving all concrete details.'
      const messages = [
        {
          role: 'user',
          content: [
            'You will refine the CURRENT_DESCRIPTION below. Preserve factual details, names, locations, roles, and the overall story world. Do NOT invent new settings or characters. Apply the INSTRUCTION to improve clarity, tone, and specificity.',
            '',
            'CURRENT_DESCRIPTION:',
            seedText,
            '',
            `INSTRUCTION: ${inst}`,
            '',
            'REQUIREMENTS:',
            '- Keep the original subject matter (Thai cuisine journey, chef name, locations, etc.).',
            '- Use engaging, vivid language and active voice.',
            '- Length: 120–200 words for the improved version.',
            '- If metadata lines are present (Genre, Audience, Tone, Duration, Structure), repeat them exactly with any necessary tone tweaks after the refined paragraph(s).',
            '',
            'OUTPUT (STRICT):',
            '<<<INPUT_DESCRIPTION>>>',
            '{single paragraph faithfully summarizing CURRENT_DESCRIPTION}',
            '<<<IMPROVED_IDEA>>>',
            '{one or two paragraphs, 120–200 words, refined per INSTRUCTION, preserving names and context; then, on new lines, include any metadata lines (Genre, Audience, Tone, Duration, Structure) if they appeared in the input}',
            '<<<GUIDANCE>>>',
            'Provide 1–2 short follow‑up instructions the creator could try.'
          ].join('\n')
        }
      ]
      const context = {
        pathname: '/inline-refine',
        mode: 'concept_treatment_refine',
        project: {
          metadata: {
            activeContext: { type: 'text', content: seedText, payload: { input: seedText, mode: 'concept_treatment_refine' } }
          }
        }
      }
      const resp = await fetch('/api/cue/respond', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, context })
      })
      const data = await resp.json()
      const txt = data.reply || ''
      const improved = extractBlock('IMPROVED_IDEA', txt) || extractBlock('INPUT_DESCRIPTION', txt) || txt
      setResult(improved)
    } catch (e) {
      setResult('Refinement failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Refine with Flow</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-400 mb-1">Current description</div>
            <div className="text-sm text-gray-200 bg-gray-800 border border-gray-700 rounded p-3 max-h-40 overflow-auto whitespace-pre-wrap">{seedText || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Your instruction</div>
            <Textarea value={instruction} onChange={e=>setInstruction(e.target.value)} rows={3} className="bg-gray-800 border-gray-700 text-white" placeholder="e.g., Make it more inspirational and character-driven" />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Refined description</div>
            <Textarea value={result} onChange={e=>setResult(e.target.value)} rows={6} className="bg-gray-800 border-gray-700 text-white" placeholder="—" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={refine} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? 'Refining…' : 'Generate'}</Button>
          <Button onClick={()=>{ if(result.trim()) { onApply(result.trim()); onOpenChange(false);} }} disabled={!result.trim()} className="bg-green-600 hover:bg-green-700 text-white">Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


