'use client'

import React, { useCallback, useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { trackCta } from '@/lib/analytics'
import { validateScript, ValidationResult } from '@/lib/script/scriptValidator'
import { parseScript, ParsedScript } from '@/lib/script/scriptParser'
import {
  assessScriptCompleteness,
  type CompletenessResult,
} from '@/lib/script/scriptCompleteness'
import { ScriptImportFeedback } from './ScriptImportFeedback'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ScriptImportPayload {
  parsedScript: ParsedScript
  importCompletenessScore: number
  importGapsResolved: boolean
}

interface ScriptImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (payload: ScriptImportPayload) => Promise<void>
}

export function ScriptImportDialog({
  open,
  onOpenChange,
  onImport,
}: ScriptImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [step, setStep] = useState<'upload' | 'feedback'>('upload')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [importedText, setImportedText] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [parsedScript, setParsedScript] = useState<ParsedScript | null>(null)
  const [completeness, setCompleteness] = useState<CompletenessResult | null>(null)
  const [gapsResolved, setGapsResolved] = useState(false)
  const [gapFillSummary, setGapFillSummary] = useState<string | null>(null)

  const resetState = useCallback(() => {
    setStep('upload')
    setIsProcessing(false)
    setErrorMsg(null)
    setImportedText(null)
    setValidation(null)
    setParsedScript(null)
    setCompleteness(null)
    setGapsResolved(false)
    setGapFillSummary(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetState()
      onOpenChange(next)
    },
    [onOpenChange, resetState]
  )

  const runValidation = useCallback((text: string) => {
    const validationResult = validateScript(text)
    setValidation(validationResult)
    setImportedText(text)

    if (validationResult.isValid) {
      const parsed = parseScript(text, validationResult)
      setParsedScript(parsed)
      setCompleteness(assessScriptCompleteness(parsed))
    } else {
      setParsedScript(null)
      setCompleteness(null)
    }

    setStep('feedback')
  }, [])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsProcessing(true)
      setErrorMsg(null)

      try {
        let extractedText = ''

        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          const { extractTextFromPdf } = await import('@/lib/upload/extractors')
          extractedText = await extractTextFromPdf(file)
        } else if (file.type.includes('wordprocessingml') || file.name.endsWith('.docx')) {
          const { extractTextFromDocx } = await import('@/lib/upload/extractors')
          extractedText = await extractTextFromDocx(file)
        } else {
          extractedText = await file.text()
        }

        if (!extractedText.trim()) {
          setErrorMsg('Could not extract text from file. Please try a different format.')
          return
        }

        runValidation(extractedText)
        trackCta({ event: 'script_import_validated' })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to import script'
        console.error('Script import error:', err)
        setErrorMsg(message)
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [runValidation]
  )

  const handleImagineGaps = useCallback(async () => {
    if (!parsedScript || !completeness?.gaps.length) return

    setIsProcessing(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/script/complete-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsedScript,
          gaps: completeness.gaps,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to imagine gaps')
      }

      setParsedScript(data.parsedScript)
      setCompleteness(assessScriptCompleteness(data.parsedScript))
      setGapsResolved(true)
      setGapFillSummary(data.summary?.message || 'Gaps filled')
      trackCta({ event: 'script_import_gaps_filled' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gap fill failed'
      setErrorMsg(message)
    } finally {
      setIsProcessing(false)
    }
  }, [parsedScript, completeness])

  const handleProceed = useCallback(async () => {
    if (!importedText || !validation) return

    setIsProcessing(true)
    setErrorMsg(null)
    try {
      const parsed = parsedScript || parseScript(importedText, validation)
      const completenessResult = completeness || assessScriptCompleteness(parsed)

      await onImport({
        parsedScript: parsed,
        importCompletenessScore: completenessResult.completenessScore,
        importGapsResolved: gapsResolved,
      })

      trackCta({ event: 'script_import_completed' })
      handleOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process imported script'
      setErrorMsg(message)
    } finally {
      setIsProcessing(false)
    }
  }, [
    importedText,
    validation,
    parsedScript,
    completeness,
    gapsResolved,
    onImport,
    handleOpenChange,
  ])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Import Script</DialogTitle>
          <DialogDescription className="text-slate-400">
            Upload a finished screenplay to skip Blueprint generation and go straight to Vision.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.fountain,.fdx,.pdf,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {step === 'upload' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing script...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Script File
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500">
              Supports .txt, .md, .fountain, .fdx, .pdf, .docx
            </p>
          </div>
        )}

        {step === 'feedback' && validation && (
          <ScriptImportFeedback
            validation={validation}
            parsedScript={parsedScript}
            completeness={completeness}
            gapFillSummary={gapFillSummary}
            isProcessing={isProcessing}
            onProceed={handleProceed}
            onCancel={() => handleOpenChange(false)}
            onImagineGaps={
              completeness?.gaps.some((g) => g.type === 'error' || g.type === 'warning')
                ? handleImagineGaps
                : undefined
            }
          />
        )}

        {errorMsg && (
          <div className="text-xs text-red-300 bg-red-900/30 border border-red-800 rounded px-3 py-2">
            {errorMsg}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ScriptImportDialog
