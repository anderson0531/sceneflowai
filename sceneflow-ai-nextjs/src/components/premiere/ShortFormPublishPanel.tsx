'use client'

import React, { useState } from 'react'
import { Smartphone, Loader2, Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ShortFormPublishPanelProps {
  projectId?: string
  videoUrl?: string
  durationSec?: number
  className?: string
}

const PLATFORMS = [
  { id: 'youtube-shorts' as const, label: 'YouTube Shorts', max: '60s' },
  { id: 'instagram-reels' as const, label: 'Instagram Reels', max: '90s' },
  { id: 'tiktok' as const, label: 'TikTok', max: '180s' },
]

export function ShortFormPublishPanel({
  projectId,
  videoUrl,
  durationSec = 120,
  className,
}: ShortFormPublishPanelProps) {
  const [selected, setSelected] = useState<Array<'youtube-shorts' | 'instagram-reels' | 'tiktok'>>([
    'youtube-shorts',
    'instagram-reels',
    'tiktok',
  ])
  const [loading, setLoading] = useState(false)
  const [clips, setClips] = useState<Array<{ id: string; platform: string; startSec: number; endSec: number; label: string }>>([])

  const toggle = (id: typeof selected[number]) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const generate = async () => {
    if (!projectId || !videoUrl) return
    setLoading(true)
    try {
      const res = await fetch('/api/premiere/shorts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, videoUrl, durationSec, platforms: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClips(data.clips || [])
      toast.success(`Generated ${data.clips?.length || 0} clip specs`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4', className)}>
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
        <Smartphone className="w-4 h-4 text-fuchsia-400" />
        Short-form cuts (9:16)
      </h3>
      <p className="text-xs text-zinc-500 mb-3">
        Auto-detect highlight windows from your master for vertical platforms.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            className={cn(
              'rounded-full px-3 py-1 text-xs border transition-colors',
              selected.includes(p.id)
                ? 'border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-200'
                : 'border-zinc-700 text-zinc-400'
            )}
          >
            {p.label} · {p.max}
          </button>
        ))}
      </div>
      <Button size="sm" onClick={generate} disabled={loading || !videoUrl || !projectId} className="mb-4">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
        Generate clip plan
      </Button>
      {clips.length > 0 && (
        <ul className="space-y-2 text-xs">
          {clips.map((c) => (
            <li key={c.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-zinc-300">
              {c.label} · {c.startSec}s–{c.endSec}s
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
