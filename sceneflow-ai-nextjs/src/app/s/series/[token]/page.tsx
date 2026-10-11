'use client'

import React, { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { PipelinePlaceholderStage } from '@/components/landing/PipelinePlaceholderStage'
import { SeriesShareView } from '@/components/series/SeriesShareView'
import { isPipelinePlaceholderToken } from '@/config/landing/productionPipelineDemo'
import type { PublicSeriesShare } from '@/lib/series/publicShare'

export default function SharedSeriesBiblePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<PublicSeriesShare | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void params.then((p) => setToken(p.token))
  }, [params])

  const placeholder = token ? isPipelinePlaceholderToken(token) : false

  useEffect(() => {
    if (!token || placeholder) return
    let cancelled = false
    fetch(`/api/series/share/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (!json.success) {
          setError(json.error || 'Link not found')
          return
        }
        setData({
          title: json.title,
          logline: json.logline,
          genre: json.genre,
          synopsis: json.synopsis,
          setting: json.setting,
          protagonist: json.protagonist,
          characters: json.characters || [],
          episodes: json.episodes || [],
        })
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load Series Bible')
      })
    return () => {
      cancelled = true
    }
  }, [token, placeholder])

  if (token && placeholder) {
    return <PipelinePlaceholderStage tokenOrSlug={token} />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <p className="text-slate-400">{error}</p>
      </div>
    )
  }

  if (!data || !token) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    )
  }

  return <SeriesShareView token={token} share={data} />
}
