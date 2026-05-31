'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/textarea'
import { toast } from 'sonner'
import {
  Compass,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Wand2,
  Check,
  RefreshCw,
} from 'lucide-react'
import type {
  BlueprintAudienceRecommendation,
  BlueprintFixSection,
} from '@/lib/types/audienceResonance'
import {
  BLUEPRINT_SECTION_TEMPLATES,
  FIX_SECTION_LABELS,
  type BlueprintSection,
} from '@/lib/constants/blueprint-optimization'
import type { BlueprintChangePlan, FieldDiff } from '@/lib/treatment/blueprintRevisionTypes'
import { cn } from '@/lib/utils'
import type { ContentIntent } from '@/lib/content/contentIntent'
import { resolveContentIntent } from '@/lib/content/contentIntent'

type TreatmentVariant = Record<string, unknown>

type Props = {
  open: boolean
  variant: TreatmentVariant | null
  onClose: () => void
  onApply: (patch: Record<string, unknown>) => void
  onRefineApplied?: (diff: FieldDiff[]) => void
  projectId?: string
  resonanceRecommendations?: BlueprintAudienceRecommendation[]
  /** Initial focus scope (from section pencil or AR fixSection) */
  initialActiveTab?: string
  onRequestReanalyze?: () => void
  contentIntent?: ContentIntent | null
}

const SCOPE_OPTIONS: { id: BlueprintFixSection | 'all'; label: string }[] = [
  { id: 'all', label: 'Full blueprint balance' },
  { id: 'core', label: 'Core info' },
  { id: 'story', label: 'Story' },
  { id: 'tone', label: 'Tone & style' },
  { id: 'beats', label: 'Beats' },
  { id: 'characters', label: 'Characters' },
]

function sectionFromTab(tab?: string): BlueprintFixSection | 'all' {
  const valid: BlueprintFixSection[] = ['core', 'story', 'tone', 'beats', 'characters']
  if (tab && valid.includes(tab as BlueprintFixSection)) return tab as BlueprintFixSection
  return 'all'
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  )
}

function BlueprintSnapshot({ variant }: { variant: TreatmentVariant }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    core: true,
    story: false,
    characters: false,
    beats: false,
    tone: false,
  })

  const toggle = (key: string) =>
    setExpanded((p) => ({ ...p, [key]: !p[key] }))

  const themes = Array.isArray(variant.themes)
    ? (variant.themes as string[]).join(', ')
    : String(variant.themes || '')

  const beats = (variant.beats as Array<{ title?: string; synopsis?: string }>) || []
  const chars =
    (variant.character_descriptions as Array<{ name?: string; role?: string }>) || []

  return (
    <div className="space-y-2 rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
      <p className="text-xs text-gray-500 mb-2">Current blueprint (read-only)</p>
      {(
        [
          {
            key: 'core',
            title: 'Core',
            content: (
              <>
                <ReadOnlyField label="Title" value={String(variant.title || '')} />
                <ReadOnlyField label="Logline" value={String(variant.logline || '')} />
                <ReadOnlyField label="Genre" value={String(variant.genre || '')} />
              </>
            ),
          },
          {
            key: 'story',
            title: 'Story',
            content: (
              <>
                <ReadOnlyField
                  label="Synopsis"
                  value={String(variant.synopsis || variant.content || '')}
                />
                <ReadOnlyField label="Protagonist" value={String(variant.protagonist || '')} />
                <ReadOnlyField label="Antagonist" value={String(variant.antagonist || '')} />
              </>
            ),
          },
          {
            key: 'characters',
            title: 'Characters',
            content: (
              <ul className="text-xs text-gray-300 space-y-1">
                {chars.length === 0 ? (
                  <li className="text-gray-500">No characters</li>
                ) : (
                  chars.map((c, i) => (
                    <li key={i}>
                      {c.name || 'Character'} — {c.role || 'role'}
                    </li>
                  ))
                )}
              </ul>
            ),
          },
          {
            key: 'beats',
            title: 'Beats',
            content: (
              <ul className="text-xs text-gray-300 space-y-1">
                {beats.map((b, i) => (
                  <li key={i}>
                    {i + 1}. {b.title || 'Beat'}
                  </li>
                ))}
              </ul>
            ),
          },
          {
            key: 'tone',
            title: 'Tone',
            content: (
              <>
                <ReadOnlyField
                  label="Tone"
                  value={String(variant.tone_description || variant.tone || '')}
                />
                <ReadOnlyField label="Themes" value={themes} />
              </>
            ),
          },
        ] as const
      ).map(({ key, title, content }) => (
        <div key={key} className="border border-slate-700/40 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggle(key)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-400 hover:bg-slate-800/50"
          >
            {title}
            {expanded[key] ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
          {expanded[key] && <div className="px-2 pb-2 space-y-2">{content}</div>}
        </div>
      ))}
    </div>
  )
}

function DiffPanel({ diffs }: { diffs: FieldDiff[] }) {
  if (diffs.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No field-level changes detected (review summary above).
      </p>
    )
  }
  return (
    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
      {diffs.map((d) => (
        <div
          key={d.field}
          className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-2.5 space-y-1.5"
        >
          <div className="text-xs font-medium text-cyan-300/90">
            {d.label}{' '}
            <span className="text-gray-500 font-normal">({FIX_SECTION_LABELS[d.section] || d.section})</span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-[11px]">
            <div>
              <span className="text-red-400/80">Before</span>
              <p className="text-gray-500 line-clamp-4 whitespace-pre-wrap">{d.before || '—'}</p>
            </div>
            <div>
              <span className="text-emerald-400/80">After</span>
              <p className="text-gray-200 line-clamp-6 whitespace-pre-wrap">{d.after || '—'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function BlueprintRefineDialog({
  open,
  variant,
  onClose,
  onApply,
  onRefineApplied,
  projectId,
  resonanceRecommendations,
  initialActiveTab,
  onRequestReanalyze,
  contentIntent: contentIntentProp,
}: Props) {
  const [phase, setPhase] = useState<'intent' | 'preview'>('intent')
  const [userIntent, setUserIntent] = useState('')
  const [focusScope, setFocusScope] = useState<BlueprintFixSection | 'all'>('all')
  const [selectedRecIds, setSelectedRecIds] = useState<Set<string>>(new Set())
  const [selectedTemplateKeys, setSelectedTemplateKeys] = useState<Set<string>>(new Set())
  const [showResonanceRecs, setShowResonanceRecs] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewVariant, setPreviewVariant] = useState<Record<string, unknown> | null>(null)
  const [changePlan, setChangePlan] = useState<BlueprintChangePlan | null>(null)
  const [diff, setDiff] = useState<FieldDiff[]>([])

  useEffect(() => {
    if (!open) return
    setPhase('intent')
    setUserIntent('')
    setFocusScope(sectionFromTab(initialActiveTab))
    setPreviewVariant(null)
    setChangePlan(null)
    setDiff([])
    setSelectedTemplateKeys(new Set())
    if (resonanceRecommendations?.length) {
      setSelectedRecIds(new Set(resonanceRecommendations.map((r) => r.id)))
      setShowResonanceRecs(true)
    } else {
      setSelectedRecIds(new Set())
    }
  }, [open, initialActiveTab, resonanceRecommendations])

  const templateSections = useMemo(() => {
    const scope = focusScope === 'all' ? null : focusScope
    const sections: BlueprintSection[] = scope
      ? [scope as BlueprintSection]
      : ['core', 'story', 'tone', 'beats', 'characters']
    return sections.map((s) => ({
      section: s,
      templates: BLUEPRINT_SECTION_TEMPLATES[s] || [],
    }))
  }, [focusScope])

  const combinedIntent = useMemo(() => {
    const parts: string[] = []
    if (userIntent.trim()) parts.push(userIntent.trim())
    for (const { section, templates } of templateSections) {
      for (const t of templates) {
        const key = `${section}:${t.id}`
        if (selectedTemplateKeys.has(key)) {
          parts.push(t.instruction)
        }
      }
    }
    return parts.join('\n')
  }, [userIntent, templateSections, selectedTemplateKeys])

  const toggleRec = (id: string) => {
    setSelectedRecIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTemplate = (section: string, id: string) => {
    const key = `${section}:${id}`
    setSelectedTemplateKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleGenerate = async () => {
    if (!variant) return
    const recs = resonanceRecommendations?.filter((r) => selectedRecIds.has(r.id)) ?? []
    if (!combinedIntent.trim() && recs.length === 0) {
      toast.error('Describe what should change or select recommendations')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/treatment/guided-revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          variant,
          userIntent: combinedIntent,
          selectedRecommendationIds: [...selectedRecIds],
          resonanceRecommendations: recs,
          focusScope: focusScope === 'all' ? undefined : focusScope,
          projectId,
          contentIntent:
            contentIntentProp ?? resolveContentIntent(String(variant?.genre || '')),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Revision failed')
      }
      if (data.success && data.revisedVariant) {
        setPreviewVariant(data.revisedVariant)
        setChangePlan(data.changePlan ?? null)
        setDiff(data.diff ?? [])
        setPhase('preview')
        toast.success('Balanced revision ready — review before applying')
      } else {
        throw new Error(data.message || 'Revision failed')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate revision')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyPreview = useCallback(() => {
    if (!previewVariant) return
    onApply(previewVariant)
    if (diff.length > 0 && onRefineApplied) {
      onRefineApplied(diff)
    }
    toast.success('Blueprint updated with balanced revision')
    if (onRequestReanalyze) {
      toast.message('Re-analyze audience resonance to refresh your score', {
        action: {
          label: 'Re-analyze',
          onClick: onRequestReanalyze,
        },
      })
    }
    onClose()
  }, [previewVariant, onApply, onClose, onRequestReanalyze, diff, onRefineApplied])

  const handleDiscardPreview = () => {
    setPreviewVariant(null)
    setChangePlan(null)
    setDiff([])
    setPhase('intent')
  }

  if (!variant) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-slate-900 border-slate-700">
        {isGenerating && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
            <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-8 shadow-2xl flex flex-col items-center max-w-sm text-center">
              <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Crafting balanced revision</h3>
              <p className="text-sm text-gray-400">
                Planning changes and reconciling story, characters, and beats…
              </p>
            </div>
          </div>
        )}

        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Compass className="w-5 h-5 text-cyan-400" />
            Blueprint Editor
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            Describe your direction — AI will balance changes across the full blueprint. No direct
            field editing.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
          {phase === 'intent' && (
            <>
              {resonanceRecommendations && resonanceRecommendations.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowResonanceRecs(!showResonanceRecs)}
                    className="flex items-center justify-between w-full text-sm font-medium text-amber-200/90"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Resonance recommendations ({resonanceRecommendations.length})
                    </span>
                    <ChevronDown
                      className={cn('w-4 h-4 transition-transform', showResonanceRecs && 'rotate-180')}
                    />
                  </button>
                  {showResonanceRecs && (
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                      {resonanceRecommendations.map((rec) => (
                        <div
                          key={rec.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleRec(rec.id)}
                          className={cn(
                            'flex items-start gap-2 p-2 rounded-lg cursor-pointer border text-left text-xs',
                            selectedRecIds.has(rec.id)
                              ? 'border-cyan-500/40 bg-cyan-500/10'
                              : 'border-slate-700/50 bg-slate-800/40'
                          )}
                        >
                          {selectedRecIds.has(rec.id) ? (
                            <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                          )}
                          <span className="text-gray-300 flex-1">
                            {rec.intentLabel || rec.title || rec.text.slice(0, 80)}
                            <span className="text-red-400/80 ml-1 font-mono">
                              −{rec.pointsDeducted}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400">
                  What should change and why?
                </label>
                <Textarea
                  value={userIntent}
                  onChange={(e) => setUserIntent(e.target.value)}
                  placeholder="e.g. Make the mentor secretly the antagonist, and rebalance the second act beats so the betrayal lands for a millennial thriller audience…"
                  className="min-h-[88px] bg-slate-800/50 border-slate-700 text-sm"
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs text-gray-500">Focus (optional)</span>
                <div className="flex flex-wrap gap-1.5">
                  {SCOPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFocusScope(opt.id)}
                      className={cn(
                        'px-2 py-1 text-[10px] rounded-md border transition-colors',
                        focusScope === opt.id
                          ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                          : 'border-slate-700 text-gray-400 hover:border-slate-500'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-gray-500">Guided refinements (optional)</span>
                <div className="flex flex-wrap gap-1.5">
                  {templateSections.flatMap(({ section, templates }) =>
                    templates.map((t) => {
                      const key = `${section}:${t.id}`
                      const on = selectedTemplateKeys.has(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleTemplate(section, t.id)}
                          className={cn(
                            'px-2 py-1 text-[10px] rounded-md border transition-colors flex items-center gap-1',
                            on
                              ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                              : 'border-slate-700 text-gray-400 hover:border-slate-500'
                          )}
                        >
                          <span>{t.icon}</span>
                          {t.label}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <BlueprintSnapshot variant={variant} />
            </>
          )}

          {phase === 'preview' && changePlan && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-2">
                <h3 className="text-sm font-semibold text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Revision plan
                </h3>
                <p className="text-xs text-gray-300">{changePlan.primaryGoal}</p>
                {changePlan.coherenceActions.length > 0 && (
                  <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                    {changePlan.coherenceActions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
              <DiffPanel diffs={diff} />
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center justify-between gap-2 pt-3 border-t border-slate-700">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {phase === 'intent' ? (
            <Button
              size="sm"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="bg-gradient-to-r from-cyan-600 to-blue-600"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              Generate balanced revision
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDiscardPreview}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Revise intent
              </Button>
              <Button
                size="sm"
                onClick={handleApplyPreview}
                className="bg-gradient-to-r from-emerald-600 to-cyan-600"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Apply revision
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BlueprintRefineDialog
