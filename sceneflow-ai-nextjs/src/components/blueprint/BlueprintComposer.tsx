import React, { useEffect, useRef, useState } from 'react'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/Button'
import { trackCta } from '@/lib/analytics'
import { Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BlueprintComposer({
  onGenerate,
}: {
  onGenerate: (text: string, opts?: { persona?: 'Narrator'|'Director'; model?: string; rigor?: 'fast'|'balanced'|'thorough' }) => void
}) {
  const [text, setText] = useState('')
  const [persona] = useState<'Narrator'|'Director'>('Director')
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
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
      
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
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

      {errorMsg && (
        <div className="mt-2 text-xs text-red-300 bg-red-900/30 border border-red-800 rounded px-2 py-1">
          {errorMsg}
        </div>
      )}
    </div>
  )
}
