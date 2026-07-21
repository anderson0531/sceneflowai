'use client'

import React, { useCallback, useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
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
  const [isExtracting, setIsExtracting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setText('')
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
          extracted = await file.text()
        }
        if (!extracted.trim()) {
          setError('Could not read any text from that file. Try pasting the treatment instead.')
          return
        }
        setText(extracted.trim())
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
    const trimmed = text.trim()
    if (!isTreatmentTextUsable(trimmed)) {
      setError('Provide a longer treatment or description to import.')
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
        throw new Error(data?.error || 'Could not import the treatment.')
      }
      onImported(data.result as TreatmentImportResult)
      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }, [text, projectId, onImported, handleOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle>Import a Film Treatment</DialogTitle>
          <DialogDescription className="text-slate-400">
            Paste a treatment (synopsis, characters, etc.) or upload a document. We will extract a
            clean project description and suggest content type, genre, and tone.
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
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting || isImporting}
              className="border-slate-600 text-slate-200"
            >
              {isExtracting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1.5" />
              )}
              {isExtracting ? 'Reading…' : 'Upload document'}
            </Button>
            <span className="text-[11px] text-slate-500">.txt, .md, .fountain, .fdx, .pdf, .docx</span>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your film treatment here — synopsis, characters, setting, tone…"
            className="min-h-[200px] bg-slate-800/50 border-slate-700 text-sm"
          />

          {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} disabled={isImporting || isExtracting || !text.trim()}>
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing…
              </>
            ) : (
              'Import treatment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
