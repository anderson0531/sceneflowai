'use client'

import React, { useCallback, useRef, useState } from 'react'
import { FileText, Loader2, Upload, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { extractTextFromPdf, extractTextFromDocx } from '@/lib/upload/extractors'
import { normalizeImportedScriptText } from '@/lib/script/fdxParser'
import { isTreatmentTextUsable, type TreatmentImportResult } from '@/lib/blueprint/importTreatment'

interface TreatmentImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  onImported: (result: TreatmentImportResult) => void
}

const ACCEPT = '.txt,.md,.fountain,.fdx,.pdf,.docx'

export function TreatmentImportDialog({
  open,
  onOpenChange,
  projectId,
  onImported,
}: TreatmentImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [text, setText] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setText('')
    setUploadedFileName(null)
    setIsExtracting(false)
    setIsImporting(false)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset()
      onOpenChange(next)
    },
    [onOpenChange, reset]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setError(null)
      setIsExtracting(true)
      try {
        const name = file.name.toLowerCase()
        let extracted = ''
        if (name.endsWith('.pdf')) {
          extracted = await extractTextFromPdf(file)
        } else if (name.endsWith('.docx')) {
          extracted = await extractTextFromDocx(file)
        } else {
          const rawText = await file.text()
          extracted = normalizeImportedScriptText(rawText, file.name)
        }
        if (!extracted.trim()) {
          setError('Could not read any text from that file. Try pasting your script or treatment instead.')
          return
        }
        setText(extracted.trim())
        setUploadedFileName(file.name)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to read file')
      } finally {
        setIsExtracting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    []
  )

  const handleImport = useCallback(async () => {
    const trimmed = normalizeImportedScriptText(text.trim(), uploadedFileName || undefined)
    if (!isTreatmentTextUsable(trimmed)) {
      setError('Provide a longer script, treatment, or description to import.')
      return
    }
    setIsImporting(true)
    setError(null)
    try {
      const response = await fetch('/api/blueprint/import-treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, projectId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Could not import the script or treatment.')
      }
      onImported(data.result as TreatmentImportResult)
      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }, [text, uploadedFileName, projectId, onImported, handleOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span>Import Script or Treatment</span>
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Upload or paste a complete screenplay, beat sheet, or film treatment. SceneFlow will
            extract the story progression, characters, locations, genre, and tone to build your
            Blueprint foundation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting || isImporting}
                className="border-slate-600 text-slate-200 hover:bg-slate-800"
              >
                {isExtracting ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1.5 text-cyan-400" />
                )}
                {isExtracting ? 'Reading file…' : 'Upload Script or Treatment'}
              </Button>
              <span className="text-[11px] text-slate-400">
                Supports <span className="text-slate-300 font-medium">.pdf, .docx, .fdx, .fountain, .txt, .md</span>
              </span>
            </div>

            {uploadedFileName && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span className="max-w-[180px] truncate">{uploadedFileName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFileName(null)
                    setText('')
                  }}
                  className="text-cyan-300/70 hover:text-white"
                  aria-label="Clear uploaded file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your complete screenplay (Fountain / standard script format), beat sheet, or film treatment here — scenes, dialogue, characters, setting, or synopsis…"
            className="min-h-[240px] bg-slate-800/50 border-slate-700 text-sm font-mono sm:font-sans"
          />

          {text.trim().length > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {text.trim().length.toLocaleString()} characters ready to extract into Blueprint brief
              </span>
              {text.trim().length > 32000 && (
                <span className="text-amber-300">
                  First 32,000 characters will be analyzed
                </span>
              )}
            </div>
          )}

          {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isImporting || isExtracting || !text.trim()}
            className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting Blueprint Brief…
              </>
            ) : (
              'Import to Blueprint'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
