'use client'

import React, { useState } from 'react'
import {
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Film,
  Mic,
  Printer,
  Sparkles,
  UserPlus,
  Video,
} from 'lucide-react'
import type { ClientPortalLocale } from '@/lib/intake/clientPortalCopy'
import {
  buildPrintablePrepSheetHtml,
  getClientPrepGuideCopy,
  type ClientProductionStyleId,
} from '@/lib/continuity/clientPrepGuideCopy'

interface ContinuityClientPrepGuideProps {
  projectTitle: string
  brandName: string
  locale: ClientPortalLocale
  allowUploads: boolean
  allowVoiceCapture: boolean
  allowVideoClips: boolean
  hasPromptCards: boolean
  preferredStyle: ClientProductionStyleId | null
  savingStyle: boolean
  onSelectStyle: (style: ClientProductionStyleId) => void
}

const STYLE_ORDER: Array<{
  id: ClientProductionStyleId
  Icon: typeof Video
  requiresVideo?: boolean
}> = [
  { id: 'hybrid_live_ai', Icon: Video, requiresVideo: true },
  { id: 'voice_over_cinema', Icon: Mic },
  { id: 'studio_hands_off', Icon: Film },
]

export function ContinuityClientPrepGuide({
  projectTitle,
  brandName,
  locale,
  allowUploads,
  allowVoiceCapture,
  allowVideoClips,
  hasPromptCards,
  preferredStyle,
  savingStyle,
  onSelectStyle,
}: ContinuityClientPrepGuideProps) {
  const [expanded, setExpanded] = useState(true)
  const copy = getClientPrepGuideCopy(locale)

  const visibleStyles = STYLE_ORDER.filter((s) => {
    if (s.id === 'hybrid_live_ai' && !allowVideoClips) return false
    if (s.id === 'voice_over_cinema' && !allowVoiceCapture && !allowVideoClips) return false
    return true
  })

  const checklistItems: Array<{
    key: string
    Icon: typeof Camera
    iconColor: string
    title: string
    body: string
  }> = []

  if (allowUploads) {
    checklistItems.push({
      key: 'photos',
      Icon: Camera,
      iconColor: 'text-cyan-400',
      title: copy.tips.photosTitle,
      body: copy.tips.photosBody,
    })
  }
  if (allowVoiceCapture) {
    checklistItems.push({
      key: 'voice',
      Icon: Mic,
      iconColor: 'text-emerald-400',
      title: copy.tips.voiceTitle,
      body: copy.tips.voiceBody,
    })
  }
  if (allowVideoClips) {
    checklistItems.push({
      key: 'video',
      Icon: Video,
      iconColor: 'text-purple-400',
      title: copy.tips.videoTitle,
      body: copy.tips.videoBody,
    })
    if (hasPromptCards) {
      checklistItems.push({
        key: 'cuecards',
        Icon: BookOpen,
        iconColor: 'text-amber-300',
        title: copy.tips.cueCardsTitle,
        body: copy.tips.cueCardsBody,
      })
    }
  }
  checklistItems.push({
    key: 'family',
    Icon: UserPlus,
    iconColor: 'text-sky-400',
    title: copy.tips.familyTitle,
    body: copy.tips.familyBody,
  })

  const handlePrintSheet = () => {
    if (typeof window === 'undefined') return
    const html = buildPrintablePrepSheetHtml({
      projectTitle,
      brandName,
      locale,
      allowUploads,
      allowVoiceCapture,
      allowVideoClips,
      hasPromptCards,
    })
    const win = window.open('', '_blank', 'width=800,height=980')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  return (
    <section className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/25 via-slate-900/90 to-slate-900/90 overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-2.5 text-left min-w-0 flex-1"
        >
          <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white leading-snug">
              {copy.guideTitle}
            </h2>
            <p className="text-xs text-slate-300 leading-snug">{copy.guideSubtitle}</p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrintSheet}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">{copy.printSheetLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition"
          >
            <span>{expanded ? copy.hideGuide : copy.showGuide}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-5">
          {/* Reassurance Banner */}
          <p className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3.5 py-2.5 text-xs sm:text-sm text-emerald-200/95">
            {copy.reassuranceNote}
          </p>

          {/* Visual Production Style Selector (only shown when >1 option applies) */}
          {visibleStyles.length > 1 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-semibold text-white">
                  {copy.chooseStyleHeading}
                </p>
                {preferredStyle && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {copy.styleSavedBadge}
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-2.5">
                {visibleStyles.map(({ id, Icon }) => {
                  const styleCopy = copy.styles[id]
                  const selected = preferredStyle === id
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={savingStyle}
                      onClick={() => onSelectStyle(id)}
                      className={`rounded-xl border p-3.5 text-left transition flex flex-col gap-1.5 ${
                        selected
                          ? 'border-cyan-400 bg-cyan-500/15 shadow-sm'
                          : 'border-slate-800 bg-slate-950/70 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            selected ? 'text-cyan-300' : 'text-slate-400'
                          }`}
                        />
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            selected
                              ? 'bg-cyan-500/30 text-cyan-100'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {styleCopy.badge}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {styleCopy.title}
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                        {styleCopy.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 5-Minute Preparation Checklist */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {copy.checklistHeading}
            </h3>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {checklistItems.map(({ key, Icon, iconColor, title, body }) => (
                <div
                  key={key}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex items-start gap-2.5"
                >
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-white">{title}</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
