'use client'

import { useState, useMemo } from 'react'
import { SegmentBlock } from './SegmentBlock'
import { SceneSegment } from './types'
import { cn } from '@/lib/utils'
import { Volume2, Music, Zap } from 'lucide-react'

interface SegmentTimelineProps {
  segments: SceneSegment[]
  selectedSegmentId?: string
  onSelect: (segmentId: string) => void
  // Audio track data (optional for now, will be enhanced later)
  audioTracks?: {
    narration?: { url?: string; startTime: number; duration: number }
    dialogue?: Array<{ url?: string; startTime: number; duration: number; character?: string }>
    sfx?: Array<{ url?: string; startTime: number; duration: number; description?: string }>
    music?: { url?: string; startTime: number; duration: number }
  }
}

const PIXELS_PER_SECOND = 50 // Scale factor for timeline visualization

export function SegmentTimeline({ segments, selectedSegmentId, onSelect, audioTracks }: SegmentTimelineProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set())

  const handleToggleExpand = (segmentId: string) => {
    setExpandedSegments((prev) => {
      const next = new Set(prev)
      if (next.has(segmentId)) {
        next.delete(segmentId)
      } else {
        next.add(segmentId)
      }
      return next
    })
  }

  // Calculate total duration and timeline width
  const totalDuration = useMemo(() => {
    if (segments.length === 0) return 0
    const lastSegment = segments[segments.length - 1]
    return lastSegment.endTime
  }, [segments])

  const timelineWidth = totalDuration * PIXELS_PER_SECOND

  if (segments.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        No segments yet. Initialize scene production to create segments and prompts.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
        <span className="font-mono">Timeline: 0:00 - {formatTime(totalDuration)}</span>
        <span className="text-gray-400">{segments.length} segment{segments.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Responsive Segment Cards Timeline - Primary View */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto p-3">
          <div className="flex gap-3">
          {/* Visual Track - Segments */}
          <div className="border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="h-24 flex items-center relative">
              {segments.map((segment) => {
                const width = (segment.endTime - segment.startTime) * PIXELS_PER_SECOND
                const left = segment.startTime * PIXELS_PER_SECOND
                return (
                  <div
                    key={segment.segmentId}
                    style={{
                      width: `${width}px`,
                      left: `${left}px`,
                    }}
                    className={cn(
                      'absolute h-full p-1 border-r border-gray-400 dark:border-gray-600',
                      'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors',
                      selectedSegmentId === segment.segmentId
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 ring-2 ring-blue-500/50'
                        : 'bg-gray-50 dark:bg-gray-800'
                    )}
                    onClick={() => onSelect(segment.segmentId)}
                    title={`Segment ${segment.sequenceIndex + 1}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
                  >
                    <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      Seq {segment.sequenceIndex + 1}
                    </div>
                    <div className="text-[10px] text-gray-600 dark:text-gray-400">
                      {formatTime(segment.endTime - segment.startTime)}
                    </div>
                    {segment.activeAssetUrl && (
                      <div className="mt-1 text-[10px] text-green-600 dark:text-green-400">✓ Asset</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Audio Tracks */}
          {audioTracks && (
            <>
              {/* Narration Track */}
              {audioTracks.narration && (
                <div className="h-12 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center relative">
                  <div className="absolute left-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Volume2 className="w-3 h-3" />
                    <span>Narration</span>
                  </div>
                  {audioTracks.narration.url && (
                    <div
                      style={{
                        width: `${audioTracks.narration.duration * PIXELS_PER_SECOND}px`,
                        left: `${audioTracks.narration.startTime * PIXELS_PER_SECOND}px`,
                      }}
                      className="absolute h-full bg-blue-200 dark:bg-blue-800/50 border border-blue-400 dark:border-blue-600 rounded"
                      title="Narration audio"
                    />
                  )}
                </div>
              )}

              {/* Dialogue Track */}
              {audioTracks.dialogue && audioTracks.dialogue.length > 0 && (
                <div className="h-12 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center relative">
                  <div className="absolute left-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Volume2 className="w-3 h-3" />
                    <span>Dialogue</span>
                  </div>
                  {audioTracks.dialogue.map((dialogue, idx) => (
                    dialogue.url && (
                      <div
                        key={idx}
                        style={{
                          width: `${dialogue.duration * PIXELS_PER_SECOND}px`,
                          left: `${dialogue.startTime * PIXELS_PER_SECOND}px`,
                        }}
                        className="absolute h-full bg-purple-200 dark:bg-purple-800/50 border border-purple-400 dark:border-purple-600 rounded"
                        title={dialogue.character ? `${dialogue.character} dialogue` : 'Dialogue'}
                      />
                    )
                  ))}
                </div>
              )}

              {/* SFX Track */}
              {audioTracks.sfx && audioTracks.sfx.length > 0 && (
                <div className="h-12 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center relative">
                  <div className="absolute left-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Zap className="w-3 h-3" />
                    <span>SFX</span>
                  </div>
                  {audioTracks.sfx.map((sfx, idx) => (
                    sfx.url && (
                      <div
                        key={idx}
                        style={{
                          width: `${sfx.duration * PIXELS_PER_SECOND}px`,
                          left: `${sfx.startTime * PIXELS_PER_SECOND}px`,
                        }}
                        className="absolute h-full bg-orange-200 dark:bg-orange-800/50 border border-orange-400 dark:border-orange-600 rounded"
                        title={sfx.description || 'Sound effect'}
                      />
                    )
                  ))}
                </div>
              )}

              {/* Music Track */}
              {audioTracks.music && (
                <div className="h-12 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center relative">
                  <div className="absolute left-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Music className="w-3 h-3" />
                    <span>Music</span>
                  </div>
                  {audioTracks.music.url && (
                    <div
                      style={{
                        width: `${audioTracks.music.duration * PIXELS_PER_SECOND}px`,
                        left: `${audioTracks.music.startTime * PIXELS_PER_SECOND}px`,
                      }}
                      className="absolute h-full bg-green-200 dark:bg-green-800/50 border border-green-400 dark:border-green-600 rounded"
                      title="Background music"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Segment Cards (Alternative View) - Keep for detailed editing */}
      <div className="mt-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto p-3">
          <div className="flex gap-3 min-w-max">
            {segments.map((segment) => (
              <SegmentBlock
                key={segment.segmentId}
                segment={segment}
                isSelected={segment.segmentId === selectedSegmentId}
                onSelect={onSelect}
                isExpanded={expandedSegments.has(segment.segmentId)}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

