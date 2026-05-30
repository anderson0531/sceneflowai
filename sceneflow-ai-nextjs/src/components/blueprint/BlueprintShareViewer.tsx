'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { BlueprintReviewSection } from './BlueprintReviewSection'
import type { BlueprintSectionAudioPlayerStatus } from './BlueprintSectionAudioPlayer'
import { BlueprintCollabChat } from './BlueprintCollabChat'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import type {
  BlueprintFeedbackSection,
  BlueprintFeedbackSections,
  BlueprintSectionAudioMap,
  BlueprintSectionAudioStatus,
  BlueprintSectionTranslationsByLanguage,
} from '@/lib/blueprint/shareTypes'
import { countSectionsWithUrl } from '@/lib/blueprint/shareAudioPayload'
import { BLUEPRINT_REVIEW_SECTION_THEME } from '@/lib/blueprint/blueprintReviewTheme'
import { BlueprintShareLanguageControls } from './BlueprintShareLanguageControls'
import { BlueprintReviewHero } from './BlueprintReviewHero'
import { resolveBlueprintHeroImageUrl } from '@/lib/blueprint/resolveBlueprintHeroImage'
import { SceneFlowStudioBrand } from '@/components/layout/SceneFlowStudioBrand'
import {
  countRatedSections,
  hasAnyFeedback,
  loadFeedbackDraft,
  saveFeedbackDraft,
  type ShareFeedbackDraft,
} from '@/lib/blueprint/feedbackChips'

const PARTICIPANT_KEY = (token: string) => `sf_collab_participant_${token}`
const SHARE_LANG_KEY = (token: string) => `sf_share_lang_${token}`

/** ~4 minutes at 8s intervals — stale links created before auto-gen fix. */
const MAX_AUDIO_POLLS = 30

function resolveSectionAudioPlayerStatus(
  sectionId: BlueprintFixSection,
  sectionAudio: BlueprintSectionAudioMap,
  audioStatus: BlueprintSectionAudioStatus | undefined,
  allowTts: boolean,
  audioPollStale: boolean,
  audioStartedAt?: string
): BlueprintSectionAudioPlayerStatus {
  if (!allowTts) return 'unavailable'
  if (sectionAudio[sectionId]?.url) return 'ready'
  if (
    audioStatus === 'pending' &&
    audioStartedAt &&
    !audioPollStale
  ) {
    return 'preparing'
  }
  return 'unavailable'
}

const SECTION_NAV: { id: BlueprintFixSection; label: string }[] = [
  { id: 'core', label: 'Core' },
  { id: 'story', label: 'Story' },
  { id: 'characters', label: 'Characters' },
  { id: 'beats', label: 'Beats' },
  { id: 'tone', label: 'Tone' },
]

type Props = { token: string }

export function BlueprintShareViewer({ token }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [treatment, setTreatment] = useState<Record<string, unknown> | null>(null)
  const [heroImageUrl, setHeroImageUrl] = useState<string | undefined>()
  const [ownerName, setOwnerName] = useState('Owner')
  const [allowTts, setAllowTts] = useState(true)
  const [sectionAudio, setSectionAudio] = useState<BlueprintSectionAudioMap>({})
  const [sectionAudioByLanguage, setSectionAudioByLanguage] = useState<
    Record<string, BlueprintSectionAudioMap>
  >({})
  const [sectionTranslations, setSectionTranslations] =
    useState<BlueprintSectionTranslationsByLanguage>({})
  const [reviewLanguage, setReviewLanguage] = useState('en')
  const [audioStatus, setAudioStatus] = useState<BlueprintSectionAudioStatus | undefined>()
  const [audioStartedAt, setAudioStartedAt] = useState<string | undefined>()

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [reviewerName, setReviewerName] = useState('')
  const [activeTab, setActiveTab] = useState<'review' | 'chat'>('review')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    core: true,
    story: false,
    characters: false,
    beats: false,
    tone: false,
  })

  const [draft, setDraft] = useState<ShareFeedbackDraft>({ sections: {} })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [audioPollStale, setAudioPollStale] = useState(false)
  const audioPollCountRef = useRef(0)

  const loadShare = useCallback(async () => {
    const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}`, { cache: 'no-store' })
    const data = await res.json()
    if (!data.success) {
      setError(data.error || 'Link not found')
      return false
    }
    setTreatment(data.payload?.treatment || null)
    setHeroImageUrl(
      resolveBlueprintHeroImageUrl(data.payload) ??
        resolveBlueprintHeroImageUrl(
          (data.payload?.treatment as Record<string, unknown> | undefined) ?? null
        )
    )
    setOwnerName(data.payload?.ownerDisplayName || 'Owner')
    setAllowTts(data.payload?.shareSettings?.allowTts !== false)
    const lang = data.payload?.sectionAudioLanguage || 'en'
    const byLang = data.payload?.sectionAudioByLanguage || {}
    const flat = data.payload?.sectionAudio || byLang[lang] || {}
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SHARE_LANG_KEY(token))
      setReviewLanguage(stored || lang)
    } else {
      setReviewLanguage(lang)
    }
    setSectionAudioByLanguage(byLang)
    setSectionTranslations(data.payload?.sectionTranslations || {})
    setSectionAudio(flat)
    setAudioStatus(data.payload?.sectionAudioStatus)
    setAudioStartedAt(data.payload?.sectionAudioStartedAt)
    return true
  }, [token])

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(PARTICIPANT_KEY(token)) : null
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.participantId) {
          setParticipantId(parsed.participantId)
          setReviewerName(parsed.name || '')
        }
      } catch {}
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const ok = await loadShare()
        if (!cancelled && !ok) setError('Blueprint not available')
      } catch {
        if (!cancelled) setError('Failed to load blueprint')
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadShare])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SHARE_LANG_KEY(token), reviewLanguage)
    }
    const langAudio =
      sectionAudioByLanguage[reviewLanguage] ||
      (reviewLanguage === 'en' ? sectionAudio : undefined) ||
      {}
    setSectionAudio(langAudio)
  }, [reviewLanguage, sectionAudioByLanguage, token])

  useEffect(() => {
    if (audioStatus !== 'pending' || !audioStartedAt) {
      audioPollCountRef.current = 0
      setAudioPollStale(false)
      return
    }
    const id = setInterval(() => {
      audioPollCountRef.current += 1
      if (audioPollCountRef.current >= MAX_AUDIO_POLLS) {
        setAudioPollStale(true)
        return
      }
      void loadShare()
    }, 8000)
    return () => clearInterval(id)
  }, [audioStatus, audioStartedAt, loadShare])

  useEffect(() => {
    if (!participantId) return
    const saved = loadFeedbackDraft(token, participantId)
    if (saved) setDraft(saved)
  }, [token, participantId])

  useEffect(() => {
    if (!participantId) return
    saveFeedbackDraft(token, participantId, draft)
  }, [draft, token, participantId])

  const handleRegister = async () => {
    if (regName.trim().length < 2) {
      toast.error('Enter your name (at least 2 characters)')
      return
    }
    setRegLoading(true)
    try {
      const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName.trim(), email: regEmail.trim() || undefined }),
      })
      const data = await res.json()
      if (data.success && data.participantId) {
        setParticipantId(data.participantId)
        setReviewerName(data.name || regName.trim())
        localStorage.setItem(
          PARTICIPANT_KEY(token),
          JSON.stringify({ participantId: data.participantId, name: data.name })
        )
        toast.success('You can now leave feedback and chat')
      } else {
        toast.error(data.error || 'Registration failed')
      }
    } catch {
      toast.error('Registration failed')
    } finally {
      setRegLoading(false)
    }
  }

  const updateSectionFeedback = (id: BlueprintFixSection, patch: BlueprintFeedbackSection) => {
    setDraft((prev) => ({
      ...prev,
      sections: { ...prev.sections, [id]: patch },
    }))
  }

  const handleSubmitFeedback = async () => {
    if (!participantId || !hasAnyFeedback(draft)) {
      toast.error('Rate at least one section or add a note before submitting')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          reviewerName,
          overallScore: draft.overallScore || undefined,
          preferred: draft.preferred || undefined,
          sections: draft.sections as BlueprintFeedbackSections,
          freeformNotes: draft.freeformNotes?.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
        toast.success('Thanks — your feedback was sent')
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`sf_share_feedback_${token}_${participantId}`)
        }
      } else {
        toast.error(data.error || 'Failed to submit feedback')
      }
    } catch {
      toast.error('Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  const scrollToSection = (id: string) => {
    setExpanded((p) => ({ ...p, [id]: true }))
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const ratedCount = useMemo(() => countRatedSections(draft), [draft])
  const audioReadyCount = countSectionsWithUrl(sectionAudio)
  const totalAudioSections = SECTION_NAV.length
  const hasCachedAudio = audioReadyCount > 0
  const hasTranslationForLang = Boolean(
    sectionTranslations[reviewLanguage] &&
      Object.keys(sectionTranslations[reviewLanguage] || {}).length > 0
  )
  const audioMissingForLang =
    allowTts &&
    reviewLanguage !== 'en' &&
    !hasCachedAudio &&
    (audioStatus === 'ready' || audioStatus === 'partial' || audioStatus === 'idle')

  const filmTitle = String(treatment?.title || 'Blueprint')
  const logline = treatment?.logline ? String(treatment.logline) : undefined

  const statusMessages = (
    <>
      {audioMissingForLang && (
        <p className="text-sm text-amber-400/90">
          Audio has not been generated for this language. You can still read the blueprint
          {hasTranslationForLang ? ' below' : ' (page translation may apply)'}.
        </p>
      )}
      {allowTts && audioStatus === 'pending' && audioStartedAt && !audioPollStale && (
        <p className="text-sm text-amber-400/90">
          {audioReadyCount > 0
            ? `Generating audio (${audioReadyCount}/${totalAudioSections} sections ready)…`
            : 'Preparing section audio…'}
        </p>
      )}
      {allowTts && audioStatus === 'idle' && !hasCachedAudio && (
        <p className="text-sm text-gray-400">
          Section audio is not generated yet. Ask the project owner to use Generate section audio
          in Studio → Collaborate.
        </p>
      )}
      {allowTts && audioPollStale && !hasCachedAudio && audioStatus === 'pending' && (
        <p className="text-sm text-amber-400/90">
          Section audio is taking longer than expected. Ask the project owner to generate section
          audio from Studio → Collaborate.
        </p>
      )}
      {allowTts && audioStatus === 'failed' && (
        <p className="text-sm text-red-400/90">
          Section audio could not be generated. The owner can retry from Studio → Collaborate.
        </p>
      )}
      {allowTts &&
        (audioStatus === 'ready' || audioStatus === 'partial') &&
        hasCachedAudio && (
          <p className="text-sm text-emerald-400/80">
            Tap Listen on each section to hear narration.
          </p>
        )}
    </>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        <div className="animate-pulse text-center space-y-2">
          <p>Loading blueprint…</p>
        </div>
      </div>
    )
  }

  if (error || !treatment) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center text-gray-400 max-w-md">
          <p className="text-lg text-gray-200 mb-2">Unable to open this review link</p>
          <p className="text-sm">{error || 'Blueprint not available'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 text-gray-100">
      <header className="border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <SceneFlowStudioBrand href="/" nameClassName="text-white" />
            <Link
              href="/"
              className="text-sm text-purple-300/90 hover:text-purple-200 underline-offset-2 hover:underline shrink-0"
            >
              Learn more about SceneFlow
            </Link>
          </div>
          <p className="sf-review-eyebrow">Blueprint Review</p>
          <BlueprintShareLanguageControls
            language={reviewLanguage}
            onLanguageChange={setReviewLanguage}
          />
          <div className="space-y-1">{statusMessages}</div>
        </div>
        <nav className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {SECTION_NAV.map((s) => {
            const t = BLUEPRINT_REVIEW_SECTION_THEME[s.id]
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  'shrink-0 text-sm font-medium px-3.5 py-1.5 rounded-full border transition-colors',
                  t.navIdle,
                  t.navHover
                )}
              >
                {s.label}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8 pb-36">
        <BlueprintReviewHero
          title={filmTitle}
          logline={logline}
          heroImageUrl={heroImageUrl}
          genre={treatment.genre ? String(treatment.genre) : undefined}
        />

        {!hasCachedAudio &&
          allowTts &&
          audioStatus !== 'skipped' &&
          audioStatus !== 'failed' &&
          !audioPollStale && (
            <p className="text-xs text-gray-500">
              Section audio will appear when ready. Use Listen on each section when it becomes
              available.
            </p>
          )}

        <div className="space-y-5">
          {SECTION_NAV.map((s) => (
            <BlueprintReviewSection
              key={s.id}
              sectionId={s.id}
              title={s.label}
              variant={treatment}
              expanded={!!expanded[s.id]}
              onToggle={() => setExpanded((p) => ({ ...p, [s.id]: !p[s.id] }))}
              audio={sectionAudio[s.id]}
              translationNarration={sectionTranslations[reviewLanguage]?.[s.id]}
              audioPlayerStatus={resolveSectionAudioPlayerStatus(
                s.id,
                sectionAudio,
                audioStatus,
                allowTts,
                audioPollStale,
                audioStartedAt
              )}
              allowTts={allowTts}
              canFeedback={!!participantId && !submitted}
              feedback={draft.sections?.[s.id]}
              onFeedbackChange={
                participantId && !submitted
                  ? (next) => updateSectionFeedback(s.id, next)
                  : undefined
              }
              omitLoglineInCore={!!treatment.logline}
              omitTitleInCore={!!treatment.title}
            />
          ))}
        </div>

        {!participantId ? (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Join to leave feedback</h3>
            <p className="text-sm text-gray-400">
              You can read and listen above. Enter your name to rate sections, submit notes, and chat with{' '}
              {ownerName}.
            </p>
            <input
              type="text"
              placeholder="Your name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
            <Button
              onClick={handleRegister}
              disabled={regLoading}
              className="w-full bg-purple-600 hover:bg-purple-500"
            >
              {regLoading ? 'Joining…' : 'Continue'}
            </Button>
          </div>
        ) : submitted ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <p className="text-emerald-300 font-medium">Thanks — your notes were sent.</p>
              <p className="text-sm text-gray-400 mt-2">The project owner can review your feedback in Studio.</p>
            </div>
            <div className="flex gap-2 border-b border-gray-800">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
                  activeTab === 'chat'
                    ? 'border-purple-500 text-purple-300'
                    : 'border-transparent text-gray-500'
                )}
              >
                Team chat
              </button>
            </div>
            {activeTab === 'chat' && (
              <BlueprintCollabChat
                shareToken={token}
                role="collaborator"
                participantId={participantId}
              />
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2 border-b border-gray-800">
              {(['review', 'chat'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                    activeTab === tab
                      ? 'border-purple-500 text-purple-300'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  )}
                >
                  {tab === 'review' ? 'Your review' : 'Team chat'}
                </button>
              ))}
            </div>

            {activeTab === 'review' ? (
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">Overall</h3>
                  <span className="text-xs text-gray-500">
                    {ratedCount}/5 sections rated
                  </span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, overallScore: n }))}
                      className={cn(
                        'w-9 h-9 rounded-lg text-sm font-medium',
                        draft.overallScore === n
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!draft.preferred}
                    onChange={(e) => setDraft((p) => ({ ...p, preferred: e.target.checked }))}
                    className="rounded border-gray-600"
                  />
                  I would pick this version
                </label>
                <Textarea
                  placeholder="Anything else? (optional)"
                  value={draft.freeformNotes || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, freeformNotes: e.target.value }))}
                  rows={3}
                  className="bg-gray-900 border-gray-700"
                />
              </div>
            ) : (
              <BlueprintCollabChat
                shareToken={token}
                role="collaborator"
                participantId={participantId}
              />
            )}
          </>
        )}

      </main>

      {participantId && !submitted && activeTab === 'review' && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <p className="text-xs text-gray-500 flex-1 hidden sm:block">
              {hasAnyFeedback(draft) ? 'Ready to submit' : 'Rate a section or add notes'}
            </p>
            <Button
              onClick={handleSubmitFeedback}
              disabled={submitting || !hasAnyFeedback(draft)}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Submit review'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
