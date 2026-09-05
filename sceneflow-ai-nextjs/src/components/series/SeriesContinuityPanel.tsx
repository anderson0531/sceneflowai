'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  Palette,
  Zap,
  GitBranch,
  ClipboardCheck,
  Loader2,
  Lock,
  BookOpen,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ProductTabList } from '@/components/product'
import { ProductionBiblePanel } from '@/components/series/ProductionBiblePanel'
import type { EpisodeBlueprintResponse, SeriesProductionBible, SeriesBibleEvent } from '@/types/series'

type ContinuitySection = 'aesthetics' | 'key-events' | 'story-threads' | 'review-updates'

interface SeriesContinuityPanelProps {
  seriesId: string
  seriesTitle: string
  bible: SeriesProductionBible | null | undefined
  episodes: EpisodeBlueprintResponse[]
  bibleEvents?: SeriesBibleEvent[]
  initialSection?: ContinuitySection
  onRefresh: () => void
}

export function SeriesContinuityPanel({
  seriesId,
  seriesTitle,
  bible: bibleProp,
  episodes,
  bibleEvents = [],
  initialSection = 'aesthetics',
  onRefresh,
}: SeriesContinuityPanelProps) {
  const [section, setSection] = useState<ContinuitySection>(initialSection)
  const [bible, setBible] = useState<SeriesProductionBible | null | undefined>(bibleProp)
  const [loading, setLoading] = useState(false)

  const refreshBible = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/series/${seriesId}/bible`)
      const data = await res.json()
      if (data.success && data.bible) setBible(data.bible)
    } finally {
      setLoading(false)
    }
  }, [seriesId])

  useEffect(() => {
    setBible(bibleProp)
  }, [bibleProp])

  useEffect(() => {
    if (initialSection) setSection(initialSection)
  }, [initialSection])

  const tabs = [
    { key: 'aesthetics', label: 'Aesthetics', icon: <Palette className="w-3.5 h-3.5" /> },
    { key: 'key-events', label: 'Key Events', icon: <Zap className="w-3.5 h-3.5" /> },
    { key: 'story-threads', label: 'Story Threads', icon: <GitBranch className="w-3.5 h-3.5" /> },
    {
      key: 'review-updates',
      label: 'Review Updates',
      icon: <ClipboardCheck className="w-3.5 h-3.5" />,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-pink-500/5 p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-purple-400" />
              Continuity Engine
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Narrative overlay for {seriesTitle} — aesthetics, canon events, story threads, and
              Production→Series bible sync. Assets live in Reference Library; iterate them in
              Production Studio.
            </p>
          </div>
          <Link
            href={`/dashboard/series/${seriesId}?tab=reference-library`}
            className="text-sm text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
          >
            Cast, locations & props in Reference Library
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {bibleEvents.length > 0 ? (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
          <p className="text-xs font-medium text-teal-300 mb-2">Recent Production→Series sync</p>
          <div className="space-y-2">
            {bibleEvents.slice(0, 5).map((evt) => (
              <div key={evt.id} className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  EP {evt.episodeNumber ?? '?'} · {evt.syncFields.join(', ')} · v{evt.bibleVersion}
                </span>
                <span className="text-gray-600">
                  {new Date(evt.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <ProductTabList
        tabs={tabs.map((t) => ({ key: t.key, label: t.label, icon: t.icon }))}
        activeKey={section}
        onChange={(key) => setSection(key as ContinuitySection)}
        accent="series"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      ) : section === 'aesthetics' ? (
        <ContinuityAestheticsSection bible={bible} />
      ) : section === 'key-events' ? (
        <ContinuityKeyEventsSection bible={bible} />
      ) : section === 'story-threads' ? (
        <ContinuityStoryThreadsSection bible={bible} />
      ) : (
        <ContinuityReviewUpdatesSection
          seriesId={seriesId}
          seriesTitle={seriesTitle}
          episodes={episodes}
          onRefresh={() => {
            refreshBible()
            onRefresh()
          }}
        />
      )}
    </div>
  )
}

function ContinuityAestheticsSection({ bible }: { bible: SeriesProductionBible | null | undefined }) {
  const aesthetic = bible?.aesthetic
  const empty = !aesthetic && !bible?.toneGuidelines && !bible?.visualGuidelines

  if (empty) {
    return (
      <EmptyContinuityState
        icon={<Palette className="w-12 h-12" />}
        title="No aesthetic guidelines yet"
        hint="Visual style syncs from Production Studio when you push updates to the Series Bible."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {aesthetic?.visualStyle ? (
        <InfoCard title="Visual Style" value={aesthetic.visualStyle} />
      ) : null}
      {aesthetic?.cinematography ? (
        <InfoCard title="Cinematography" value={aesthetic.cinematography} />
      ) : null}
      {aesthetic?.aspectRatio ? (
        <InfoCard title="Aspect Ratio" value={aesthetic.aspectRatio} />
      ) : null}
      {aesthetic?.lightingStyle ? (
        <InfoCard title="Lighting" value={aesthetic.lightingStyle} />
      ) : null}
      {bible?.toneGuidelines ? (
        <InfoCard title="Tone Guidelines" value={bible.toneGuidelines} className="md:col-span-2" />
      ) : null}
      {bible?.visualGuidelines ? (
        <InfoCard title="Visual Guidelines" value={bible.visualGuidelines} className="md:col-span-2" />
      ) : null}
    </div>
  )
}

function ContinuityKeyEventsSection({ bible }: { bible: SeriesProductionBible | null | undefined }) {
  const events = [...(bible?.keyEvents ?? [])].sort((a, b) => a.episodeNumber - b.episodeNumber)
  const charMap = new Map((bible?.characters ?? []).map((c) => [c.id, c.name]))

  if (events.length === 0) {
    return (
      <EmptyContinuityState
        icon={<Zap className="w-12 h-12" />}
        title="No key events recorded"
        hint="Canon events are extracted when you sync an episode storyline from Production into the Series Bible."
      />
    )
  }

  const byEpisode = new Map<number, typeof events>()
  for (const ev of events) {
    const list = byEpisode.get(ev.episodeNumber) ?? []
    list.push(ev)
    byEpisode.set(ev.episodeNumber, list)
  }

  return (
    <div className="space-y-6">
      {Array.from(byEpisode.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([epNum, epEvents]) => (
          <div key={epNum}>
            <p className="text-xs font-medium text-amber-400 mb-2">Episode {epNum}</p>
            <div className="space-y-2">
              {epEvents.map((ev) => (
                <div
                  key={ev.id}
                  className={`rounded-lg border p-3 ${
                    ev.irreversible
                      ? 'border-red-900/50 bg-red-950/20'
                      : 'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-200">{ev.description}</p>
                    {ev.irreversible ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400 shrink-0">
                        <Lock className="w-3 h-3" /> Irreversible
                      </span>
                    ) : null}
                  </div>
                  {ev.affectedCharacterIds.length > 0 ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Affects:{' '}
                      {ev.affectedCharacterIds.map((id) => charMap.get(id) ?? id).join(', ')}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

function ContinuityStoryThreadsSection({ bible }: { bible: SeriesProductionBible | null | undefined }) {
  const threads = bible?.storyThreads ?? []

  if (threads.length === 0) {
    return (
      <EmptyContinuityState
        icon={<GitBranch className="w-12 h-12" />}
        title="No story threads tracked"
        hint="Threads are added when episode storylines sync into the Series Bible from Production."
      />
    )
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => (
        <div key={thread.id} className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-white">{thread.name}</h3>
              <p className="text-xs text-gray-500 capitalize">{thread.type.replace('_', ' ')}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 capitalize">
              {thread.status}
            </span>
          </div>
          {thread.description ? (
            <p className="text-sm text-gray-400 mt-2">{thread.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function ContinuityReviewUpdatesSection({
  seriesId,
  seriesTitle,
  episodes,
  onRefresh,
}: {
  seriesId: string
  seriesTitle: string
  episodes: EpisodeBlueprintResponse[]
  onRefresh: () => void
}) {
  const started = episodes.filter((ep) => ep.projectId && ep.status !== 'blueprint')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (started.length === 0) {
    return (
      <EmptyContinuityState
        icon={<ClipboardCheck className="w-12 h-12" />}
        title="No episodes ready to sync"
        hint="Start an episode in Production Studio, then return here to push assets and storyline into the Series Bible."
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Review Production-authored changes before they merge into the shared Series Bible for{' '}
        {seriesTitle}.
      </p>
      {started.map((ep) => (
        <div key={ep.id} className="rounded-xl border border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 text-left"
          >
            <div>
              <p className="font-medium text-white">
                Episode {ep.episodeNumber}: {ep.title}
              </p>
              <p className="text-xs text-gray-500 capitalize">{ep.status.replace('_', ' ')}</p>
            </div>
            <BookOpen className="w-4 h-4 text-teal-400" />
          </button>
          {expandedId === ep.id && ep.projectId ? (
            <div className="border-t border-gray-700 p-4 bg-gray-900/40">
              <ProductionBiblePanel
                seriesId={seriesId}
                projectId={ep.projectId}
                seriesTitle={seriesTitle}
                bibleVersion={undefined}
                onSyncComplete={onRefresh}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function InfoCard({
  title,
  value,
  className = '',
}: {
  title: string
  value: string
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-gray-700 bg-gray-800/50 p-4 ${className}`}>
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className="text-sm text-gray-200 whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function EmptyContinuityState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode
  title: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/30 p-12 text-center">
      <div className="text-gray-600 mx-auto mb-3 flex justify-center">{icon}</div>
      <p className="text-gray-300 font-medium">{title}</p>
      <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">{hint}</p>
    </div>
  )
}
