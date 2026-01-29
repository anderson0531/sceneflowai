'use client'

import React, { useState, useMemo } from 'react'
import {
  MessageSquare,
  Clock,
  User,
  Reply,
  CheckCircle2,
  Filter,
  SortAsc,
  Play,
  Heart
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { TimestampedComment, ScreeningReaction } from '@/lib/types/finalCut'

// ============================================================================
// Types
// ============================================================================

export interface FeedbackPanelProps {
  /** Comments from viewers */
  comments: TimestampedComment[]
  /** Reactions from viewers */
  reactions: ScreeningReaction[]
  /** Callback when timestamp is clicked (to seek video) */
  onSeekToTimestamp?: (timestamp: number) => void
  /** Callback to mark comment as resolved */
  onResolveComment?: (commentId: string) => void
  /** Callback to reply to comment */
  onReplyToComment?: (commentId: string, text: string) => void
  /** Current video timestamp (for highlighting) */
  currentTimestamp?: number
}

// ============================================================================
// Helpers
// ============================================================================

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

// ============================================================================
// FeedbackPanel Component
// ============================================================================

export function FeedbackPanel({
  comments,
  reactions,
  onSeekToTimestamp,
  onResolveComment,
  onReplyToComment,
  currentTimestamp = 0
}: FeedbackPanelProps) {
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all')
  const [sortBy, setSortBy] = useState<'timestamp' | 'date'>('timestamp')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  
  // Filter and sort comments
  const filteredComments = useMemo(() => {
    let filtered = [...comments]
    
    // Apply filter
    if (filter === 'unresolved') {
      filtered = filtered.filter(c => !c.isResolved)
    } else if (filter === 'resolved') {
      filtered = filtered.filter(c => c.isResolved)
    }
    
    // Apply sort
    if (sortBy === 'timestamp') {
      filtered.sort((a, b) => a.timestamp - b.timestamp)
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    
    return filtered
  }, [comments, filter, sortBy])
  
  // Group reactions by timestamp for density visualization
  const reactionDensity = useMemo(() => {
    const density: Record<number, { count: number; emojis: string[] }> = {}
    
    reactions.forEach(reaction => {
      const bucket = Math.floor(reaction.timestamp / 5) * 5 // 5-second buckets
      if (!density[bucket]) {
        density[bucket] = { count: 0, emojis: [] }
      }
      density[bucket].count++
      if (!density[bucket].emojis.includes(reaction.emoji)) {
        density[bucket].emojis.push(reaction.emoji)
      }
    })
    
    return density
  }, [reactions])
  
  const handleSubmitReply = (commentId: string) => {
    if (!replyText.trim() || !onReplyToComment) return
    onReplyToComment(commentId, replyText)
    setReplyingTo(null)
    setReplyText('')
  }
  
  const unresolvedCount = comments.filter(c => !c.isResolved).length
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Feedback</h3>
          {unresolvedCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
              {unresolvedCount} unresolved
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
          >
            <option value="all">All</option>
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>
          
          {/* Sort */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy(sortBy === 'timestamp' ? 'date' : 'timestamp')}
            className="text-gray-400 hover:text-white px-2"
            title={`Sort by ${sortBy === 'timestamp' ? 'date' : 'timestamp'}`}
          >
            <SortAsc className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Reaction Summary */}
      {reactions.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4 text-pink-400" />
            <span className="text-gray-400">
              {reactions.length} reactions
            </span>
            <div className="flex gap-0.5">
              {Array.from(new Set(reactions.map(r => r.emoji))).slice(0, 5).map(emoji => (
                <span key={emoji}>{emoji}</span>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        {filteredComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageSquare className="w-10 h-10 text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">No comments yet</p>
            <p className="text-sm text-gray-500">
              {filter !== 'all' 
                ? 'Try changing the filter' 
                : 'Comments from viewers will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isNearCurrent={Math.abs(comment.timestamp - currentTimestamp) < 5}
                isReplying={replyingTo === comment.id}
                replyText={replyText}
                onSeekToTimestamp={onSeekToTimestamp}
                onResolve={onResolveComment}
                onStartReply={() => setReplyingTo(comment.id)}
                onCancelReply={() => { setReplyingTo(null); setReplyText('') }}
                onReplyTextChange={setReplyText}
                onSubmitReply={() => handleSubmitReply(comment.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Stats Footer */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50 text-xs text-gray-500 flex justify-between">
        <span>{comments.length} total comments</span>
        <span>{reactions.length} reactions</span>
      </div>
    </div>
  )
}

// ============================================================================
// CommentItem Component
// ============================================================================

function CommentItem({
  comment,
  isNearCurrent,
  isReplying,
  replyText,
  onSeekToTimestamp,
  onResolve,
  onStartReply,
  onCancelReply,
  onReplyTextChange,
  onSubmitReply
}: {
  comment: TimestampedComment
  isNearCurrent: boolean
  isReplying: boolean
  replyText: string
  onSeekToTimestamp?: (timestamp: number) => void
  onResolve?: (commentId: string) => void
  onStartReply: () => void
  onCancelReply: () => void
  onReplyTextChange: (text: string) => void
  onSubmitReply: () => void
}) {
  return (
    <div 
      className={cn(
        "p-4 transition-colors",
        isNearCurrent && "bg-blue-500/5",
        comment.isResolved && "opacity-60"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="w-3 h-3 text-gray-400" />
          </div>
          <span className="text-sm font-medium text-gray-200">
            {comment.viewerName || 'Anonymous'}
          </span>
          <span className="text-xs text-gray-500">
            {formatTimeAgo(comment.createdAt)}
          </span>
        </div>
        
        {/* Timestamp badge */}
        <button
          onClick={() => onSeekToTimestamp?.(comment.timestamp)}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors",
            isNearCurrent
              ? "bg-blue-500/20 text-blue-400"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          )}
        >
          <Play className="w-3 h-3" />
          {formatTimestamp(comment.timestamp)}
        </button>
      </div>
      
      {/* Comment text */}
      <p className="text-sm text-gray-300 mb-2">{comment.text}</p>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        {!comment.isResolved && onResolve && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onResolve(comment.id)}
            className="text-xs text-gray-400 hover:text-green-400 px-2 h-7"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Resolve
          </Button>
        )}
        
        {comment.isResolved && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Resolved
          </span>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onStartReply}
          className="text-xs text-gray-400 hover:text-white px-2 h-7"
        >
          <Reply className="w-3 h-3 mr-1" />
          Reply
        </Button>
      </div>
      
      {/* Reply input */}
      {isReplying && (
        <div className="mt-3 pl-4 border-l-2 border-gray-700">
          <Input
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder="Write a reply..."
            className="bg-gray-800 border-gray-700 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && onSubmitReply()}
          />
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={onSubmitReply}
              disabled={!replyText.trim()}
              className="text-xs"
            >
              Reply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-gray-700 space-y-2">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-300">
                  {reply.viewerName || 'Team'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(reply.createdAt)}
                </span>
              </div>
              <p className="text-sm text-gray-400">{reply.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
