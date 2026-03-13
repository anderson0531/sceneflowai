'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Zap,
  ArrowLeft,
  Loader2,
  Skull,
  MapPinned,
  Eye,
  Heart,
  Package,
  Swords,
  ShieldAlert,
  Sparkles,
  LogOut,
  LogIn,
  Handshake,
  Lock,
  Circle,
} from 'lucide-react'
import Link from 'next/link'

interface KeyEvent {
  id: string
  episodeNumber: number
  type: string
  description: string
  affectedCharacterIds: string[]
  affectedLocationIds?: string[]
  irreversible: boolean
  createdAt: string
}

interface Character {
  id: string
  name: string
}

const EVENT_TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  death: { icon: Skull, label: 'Death', color: 'text-red-600' },
  relocation: { icon: MapPinned, label: 'Relocation', color: 'text-blue-500' },
  reveal: { icon: Eye, label: 'Reveal', color: 'text-purple-500' },
  relationship_change: { icon: Heart, label: 'Relationship Change', color: 'text-pink-500' },
  acquisition: { icon: Package, label: 'Acquisition', color: 'text-emerald-500' },
  injury: { icon: ShieldAlert, label: 'Injury', color: 'text-orange-500' },
  transformation: { icon: Sparkles, label: 'Transformation', color: 'text-indigo-500' },
  departure: { icon: LogOut, label: 'Departure', color: 'text-gray-500' },
  arrival: { icon: LogIn, label: 'Arrival', color: 'text-teal-500' },
  conflict_resolution: { icon: Handshake, label: 'Conflict Resolution', color: 'text-green-500' },
  betrayal: { icon: Swords, label: 'Betrayal', color: 'text-red-500' },
  other: { icon: Circle, label: 'Event', color: 'text-gray-400' },
}

export default function KeyEventsPage() {
  const params = useParams()
  const seriesId = params?.seriesId as string
  const [events, setEvents] = useState<KeyEvent[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterIrreversible, setFilterIrreversible] = useState(false)

  const fetchData = useCallback(async () => {
    if (!seriesId) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/series/${seriesId}/bible`)
      const data = await res.json()
      if (data.success && data.bible) {
        setEvents((data.bible.keyEvents || []).sort(
          (a: KeyEvent, b: KeyEvent) => a.episodeNumber - b.episodeNumber
        ))
        setCharacters(data.bible.characters || [])
      }
    } catch (err) {
      console.error('Failed to load key events:', err)
    } finally {
      setIsLoading(false)
    }
  }, [seriesId])

  useEffect(() => { fetchData() }, [fetchData])

  const charNameMap = new Map(characters.map(c => [c.id, c.name]))

  const filteredEvents = events.filter(e => {
    if (filterType !== 'all' && e.type !== filterType) return false
    if (filterIrreversible && !e.irreversible) return false
    return true
  })

  // Group events by episode for timeline
  const episodeGroups = new Map<number, KeyEvent[]>()
  for (const event of filteredEvents) {
    const group = episodeGroups.get(event.episodeNumber) || []
    group.push(event)
    episodeGroups.set(event.episodeNumber, group)
  }
  const sortedEpisodes = Array.from(episodeGroups.entries()).sort((a, b) => a[0] - b[0])

  // Unique event types for filter
  const eventTypes = [...new Set(events.map(e => e.type))]

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-sf-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/series/${seriesId}/continuity`}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Key Events Timeline
          </h2>
          <p className="text-sm text-muted-foreground">
            {events.length} canon event{events.length !== 1 ? 's' : ''} across {episodeGroups.size} episode{episodeGroups.size !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-transparent"
        >
          <option value="all">All types</option>
          {eventTypes.map(type => (
            <option key={type} value={type}>
              {EVENT_TYPE_CONFIG[type]?.label || type}
            </option>
          ))}
        </select>
        <button
          onClick={() => setFilterIrreversible(!filterIrreversible)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
            filterIrreversible
              ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 font-medium'
              : 'bg-gray-50 dark:bg-gray-800 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          Irreversible only
        </button>
      </div>

      {events.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No key events recorded yet.</p>
          <p className="text-sm mt-1">Key events are extracted when you sync an episode&apos;s storyline to the bible.</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
          No events match the current filters.
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />

          <div className="space-y-6">
            {sortedEpisodes.map(([episodeNumber, epEvents]) => (
              <div key={episodeNumber} className="relative">
                {/* Episode marker */}
                <div className="flex items-center gap-3 mb-3 relative">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm font-bold z-10">
                    {episodeNumber}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Episode {episodeNumber}
                  </span>
                </div>

                {/* Events for this episode */}
                <div className="ml-16 space-y-2">
                  {epEvents.map(event => {
                    const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.other
                    const EventIcon = config.icon
                    const affectedNames = event.affectedCharacterIds
                      .map(id => charNameMap.get(id) || id)
                      .join(', ')

                    return (
                      <div
                        key={event.id}
                        className={`border rounded-lg p-3 ${
                          event.irreversible
                            ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20'
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <EventIcon className={`h-4 w-4 ${config.color} flex-shrink-0`} />
                            <span className="text-sm">{event.description}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {event.irreversible && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs rounded font-medium">
                                <Lock className="h-3 w-3" />
                                Irreversible
                              </span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded text-xs ${config.color} bg-gray-50 dark:bg-gray-800`}>
                              {config.label}
                            </span>
                          </div>
                        </div>
                        {affectedNames && (
                          <div className="text-xs text-muted-foreground mt-1.5 ml-6">
                            Affects: {affectedNames}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
