'use client'

import React, { useEffect, useState } from 'react'
import { BookOpen, Loader2 } from 'lucide-react'

interface SharePayload {
  title: string
  logline?: string
  genre?: string
  episodeCount: number
  bible: {
    version?: string
    synopsis?: string
    setting?: string
    protagonist?: { name: string; goal?: string }
    characters?: Array<{ name: string; role: string; description: string }>
  }
}

export default function SharedSeriesBiblePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<SharePayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void params.then((p) => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`/api/series/share/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (!json.success) {
          setError(json.error || 'Link not found')
          return
        }
        setData(json)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load Series Bible')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <p className="text-gray-400">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
            <BookOpen className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-amber-400 font-medium uppercase tracking-wide">Series Bible</p>
            <h1 className="text-3xl font-bold mt-1">{data.title}</h1>
            {data.logline ? <p className="text-gray-400 mt-2">{data.logline}</p> : null}
            <p className="text-xs text-gray-600 mt-2">
              v{data.bible.version || '1.0.0'} · {data.episodeCount} episode blueprint
              {data.episodeCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {data.bible.synopsis ? (
          <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-2">Synopsis</h2>
            <p className="text-gray-200 whitespace-pre-wrap text-sm">{data.bible.synopsis}</p>
          </section>
        ) : null}

        {data.bible.protagonist?.name ? (
          <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-2">Protagonist</h2>
            <p className="text-white font-medium">{data.bible.protagonist.name}</p>
            {data.bible.protagonist.goal ? (
              <p className="text-sm text-gray-400 mt-1">{data.bible.protagonist.goal}</p>
            ) : null}
          </section>
        ) : null}

        {data.bible.characters && data.bible.characters.length > 0 ? (
          <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-4">Cast</h2>
            <div className="space-y-3">
              {data.bible.characters.map((c) => (
                <div key={c.name}>
                  <p className="text-white font-medium">
                    {c.name}{' '}
                    <span className="text-xs text-gray-500 capitalize">({c.role})</span>
                  </p>
                  {c.description ? (
                    <p className="text-sm text-gray-400 mt-0.5">{c.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-center text-xs text-gray-600 pt-4">
          Shared via SceneFlow Series Studio · read-only view
        </p>
      </div>
    </div>
  )
}
