'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { AlertTriangle, Check, CheckCircle2, Copy, LifeBuoy, Loader2, Mail, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { getHelpUiCopy } from '@/config/help/helpUiCopy'
import {
  evaluateGenerationError,
  type GenerationMediaType,
} from '@/lib/errors/generationErrorIntelligence'
import {
  getSupportMediaLabel,
  type SupportReportContext,
  type SupportReportMediaType,
} from '@/lib/support/generationErrorReport'

export interface SupportErrorReportPayload {
  mediaType: SupportReportMediaType
  rawError?: string
  technicalDetails?: string
  statusCode?: number
  errorCode?: string
  title?: string
  explanation?: string
  recommendedAction?: string
  prompt?: string
  userNote?: string
  context?: SupportReportContext
}

const SUPPORT_CATEGORY_OPTIONS: Array<{ value: SupportReportMediaType; label: string }> = [
  { value: 'general', label: 'General Studio Support' },
  { value: 'still', label: 'Shot Still Generation' },
  { value: 'clip', label: 'Video Clip Generation' },
  { value: 'audio', label: 'Audio, Voices & Dubbing' },
  { value: 'export', label: 'Export & Production Streams' },
  { value: 'billing', label: 'Billing, Credits & BYOK' },
  { value: 'agency', label: 'White-Label & Agency Ops' },
]

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
  const locale = useLocale()
  const ui = useMemo(() => getHelpUiCopy(locale), [locale])
  const copy = ui.supportDialog
  const [userNote, setUserNote] = useState('')
  const [selectedMediaType, setSelectedMediaType] = useState<SupportReportMediaType>('general')
  const [submitting, setSubmitting] = useState(false)
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null)
  const [emailDelivered, setEmailDelivered] = useState<boolean>(true)
  const [confirmationSent, setConfirmationSent] = useState<boolean>(false)
  const [supportEmailAddress, setSupportEmailAddress] = useState<string>('support@sceneflowai.studio')
  const [copiedTicket, setCopiedTicket] = useState(false)

  useEffect(() => {
    if (open) {
      setUserNote(payload?.userNote || '')
      setSelectedMediaType(payload?.mediaType || 'general')
      setSubmittedTicketId(null)
      setEmailDelivered(true)
      setConfirmationSent(false)
      setCopiedTicket(false)
    }
  }, [open, payload])

  if (!payload) return null

  const isGeneralMode =
    payload.mediaType === 'general' ||
    payload.mediaType === 'billing' ||
    payload.mediaType === 'agency' ||
    payload.mediaType === 'audio' ||
    payload.mediaType === 'export'
  const evalMediaType: GenerationMediaType = selectedMediaType === 'still' ? 'still' : 'clip'
  const evaluated = evaluateGenerationError({
    mediaType: evalMediaType,
    rawError: payload.technicalDetails || payload.rawError || payload.explanation,
    statusCode: payload.statusCode,
    errorCode: payload.errorCode,
    generationMethod: payload.context?.generationMethod,
    provider: payload.context?.provider,
  })

  const title = payload.title || evaluated.title
  const explanation = payload.explanation || evaluated.explanation
  const technical = (payload.technicalDetails || payload.rawError || '').trim()
  const mediaLabel = getSupportMediaLabel(selectedMediaType)
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
          mediaType: selectedMediaType,
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
      setEmailDelivered(Boolean(data.emailSent))
      setConfirmationSent(Boolean(data.confirmationEmailSent))
      if (data.supportEmail) setSupportEmailAddress(String(data.supportEmail))
      toast.success(`Support ticket logged (${data.ticketId})`)
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
        dir={ui.isRtl ? 'rtl' : 'ltr'}
        className="max-w-lg border-slate-700 bg-slate-900 text-slate-100"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <LifeBuoy className="h-5 w-5 text-cyan-400" />
            {copy.titlePrefix} {mediaLabel} {copy.titleSuffix}
          </DialogTitle>
        </DialogHeader>

        {submittedTicketId ? (
          <div className="space-y-4 py-2">
            <div
              className={`rounded-lg border p-4 space-y-2 ${
                emailDelivered
                  ? 'border-emerald-500/40 bg-emerald-950/30'
                  : 'border-amber-500/40 bg-amber-950/30'
              }`}
            >
              <div
                className={`flex items-center gap-2 font-medium text-sm ${
                  emailDelivered ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {emailDelivered ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                {emailDelivered ? copy.escalatedHeading : copy.relayOfflineHeading}
              </div>
              <p className="text-xs leading-relaxed text-slate-300">
                {emailDelivered
                  ? confirmationSent
                    ? copy.escalatedWithConfirm
                    : copy.escalatedBody
                  : `${copy.relayOfflineBodyPrefix} ${supportEmailAddress}.`}
              </p>
              {!emailDelivered && (
                <a
                  href={`mailto:${supportEmailAddress}?subject=${encodeURIComponent(
                    `SceneFlow Support Ticket ${submittedTicketId}`
                  )}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 hover:text-white underline"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>
                    {copy.emailFallbackBtnPrefix} {supportEmailAddress}
                  </span>
                </a>
              )}
              <div className="flex items-center justify-between gap-2 rounded bg-slate-950/70 border border-slate-800 px-3 py-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 block">
                    {copy.referenceTicketLabel}
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
                      {copy.copiedBtn}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      {copy.copyIdBtn}
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => onOpenChange(false)}>
                {copy.doneBtn}
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

            {isGeneralMode && (
              <div className="space-y-1.5">
                <label
                  htmlFor="support-report-category"
                  className="block text-xs font-medium text-slate-300"
                >
                  {copy.topicLabel}
                </label>
                <select
                  id="support-report-category"
                  value={selectedMediaType}
                  onChange={(e) => setSelectedMediaType(e.target.value as SupportReportMediaType)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {SUPPORT_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="support-report-note"
                className="block text-xs font-medium text-slate-300"
              >
                {isGeneralMode ? copy.noteLabelGeneral : copy.noteLabelError}
              </label>
              <Textarea
                id="support-report-note"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder={
                  isGeneralMode ? copy.notePlaceholderGeneral : copy.notePlaceholderError
                }
                rows={3}
                className="bg-slate-950 border-slate-700 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            {technical && (
              <details className="rounded border border-slate-800 bg-slate-950/50 px-2.5 py-1.5">
                <summary className="cursor-pointer text-[11px] text-slate-400 hover:text-slate-200 select-none">
                  {copy.diagnosticsSummary}
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
                {copy.cancelBtn}
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
                    {copy.sendingBtn}
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {copy.sendBtn}
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
