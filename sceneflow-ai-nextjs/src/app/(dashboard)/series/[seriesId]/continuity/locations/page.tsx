'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { MapPin, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Location {
  id: string
  name: string
  description: string
  visualDescription?: string
  referenceImageUrl?: string
  lockedPromptTokens?: string[]
}

export default function LocationsPage() {
  const params = useParams()
  const seriesId = params?.seriesId as string
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!seriesId) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/series/${seriesId}/bible`)
      const data = await res.json()
      if (data.success && data.bible) {
        setLocations(data.bible.locations || [])
      }
    } catch (err) {
      console.error('Failed to load locations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [seriesId])

  useEffect(() => { fetchData() }, [fetchData])

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
            <MapPin className="h-5 w-5 text-green-500" />
            Locations
          </h2>
          <p className="text-sm text-muted-foreground">
            {locations.length} location{locations.length !== 1 ? 's' : ''} in the production bible
          </p>
        </div>
      </div>

      {locations.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No locations in the production bible yet.</p>
          <p className="text-sm mt-1">Locations are extracted from scene headings when you sync an episode.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map(loc => (
            <div key={loc.id} className="border rounded-lg overflow-hidden">
              {loc.referenceImageUrl && (
                <img
                  src={loc.referenceImageUrl}
                  alt={loc.name}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-4 space-y-2">
                <h3 className="font-medium">{loc.name}</h3>
                {loc.description && (
                  <p className="text-sm text-muted-foreground">{loc.description}</p>
                )}
                {loc.visualDescription && loc.visualDescription !== loc.description && (
                  <div className="text-xs">
                    <span className="font-medium">Visual: </span>
                    <span className="text-muted-foreground">{loc.visualDescription}</span>
                  </div>
                )}
                {loc.lockedPromptTokens && loc.lockedPromptTokens.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {loc.lockedPromptTokens.map((token, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs rounded"
                      >
                        {token}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
