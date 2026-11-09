'use client'

import React, { useEffect, useState } from 'react'
import { Check, CheckCircle2, Copy, LifeBuoy, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import {
  evaluateGenerationError,
  type GenerationMediaType,
} from '@/lib/errors/generationErrorIntelligence'
import type { SupportReportContext } from '@/lib/support/generationErrorReport'

export interface SupportErrorReportPayload {
  mediaType: GenerationMediaType
  rawError?: string
  technicalDetails?: string
  statusCode?: number
  errorCode?: string
  title?: string
  explanation?: string
  recommendedAction?: string
  prompt?: string
  context?: SupportReportContext
}

const SUPPORT_REPORT_EVENT = 'sceneflow:open-support-error-report'

/**
 * Open the global Support Error Report modal from anywhere on the client
 * (including Sonner toast action callbacks).
 */
export function openSupportErrorReport(payload: SupportErrorReportPayload): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<SupportErrorReportPayload>(SUPPORT_REPORT_EVENT, { detail: payload }))
}

export interface ReportGenerationErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payload: SupportErrorReportPayload | null
}

export function ReportGenerationErrorDialog({
  open,
  onOpenChange,
  payload,
}: ReportGenerationErrorDialogProps) {
  const [userNote, setUserNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null)
  const [copiedTicket, setCopiedTicket] = useState(false)

  useEffect(() => {
    if (open) {
      setUserNote('')
      setSubmittedTicketId(null)
      setCopiedTicket(false)
    }
  }, [open, payload])

  if (!payload) return null

  const evaluated = evaluateGenerationError({
    mediaType: payload.mediaType,
    rawError: payload.technicalDetails || payload.rawError || payload.explanation,
    statusCode: payload.statusCode,
    errorCode: payload.errorCode,
    generationMethod: payload.context?.generationMethod,
    provider: payload.context?.provider,
  })

  const title = payload.title || evaluated.title
  const explanation = payload.explanation || evaluated.explanation
  const technical = (payload.technicalDetails || payload.rawError || '').trim()
  const mediaLabel = payload.mediaType === 'clip' ? 'Video Clip' : 'Shot Still'
  const locationBadges = [
    payload.context?.sceneNumber != null ? `Scene ${payload.context.sceneNumber}` : undefined,
    payload.context?.shotNumber != null ? `Shot ${payload.context.shotNumber}` : undefined,
    payload.context?.frameRole ? payload.context.frameRole : undefined,
  ].filter(Boolean)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const pageUrl =
        payload.context?.pageUrl || (typeof window !== 'undefined' ? window.location.href : undefined)
      const res = await fetch('/api/support/report-generation-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mediaType: payload.mediaType,
          rawError: payload.rawError,
          technicalDetails: technical || undefined,
          statusCode: payload.statusCode,
          errorCode: payload.errorCode,
          title,
          explanation,
          recommendedAction: payload.recommendedAction || evaluated.primaryCta.label,
          prompt: payload.prompt,
          userNote: userNote.trim() || undefined,
          context: {
            ...payload.context,
            pageUrl,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not send report to SceneFlow Support')
      }
      setSubmittedTicketId(data.ticketId || 'SF-REPORTED')
      toast.success(`Reported to SceneFlow Support (${data.ticketId})`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send report')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyTicket = () => {
    if (!submittedTicketId) return
    void navigator.clipboard.writeText(submittedTicketId).then(() => {
      setCopiedTicket(true)
      window.setTimeout(() => setCopiedTicket(false), 2000)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg border-slate-700 bg-slate-900 text-slate-100"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <LifeBuoy className="h-5 w-5 text-cyan-400" />
            Report {mediaLabel} Issue to Support
          </DialogTitle>
        </DialogHeader>

        {submittedTicketId ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-medium text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Escalated to SceneFlow Customer Support
              </div>
              <p className="text-xs leading-relaxed text-slate-300">
                Our engineering and support team received the shot diagnostics and raw error log so
                this can be quickly investigated and resolved.
              </p>
              <div className="flex items-center justify-between gap-2 rounded bg-slate-950/70 border border-slate-800 px-3 py-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 block">
                    Reference Ticket
                  </span>
                  <span className="font-mono text-sm font-semibold text-cyan-300">
                    {submittedTicketId}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCopyTicket}
                >
                  {copiedTicket ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy ID
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 py-1">
            <div className="rounded-lg border border-slate-700/80 bg-slate-950/60 p-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.5 text-[10px] font-medium text-cyan-200">
                  {mediaLabel}
                </span>
                {locationBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <p className="text-xs font-semibold text-slate-100">{title}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{explanation}</p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="support-report-note"
                className="block text-xs font-medium text-slate-300"
              >
                Add context for our support team (optional)
              </label>
              <Textarea
                id="support-report-note"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="e.g., Tried rerunning twice on Shot 4 and got the same error..."
                rows={3}
                className="bg-slate-950 border-slate-700 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            {technical && (
              <details className="rounded border border-slate-800 bg-slate-950/50 px-2.5 py-1.5">
                <summary className="cursor-pointer text-[11px] text-slate-400 hover:text-slate-200 select-none">
                  Included diagnostic details (sent automatically)
                </summary>
                <pre className="mt-1.5 max-h-28 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] text-slate-400">
                  {technical}
                </pre>
              </details>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Send to Support
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Global listener host so `openSupportErrorReport(...)` works from toasts and
 * deeply nested callbacks without prop drilling.
 */
export function ReportGenerationErrorDialogHost() {
  const [payload, setPayload] = useState<SupportErrorReportPayload | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SupportErrorReportPayload>).detail
      if (!detail) return
      setPayload(detail)
      setOpen(true)
    }
    window.addEventListener(SUPPORT_REPORT_EVENT, handler)
    return () => window.removeEventListener(SUPPORT_REPORT_EVENT, handler)
  }, [])

  return (
    <ReportGenerationErrorDialog
      open={open}
      onOpenChange={setOpen}
      payload={payload}
    />
  )
}
