'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Users,
  ArrowLeft,
  Loader2,
  Skull,
  MapPinned,
  User,
  Star,
  Shield,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'

interface Character {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'recurring'
  description: string
  appearance: string
  backstory?: string
  personality?: string
  voiceId?: string
  referenceImageUrl?: string
  lockedPromptTokens?: string[]
}

interface CharacterStatus {
  name: string
  status: string
}

export default function CharactersPage() {
  const params = useParams()
  const seriesId = params?.seriesId as string
  const [characters, setCharacters] = useState<Character[]>([])
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!seriesId) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/series/${seriesId}/bible`)
      const data = await res.json()
      if (data.success && data.bible) {
        setCharacters(data.bible.characters || [])
        // Build status map from key events and episode summaries
        const statusMap: Record<string, string> = {}
        const events = data.bible.keyEvents || []
        const charNameMap = new Map(
          (data.bible.characters || []).map((c: Character) => [c.id, c.name])
        )
        for (const event of events.sort((a: any, b: any) => a.episodeNumber - b.episodeNumber)) {
          for (const charId of event.affectedCharacterIds || []) {
            const name = charNameMap.get(charId) || charId
            switch (event.type) {
              case 'death': statusMap[name] = 'DECEASED'; break
              case 'departure': statusMap[name] = `Departed (Ep ${event.episodeNumber})`; break
              case 'relocation': statusMap[name] = `Relocated: ${event.description}`; break
              case 'injury': statusMap[name] = `Injured: ${event.description}`; break
              case 'transformation': statusMap[name] = `Transformed: ${event.description}`; break
              default: statusMap[name] = event.description; break
            }
          }
        }
        // Also merge summarycharacterStatuses
        for (const summary of data.bible.episodeSummaries || []) {
          if (summary.characterStatuses) {
            Object.assign(statusMap, summary.characterStatuses)
          }
        }
        setStatuses(statusMap)
      }
    } catch (err) {
      console.error('Failed to load characters:', err)
    } finally {
      setIsLoading(false)
    }
  }, [seriesId])

  useEffect(() => { fetchData() }, [fetchData])

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'protagonist': return <Star className="h-4 w-4 text-yellow-500" />
      case 'antagonist': return <Shield className="h-4 w-4 text-red-500" />
      case 'supporting': return <User className="h-4 w-4 text-blue-500" />
      default: return <RefreshCw className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (name: string) => {
    const status = statuses[name]
    if (!status) return null
    const isDeceased = status.includes('DECEASED')
    const isDeparted = status.includes('Departed')
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isDeceased ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' :
        isDeparted ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
        'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
      }`}>
        {isDeceased && <Skull className="h-3 w-3" />}
        {isDeparted && <MapPinned className="h-3 w-3" />}
        {status}
      </span>
    )
  }

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
            <Users className="h-5 w-5 text-blue-500" />
            Characters
          </h2>
          <p className="text-sm text-muted-foreground">
            {characters.length} character{characters.length !== 1 ? 's' : ''} in the production bible
          </p>
        </div>
      </div>

      {characters.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No characters in the production bible yet.</p>
          <p className="text-sm mt-1">Characters will appear here after syncing from an episode.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {characters.map(char => (
            <div key={char.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {char.referenceImageUrl ? (
                    <img
                      src={char.referenceImageUrl}
                      alt={char.name}
                      className="h-10 w-10 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-medium">
                      {char.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      {char.name}
                      {getRoleIcon(char.role)}
                      <span className="text-xs text-muted-foreground capitalize">({char.role})</span>
                    </h3>
                    {getStatusBadge(char.name)}
                  </div>
                </div>
              </div>

              {char.description && (
                <p className="text-sm text-muted-foreground">{char.description}</p>
              )}

              {char.appearance && (
                <div className="text-xs">
                  <span className="font-medium">Appearance: </span>
                  <span className="text-muted-foreground">{char.appearance}</span>
                </div>
              )}

              {char.personality && (
                <div className="text-xs">
                  <span className="font-medium">Personality: </span>
                  <span className="text-muted-foreground">{char.personality}</span>
                </div>
              )}

              {char.lockedPromptTokens && char.lockedPromptTokens.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {char.lockedPromptTokens.map((token, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs rounded"
                    >
                      {token}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
