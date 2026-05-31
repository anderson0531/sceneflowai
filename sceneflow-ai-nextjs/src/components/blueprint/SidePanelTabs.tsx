'use client'

import React, { useState } from 'react'
import { Users, X, Copy, Check, Link2, Radar } from 'lucide-react'
import { AudienceResonancePanelV3 } from './AudienceResonancePanelV3'
import { cn } from '@/lib/utils'
import { useGuideStore } from '@/store/useGuideStore'
import { BlueprintCollabChat } from './BlueprintCollabChat'
import { Sparkles, Loader2 } from 'lucide-react'
import type { BlueprintAudienceRecommendation } from '@/lib/types/audienceResonance'
import type {
  AudienceDefinition,
  PersistedBlueprintAudienceResonance,
  AudienceIntent,
} from '@/lib/types/audienceResonance'
import { isBlueprintARV3Enabled } from '@/lib/types/audienceResonance'
import { AudienceResonancePanel } from './AudienceResonancePanel'
import type { OpenBlueprintRefineOptions } from '@/lib/blueprint/openBlueprintRefine'
import { chipLabelById } from '@/lib/blueprint/feedbackChips'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { triggerBlueprintShareSectionAudio } from '@/lib/blueprint/createBlueprintShare'
import type { BlueprintSectionAudioStatus } from '@/lib/blueprint/shareTypes'
import { BlueprintGeminiVoicePicker } from './BlueprintGeminiVoicePicker'
import { DirectorNoteBuilderDialog } from '@/components/tts/DirectorNoteBuilderDialog'
import { DEFAULT_BLUEPRINT_GEMINI_VOICE } from '@/lib/tts/blueprintTtsConstants'

interface SidePanelTabsProps {
  onClose?: () => void
  sessionId: string | null
  shareUrl: string | null
  onShare: (opts?: { forceNew?: boolean }) => void
  isSharing: boolean
  onProceedToScripting?: () => void
  projectId?: string
  audienceDefinition?: AudienceDefinition | null
  onAudienceDefinitionSave?: (def: AudienceDefinition) => Promise<void>
  onAnalysisComplete?: (persisted: PersistedBlueprintAudienceResonance) => void
  savedBlueprintAR?: PersistedBlueprintAudienceResonance | null
  legacyIntent?: AudienceIntent | null
  contentIntent?: import('@/lib/content/contentIntent').ContentIntent | null
  shareToken?: string | null
  onOpenBlueprintRefine?: (opts: OpenBlueprintRefineOptions) => void
  /** Increment to switch to the Collaborate tab (e.g. after creating a link). */
  collaborationTabSignal?: number
  /** Increment to switch to the Resonance tab (e.g. after first generation). */
  resonanceTabSignal?: number
  onScrollToSection?: (section: string) => void
}

export function SidePanelTabs({ 
  onClose, 
  sessionId, 
  shareUrl, 
  onShare, 
  isSharing, 
  onProceedToScripting,
  projectId,
  audienceDefinition,
  onAudienceDefinitionSave,
  onAnalysisComplete,
  savedBlueprintAR,
  legacyIntent,
  contentIntent,
  onOpenBlueprintRefine,
  shareToken,
  collaborationTabSignal = 0,
  resonanceTabSignal = 0,
  onScrollToSection,
}: SidePanelTabsProps) {
  const [activeTab, setActiveTab] = useState<'resonance' | 'collaboration'>('resonance')

  React.useEffect(() => {
    if (collaborationTabSignal > 0) {
      setActiveTab('collaboration')
    }
  }, [collaborationTabSignal])

  React.useEffect(() => {
    if (resonanceTabSignal > 0) {
      setActiveTab('resonance')
    }
  }, [resonanceTabSignal])
  const { guide } = useGuideStore()
  const { updateTreatmentVariant } = useGuideStore() as any
  const activeVariantId = (guide as any)?.selectedTreatmentId || ((guide as any)?.treatmentVariants?.[0]?.id)
  
  // Get the current treatment variant for resonance analysis
  const currentTreatment = React.useMemo(() => {
    const variants = (guide as any)?.treatmentVariants || []
    return variants.find((v: any) => v.id === activeVariantId) || variants[0] || null
  }, [guide, activeVariantId])
  
  // Handle treatment updates from resonance fixes
  const handleTreatmentUpdate = React.useCallback((updatedTreatment: any) => {
    if (updatedTreatment?.id && updateTreatmentVariant) {
      updateTreatmentVariant(updatedTreatment.id, updatedTreatment)
      console.log('[SidePanelTabs] Treatment updated from resonance fix:', updatedTreatment.id)
    }
  }, [updateTreatmentVariant])

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 border-l border-gray-800">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800/60 bg-gray-900/50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('resonance')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeTab === 'resonance'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            )}
          >
            <Radar size={14} />
            <span>Resonance</span>
          </button>
          <button
            onClick={() => setActiveTab('collaboration')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeTab === 'collaboration'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            )}
          >
            <Users size={14} />
            <span>Collaborate</span>
          </button>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
            title="Close panel"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'resonance' ? (
          isBlueprintARV3Enabled() ? (
            <AudienceResonancePanelV3
              treatment={currentTreatment}
              projectId={projectId}
              audienceDefinition={audienceDefinition}
              savedBlueprintAR={savedBlueprintAR}
              legacyIntent={legacyIntent}
              contentIntent={contentIntent}
              onTreatmentUpdate={handleTreatmentUpdate}
              onProceedToScripting={onProceedToScripting}
              onAudienceDefinitionSave={onAudienceDefinitionSave}
              onAnalysisComplete={onAnalysisComplete}
              onOpenBlueprintRefine={onOpenBlueprintRefine}
              onScrollToSection={onScrollToSection}
            />
          ) : (
            <AudienceResonancePanel
              treatment={currentTreatment}
              projectId={projectId}
              onTreatmentUpdate={handleTreatmentUpdate}
              onProceedToScripting={onProceedToScripting}
              onAnalysisComplete={onAnalysisComplete}
            />
          )
        ) : (
          <CollaborationContent 
            sessionId={sessionId}
            shareToken={shareToken}
            shareUrl={shareUrl}
            onShare={onShare}
            isSharing={isSharing}
            onOpenBlueprintRefine={onOpenBlueprintRefine}
          />
        )}
      </div>
    </div>
  )
}

// Inline collaboration content (not a modal overlay)
function CollaborationContent({
  sessionId,
  shareToken,
  shareUrl,
  onShare,
  isSharing,
  onOpenBlueprintRefine,
}: {
  sessionId: string | null
  shareToken: string | null | undefined
  shareUrl: string | null
  onShare: (opts?: { forceNew?: boolean }) => void
  isSharing: boolean
  onOpenBlueprintRefine?: (opts: OpenBlueprintRefineOptions) => void
}) {
  const [subTab, setSubTab] = useState<'feedback' | 'team' | 'messages'>('feedback')
  const [feedback, setFeedback] = React.useState<any[]>([])
  const [participants, setParticipants] = React.useState<
    Array<{ id: string; name: string; lastMessage?: { text: string } | null }>
  >([])
  const [loading, setLoading] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [synthesizing, setSynthesizing] = React.useState(false)
  const [recommendations, setRecommendations] = React.useState<BlueprintAudienceRecommendation[]>([])
  const [selectedRecIds, setSelectedRecIds] = React.useState<Set<string>>(new Set())
  const [revoking, setRevoking] = React.useState(false)
  const [audioRefreshing, setAudioRefreshing] = React.useState(false)
  const [audioLanguage, setAudioLanguage] = React.useState('en')
  const [audioStatus, setAudioStatus] = React.useState<BlueprintSectionAudioStatus | undefined>()
  const [audioVoiceId, setAudioVoiceId] = React.useState(DEFAULT_BLUEPRINT_GEMINI_VOICE)
  const [audioVoiceName, setAudioVoiceName] = React.useState('Kore (Gemini)')
  const [audioDirectorNotes, setAudioDirectorNotes] = React.useState('')
  const [voicePickerOpen, setVoicePickerOpen] = React.useState(false)
  const [directorNotesOpen, setDirectorNotesOpen] = React.useState(false)

  const token = shareToken || (shareUrl ? shareUrl.split('/blueprint/share/')[1]?.split('?')[0] : null)

  const refreshShareAudioMeta = React.useCallback(async () => {
    if (!token) return
    try {
      const r = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}`, {
        cache: 'no-store',
      })
      const j = await r.json()
      if (j?.success) {
        setAudioStatus(j.payload?.sectionAudioStatus)
        if (j.payload?.sectionAudioLanguage) {
          setAudioLanguage(j.payload.sectionAudioLanguage)
        }
        if (j.payload?.sectionAudioVoiceId) {
          const id = j.payload.sectionAudioVoiceId as string
          setAudioVoiceId(id.startsWith('gemini-') ? id : DEFAULT_BLUEPRINT_GEMINI_VOICE)
        }
        if (typeof j.payload?.sectionAudioDirectorNotes === 'string') {
          setAudioDirectorNotes(j.payload.sectionAudioDirectorNotes)
        }
      }
    } catch {}
  }, [token])

  React.useEffect(() => {
    if (token) void refreshShareAudioMeta()
  }, [token, refreshShareAudioMeta])

  const handleGenerateSectionAudio = async () => {
    if (!token) return
    setAudioRefreshing(true)
    try {
      const result = await triggerBlueprintShareSectionAudio(token, {
        language: audioLanguage,
        voiceId: audioVoiceId,
        directorNotes: audioDirectorNotes,
      })
      const { toast } = await import('sonner')
      if (result.success) {
        if (result.skipped) {
          toast.message(`Section audio is already up to date (${audioLanguage})`)
        } else {
          toast.success(`Generating section audio (${audioLanguage})…`)
        }
        await refreshShareAudioMeta()
      } else {
        toast.error(result.error || 'Audio generation failed')
      }
    } catch {
      try {
        const { toast } = await import('sonner')
        toast.error('Audio generation failed')
      } catch {}
    } finally {
      setAudioRefreshing(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Copy failed:', e)
    }
  }

  const refreshFeedback = React.useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const r = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/feedback`, {
        cache: 'no-store',
      })
      const j = await r.json()
      if (j?.success) setFeedback(j.feedback || [])
    } catch {}
    setLoading(false)
  }, [token])

  React.useEffect(() => {
    if (!token) return
    refreshFeedback()
    ;(async () => {
      try {
        const r = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/participants`, {
          cache: 'no-store',
        })
        const j = await r.json()
        if (j?.success) setParticipants(j.participants || [])
      } catch {}
    })()
  }, [token, refreshFeedback])

  const handleSynthesize = async () => {
    if (!token) return
    setSynthesizing(true)
    try {
      const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/synthesize`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations)
        setSelectedRecIds(new Set(data.recommendations.map((r: BlueprintAudienceRecommendation) => r.id)))
        try {
          const { toast } = require('sonner')
          toast.success('Recommendations ready')
        } catch {}
      } else {
        try {
          const { toast } = require('sonner')
          toast.error(data.error || 'Synthesis failed')
        } catch {}
      }
    } catch {
      try {
        const { toast } = require('sonner')
        toast.error('Synthesis failed')
      } catch {}
    } finally {
      setSynthesizing(false)
    }
  }

  const handleRevoke = async () => {
    if (!token || !confirm('Revoke this share link? Reviewers will no longer have access.')) return
    setRevoking(true)
    try {
      await fetch(`/api/blueprint/share/${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revoke: true }),
      })
      try {
        const { toast } = require('sonner')
        toast.success('Link revoked')
      } catch {}
    } finally {
      setRevoking(false)
    }
  }

  const toggleRec = (id: string) => {
    setSelectedRecIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasShareLink = Boolean(sessionId && token && shareUrl)

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Share CTA / link — always at top of Collaborate tab */}
      <div className="shrink-0 px-3 py-3 border-b border-purple-500/20 bg-gradient-to-b from-purple-500/10 to-transparent">
        <div className="flex items-start gap-2">
          <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Users size={18} className="text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white leading-tight">
              {hasShareLink ? 'Reviewer link' : 'Share for feedback'}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
              {hasShareLink
                ? 'One link for all reviewers. Send it so collaborators can read, listen, and comment.'
                : 'Create a link reviewers can open without logging in.'}
            </p>
          </div>
        </div>

        {hasShareLink && shareUrl ? (
          <div className="mt-2.5 flex items-center gap-2">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 bg-gray-900/70 rounded-lg px-2.5 py-2 text-xs text-purple-200 truncate border border-purple-500/25 hover:border-purple-400/40 transition-colors"
              title={shareUrl}
            >
              {shareUrl}
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors shrink-0"
              title={copied ? 'Copied!' : 'Copy link'}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onShare}
            disabled={isSharing}
            className="mt-2.5 w-full px-3 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSharing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Users size={16} />
            )}
            <span>{isSharing ? 'Creating link…' : 'Share & Collaborate'}</span>
          </button>
        )}

        {hasShareLink && (
          <div className="mt-3 space-y-2 rounded-lg border border-slate-700/50 bg-slate-900/40 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Reviewer audio</p>
            <GroupedLanguageSelector
              value={audioLanguage}
              onValueChange={setAudioLanguage}
              size="xs"
              intent="generate"
              disabled={audioRefreshing || audioStatus === 'pending'}
            />
            <button
              type="button"
              onClick={() => setVoicePickerOpen(true)}
              disabled={audioRefreshing || audioStatus === 'pending'}
              className="w-full px-3 py-2 rounded-lg border border-slate-600/60 bg-slate-800/40 text-white text-xs text-left truncate disabled:opacity-50"
            >
              Voice: {audioVoiceName}
            </button>
            <button
              type="button"
              onClick={() => setDirectorNotesOpen(true)}
              disabled={audioRefreshing || audioStatus === 'pending'}
              className="w-full px-3 py-2 rounded-lg border border-slate-600/60 bg-slate-800/40 text-gray-300 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              {audioDirectorNotes.trim() ? "Director's notes (set)" : "Director's notes"}
            </button>
            <button
              type="button"
              onClick={handleGenerateSectionAudio}
              disabled={audioRefreshing || audioStatus === 'pending'}
              className="w-full px-3 py-2 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {audioRefreshing || audioStatus === 'pending' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              {audioRefreshing || audioStatus === 'pending'
                ? 'Generating section audio…'
                : 'Generate section audio'}
            </button>
            {audioStatus ? (
              <p className="text-[10px] text-gray-500">
                Status: {audioStatus}
                {audioStatus === 'idle' ? ' — tap Generate when ready' : ''}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => onShare({ forceNew: true })}
              disabled={isSharing}
              className="w-full text-[11px] text-purple-300/90 hover:text-purple-200 disabled:opacity-50 text-left"
            >
              {isSharing ? 'Creating new link…' : 'Create new link (new URL)'}
            </button>
            <BlueprintGeminiVoicePicker
              open={voicePickerOpen}
              onOpenChange={setVoicePickerOpen}
              selectedVoiceId={audioVoiceId}
              onSelectVoice={(id, name) => {
                setAudioVoiceId(id)
                setAudioVoiceName(name)
              }}
            />
            <DirectorNoteBuilderDialog
              isOpen={directorNotesOpen}
              onClose={() => setDirectorNotesOpen(false)}
              initialPrompt={audioDirectorNotes}
              onSave={(prompt) => {
                setAudioDirectorNotes(prompt)
                setDirectorNotesOpen(false)
              }}
            />
          </div>
        )}
      </div>

      {!hasShareLink ? (
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            After you create a link, feedback, team chat, and direct messages with reviewers will appear here.
          </p>
        </div>
      ) : (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      <div className="shrink-0 px-3 py-1.5 flex items-center justify-between border-b border-gray-800/40">
        <span className="text-[10px] text-gray-500">
          {feedback.length} review{feedback.length !== 1 ? 's' : ''} · {participants.length} reviewer
          {participants.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={handleRevoke}
          disabled={revoking}
          className="text-[10px] text-red-400/80 hover:text-red-300 disabled:opacity-50"
        >
          Revoke link
        </button>
      </div>

      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-800/40 flex-wrap">
        {(['feedback', 'team', 'messages'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={cn(
              'text-xs px-2 py-1 rounded capitalize',
              subTab === t ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60'
            )}
            onClick={() => setSubTab(t)}
          >
            {t === 'messages' ? 'Messages' : t}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {subTab === 'feedback' && (
          <div className="space-y-3">
            {loading && <div className="text-sm text-gray-400">Loading…</div>}
            {!loading && feedback.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-6">
                No feedback yet. Share the link with reviewers.
              </div>
            )}
            {feedback.map((f: any) => (
              <div key={f.id} className="text-xs text-gray-300 rounded border border-gray-800 p-2 bg-gray-900/50">
                <div className="text-gray-400 mb-1 flex justify-between gap-2">
                  <span className="min-w-0">
                    {f.overallScore ? (
                      <span className="text-yellow-500 font-medium">{f.overallScore}/5</span>
                    ) : null}{' '}
                    <span className="text-gray-200">{f.reviewerName}</span>
                    {f.preferred ? (
                      <span className="ml-1 text-emerald-400/90">· Preferred</span>
                    ) : null}
                  </span>
                  <span className="text-gray-500 shrink-0">
                    {new Date(f.createdAt).toLocaleString()}
                  </span>
                </div>
                {f.sections &&
                  Object.entries(f.sections).map(([sec, data]: [string, any]) => {
                    if (!data || typeof data !== 'object') return null
                    const hasContent =
                      data.score ||
                      data.tags?.length ||
                      data.strengths ||
                      data.concerns ||
                      data.suggestions
                    if (!hasContent) return null
                    return (
                      <div key={sec} className="mt-2 pt-1 border-t border-gray-800/60">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-gray-500 uppercase text-[10px] font-medium">
                            {sec}
                          </span>
                          {data.score ? (
                            <span className="text-amber-500/90 text-[10px]">{data.score}/5</span>
                          ) : null}
                        </div>
                        {Array.isArray(data.tags) && data.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {data.tags.map((tagId: string) => (
                              <span
                                key={tagId}
                                className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300/90 text-[10px]"
                              >
                                {chipLabelById(tagId)}
                              </span>
                            ))}
                          </div>
                        )}
                        {data.strengths && (
                          <p className="mt-0.5 text-emerald-400/80">
                            <span className="text-gray-500">+ </span>
                            {data.strengths}
                          </p>
                        )}
                        {data.concerns && (
                          <p className="mt-0.5">
                            <span className="text-gray-500">Concerns: </span>
                            {data.concerns}
                          </p>
                        )}
                        {data.suggestions && (
                          <p className="mt-0.5 text-gray-400">
                            <span className="text-gray-500">Notes: </span>
                            {data.suggestions}
                          </p>
                        )}
                      </div>
                    )
                  })}
                {f.freeformNotes && (
                  <p className="mt-2 pt-1 border-t border-gray-800/60 text-gray-400">
                    {f.freeformNotes}
                  </p>
                )}
              </div>
            ))}

            {feedback.length > 0 && (
              <button
                type="button"
                onClick={handleSynthesize}
                disabled={synthesizing}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {synthesizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Turn feedback into recommendations
              </button>
            )}

            {recommendations.length > 0 && (
              <div className="space-y-2 border-t border-gray-800 pt-3">
                <p className="text-xs text-gray-400 font-medium">Synthesized recommendations</p>
                {recommendations.map((rec) => (
                  <label
                    key={rec.id}
                    className="flex gap-2 text-xs rounded border border-gray-800 p-2 bg-gray-900/60 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecIds.has(rec.id)}
                      onChange={() => toggleRec(rec.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="text-purple-400">{rec.fixSection}</span> — {rec.text}
                    </span>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const selected = recommendations.filter((r) => selectedRecIds.has(r.id))
                    onOpenBlueprintRefine?.({
                      resonanceRecommendations: selected,
                      initialScope: selected[0]?.fixSection || 'all',
                    })
                  }}
                  disabled={selectedRecIds.size === 0 || !onOpenBlueprintRefine}
                  className="w-full px-3 py-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  Open guided revision
                </button>
              </div>
            )}
          </div>
        )}

        {subTab === 'team' && token && (
          <BlueprintCollabChat shareToken={token} role="owner" variant="team" participants={participants} />
        )}

        {subTab === 'messages' && token && (
          <BlueprintCollabChat
            shareToken={token}
            role="owner"
            variant="dm"
            participants={participants}
          />
        )}
      </div>
    </div>
      )}
    </div>
  )
}
