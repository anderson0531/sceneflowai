/**
 * Screening Room Dashboard
 * 
 * Central hub for managing screenings and viewing analytics.
 * Features a tabbed interface for different content types:
 * - Storyboard Screenings (from Animatic Editor)
 * - Pre-Cut Screenings (from Rough Cut Editor)
 * - Final Cut / External (from Final Cut Editor or direct upload)
 * 
 * Also includes A/B test management and external video upload.
 * 
 * @see /src/lib/types/behavioralAnalytics.ts for types
 */

'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Film,
  Scissors,
  Video,
  Upload,
  FlaskConical,
  BarChart3,
  Plus,
  ExternalLink,
  Play,
  Users,
  Eye,
  Clock,
  TrendingUp,
  AlertCircle,
  Check,
  Loader2,
  FileVideo,
  X,
  Pencil,
  UploadCloud,
  Send,
  MessageSquare,
  Download,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type {
  BehavioralAnalyticsSummary,
  ABTestConfig,
} from '@/lib/types/behavioralAnalytics'

// ============================================================================
// Types
// ============================================================================

interface ScreeningRoomDashboardProps {
  projectId: string
  projectName?: string
  
  // Linked screenings from editors
  storyboardScreenings?: ScreeningItem[]
  preCutScreenings?: ScreeningItem[]
  finalCutScreenings?: ScreeningItem[]
  
  // Credits
  screeningCredits?: number
  
  // Callbacks
  onCreateScreening?: (type: ScreeningType, streamId?: string) => void
  onViewAnalytics?: (screeningId: string) => void
  onConfigureABTest?: (screeningId: string) => void
  onUploadExternal?: (file: File) => Promise<string>
  onRenameScreening?: (screeningId: string, nextTitle: string) => Promise<void> | void
  onListFeedback?: (screeningId: string) => Promise<ScreeningFeedback[]>
  onCreateFeedback?: (input: CreateScreeningFeedbackInput) => Promise<void>
  onUpdateFeedback?: (
    screeningId: string,
    feedbackId: string,
    updates: UpdateScreeningFeedbackInput
  ) => Promise<void>
  onExportFeedback?: (screeningId: string) => Promise<void> | void

  /** Embedded on Final Cut page: Final Cut tab + external upload only */
  variant?: 'full' | 'finalCutOnly'
  /** When true with finalCutOnly, omit outer card title row (page supplies section header) */
  hideFinalCutChrome?: boolean
}

interface ScreeningItem {
  id: string
  title: string
  streamId?: string
  videoUrl?: string
  createdAt: string
  status: 'draft' | 'active' | 'completed' | 'expired'
  viewerCount: number
  averageCompletion: number
  hasABTest?: boolean
  abTestVariant?: 'A' | 'B'
  thumbnail?: string
  editable?: boolean
  streamLabel?: string
  locale?: string
  sourceType?: 'video' | 'animatic'
  reviewStatus?: 'open' | 'in_review' | 'resolved'
  owner?: string
  feedbackCount?: number
  avgRating?: number
  latestFeedbackAt?: string
  openItems?: number
}

type ScreeningFeedbackStatus = 'open' | 'in_review' | 'resolved'

interface ScreeningFeedback {
  id: string
  screeningId: string
  streamId?: string
  author: string
  rating: number
  comment: string
  tags: string[]
  status: ScreeningFeedbackStatus
  owner?: string
  createdAt: string
  updatedAt: string
}

interface CreateScreeningFeedbackInput {
  screeningId: string
  streamId?: string
  author?: string
  rating: number
  comment: string
  tags?: string[]
}

interface UpdateScreeningFeedbackInput {
  status?: ScreeningFeedbackStatus
  owner?: string
  tags?: string[]
}

type ScreeningType = 'storyboard' | 'pre-cut' | 'final-cut' | 'external'

// ============================================================================
// Tab Configuration
// ============================================================================

const TABS = [
  {
    id: 'storyboard',
    label: 'Storyboard',
    icon: Film,
    description: 'Screenings from Animatic Editor',
  },
  {
    id: 'pre-cut',
    label: 'Pre-Cut',
    icon: Scissors,
    description: 'Screenings from Rough Cut Editor',
  },
  {
    id: 'final-cut',
    label: 'Final Cut',
    icon: Video,
    description: 'Final cuts and external uploads',
  },
] as const

// ============================================================================
// Component
// ============================================================================

export function ScreeningRoomDashboard({
  projectId,
  projectName,
  storyboardScreenings = [],
  preCutScreenings = [],
  finalCutScreenings = [],
  screeningCredits = 0,
  onCreateScreening,
  onViewAnalytics,
  onConfigureABTest,
  onUploadExternal,
  onRenameScreening,
  onListFeedback,
  onCreateFeedback,
  onUpdateFeedback,
  onExportFeedback,
  variant = 'full',
  hideFinalCutChrome = false,
}: ScreeningRoomDashboardProps) {
  const isFinalCutOnly = variant === 'finalCutOnly'
  const [activeTab, setActiveTab] = useState<string>(isFinalCutOnly ? 'final-cut' : 'storyboard')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [playingScreeningId, setPlayingScreeningId] = useState<string | null>(null)
  const [editingScreeningId, setEditingScreeningId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const [feedbackOpenFor, setFeedbackOpenFor] = useState<string | null>(null)
  const [feedbackByScreening, setFeedbackByScreening] = useState<Record<string, ScreeningFeedback[]>>({})
  const [isLoadingFeedbackFor, setIsLoadingFeedbackFor] = useState<string | null>(null)
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<
    'all' | 'open' | 'in_review' | 'resolved'
  >('all')
  const [feedbackTagFilter, setFeedbackTagFilter] = useState('')
  const [feedbackDraftComment, setFeedbackDraftComment] = useState('')
  const [feedbackDraftAuthor, setFeedbackDraftAuthor] = useState('')
  const [feedbackDraftRating, setFeedbackDraftRating] = useState(4)
  const [feedbackDraftTags, setFeedbackDraftTags] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // ============================================================================
  // Get screenings for current tab
  // ============================================================================
  
  const getScreeningsForTab = () => {
    switch (activeTab) {
      case 'storyboard':
        return storyboardScreenings
      case 'pre-cut':
        return preCutScreenings
      case 'final-cut':
        return finalCutScreenings
      default:
        return []
    }
  }
  
  // ============================================================================
  // External Upload Handlers
  // ============================================================================
  
  const handleFileUpload = useCallback(async (file: File) => {
    if (!onUploadExternal) return
    
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-m4v']
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload MP4 or MOV files.')
      return
    }
    
    // Validate file size (max 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 2GB.')
      return
    }
    
    // Check credits
    if (screeningCredits <= 0) {
      alert('Insufficient screening credits. Please upgrade your plan.')
      return
    }
    
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      // Simulate progress (actual upload would track real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 500)
      
      await onUploadExternal(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 1000)
    } catch (error) {
      console.error('Upload failed:', error)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [onUploadExternal, screeningCredits])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const loadFeedbackForScreening = useCallback(
    async (screeningId: string) => {
      if (!onListFeedback) return
      setIsLoadingFeedbackFor(screeningId)
      try {
        const feedback = await onListFeedback(screeningId)
        setFeedbackByScreening((prev) => ({ ...prev, [screeningId]: feedback }))
      } finally {
        setIsLoadingFeedbackFor(null)
      }
    },
    [onListFeedback]
  )

  const handleToggleFeedback = useCallback(
    async (screeningId: string) => {
      const nextOpen = feedbackOpenFor === screeningId ? null : screeningId
      setFeedbackOpenFor(nextOpen)
      if (nextOpen && onListFeedback && !feedbackByScreening[screeningId]) {
        await loadFeedbackForScreening(screeningId)
      }
    },
    [feedbackByScreening, feedbackOpenFor, loadFeedbackForScreening, onListFeedback]
  )

  const handleCreateFeedbackEntry = useCallback(
    async (screening: ScreeningItem) => {
      if (!onCreateFeedback || !feedbackDraftComment.trim()) return
      setIsSubmittingFeedback(true)
      try {
        await onCreateFeedback({
          screeningId: screening.id,
          streamId: screening.streamId,
          author: feedbackDraftAuthor.trim() || 'Reviewer',
          rating: feedbackDraftRating,
          comment: feedbackDraftComment.trim(),
          tags: feedbackDraftTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        })
        setFeedbackDraftComment('')
        setFeedbackDraftAuthor('')
        setFeedbackDraftTags('')
        await loadFeedbackForScreening(screening.id)
      } finally {
        setIsSubmittingFeedback(false)
      }
    },
    [
      feedbackDraftAuthor,
      feedbackDraftComment,
      feedbackDraftRating,
      feedbackDraftTags,
      loadFeedbackForScreening,
      onCreateFeedback,
    ]
  )

  const handleUpdateFeedbackEntry = useCallback(
    async (
      screeningId: string,
      feedbackId: string,
      updates: { status?: ScreeningFeedbackStatus; owner?: string; tags?: string[] }
    ) => {
      if (!onUpdateFeedback) return
      await onUpdateFeedback(screeningId, feedbackId, updates)
      await loadFeedbackForScreening(screeningId)
    },
    [loadFeedbackForScreening, onUpdateFeedback]
  )
  
  // ============================================================================
  // Render: Screening Card
  // ============================================================================
  
  const renderScreeningCard = (screening: ScreeningItem) => (
    <motion.div
      key={screening.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden hover:border-gray-600 transition-colors"
    >
      {/* Thumbnail */}
      <div className="p-2 bg-gradient-to-b from-zinc-700/30 to-zinc-900/60 border-b border-zinc-700/40">
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden ring-1 ring-zinc-500/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
          {playingScreeningId === screening.id && screening.videoUrl ? (
            <video
              key={`inline-${screening.id}`}
              src={screening.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-cover bg-black"
            />
          ) : screening.thumbnail ? (
            <img
              src={screening.thumbnail}
              alt={screening.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900/80">
              <Video className="w-12 h-12 text-gray-700" />
            </div>
          )}

          {/* Status Badge */}
          <div className={cn(
            "absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium",
            screening.status === 'active' && "bg-green-500/20 text-green-400",
            screening.status === 'draft' && "bg-gray-500/20 text-gray-400",
            screening.status === 'completed' && "bg-blue-500/20 text-blue-400",
            screening.status === 'expired' && "bg-red-500/20 text-red-400",
          )}>
            {screening.status}
          </div>

          {/* A/B Test Badge */}
          {screening.hasABTest && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium flex items-center gap-1">
              <FlaskConical className="w-3 h-3" />
              A/B Test
            </div>
          )}

          {/* Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/50">
            <button
              type="button"
              disabled={!screening.videoUrl}
              onClick={() => {
                if (!screening.videoUrl) return
                setPlayingScreeningId(screening.id)
              }}
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
                screening.videoUrl
                  ? 'bg-white/20 hover:bg-white/30'
                  : 'bg-white/10 cursor-not-allowed'
              )}
            >
              <Play className="w-7 h-7 text-white ml-0.5" fill="white" />
            </button>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-violet-500/20" />
        </div>
      </div>
      
      {/* Info */}
      <div className="p-4">
        {editingScreeningId === screening.id ? (
          <div className="mb-2 flex items-center gap-1.5">
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/60"
              maxLength={120}
              autoFocus
            />
            <Button
              size="sm"
              variant="outline"
              disabled={isSavingTitle || !draftTitle.trim()}
              onClick={async () => {
                if (!onRenameScreening) return
                const nextTitle = draftTitle.trim()
                if (!nextTitle) return
                try {
                  setIsSavingTitle(true)
                  await onRenameScreening(screening.id, nextTitle)
                  setEditingScreeningId(null)
                } finally {
                  setIsSavingTitle(false)
                }
              }}
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isSavingTitle}
              onClick={() => {
                setEditingScreeningId(null)
                setDraftTitle('')
              }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <h3 className="min-w-0 text-xs font-semibold text-white leading-snug whitespace-normal break-words [overflow-wrap:anywhere]">
              {screening.title}
            </h3>
            {onRenameScreening && screening.editable !== false ? (
              <button
                type="button"
                className="shrink-0 mt-0.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                onClick={() => {
                  setEditingScreeningId(screening.id)
                  setDraftTitle(screening.title)
                }}
                aria-label="Edit screening title"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        )}
        
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
          {screening.streamLabel ? (
            <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-0.5">
              {screening.streamLabel}
            </span>
          ) : null}
          {screening.locale ? (
            <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-0.5 uppercase">
              {screening.locale}
            </span>
          ) : null}
          {screening.sourceType ? (
            <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-0.5 capitalize">
              {screening.sourceType}
            </span>
          ) : null}
          {screening.reviewStatus ? (
            <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 capitalize text-violet-300">
              {screening.reviewStatus.replace('_', ' ')}
            </span>
          ) : null}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{screening.viewerCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            <span>{Math.round(screening.averageCompletion)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            <span>{screening.feedbackCount ?? 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Rating</span>
            <span>{(screening.avgRating ?? 0).toFixed(1)}</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!screening.videoUrl}
            onClick={() => {
              if (!screening.videoUrl) return
              setPlayingScreeningId((current) => (current === screening.id ? null : screening.id))
            }}
            className="w-full"
          >
            <UploadCloud className="w-4 h-4 mr-1.5" />
            {playingScreeningId === screening.id ? 'Stop' : 'Screen'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!screening.videoUrl}
            onClick={() => {
              if (!screening.videoUrl) return
              window.open(screening.videoUrl, '_blank', 'noopener,noreferrer')
            }}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Publish
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewAnalytics?.(screening.id)}
            className="w-full"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Analytics
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleToggleFeedback(screening.id)}
            className="w-full"
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Feedback
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!onExportFeedback}
            onClick={() => void onExportFeedback?.(screening.id)}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>

        {feedbackOpenFor === screening.id ? (
          <div className="mt-3 rounded-lg border border-zinc-700/70 bg-zinc-950/60 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={feedbackStatusFilter}
                onChange={(e) =>
                  setFeedbackStatusFilter(e.target.value as 'all' | 'open' | 'in_review' | 'resolved')
                }
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="in_review">In review</option>
                <option value="resolved">Resolved</option>
              </select>
              <input
                value={feedbackTagFilter}
                onChange={(e) => setFeedbackTagFilter(e.target.value)}
                placeholder="Filter tag"
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
              />
            </div>

            <div className="space-y-2 max-h-48 overflow-auto pr-1">
              {(feedbackByScreening[screening.id] || [])
                .filter((item) => feedbackStatusFilter === 'all' || item.status === feedbackStatusFilter)
                .filter((item) =>
                  feedbackTagFilter.trim()
                    ? item.tags.some((tag) => tag.toLowerCase().includes(feedbackTagFilter.toLowerCase()))
                    : true
                )
                .map((item) => (
                  <div key={item.id} className="rounded-md border border-zinc-700/70 bg-zinc-900/70 p-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                      <span className="font-medium text-zinc-200">{item.author}</span>
                      <span>{item.rating}/5</span>
                      <span className="capitalize">{item.status.replace('_', ' ')}</span>
                      {item.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 text-zinc-300">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-zinc-200 whitespace-pre-wrap">{item.comment}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() =>
                          void handleUpdateFeedbackEntry(screening.id, item.id, {
                            status: item.status === 'resolved' ? 'in_review' : 'resolved',
                          })
                        }
                      >
                        {item.status === 'resolved' ? 'Reopen' : 'Resolve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() =>
                          void handleUpdateFeedbackEntry(screening.id, item.id, {
                            status: 'in_review',
                          })
                        }
                      >
                        Mark in review
                      </Button>
                    </div>
                  </div>
                ))}

              {isLoadingFeedbackFor === screening.id ? (
                <p className="text-xs text-zinc-500">Loading feedback…</p>
              ) : (feedbackByScreening[screening.id] || []).length === 0 ? (
                <p className="text-xs text-zinc-500">No feedback yet for this stream.</p>
              ) : null}
            </div>

            <div className="rounded-md border border-zinc-700/70 bg-zinc-900/60 p-2 space-y-2">
              <p className="text-xs font-medium text-zinc-200">Add feedback</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={feedbackDraftAuthor}
                  onChange={(e) => setFeedbackDraftAuthor(e.target.value)}
                  placeholder="Author"
                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                />
                <select
                  value={feedbackDraftRating}
                  onChange={(e) => setFeedbackDraftRating(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Good</option>
                  <option value={3}>3 - Fair</option>
                  <option value={2}>2 - Needs work</option>
                  <option value={1}>1 - Poor</option>
                </select>
              </div>
              <input
                value={feedbackDraftTags}
                onChange={(e) => setFeedbackDraftTags(e.target.value)}
                placeholder="Tags (comma separated)"
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
              />
              <textarea
                value={feedbackDraftComment}
                onChange={(e) => setFeedbackDraftComment(e.target.value)}
                placeholder="Feedback comment"
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
              />
              <Button
                size="sm"
                disabled={!onCreateFeedback || isSubmittingFeedback || !feedbackDraftComment.trim()}
                onClick={() => void handleCreateFeedbackEntry(screening)}
              >
                {isSubmittingFeedback ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Submit feedback
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  )
  
  // ============================================================================
  // Render: Empty State
  // ============================================================================
  
  const renderEmptyState = (tabOverride?: ScreeningType) => {
    const tabId = (tabOverride ?? activeTab) as ScreeningType
    const tabConfig = TABS.find((t) => t.id === tabId)
    if (!tabConfig) return null

    const Icon = tabConfig.icon

    return (
      <div className={cn('text-center', isFinalCutOnly ? 'py-10' : 'py-16')}>
        <div
          className={cn(
            isFinalCutOnly
              ? 'bg-zinc-800/80 ring-1 ring-violet-500/15 rounded-full flex items-center justify-center mx-auto mb-4'
              : 'bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4',
            isFinalCutOnly ? 'w-14 h-14' : 'w-16 h-16'
          )}
        >
          <Icon
            className={cn(
              isFinalCutOnly ? 'text-zinc-500' : 'text-gray-500',
              isFinalCutOnly ? 'w-7 h-7' : 'w-8 h-8'
            )}
          />
        </div>
        <h3
          className={cn(
            'font-semibold text-white mb-2 tracking-tight',
            isFinalCutOnly ? 'text-sm' : 'text-lg'
          )}
        >
          No {tabConfig.label} Screenings
        </h3>
        <p
          className={cn(
            'mb-6 max-w-md mx-auto',
            isFinalCutOnly ? 'text-xs text-zinc-500 leading-relaxed' : 'text-gray-400 text-sm'
          )}
        >
          {tabConfig.description}. Create your first screening to start collecting audience insights.
        </p>
        <Button onClick={() => onCreateScreening?.(tabId)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Screening
        </Button>
      </div>
    )
  }
  
  // ============================================================================
  // Render: External Upload Zone
  // ============================================================================
  
  const renderExternalUpload = () => {
    const fc = isFinalCutOnly
    return (
      <div className={cn('mb-8', fc && 'mb-6')}>
        <h3
          className={cn(
            'text-sm font-semibold mb-3 flex items-center gap-2 tracking-tight',
            fc ? 'text-zinc-200' : 'text-gray-300 font-medium'
          )}
        >
          <Upload className={cn('w-4 h-4', fc && 'text-violet-400')} />
          External Video Upload
        </h3>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
            dragOver &&
              (fc ? 'border-violet-400 bg-violet-500/10 shadow-[0_0_40px_-12px_rgba(139,92,246,0.45)]' : 'border-blue-500 bg-blue-500/10'),
            !dragOver &&
              (fc
                ? 'border-zinc-700/90 bg-zinc-950/40 hover:border-violet-500/35 hover:bg-zinc-900/50'
                : 'border-gray-700 hover:border-gray-600'),
            isUploading && 'pointer-events-none opacity-70'
          )}
        >
          {isUploading ? (
            <div className="space-y-4">
              <Loader2
                className={cn('w-8 h-8 animate-spin mx-auto', fc ? 'text-violet-400' : 'text-blue-400')}
              />
              <div>
                <p className="text-sm font-semibold text-white mb-2">Uploading video…</p>
                <div
                  className={cn(
                    'w-48 h-2 rounded-full mx-auto overflow-hidden',
                    fc ? 'bg-zinc-800' : 'bg-gray-700'
                  )}
                >
                  <div
                    className={cn(
                      'h-full transition-all duration-300',
                      fc ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className={cn('text-xs mt-2', fc ? 'text-zinc-500' : 'text-sm text-gray-400')}>
                  {uploadProgress}%
                </p>
              </div>
            </div>
          ) : (
            <>
              <FileVideo className={cn('w-10 h-10 mx-auto mb-3', fc ? 'text-zinc-500' : 'text-gray-500')} />
              <p className="text-sm font-semibold text-white mb-1">Drop your video here</p>
              <p className={cn('mb-4', fc ? 'text-xs text-zinc-500' : 'text-sm text-gray-400')}>
                or click to browse (MP4, MOV • Max 2GB)
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className={
                  fc
                    ? 'border-violet-500/40 bg-violet-950/20 text-violet-100 hover:bg-violet-950/40 hover:border-violet-400/50'
                    : undefined
                }
              >
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />

              <p
                className={cn(
                  'text-xs mt-4 flex items-center justify-center gap-1',
                  fc ? 'text-zinc-500' : 'text-gray-500'
                )}
              >
                <AlertCircle className="w-3 h-3 shrink-0" />
                Upload will use 1 screening credit ({screeningCredits} remaining)
              </p>
            </>
          )}
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  const screenings = getScreeningsForTab()

  if (isFinalCutOnly) {
    const finalCutList = finalCutScreenings
    return (
      <div
        className={cn(
          'space-y-4',
          !hideFinalCutChrome &&
            'rounded-2xl border border-zinc-800/70 bg-zinc-950/40 backdrop-blur-md p-4 sm:p-5 shadow-lg shadow-black/20'
        )}
      >
        {!hideFinalCutChrome ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <Video className="w-4 h-4 text-violet-400 shrink-0" />
                Final Cut screenings
              </h2>
              {projectName ? <p className="text-xs text-zinc-500 mt-1 truncate">{projectName}</p> : null}
              <p className="text-xs text-zinc-500 mt-2 max-w-2xl leading-relaxed">
                Share exports and external uploads for feedback. Linked videos appear below.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
              <div className="px-2.5 py-1.5 bg-zinc-900/90 rounded-lg border border-zinc-700/80 text-xs">
                <span className="text-zinc-500">Credits:</span>
                <span className="text-white font-semibold ml-2 tabular-nums">{screeningCredits}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="border-violet-500/40 bg-violet-950/20 text-violet-100 hover:bg-violet-950/40 hover:border-violet-400/50"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isUploading ? 'Uploading…' : 'Upload video'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />
              <Button size="sm" onClick={() => onCreateScreening?.('final-cut')}>
                <Plus className="w-4 h-4 mr-2" />
                New screening
              </Button>
            </div>
          </div>
        ) : null}

        {finalCutList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {finalCutList.map(renderScreeningCard)}
          </div>
        ) : (
          renderEmptyState('final-cut')
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              Screening Room
            </h1>
            {projectName && (
              <p className="text-gray-400 mt-1">{projectName}</p>
            )}
          </div>
          
          {/* Credits Badge */}
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 text-sm">
              <span className="text-gray-400">Credits:</span>
              <span className="text-white font-semibold ml-2">{screeningCredits}</span>
            </div>
            
            <Button onClick={() => onCreateScreening?.(activeTab as ScreeningType)}>
              <Plus className="w-4 h-4 mr-2" />
              New Screening
            </Button>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {/* Tab Content */}
          {TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              {/* External Upload Zone (only for Final Cut tab) */}
              {tab.id === 'final-cut' && renderExternalUpload()}
              
              {/* Screenings Grid or Empty State */}
              {screenings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {screenings.map(renderScreeningCard)}
                </div>
              ) : (
                renderEmptyState()
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

export default ScreeningRoomDashboard
