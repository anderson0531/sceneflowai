import React, { useEffect, useRef, useState } from 'react'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Button } from '../../components/ui/Button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../../components/ui/tooltip'
import { InspirationDrawer } from './InspirationDrawer'
import { trackCta } from '@/lib/analytics'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { Mic, MicOff, Sparkles, Loader2 } from 'lucide-react'

export function BlueprintComposer({
  onGenerate,
  rigor,
  onChangeRigor,
}: {
  onGenerate: (text: string, opts?: { persona?: 'Narrator'|'Director'; model?: string; rigor?: 'fast'|'balanced'|'thorough' }) => void
  rigor?: 'fast'|'balanced'|'thorough'
  onChangeRigor?: (r: 'fast'|'balanced'|'thorough') => void
}) {
  const [text, setText] = useState('')
  const [persona] = useState<'Narrator'|'Director'>('Director')
  const [model, setModel] = useState('auto')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [inspirationOpen, setInspirationOpen] = useState(false)
  const { supported: sttSupported, isSecure, permission, isRecording, transcript, error: sttError, start, stop, setTranscript } = useSpeechRecognition()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const creditForModel = (m: string) => {
    switch (m) {
      case 'gpt4':
      case 'claude':
        return '~2 credits'
      case 'gemini':
      case 'auto':
      default:
        return '~1 credit'
    }
  }

  // Removed inline examples for simplicity

  const handleGen = async () => {
    setErrorMsg(null)
    trackCta({ event: 'blueprint_generate_clicked' })
    try {
      setIsGenerating(true)
      await onGenerate(text.trim(), { persona, model })
    } catch (e: any) {
      setErrorMsg(e?.message || 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGen();
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [text, persona, model])

  // Append live transcript while recording
  useEffect(() => {
    if (!isRecording) return
    if (!transcript) return
    setText((prev) => {
      // Append new transcript segments at the end with a space
      const base = prev || ''
      // Ensure we don't duplicate words excessively; naive merge
      if (base.endsWith(transcript)) return base
      // If transcript is a superset of previous transcript, replace tail
      return transcript.length > base.length ? transcript : `${base} ${transcript}`
    })
  }, [transcript, isRecording])

  return (
    <div className="w-full space-y-4">
      <div className="space-y-3">
        <div className="flex gap-2 items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => (isRecording ? stop() : start())}
                  disabled={!sttSupported}
                  aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
                  className={`p-2 rounded-lg border transition-colors ${isRecording ? 'border-red-500 text-red-300 hover:bg-red-500/10' : 'border-gray-700 text-gray-300 hover:bg-gray-800'} ${!sttSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{sttSupported ? (isRecording ? 'Stop voice input' : 'Start voice input') : (isSecure ? 'Voice input not supported' : 'Use HTTPS for mic access')}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setInspirationOpen(true)}
                  className="p-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                  aria-label="Get inspiration"
                >
                  <Sparkles size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Get inspiration for your blueprint</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* Advanced moved next to Generate */}
        </div>
        {showAdvanced && (
          <div className="flex gap-2 items-center text-xs text-gray-300">
            <div className="shrink-0">Model:</div>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Auto (Best value)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Best value)</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="gpt4">GPT‑4</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
              </SelectContent>
            </Select>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-700/70">
              Managed model — credits apply
            </span>
          </div>
        )}
        <Textarea
          ref={textareaRef as any}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell us about your video project... Who is it for? What's the goal and tone? Paste a script or brief if you have one."
          className="min-h-[260px] text-base"
        />
        {/* Examples removed to reduce clutter */}
      </div>
      
      <div className="flex items-center justify-end gap-2">
        {/* Advanced toggle */}
        <Button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          variant="outline"
          size="default"
          className="border-gray-700 text-gray-200 hover:bg-gray-800"
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? 'Advanced ▲' : 'Advanced ▼'}
        </Button>
        <Button variant="outline" onClick={() => setText('')} className="border-gray-700 text-gray-200">Clear</Button>
        <Button onClick={handleGen} disabled={!text.trim() || isGenerating} className="bg-sf-primary text-white hover:bg-sf-accent disabled:opacity-50 disabled:cursor-not-allowed">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate
            </>
          )}
        </Button>
      </div>

      {errorMsg && (
        <div className="mt-2 text-xs text-red-300 bg-red-900/30 border border-red-800 rounded px-2 py-1">
          {errorMsg}
        </div>
      )}

      {(!sttSupported || !isSecure || sttError) && (
        <div className="mt-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-800 rounded px-2 py-1">
          {!isSecure ? 'Microphone requires HTTPS or localhost.' : !sttSupported ? 'Voice input is not supported in this browser. Try Chrome or Edge.' : `Mic error: ${String(sttError)}`}
          {permission && permission !== 'granted' ? ` (Permission: ${permission})` : ''}
        </div>
      )}

      {/* Advanced under primary action */}
      {showAdvanced && (
        <div className="mt-2 flex items-center justify-end gap-2 text-xs text-gray-300">
          <div className="shrink-0">Model:</div>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Auto (Best value)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (Best value)</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
              <SelectItem value="gpt4">GPT‑4</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
            </SelectContent>
          </Select>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-700/70">
            Managed model — credits apply
          </span>
        </div>
      )}

      {/* Inspiration Drawer */}
      <InspirationDrawer
        open={inspirationOpen}
        onClose={() => setInspirationOpen(false)}
        onInsert={(snippet) => {
          setText(t => (t ? t + '\n\n' : '') + snippet)
          setInspirationOpen(false)
        }}
      />
    </div>
  )
}
