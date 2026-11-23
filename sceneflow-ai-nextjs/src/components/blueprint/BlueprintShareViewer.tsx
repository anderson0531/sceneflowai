'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { BlueprintReviewSection } from './BlueprintReviewSection'
import type { BlueprintSectionAudioPlayerStatus } from './BlueprintSectionAudioPlayer'
import { BlueprintCollabChat } from './BlueprintCollabChat'
import { Button } from '@/components/ui/Button'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { getLocaleDirection } from '@/i18n/locale'
import { cn } from '@/lib/utils'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import type {
  BlueprintBeatAudioByLanguage,
  BlueprintBeatTranslationsByLanguage,
  BlueprintClientClarificationDraft,
  BlueprintFeedbackSection,
  BlueprintFeedbackSections,
  BlueprintSectionAudioMap,
  BlueprintSectionAudioStatus,
  BlueprintSectionTranslationsByLanguage,
  BlueprintShareAccessRole,
  BlueprintShareSettings,
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
import { useContentTranslation } from '@/i18n/content/useContentTranslation'
import {
  applyTreatmentVariantTranslations,
  buildTreatmentVariantDisplayFields,
} from '@/i18n/content/buildBlueprintDisplayFields'
import { EMPTY_ENTITY_I18N, readContentEntityI18n } from '@/i18n/content/entityI18n'
import { fromTtsLanguageCode } from '@/i18n/languageCodeBridge'
import {
  isBlueprintFeedbackAllowed,
  isBlueprintRoundLimitReached,
} from '@/lib/blueprint/shareSettings'
import {
  formatPortalCopy,
  getPortalLocaleLabel,
  getSpeechLangForPortalLocale,
  resolveClientPortalLocale,
  type ClientPortalStrings,
} from '@/lib/intake/clientPortalCopy'
import type { SharedBlueprintARSnapshot } from '@/lib/blueprint/sanitizeShareAR'
import { BlueprintShareResonancePanel } from './BlueprintShareResonancePanel'
import { ClientAutoRevisePanel } from './ClientAutoRevisePanel'
import { PipelinePlaceholderStage } from '@/components/landing/PipelinePlaceholderStage'
import { isPipelinePlaceholderToken } from '@/config/landing/productionPipelineDemo'
import type { BlueprintSectionAudioEntry } from '@/lib/blueprint/shareTypes'

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

const SECTION_NAV: { id: BlueprintFixSection; labelKey: keyof ClientPortalStrings }[] = [
  { id: 'core', labelKey: 'sectionCoreLabel' },
  { id: 'story', labelKey: 'sectionStoryLabel' },
  { id: 'characters', labelKey: 'sectionCharactersLabel' },
  { id: 'beats', labelKey: 'sectionBeatsLabel' },
  { id: 'tone', labelKey: 'sectionToneLabel' },
]

type Props = { token: string }

export function BlueprintShareViewer({ token }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [treatment, setTreatment] = useState<Record<string, unknown> | null>(null)
  const [heroImageUrl, setHeroImageUrl] = useState<string | undefined>()
  const [ownerName, setOwnerName] = useState('Owner')
  const [allowTts, setAllowTts] = useState(true)
  const [allowFeedback, setAllowFeedback] = useState(true)
  const [arSnapshot, setArSnapshot] = useState<SharedBlueprintARSnapshot | null>(null)
  const [resonanceAudioByLanguage, setResonanceAudioByLanguage] = useState<
    Record<string, BlueprintSectionAudioEntry>
  >({})
  const [resonanceTranslations, setResonanceTranslations] = useState<Record<string, string>>({})
  const [sectionAudio, setSectionAudio] = useState<BlueprintSectionAudioMap>({})
  const [sectionAudioByLanguage, setSectionAudioByLanguage] = useState<
    Record<string, BlueprintSectionAudioMap>
  >({})
  const [sectionTranslations, setSectionTranslations] =
    useState<BlueprintSectionTranslationsByLanguage>({})
  const [beatAudioByLanguage, setBeatAudioByLanguage] =
    useState<BlueprintBeatAudioByLanguage>({})
  const [beatTranslations, setBeatTranslations] =
    useState<BlueprintBeatTranslationsByLanguage>({})
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
  const [shareSettings, setShareSettings] = useState<BlueprintShareSettings | null>(null)
  const [accessRole, setAccessRole] = useState<BlueprintShareAccessRole>('standard')
  const [guestShareUrl, setGuestShareUrl] = useState<string | null>(null)
  const [pendingClarification, setPendingClarification] =
    useState<BlueprintClientClarificationDraft | null>(null)
  const [approvingBlueprint, setApprovingBlueprint] = useState(false)
  const [unlockingExpress, setUnlockingExpress] = useState(false)
  const [audioPollStale, setAudioPollStale] = useState(false)
  const audioPollCountRef = useRef(0)

  const loadShare = useCallback(async () => {
    const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}`, { cache: 'no-store' })
    const data = await res.json()
    if (!data.success) {
      setError(data.error || 'Link not found')
      return false
    }
    setAccessRole((data.accessRole as BlueprintShareAccessRole) || 'standard')
    setGuestShareUrl(typeof data.guestShareUrl === 'string' ? data.guestShareUrl : null)
    setTreatment(data.payload?.treatment || null)
    setHeroImageUrl(
      resolveBlueprintHeroImageUrl(data.payload) ??
        resolveBlueprintHeroImageUrl(
          (data.payload?.treatment as Record<string, unknown> | undefined) ?? null
        )
    )
    setOwnerName(data.payload?.ownerDisplayName || 'Owner')
    setShareSettings(data.payload?.shareSettings || null)
    setPendingClarification(data.payload?.pendingClientClarification || null)
    setAllowTts(data.payload?.shareSettings?.allowTts !== false)
    setAllowFeedback(isBlueprintFeedbackAllowed(data.payload?.shareSettings))
    setArSnapshot(data.payload?.blueprintAudienceResonance ?? null)
    setResonanceAudioByLanguage(data.payload?.resonanceAudioByLanguage || {})
    setResonanceTranslations(data.payload?.resonanceTranslations || {})
    const rawLang = data.payload?.sectionAudioLanguage || 'en'
    const lang = rawLang.toLowerCase().startsWith('zh') ? 'zh' : rawLang
    const byLang = data.payload?.sectionAudioByLanguage || {}
    const flat = data.payload?.sectionAudio || byLang[lang] || byLang[rawLang] || {}
    if (typeof window !== 'undefined') {
      const urlLang = new URLSearchParams(window.location.search).get('lang')?.trim()
      const normalizedUrlLang = urlLang
        ? urlLang.toLowerCase().startsWith('zh')
          ? 'zh'
          : urlLang
        : null
      const stored = localStorage.getItem(SHARE_LANG_KEY(token))
      setReviewLanguage(normalizedUrlLang || stored || lang)
    } else {
      setReviewLanguage(lang)
    }
    setSectionAudioByLanguage(byLang)
    setSectionTranslations(data.payload?.sectionTranslations || {})
    setBeatAudioByLanguage(data.payload?.beatAudioByLanguage || {})
    setBeatTranslations(data.payload?.beatTranslations || {})
    setSectionAudio(flat)
    setAudioStatus(data.payload?.sectionAudioStatus)
    setAudioStartedAt(data.payload?.sectionAudioStartedAt)
    const incomingBeats = Array.isArray(data.payload?.treatment?.beats)
      ? data.payload.treatment.beats
      : []
    const hasIllustratedBeats = incomingBeats.some((b: any) =>
      Boolean(b?.imageUrl || b?.storyboardStillUrl || b?.stillUrl)
    )
    if (data.payload?.shareSettings?.clientMode || hasIllustratedBeats) {
      setExpanded((prev) => ({ ...prev, beats: true, characters: true }))
    }
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

  const placeholder = isPipelinePlaceholderToken(token)

  useEffect(() => {
    if (placeholder) {
      setLoading(false)
      return
    }
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
  }, [loadShare, placeholder])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SHARE_LANG_KEY(token), reviewLanguage)
    }
    const portalLoc = resolveClientPortalLocale(reviewLanguage)
    const langAudio =
      sectionAudioByLanguage[reviewLanguage] ||
      sectionAudioByLanguage[portalLoc] ||
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

  const treatmentForMt = useMemo(() => {
    if (!treatment) return null
    if (treatment.id) return treatment
    return { ...treatment, id: 'share' }
  }, [treatment])

  const contentFields = useMemo(
    () => buildTreatmentVariantDisplayFields(treatmentForMt),
    [treatmentForMt]
  )
  const shareContentI18n = useMemo(() => {
    if (!treatment) return EMPTY_ENTITY_I18N
    return readContentEntityI18n({
      metadata: (treatment as { metadata?: Record<string, unknown> }).metadata,
    })
  }, [treatment])
  const contentTargetLocale = fromTtsLanguageCode(reviewLanguage)

  const { resolve: resolveContent } = useContentTranslation({
    fields: contentFields,
    i18n: shareContentI18n,
    enabled: Boolean(treatmentForMt),
    targetLocale: contentTargetLocale,
  })

  const localizedTreatment = useMemo(() => {
    if (!treatmentForMt) return null
    return applyTreatmentVariantTranslations(treatmentForMt, resolveContent) || treatmentForMt
  }, [treatmentForMt, resolveContent])

  const filmTitle = String(localizedTreatment?.title || treatment?.title || 'Blueprint')
  const logline = localizedTreatment?.logline
    ? String(localizedTreatment.logline)
    : treatment?.logline
      ? String(treatment.logline)
      : undefined
  const displayGenre = localizedTreatment?.genre
    ? String(localizedTreatment.genre)
    : treatment?.genre
      ? String(treatment.genre)
      : undefined
  const reviewVariant = localizedTreatment || treatment!

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

  if (placeholder) {
    return <PipelinePlaceholderStage tokenOrSlug={token} />
  }

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

  const roundLimitReached = isBlueprintRoundLimitReached(shareSettings)
  const isApproved = shareSettings?.approvalStatus === 'approved'
  const isGuestReviewer = accessRole === 'guest_reviewer'
  const brandSnapshot = shareSettings?.brandProfileSnapshot
  const portalLocale = resolveClientPortalLocale(reviewLanguage)
  const canFeedback =
    allowFeedback &&
    !!participantId &&
    !submitted &&
    (isGuestReviewer || shareSettings?.clientAutoReviseMode === true || !roundLimitReached)

  const handleApproveBlueprint = async () => {
    setApprovingBlueprint(true)
    try {
      const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerName: reviewerName || regName || 'Client' }),
      })
      const data = await res.json()
      if (data.success) {
        setShareSettings((prev) => ({
          ...(prev || {}),
          approvalStatus: 'approved',
        }))
        toast.success(formatPortalCopy(portalLocale, 'blueprintApproved'))
      } else {
        toast.error(data.error || 'Could not approve blueprint')
      }
    } catch {
      toast.error('Could not approve blueprint')
    } finally {
      setApprovingBlueprint(false)
    }
  }

  const handleUnlockExpressFilm = async () => {
    setUnlockingExpress(true)
    try {
      const res = await fetch('/api/showcase/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderKind: 'express_film_balance',
          blueprintToken: token,
          customerName: reviewerName || regName || shareSettings?.customerName || undefined,
          customerEmail: shareSettings?.customerEmail || undefined,
        }),
      })
      const data = await res.json()
      if (data.success && data.purchaseUrl) {
        window.location.href = data.purchaseUrl
      } else {
        toast.error(data.error || 'Could not launch Whop checkout')
        setUnlockingExpress(false)
      }
    } catch {
      toast.error('Could not launch Whop checkout')
      setUnlockingExpress(false)
    }
  }

  const isExpress4kOrder = shareSettings?.deliveryTier === 'express_cinema_4k'
  const expressBalanceUsd = shareSettings?.expressBalanceUsd ?? 120
  const expressTotalUsd = shareSettings?.expressTotalPriceUsd ?? 149
  const expressContinuityUrl = shareSettings?.continuityPortalUrl || null

  return (
    <div
      dir={getLocaleDirection(portalLocale)}
      lang={portalLocale}
      className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 text-gray-100"
    >
      <header
        className="border-b border-gray-800/60 bg-gray-900/85 backdrop-blur-md sticky top-0 z-20"
        style={
          brandSnapshot?.primaryColor
            ? { borderTop: `3px solid ${brandSnapshot.primaryColor}` }
            : undefined
        }
      >
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {brandSnapshot?.brandName ? (
              <div className="flex items-center gap-2.5">
                {brandSnapshot.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brandSnapshot.logoUrl}
                    alt={brandSnapshot.brandName}
                    className="h-9 w-9 rounded-lg object-cover border border-gray-700"
                  />
                ) : (
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: brandSnapshot.primaryColor || '#7c3aed' }}
                  >
                    {brandSnapshot.brandName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="leading-tight">
                  <span className="font-semibold text-white block">
                    {formatPortalCopy(portalLocale, 'producedBy', {
                      brand: brandSnapshot.brandName,
                    })}
                  </span>
                  {brandSnapshot.supportEmail ? (
                    <a
                      href={`mailto:${brandSnapshot.supportEmail}`}
                      className="text-[11px] text-gray-400 hover:text-gray-200"
                    >
                      {brandSnapshot.supportEmail}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <SceneFlowStudioBrand href="/" nameClassName="text-white" />
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              {!isGuestReviewer && typeof shareSettings?.maxFeedbackRounds === 'number' && (
                <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-200">
                  {formatPortalCopy(portalLocale, 'roundBadge', {
                    used: shareSettings.roundsUsed ?? 0,
                    max: shareSettings.maxFeedbackRounds,
                  })}
                </span>
              )}
              {isGuestReviewer && (
                <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
                  Guest Reviewer • Comment Only
                </span>
              )}
              {shareSettings?.clientMode && !isGuestReviewer && (
                <button
                  type="button"
                  disabled={isApproved || approvingBlueprint}
                  onClick={handleApproveBlueprint}
                  className={cn(
                    'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition shadow-sm',
                    isApproved
                      ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  )}
                >
                  {isApproved
                    ? formatPortalCopy(portalLocale, 'blueprintApproved')
                    : formatPortalCopy(portalLocale, 'approveBlueprint')}
                </button>
              )}
              {brandSnapshot?.brandName
                ? !brandSnapshot.hideSceneFlowBranding && (
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/90 hover:border-purple-500/40 px-2.5 py-1 text-[11px] font-medium text-gray-300 hover:text-white transition shrink-0"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                      Powered by SceneFlow Studio
                    </Link>
                  )
                : !brandSnapshot?.hideSceneFlowBranding && (
                    <Link
                      href="/"
                      className="text-sm text-purple-300/90 hover:text-purple-200 underline-offset-2 hover:underline shrink-0"
                    >
                      Learn more about SceneFlow
                    </Link>
                  )}
            </div>
          </div>
          {roundLimitReached && !isApproved && !isGuestReviewer && !shareSettings?.clientAutoReviseMode && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {formatPortalCopy(portalLocale, 'roundLimitReached', {
                brand: brandSnapshot?.brandName || ownerName,
              })}
            </div>
          )}
          {isExpress4kOrder && !isGuestReviewer && (
            <div className="rounded-xl border border-amber-400/35 bg-gradient-to-r from-amber-500/12 via-slate-900/90 to-slate-900/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  {expressContinuityUrl
                    ? 'Express 4K Cinema Film Unlocked'
                    : 'Next Step · Same-Day Express 4K Cinema Film'}
                </p>
                <p className="text-xs sm:text-sm text-slate-200">
                  {expressContinuityUrl
                    ? 'Your balance is paid! Open your Continuity Library to upload real photos & add your 10-second pronunciation guide.'
                    : `Your $29 Blueprint Pass is 100% credited toward your $${expressTotalUsd} Express 4K Cinema Film. Complete the $${expressBalanceUsd} balance via Whop to unlock your Continuity Library & Same-Day 4K Master.`}
                </p>
              </div>
              {expressContinuityUrl ? (
                <a
                  href={expressContinuityUrl}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 transition shrink-0"
                >
                  Open Continuity Library →
                </a>
              ) : (
                <button
                  type="button"
                  disabled={unlockingExpress}
                  onClick={handleUnlockExpressFilm}
                  className="inline-flex items-center justify-center rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-60 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 transition shrink-0 shadow-sm"
                >
                  {unlockingExpress
                    ? 'Opening Whop Checkout...'
                    : `Unlock Express 4K Film ($${expressBalanceUsd}) →`}
                </button>
              )}
            </div>
          )}
          <p className="sf-review-eyebrow">
            {allowFeedback
              ? formatPortalCopy(portalLocale, 'blueprintReviewHeading')
              : formatPortalCopy(portalLocale, 'blueprintListenOnlyHeading')}
          </p>
          <BlueprintShareLanguageControls
            language={reviewLanguage}
            onLanguageChange={setReviewLanguage}
            enableGoogleTranslate={false}
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
                {formatPortalCopy(portalLocale, s.labelKey)}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8 pb-36">
        {isGuestReviewer && (
          <div className="rounded-2xl border border-cyan-500/35 bg-gradient-to-r from-cyan-950/50 via-slate-900/90 to-slate-900/90 p-4 space-y-1 shadow-lg">
            <div className="text-sm font-semibold text-cyan-200">
              Shared for Your Review &amp; Comments
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Listen to the narrated Blueprint and explore each chapter storyboard below. Any comments
              you leave are sent directly to{' '}
              <strong className="text-white">{shareSettings?.customerName || 'the project owner'}</strong>{' '}
              to review and filter before updating the Blueprint.
            </p>
          </div>
        )}
        {shareSettings?.clientAutoReviseMode && !isGuestReviewer && !isApproved && (
          <ClientAutoRevisePanel
            token={token}
            locale={portalLocale}
            shareSettings={shareSettings}
            initialClarification={pendingClarification}
            arSnapshot={arSnapshot}
            guestShareUrl={guestShareUrl}
            onBlueprintUpdated={loadShare}
          />
        )}
        {shareSettings?.clientMode && isApproved && (
          <div className="rounded-2xl border border-emerald-500/35 bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-slate-900/90 p-4 space-y-1.5 shadow-lg">
            <div className="text-sm font-semibold text-emerald-200">
              {formatPortalCopy(portalLocale, 'blueprintApproved')}
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {formatPortalCopy(portalLocale, 'blueprintApprovedNextSteps', {
                brand: brandSnapshot?.brandName || ownerName,
              })}
            </p>
          </div>
        )}

        <BlueprintReviewHero
          title={filmTitle}
          logline={logline}
          heroImageUrl={heroImageUrl}
          genre={displayGenre}
          runtimeLabel={
            reviewVariant.estimatedDurationMinutes
              ? `~${reviewVariant.estimatedDurationMinutes} min`
              : typeof reviewVariant.format_length === 'string'
                ? reviewVariant.format_length
                : undefined
          }
          chapterCount={
            Array.isArray(reviewVariant.beats) ? reviewVariant.beats.length : undefined
          }
          visualStyle={
            typeof reviewVariant.visual_style === 'string' && reviewVariant.visual_style.trim()
              ? reviewVariant.visual_style
              : typeof reviewVariant.artStyle === 'string' && reviewVariant.artStyle.trim()
                ? reviewVariant.artStyle
                : undefined
          }
          visionStatement={
            typeof reviewVariant.visionStatement === 'string'
              ? reviewVariant.visionStatement
              : undefined
          }
          intendedImpact={
            typeof reviewVariant.intendedImpact === 'string'
              ? reviewVariant.intendedImpact
              : undefined
          }
          accentColor={brandSnapshot?.primaryColor}
          locale={portalLocale}
        />

        {arSnapshot ? (
          <BlueprintShareResonancePanel
            snapshot={arSnapshot}
            audio={
              resonanceAudioByLanguage[reviewLanguage] ||
              resonanceAudioByLanguage[portalLocale]
            }
            translationNarration={
              resonanceTranslations[reviewLanguage] ||
              resonanceTranslations[portalLocale]
            }
            allowTts={allowTts}
          />
        ) : null}

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
              title={formatPortalCopy(portalLocale, s.labelKey)}
              variant={reviewVariant}
              expanded={!!expanded[s.id]}
              onToggle={() => setExpanded((p) => ({ ...p, [s.id]: !p[s.id] }))}
              audio={sectionAudio[s.id]}
              beatAudioMap={
                s.id === 'beats'
                  ? beatAudioByLanguage[reviewLanguage] ||
                    beatAudioByLanguage[portalLocale] ||
                    beatAudioByLanguage.en
                  : undefined
              }
              beatTranslationMap={
                s.id === 'beats'
                  ? beatTranslations[reviewLanguage] || beatTranslations[portalLocale]
                  : undefined
              }
              translationNarration={
                sectionTranslations[reviewLanguage]?.[s.id] ||
                sectionTranslations[portalLocale]?.[s.id]
              }
              audioPlayerStatus={resolveSectionAudioPlayerStatus(
                s.id,
                sectionAudio,
                audioStatus,
                allowTts,
                audioPollStale,
                audioStartedAt
              )}
              allowTts={allowTts}
              clientMode={Boolean(shareSettings?.clientMode)}
              canFeedback={canFeedback}
              feedback={draft.sections?.[s.id]}
              onFeedbackChange={
                canFeedback
                  ? (next) => updateSectionFeedback(s.id, next)
                  : undefined
              }
              omitLoglineInCore={!!reviewVariant.logline}
              omitTitleInCore={!!reviewVariant.title}
              locale={portalLocale}
            />
          ))}
        </div>

        {allowFeedback && (!participantId ? (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">
              {formatPortalCopy(portalLocale, 'joinToLeaveFeedbackTitle')}
            </h3>
            <p className="text-sm text-gray-400">
              {formatPortalCopy(portalLocale, 'joinToLeaveFeedbackBody', {
                owner: brandSnapshot?.brandName || ownerName,
              })}
            </p>
            <input
              type="text"
              dir={getLocaleDirection(portalLocale)}
              lang={portalLocale}
              placeholder={formatPortalCopy(portalLocale, 'yourName')}
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="email"
              dir="ltr"
              placeholder={formatPortalCopy(portalLocale, 'yourEmail')}
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
            <Button
              onClick={handleRegister}
              disabled={regLoading}
              className="w-full bg-purple-600 hover:bg-purple-500"
            >
              {regLoading ? '…' : formatPortalCopy(portalLocale, 'continueButton')}
            </Button>
          </div>
        ) : submitted ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <p className="text-emerald-300 font-medium">
                {formatPortalCopy(portalLocale, 'feedbackSubmittedTitle')}
              </p>
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
                {formatPortalCopy(portalLocale, 'teamChatTab')}
              </button>
            </div>
            {activeTab === 'chat' && (
              <BlueprintCollabChat
                shareToken={token}
                role="collaborator"
                participantId={participantId}
                language={reviewLanguage}
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
                  {tab === 'review'
                    ? formatPortalCopy(portalLocale, 'yourReviewTab')
                    : formatPortalCopy(portalLocale, 'teamChatTab')}
                </button>
              ))}
            </div>

            {activeTab === 'review' ? (
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    {formatPortalCopy(portalLocale, 'overallRatingLabel')}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {ratedCount}/5
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
                <DictationTextarea
                  lang={getSpeechLangForPortalLocale(portalLocale)}
                  dir={getLocaleDirection(portalLocale)}
                  startLabel={formatPortalCopy(portalLocale, 'tapMicToSpeak')}
                  stopLabel={formatPortalCopy(portalLocale, 'stopRecording')}
                  listeningHint={formatPortalCopy(portalLocale, 'listeningInLanguage', {
                    lang: getPortalLocaleLabel(portalLocale),
                  })}
                  placeholder={formatPortalCopy(portalLocale, 'freeformNotesPlaceholder')}
                  value={draft.freeformNotes || ''}
                  onChange={(val) => setDraft((p) => ({ ...p, freeformNotes: val }))}
                  rows={3}
                  className="bg-gray-900 border-gray-700"
                />
              </div>
            ) : (
              <BlueprintCollabChat
                shareToken={token}
                role="collaborator"
                participantId={participantId}
                language={reviewLanguage}
              />
            )}
          </>
        ))}

      </main>

      {allowFeedback && participantId && !submitted && (isGuestReviewer || shareSettings?.clientAutoReviseMode === true || !roundLimitReached) && activeTab === 'review' && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="flex-1 hidden sm:block" />
            <Button
              onClick={handleSubmitFeedback}
              disabled={submitting || !hasAnyFeedback(draft)}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
            >
              {submitting ? '…' : formatPortalCopy(portalLocale, 'submitReviewButton')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
