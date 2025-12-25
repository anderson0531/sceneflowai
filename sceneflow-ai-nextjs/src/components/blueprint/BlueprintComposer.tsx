import React, { useEffect, useRef, useState } from 'react'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/Button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../../components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { InspirationDrawer } from './InspirationDrawer'
import { trackCta } from '@/lib/analytics'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { Mic, MicOff, Lightbulb, Sparkles, Loader2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [inspirationOpen, setInspirationOpen] = useState(false)
  const { supported: sttSupported, isSecure, permission, isRecording, transcript, error: sttError, start, stop, setTranscript } = useSpeechRecognition()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Removed inline examples for simplicity

  const handleGen = async () => {
    setErrorMsg(null)
    trackCta({ event: 'blueprint_generate_clicked' })
    try {
      setIsGenerating(true)
      await onGenerate(text.trim(), { persona, model: 'gemini-3.0-pro' })
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
  }, [text, persona])

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

  // Example prompts for the Examples popover
  const examplePrompts = [
    { label: 'Documentary about urban farming', text: 'A 15-minute documentary about urban farming in Detroit, showcasing community gardens and their impact on food security.' },
    { label: 'Workplace safety training', text: 'Training video for new employees on workplace safety protocols, covering emergency procedures and equipment handling.' },
    { label: 'Cryptocurrency explainer', text: 'YouTube explainer on the history of cryptocurrency, from Bitcoin\'s origins to modern DeFi applications.' },
    { label: 'Horror short film', text: 'A short horror film about a haunted lighthouse keeper who discovers the previous keeper never truly left.' },
  ]

  return (
    <div className="w-full space-y-4">
      {/* Textarea - Clean and focused */}
      <Textarea
        ref={textareaRef as any}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe the film or video you want to create..."
        className="min-h-[180px] text-base bg-slate-900/50 border-slate-600 placeholder:text-slate-500 focus:ring-cyan-500/50 focus:border-cyan-500/50"
      />
      
      {/* Helper Toolbar - Below Input */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: Helper Actions */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            {/* Voice Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => (isRecording ? stop() : start())}
                  disabled={!sttSupported}
                  className={cn(
                    "text-slate-400 hover:text-white hover:bg-slate-700/50",
                    isRecording && "text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300",
                    !sttSupported && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isRecording ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                  Voice
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{sttSupported ? (isRecording ? 'Stop voice input' : 'Start voice input') : (isSecure ? 'Voice input not supported' : 'Use HTTPS for mic access')}</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Inspire Me Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setInspirationOpen(true)}
                  className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Inspire Me
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Get AI-powered inspiration for your project</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Examples Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-slate-700/50"
              >
                <FileText className="w-4 h-4 mr-2" />
                Examples
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-slate-800 border-slate-700 text-white p-4">
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-300">Click to try:</p>
                <ul className="text-sm text-slate-400 space-y-1">
                  {examplePrompts.map((example, idx) => (
                    <li
                      key={idx}
                      className="cursor-pointer hover:text-cyan-400 transition-colors p-2 rounded hover:bg-slate-700/50"
                      onClick={() => setText(example.text)}
                    >
                      • {example.label}
                    </li>
                  ))}
                </ul>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setText('')}
            className="text-slate-400 hover:text-white"
            disabled={!text}
          >
            Clear
          </Button>
          <Button
            onClick={handleGen}
            disabled={!text.trim() || isGenerating}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Blueprint
              </>
            )}
          </Button>
        </div>
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
