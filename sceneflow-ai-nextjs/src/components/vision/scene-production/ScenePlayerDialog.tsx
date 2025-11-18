'use client'

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { SceneSegment } from './types'
import { Volume2, Music, Waves, Video, Film } from 'lucide-react'

interface ScenePlayerDialogProps {
  open: boolean
  onClose: () => void
  sceneNumber: number
  heading?: string
  segments?: SceneSegment[]
  audioTracks?: {
    narration?: { url?: string; startTime: number; duration: number }
    dialogue?: Array<{ url?: string; startTime: number; duration: number; character?: string }>
    sfx?: Array<{ url?: string; startTime: number; duration: number; description?: string }>
    music?: { url?: string; startTime: number; duration: number }
  }
}

export function ScenePlayerDialog({
  open,
  onClose,
  sceneNumber,
  heading,
  segments = [],
  audioTracks,
}: ScenePlayerDialogProps) {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(segments[0]?.segmentId ?? null)

  useEffect(() => {
    if (open) {
      setActiveSegmentId(segments[0]?.segmentId ?? null)
    }
  }, [open, segments])

  const activeSegment = segments.find((segment) => segment.segmentId === activeSegmentId) ?? segments[0] ?? null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-slate-950 text-white border-slate-900">
        <DialogHeader>
          <DialogTitle>Scene Preview · Scene {sceneNumber}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {heading || 'Call Action preview'} • {segments.length} segments
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1.7fr,1fr]">
          <div className="space-y-4">
            <div className="relative aspect-video rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-center overflow-hidden">
              {activeSegment?.activeAssetUrl ? (
                activeSegment.assetType === 'image' ? (
                  <img
                    src={activeSegment.activeAssetUrl}
                    alt="Segment preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    key={activeSegment.segmentId}
                    src={activeSegment.activeAssetUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="text-sm text-slate-500 flex flex-col items-center gap-2">
                  <Video className="w-6 h-6 text-slate-600" />
                  No active media selected for this segment.
                </div>
              )}
              {activeSegment && (
                <div className="absolute bottom-3 left-3 text-xs text-slate-300 bg-black/40 backdrop-blur rounded-full px-3 py-1">
                  Segment {activeSegment.sequenceIndex + 1} · {activeSegment.startTime.toFixed(1)}s –{' '}
                  {activeSegment.endTime.toFixed(1)}s
                </div>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {segments.map((segment) => {
                const isActive = segment.segmentId === activeSegment?.segmentId
                return (
                  <button
                    key={segment.segmentId}
                    onClick={() => setActiveSegmentId(segment.segmentId)}
                    className={`px-3 py-2 rounded-xl border text-xs text-left transition ${
                      isActive ? 'border-sf-primary bg-sf-primary/15' : 'border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold text-white">Segment {segment.sequenceIndex + 1}</div>
                    <div className="text-slate-400">
                      {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-1">
                      {segment.status.toLowerCase()}
                    </div>
                  </button>
                )
              })}
              {segments.length === 0 && (
                <div className="text-xs text-slate-500">Generate segments to preview this scene.</div>
              )}
            </div>
          </div>

          <div className="space-y-4 border border-slate-900 rounded-2xl p-4 bg-slate-900/40">
            <h4 className="text-sm font-semibold">Audio & Overlay Tracks</h4>
            <div className="space-y-3 text-sm">
              <TrackRow
                icon={<Volume2 className="w-4 h-4 text-cyan-300" />}
                label="Narration"
                detail={
                  audioTracks?.narration?.url
                    ? `${audioTracks.narration.duration.toFixed(1)}s clip`
                    : 'Not recorded yet'
                }
              />
              <TrackRow
                icon={<Music className="w-4 h-4 text-emerald-300" />}
                label="Music"
                detail={
                  audioTracks?.music?.url ? `${audioTracks.music.duration.toFixed(1)}s score` : 'No score yet'
                }
              />
              <TrackRow
                icon={<Waves className="w-4 h-4 text-amber-300" />}
                label="SFX"
                detail={
                  audioTracks?.sfx && audioTracks.sfx.length > 0
                    ? `${audioTracks.sfx.length} layered effects`
                    : 'No SFX yet'
                }
              />
              <TrackRow
                icon={<Film className="w-4 h-4 text-purple-300" />}
                label="Dialogue"
                detail={
                  audioTracks?.dialogue && audioTracks.dialogue.length > 0
                    ? `${audioTracks.dialogue.length} character lines`
                    : 'No dialogue tracks'
                }
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-slate-100">Timeline overview</div>
              {segments.length > 0 ? (
                <div className="space-y-1">
                  {segments.map((segment) => (
                    <div key={segment.segmentId} className="flex justify-between">
                      <span>
                        Segment {segment.sequenceIndex + 1}{' '}
                        {segment.status === 'COMPLETE' && <span className="text-emerald-300">· locked</span>}
                      </span>
                      <span className="text-slate-400">
                        {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No segments yet. Generate them to unlock scene preview.</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} className="text-slate-300 hover:text-white">
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface TrackRowProps {
  icon: React.ReactNode
  label: string
  detail: string
}

function TrackRow({ icon, label, detail }: TrackRowProps) {
  return (
    <div className="flex items-center gap-3 border border-slate-900 rounded-xl px-3 py-2">
      <div className="w-8 h-8 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-slate-100 text-sm font-medium">{label}</div>
        <div className="text-xs text-slate-500">{detail}</div>
      </div>
    </div>
  )
}

