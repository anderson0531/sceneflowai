'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Users,
  MapPin,
  Palette,
  GitBranch,
  Zap,
  ClipboardCheck,
  ChevronRight,
  BookOpen,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

interface BibleStats {
  characters: number
  locations: number
  storyThreads: number
  keyEvents: number
  episodeSummaries: number
  unresolvedHooks: number
  version: string
}

export default function ContinuityDashboard() {
  const params = useParams()
  const seriesId = params?.seriesId as string
  const [stats, setStats] = useState<BibleStats | null>(null)
  const [seriesTitle, setSeriesTitle] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!seriesId) return
    const fetchBible = async () => {
      try {
        const res = await fetch(`/api/series/${seriesId}/bible`)
        const data = await res.json()
        if (data.success && data.bible) {
          const b = data.bible
          setStats({
            characters: b.characters?.length || 0,
            locations: b.locations?.length || 0,
            storyThreads: b.storyThreads?.length || 0,
            keyEvents: b.keyEvents?.length || 0,
            episodeSummaries: b.episodeSummaries?.length || 0,
            unresolvedHooks: b.unresolvedHooks?.length || 0,
            version: b.version || '1.0.0',
          })
          setSeriesTitle(data.seriesTitle || '')
        }
      } catch (err) {
        console.error('Failed to load bible:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBible()
  }, [seriesId])

  const sections = [
    {
      href: `characters`,
      icon: Users,
      label: 'Characters',
      description: 'Character DNA — appearance, voice, locked prompt tokens',
      count: stats?.characters,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      href: `locations`,
      icon: MapPin,
      label: 'Locations',
      description: 'Recurring locations with visual descriptions and tokens',
      count: stats?.locations,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      href: `story-threads`,
      icon: GitBranch,
      label: 'Story Threads',
      description: 'Narrative arcs and subplots across episodes',
      count: stats?.storyThreads,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      href: `key-events`,
      icon: Zap,
      label: 'Key Events',
      description: 'Canonical events — deaths, reveals, relocations',
      count: stats?.keyEvents,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      href: `aesthetics`,
      icon: Palette,
      label: 'Aesthetic Blueprint',
      description: 'Visual style, color palette, cinematography settings',
      count: undefined,
      color: 'text-pink-500',
      bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    },
    {
      href: `review-updates`,
      icon: ClipboardCheck,
      label: 'Review Updates',
      description: 'Preview and approve bible sync changes from episodes',
      count: undefined,
      color: 'text-teal-500',
      bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    },
  ]

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-sf-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Continuity Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {seriesTitle ? `${seriesTitle} — ` : ''}Production Bible v{stats?.version || '1.0.0'}
          </p>
        </div>
        {stats && stats.unresolvedHooks > 0 && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-md text-sm">
            <AlertTriangle className="h-4 w-4" />
            {stats.unresolvedHooks} unresolved hook{stats.unresolvedHooks !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{stats.episodeSummaries}</div>
            <div className="text-xs text-muted-foreground">Episodes Logged</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{stats.characters}</div>
            <div className="text-xs text-muted-foreground">Characters</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{stats.storyThreads}</div>
            <div className="text-xs text-muted-foreground">Story Threads</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{stats.keyEvents}</div>
            <div className="text-xs text-muted-foreground">Canon Events</div>
          </div>
        </div>
      )}

      {/* Section grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(section => (
          <Link
            key={section.href}
            href={section.href}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-md ${section.bgColor}`}>
                <section.icon className={`h-5 w-5 ${section.color}`} />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
            </div>
            <h3 className="font-medium mt-3">{section.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
            {section.count !== undefined && (
              <div className="text-xs text-muted-foreground mt-2">
                {section.count} {section.count === 1 ? 'entry' : 'entries'}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
