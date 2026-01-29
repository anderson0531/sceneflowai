'use client'

import React from 'react'
import {
  Eye,
  Users,
  MessageSquare,
  Clock,
  Copy,
  ExternalLink,
  MoreVertical,
  Trash2,
  Pause,
  Play,
  Globe,
  Lock,
  Mail
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ScreeningSession, FinalCutStream } from '@/lib/types/finalCut'

// ============================================================================
// Types
// ============================================================================

export interface ScreeningCardProps {
  /** Screening data */
  screening: ScreeningSession
  /** Associated stream (for display) */
  stream?: FinalCutStream
  /** Callback to view screening details */
  onView: () => void
  /** Callback to copy share link */
  onCopyLink: () => void
  /** Callback to delete screening */
  onDelete: () => void
  /** Callback to toggle active status */
  onToggleStatus: (active: boolean) => void
}

// ============================================================================
// Helpers
// ============================================================================

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

function formatExpiresIn(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  
  if (diffMs <= 0) return 'Expired'
  
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffDays > 30) return 'Never'
  if (diffDays >= 1) return `${diffDays}d left`
  if (diffHours >= 1) return `${diffHours}h left`
  return 'Expiring soon'
}

const ACCESS_TYPE_ICONS = {
  'public': <Globe className="w-4 h-4" />,
  'password': <Lock className="w-4 h-4" />,
  'invite-only': <Mail className="w-4 h-4" />,
  'internal': <Users className="w-4 h-4" />
}

const ACCESS_TYPE_LABELS = {
  'public': 'Public',
  'password': 'Password',
  'invite-only': 'Invite Only',
  'internal': 'Team'
}

// ============================================================================
// ScreeningCard Component
// ============================================================================

export function ScreeningCard({
  screening,
  stream,
  onView,
  onCopyLink,
  onDelete,
  onToggleStatus
}: ScreeningCardProps) {
  const isActive = screening.status === 'active'
  const isExpired = screening.status === 'expired'
  
  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border transition-all",
        isActive
          ? "bg-gray-800/50 border-gray-700/50 hover:border-gray-600"
          : "bg-gray-900/50 border-gray-800/50"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">
            {ACCESS_TYPE_ICONS[screening.accessType]}
          </span>
          <div>
            <h4 className="font-medium text-gray-200 line-clamp-1">
              {screening.title}
            </h4>
            <p className="text-xs text-gray-500">
              {stream?.name || 'Unknown stream'}
            </p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border-gray-700">
            <DropdownMenuItem onClick={onView} className="cursor-pointer">
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyLink} className="cursor-pointer">
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => window.open(screening.shareUrl, '_blank')} 
              className="cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem 
              onClick={() => onToggleStatus(!isActive)}
              className="cursor-pointer"
            >
              {isActive ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Disable
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Enable
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem 
              onClick={onDelete}
              className="cursor-pointer text-red-400 focus:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-gray-900/50 rounded">
          <div className="flex items-center justify-center gap-1 text-gray-400">
            <Eye className="w-3 h-3" />
            <span className="text-lg font-semibold text-gray-200">
              {screening.viewerCount}
            </span>
          </div>
          <p className="text-xs text-gray-500">Views</p>
        </div>
        
        <div className="text-center p-2 bg-gray-900/50 rounded">
          <div className="flex items-center justify-center gap-1 text-gray-400">
            <MessageSquare className="w-3 h-3" />
            <span className="text-lg font-semibold text-gray-200">
              {screening.comments.length}
            </span>
          </div>
          <p className="text-xs text-gray-500">Comments</p>
        </div>
        
        <div className="text-center p-2 bg-gray-900/50 rounded">
          <div className="flex items-center justify-center gap-1 text-gray-400">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-medium text-gray-200">
              {formatExpiresIn(screening.expiresAt)}
            </span>
          </div>
          <p className="text-xs text-gray-500">Expires</p>
        </div>
      </div>
      
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span 
          className={cn(
            "text-xs px-2 py-1 rounded-full",
            isActive 
              ? "bg-green-500/20 text-green-400"
              : isExpired
                ? "bg-red-500/20 text-red-400"
                : "bg-gray-500/20 text-gray-400"
          )}
        >
          {isActive ? 'Active' : isExpired ? 'Expired' : 'Disabled'}
        </span>
        
        <span className="text-xs text-gray-500">
          Created {formatTimeAgo(screening.createdAt)}
        </span>
      </div>
      
      {/* Quick Copy Button */}
      {isActive && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCopyLink}
          className="w-full mt-3 bg-gray-800/50 border-gray-700 hover:bg-gray-700"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Share Link
        </Button>
      )}
    </div>
  )
}
