'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Palette, ArrowLeft, Loader2, Monitor, Clapperboard, Sun } from 'lucide-react'
import Link from 'next/link'

interface Aesthetic {
  cinematography?: string
  colorPalette?: Record<string, string[]>
  aspectRatio?: string
  visualStyle?: string
  lightingStyle?: string
  lockedPromptTokens?: {
    global?: string[]
    characters?: Record<string, string[]>
    locations?: Record<string, string[]>
  }
}

export default function AestheticsPage() {
  const params = useParams()
  const seriesId = params?.seriesId as string
  const [aesthetic, setAesthetic] = useState<Aesthetic | null>(null)
  const [toneGuidelines, setToneGuidelines] = useState<string>('')
  const [visualGuidelines, setVisualGuidelines] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!seriesId) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/series/${seriesId}/bible`)
      const data = await res.json()
      if (data.success && data.bible) {
        setAesthetic(data.bible.aesthetic || null)
        setToneGuidelines(data.bible.toneGuidelines || '')
        setVisualGuidelines(data.bible.visualGuidelines || '')
      }
    } catch (err) {
      console.error('Failed to load aesthetic:', err)
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
            <Palette className="h-5 w-5 text-pink-500" />
            Aesthetic Blueprint
          </h2>
          <p className="text-sm text-muted-foreground">
            Visual style, cinematography, and tone guidelines
          </p>
        </div>
      </div>

      {!aesthetic && !toneGuidelines && !visualGuidelines ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <Palette className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No aesthetic settings in the production bible yet.</p>
          <p className="text-sm mt-1">Aesthetic data is synced from episode generation settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aesthetic?.visualStyle && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clapperboard className="h-4 w-4 text-pink-500" />
                Visual Style
              </div>
              <p className="text-sm text-muted-foreground">{aesthetic.visualStyle}</p>
            </div>
          )}

          {aesthetic?.cinematography && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Monitor className="h-4 w-4 text-pink-500" />
                Cinematography
              </div>
              <p className="text-sm text-muted-foreground">{aesthetic.cinematography}</p>
            </div>
          )}

          {aesthetic?.aspectRatio && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Monitor className="h-4 w-4 text-pink-500" />
                Aspect Ratio
              </div>
              <p className="text-sm text-muted-foreground">{aesthetic.aspectRatio}</p>
            </div>
          )}

          {aesthetic?.lightingStyle && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sun className="h-4 w-4 text-pink-500" />
                Lighting Style
              </div>
              <p className="text-sm text-muted-foreground">{aesthetic.lightingStyle}</p>
            </div>
          )}

          {toneGuidelines && (
            <div className="border rounded-lg p-4 space-y-2 md:col-span-2">
              <div className="text-sm font-medium">Tone Guidelines</div>
              <p className="text-sm text-muted-foreground">{toneGuidelines}</p>
            </div>
          )}

          {visualGuidelines && (
            <div className="border rounded-lg p-4 space-y-2 md:col-span-2">
              <div className="text-sm font-medium">Visual Guidelines</div>
              <p className="text-sm text-muted-foreground">{visualGuidelines}</p>
            </div>
          )}

          {/* Color palette */}
          {aesthetic?.colorPalette && Object.keys(aesthetic.colorPalette).length > 0 && (
            <div className="border rounded-lg p-4 space-y-3 md:col-span-2">
              <div className="text-sm font-medium">Color Palette</div>
              {Object.entries(aesthetic.colorPalette).map(([category, colors]) => (
                <div key={category} className="space-y-1">
                  <div className="text-xs text-muted-foreground capitalize">{category}</div>
                  <div className="flex gap-2 flex-wrap">
                    {(colors as string[]).map((color, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-muted-foreground">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Locked Prompt Tokens */}
          {aesthetic?.lockedPromptTokens?.global && aesthetic.lockedPromptTokens.global.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2 md:col-span-2">
              <div className="text-sm font-medium">Global Locked Prompt Tokens</div>
              <div className="flex flex-wrap gap-1">
                {aesthetic.lockedPromptTokens.global.map((token, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-400 text-xs rounded"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
