import React, { useEffect, useRef, useState } from 'react'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Button } from '../../components/ui/Button'
import { GuidanceRail } from './GuidanceRail'
import { trackCta } from '@/lib/analytics'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { Mic, MicOff } from 'lucide-react'

export function BlueprintComposer({ onGenerate }: { onGenerate: (text: string, opts?: { persona: string; model: string }) => void }) {
  const [text, setText] = useState('')
  const [persona, setPersona] = useState('Brian')
  const [model, setModel] = useState('auto')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { supported: sttSupported, isRecording, transcript, error: sttError, start, stop, setTranscript } = useSpeechRecognition()

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
    <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <div className="space-y-3">
        <div className="flex gap-2 items-center">
          <Select value={persona} onValueChange={setPersona}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Persona" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Brian">Brian</SelectItem>
              <SelectItem value="Narrator">Narrator</SelectItem>
              <SelectItem value="Director">Director</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => (isRecording ? stop() : start())}
            disabled={!sttSupported}
            aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
            className={`text-xs px-2 py-1 rounded border ${isRecording ? 'border-red-500 text-red-300 hover:bg-red-500/10' : 'border-gray-700 text-gray-300 hover:bg-gray-800'} ${!sttSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={sttSupported ? (isRecording ? 'Stop voice input' : 'Start voice input') : 'Voice input not supported in this browser'}
          >
            <span className="inline-flex items-center gap-1">
              {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
              {isRecording ? 'Stop' : 'Voice'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-gray-800"
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? 'Hide Advanced' : 'Advanced'}
          </button>
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell us about your video project... Who is it for? What's the goal and tone? Paste a script or brief if you have one."
          className="min-h-[260px] text-base"
        />
        {/* Examples removed to reduce clutter */}
      </div>
      <GuidanceRail onInsert={(snippet: string) => setText(t => (t ? t + '\n\n' : '') + snippet)} />
      <div className="lg:col-span-2 flex items-center justify-end gap-3">
        <div className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700/70">
          {creditForModel(model)}
        </div>
        <Button variant="outline" onClick={() => setText('')} className="border-gray-700 text-gray-200">Clear</Button>
        <Button onClick={handleGen} disabled={!text.trim() || isGenerating} className="bg-sf-primary text-sf-background hover:bg-sf-accent disabled:opacity-50 disabled:cursor-not-allowed">
          {isGenerating ? 'Generating…' : 'Generate Treatment ⌘⏎'}
        </Button>
      </div>

      {errorMsg && (
        <div className="lg:col-span-2 mt-2 text-xs text-red-300 bg-red-900/30 border border-red-800 rounded px-2 py-1">
          {errorMsg}
        </div>
      )}

      {sttError && (
        <div className="lg:col-span-2 mt-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-800 rounded px-2 py-1">
          {String(sttError)}
        </div>
      )}

      {/* Advanced under primary action */}
      {showAdvanced && (
        <div className="lg:col-span-2 mt-2 flex items-center justify-end gap-2 text-xs text-gray-300">
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
    </div>
  )
}
