import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/Button'
import { trackCta } from '@/lib/analytics'
import { Sparkles, Loader2, Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateScript, ValidationResult } from '@/lib/script/scriptValidator'
import { parseScript, ParsedScript, toVisionPhaseFormat, toTreatmentVariant } from '@/lib/script/scriptParser'
import { ScriptImportFeedback } from './ScriptImportFeedback'

export interface ScriptImportResult {
  parsedScript: ParsedScript
  visionPhase: ReturnType<typeof toVisionPhaseFormat>
  treatmentVariant: ReturnType<typeof toTreatmentVariant>
}

export function BlueprintComposer({
  onGenerate,
  onScriptImport,
}: {
  onGenerate: (text: string, opts?: { persona?: 'Narrator'|'Director'; model?: string; rigor?: 'fast'|'balanced'|'thorough' }) => void
  onScriptImport?: (result: ScriptImportResult) => void
}) {
  const [text, setText] = useState('')
  const [persona] = useState<'Narrator'|'Director'>('Director')
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  
  // Script import state
  const [importedText, setImportedText] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [parsedScript, setParsedScript] = useState<ParsedScript | null>(null)
  const [isProcessingImport, setIsProcessingImport] = useState(false)
  const [showImportFeedback, setShowImportFeedback] = useState(false)

  // Removed inline examples for simplicity

  // Handle file import
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessingImport(true)
    setErrorMsg(null)

    try {
      let extractedText = ''

      // Handle different file types
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const { extractTextFromPdf } = await import('@/lib/upload/extractors')
        extractedText = await extractTextFromPdf(file)
      } else if (file.type.includes('wordprocessingml') || file.name.endsWith('.docx')) {
        const { extractTextFromDocx } = await import('@/lib/upload/extractors')
        extractedText = await extractTextFromDocx(file)
      } else {
        // Plain text, fountain, fdx, etc.
        extractedText = await file.text()
      }

      if (!extractedText.trim()) {
        setErrorMsg('Could not extract text from file. Please try a different format.')
        setIsProcessingImport(false)
        return
      }

      // Validate the script
      const validationResult = validateScript(extractedText)
      setValidation(validationResult)
      setImportedText(extractedText)

      // Parse if valid enough
      if (validationResult.isValid) {
        const parsed = parseScript(extractedText, validationResult)
        setParsedScript(parsed)
      }

      setShowImportFeedback(true)
      trackCta({ event: 'script_import_validated' })
    } catch (err: any) {
      console.error('Script import error:', err)
      setErrorMsg(err?.message || 'Failed to import script')
    } finally {
      setIsProcessingImport(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [])

  // Handle proceed after validation
  const handleProceedWithImport = useCallback(async () => {
    if (!importedText || !validation) return

    setIsProcessingImport(true)
    try {
      // Parse script (if not already parsed)
      const parsed = parsedScript || parseScript(importedText, validation)
      setParsedScript(parsed)

      // Convert to formats needed by the system
      const visionPhase = toVisionPhaseFormat(parsed)
      const treatmentVariant = toTreatmentVariant(parsed)

      // Call the import handler
      if (onScriptImport) {
        await onScriptImport({
          parsedScript: parsed,
          visionPhase,
          treatmentVariant
        })
      }

      trackCta({ event: 'script_import_completed' })
      
      // Reset state
      setShowImportFeedback(false)
      setImportedText(null)
      setValidation(null)
      setParsedScript(null)
    } catch (err: any) {
      console.error('Script import processing error:', err)
      setErrorMsg(err?.message || 'Failed to process imported script')
    } finally {
      setIsProcessingImport(false)
    }
  }, [importedText, validation, parsedScript, onScriptImport])

  // Handle cancel import
  const handleCancelImport = useCallback(() => {
    setShowImportFeedback(false)
    setImportedText(null)
    setValidation(null)
    setParsedScript(null)
    setErrorMsg(null)
  }, [])

  // AI-assisted format correction (placeholder for future implementation)
  const handleFixFormat = useCallback(async () => {
    if (!importedText) return
    
    setIsProcessingImport(true)
    try {
      // TODO: Call AI API to reformat the script
      // For now, just show a message
      setErrorMsg('AI format correction is coming soon. Please manually format your script.')
    } finally {
      setIsProcessingImport(false)
    }
  }, [importedText])

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

  // Show import feedback if validating
  if (showImportFeedback && validation) {
    return (
      <div className="w-full space-y-4">
        <ScriptImportFeedback
          validation={validation}
          parsedScript={parsedScript}
          isProcessing={isProcessingImport}
          onProceed={handleProceedWithImport}
          onCancel={handleCancelImport}
          onFixFormat={handleFixFormat}
        />
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.fountain,.fdx,.pdf,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Textarea - Clean and focused */}
      <Textarea
        ref={textareaRef as any}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe the film or video you want to create..."
        className="min-h-[180px] text-base bg-slate-900/50 border-slate-600 placeholder:text-slate-500 focus:ring-cyan-500/50 focus:border-cyan-500/50"
      />
      
      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3">
        {/* Import Script Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isGenerating || isProcessingImport}
          className="text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white"
        >
          {isProcessingImport ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Import Script
            </>
          )}
        </Button>
        
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
    </div>
  )
}
