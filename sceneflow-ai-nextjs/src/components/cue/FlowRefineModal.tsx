'use client'

import { useEffect, useState } from 'react'
import { X, Mic, Square, Send, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/Button'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

// Drawer-style panel replacing previous Dialog modal
// Slides in from right, docks, and provides wide side-by-side comparison

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  seedText: string
  onApply: (text: string) => void
  initialInstruction?: string
}

function extractBlock(name: string, text: string): string | null {
  const re = new RegExp(`<<<${name}>>>[\\s\\S]*?(?=<<<|$)`, 'm')
  const m = text.match(re)
  if (!m) return null
  return m[0].replace(`<<<${name}>>>`, '').trim()
}

export function FlowRefineModal({ open, onOpenChange, seedText, onApply, initialInstruction }: Props) {
  const [instruction, setInstruction] = useState(initialInstruction || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [variations, setVariations] = useState<string[]>([])
  const [varIndex, setVarIndex] = useState(0)
  const { supported: sttSupported, isRecording, transcript, error, start, stop, setTranscript } = useSpeechRecognition()

  useEffect(() => {
    if (open && typeof initialInstruction === 'string') {
      setInstruction(initialInstruction)
    }
  }, [open, initialInstruction])

  const refine = async () => {
    setLoading(true)
    setResult('')
    setVariations([])
    setVarIndex(0)
    try {
      const inst = (instruction && instruction.trim()) ? instruction.trim() : 'Improve this description while preserving all concrete details.'
      const messages = [
        {
          role: 'user',
          content: [
            'Refine the following description. Preserve factual details, names, locations, roles, and the overall story world. Do NOT invent new settings or characters. Apply the INSTRUCTION to improve clarity, tone, and specificity.',
            '',
            'CURRENT_DESCRIPTION:',
            seedText,
            '',
            `INSTRUCTION: ${inst}`,
            '',
            'OUTPUT REQUIREMENTS (STRICT):',
            '- Output ONLY the improved description (no headers, no blocks, no INPUT echo, no analysis).',
            '- 120–200 words in one or two paragraphs.',
            '- If metadata lines are present (Genre, Audience, Tone, Duration, Structure), append them after the paragraphs on separate lines using the same labels.'
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
      let improved = extractBlock('IMPROVED_IDEA', txt) || txt
      improved = improved
        .replace(/<<<INPUT_DESCRIPTION>>>[\s\S]*?(?=<<<|$)/g, '')
        .replace(/<<<IMPROVED_IDEA>>>/g, '')
        .replace(/<<<GUIDANCE>>>[\s\S]*?$/g, '')
        .trim()
      // Try to extract multiple variations
      const blocks = txt.match(/<<<IMPROVED_IDEA[^>]*>>>[\s\S]*?(?=<<<|$)/g) || []
      let vars: string[] = []
      if (blocks.length > 1) {
        vars = blocks.map(b => b.replace(/<<<IMPROVED_IDEA[^>]*>>>/,'').trim())
      } else {
        // heuristic split delimiters
        const split = improved.split(/\n-{3,}\n|\n\|\|\|\n/).map(s=>s.trim()).filter(Boolean)
        vars = split.length > 1 ? split : [improved]
      }
      setVariations(vars)
      setVarIndex(0)
      setResult(vars[0] || '')
    } catch (e) {
      setResult('Refinement failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={()=>onOpenChange(false)} />
      {/* Drawer Panel */}
      <div className="absolute right-0 top-0 h-full w-[min(60vw,800px)] bg-gray-900 border-l border-gray-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="text-sm text-gray-400">Ask Flow</div>
          <div className="text-lg font-semibold text-white">Concept Revision</div>
          <button className="p-2 text-gray-300 hover:text-white" onClick={()=>onOpenChange(false)} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Diff viewer */}
          <div className="bg-gray-850 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
              <div>Changes</div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40" onClick={()=>setVarIndex(i=>Math.max(0, i-1))} disabled={varIndex<=0}>&lt;</button>
                <span className="text-gray-400">Variation {Math.min(varIndex+1, (variations.length||1))} of {Math.max(variations.length, 1)}</span>
                <button className="px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40" onClick={()=>setVarIndex(i=>Math.min((variations.length||1)-1, i+1))} disabled={varIndex>=(Math.max(variations.length,1)-1)}>&gt;</button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <div className="grid grid-cols-2 gap-4 text-sm" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Original</div>
                  <pre className="whitespace-pre-wrap bg-[#0b0f19] text-gray-200 border border-gray-800 rounded p-3">{seedText || ''}</pre>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Revision</div>
                  <pre className="whitespace-pre-wrap bg-[#0b0f19] text-gray-200 border border-gray-800 rounded p-3">{(variations[varIndex] ?? result) || ''}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Sticky Footer with actions + suggestions + chat-style input bar */}
        <div className="px-4 py-3 border-t border-gray-800 bg-gray-900 flex flex-col gap-2">
          {/* Actions bar */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => { setVariations([]); setResult(''); setVarIndex(0) }}>Discard</Button>
            <Button
              variant="primary"
              disabled={loading || !(((variations[varIndex] ?? result) || '').trim())}
              onClick={()=>{ const applied = (variations[varIndex] ?? result).trim(); if(applied){ onApply(applied); onOpenChange(false) } }}
            >
              Apply Changes
            </Button>
          </div>
          {/* Suggestion chips */}
          <div className="w-full overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 whitespace-nowrap">
              {['Make it funnier','Add suspense','Shorten significantly','Focus on visuals'].map(s => (
                <button key={s} onClick={()=>setInstruction(s)} className="px-3 py-1.5 rounded-full border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-750 text-xs">
                  {s}
                </button>
              ))}
            </div>
          </div>
          {/* Input row */}
          <div className="flex items-end gap-2">
            <Textarea
              value={instruction}
              onChange={e=>setInstruction(e.target.value)}
              rows={2}
              onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); if(!loading) refine() } }}
              disabled={loading}
              className="bg-gray-850 border border-gray-700 text-gray-100 flex-1 disabled:opacity-60"
              placeholder="Your instruction (Shift+Enter for newline)"
            />
            <button
              type="button"
              onClick={() => { if (isRecording) { stop(); return } setTranscript(''); start() }}
              className={`px-3 py-2 rounded-md border ${isRecording ? 'bg-red-600/20 border-red-600 text-red-300' : 'bg-gray-800 border-gray-700 text-gray-200'} hover:bg-gray-700`}
              title={sttSupported ? (isRecording ? 'Stop recording' : 'Speak instruction') : 'Speech recognition not supported'}
              disabled={!sttSupported || loading}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <Button variant="primary" disabled={loading} onClick={()=>refine()}>
              {loading ? (<div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /><span>Working…</span></div>) : (<div className="flex items-center gap-2"><Send className="w-4 h-4" /><span>Revise</span></div>)}
            </Button>
          </div>
          <div className="flex items-center gap-2 self-end">
            <Button variant="ghost" onClick={()=>onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  )
}


