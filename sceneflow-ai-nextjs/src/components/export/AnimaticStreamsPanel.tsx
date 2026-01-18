'use client'

/**
 * AnimaticStreamsPanel
 * 
 * Displays animatic production streams (rendered from Screening Room) per language.
 * Used in the Final Cut phase to access rendered animatics.
 */

import { useState, useEffect, useCallback } from 'react'
import { Film, Download, RefreshCw, Loader2, CheckCircle, XCircle, Clock, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface AnimaticStream {
  id: string
  language: string
  languageLabel: string
  status: 'pending' | 'rendering' | 'complete' | 'failed'
  progress: number
  mp4Url: string | null
  resolution: '720p' | '1080p' | '4K'
  duration: number | null
  createdAt: string
  completedAt: string | null
  error: string | null
}

interface AnimaticStreamsPanelProps {
  projectId: string
  className?: string
}

export function AnimaticStreamsPanel({ projectId, className }: AnimaticStreamsPanelProps) {
  const [streams, setStreams] = useState<AnimaticStream[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStreams = useCallback(async () => {
    try {
      const response = await fetch(`/api/export/animatics/${projectId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch animatic streams')
      }

      setStreams(data.streams || [])
      setError(null)
    } catch (err) {
      console.error('[AnimaticStreamsPanel] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load animatic streams')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchStreams()
    
    // Poll for updates if any streams are rendering
    const interval = setInterval(() => {
      const hasRendering = streams.some(s => s.status === 'pending' || s.status === 'rendering')
      if (hasRendering) {
        fetchStreams()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [fetchStreams, streams])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchStreams()
  }

  const handleDownload = (stream: AnimaticStream) => {
    if (stream.mp4Url) {
      window.open(stream.mp4Url, '_blank')
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusIcon = (status: AnimaticStream['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rendering':
      case 'pending':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: AnimaticStream['status'], progress: number) => {
    switch (status) {
      case 'complete':
        return 'Complete'
      case 'rendering':
        return `Rendering ${progress}%`
      case 'pending':
        return 'Queued'
      case 'failed':
        return 'Failed'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className={cn('bg-gray-900 rounded-lg p-4', className)}>
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading animatic streams...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('bg-gray-900 rounded-lg p-4', className)}>
        <div className="flex items-center gap-2 text-red-400">
          <XCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="mt-2"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('bg-gray-900 rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Animatic Streams</h3>
          {streams.length > 0 && (
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
              {streams.length} {streams.length === 1 ? 'language' : 'languages'}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        {streams.length === 0 ? (
          <div className="text-center py-8">
            <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">No animatic streams yet</p>
            <p className="text-sm text-gray-500">
              Render an animatic from the Screening Room to create production streams.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {streams.map((stream) => (
              <div
                key={stream.id}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
              >
                {/* Language & Status */}
                <div className="flex items-center gap-3 flex-1">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{stream.languageLabel}</span>
                      <span className="text-xs text-gray-500 uppercase">{stream.resolution}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {getStatusIcon(stream.status)}
                      <span>{getStatusText(stream.status, stream.progress)}</span>
                      {stream.status === 'complete' && stream.completedAt && (
                        <>
                          <span>•</span>
                          <span>{formatDate(stream.completedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="text-sm text-gray-400 mr-4">
                  {formatDuration(stream.duration)}
                </div>

                {/* Actions */}
                <div>
                  {stream.status === 'complete' && stream.mp4Url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(stream)}
                      className="text-purple-400 border-purple-400/30 hover:bg-purple-400/10"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  ) : stream.status === 'rendering' || stream.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${stream.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8">{stream.progress}%</span>
                    </div>
                  ) : stream.status === 'failed' ? (
                    <span className="text-xs text-red-400" title={stream.error || undefined}>
                      {stream.error?.slice(0, 30) || 'Render failed'}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AnimaticStreamsPanel
