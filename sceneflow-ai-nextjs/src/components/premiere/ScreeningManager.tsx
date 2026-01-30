'use client'

import React, { useState } from 'react'
import {
  Plus,
  Link as LinkIcon,
  Copy,
  Eye,
  Users,
  Clock,
  Lock,
  Globe,
  Mail,
  Calendar,
  Trash2,
  MoreVertical,
  ExternalLink,
  QrCode
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ScreeningCard } from './ScreeningCard'
import type {
  ScreeningSession,
  ScreeningAccessType,
  FinalCutStream
} from '@/lib/types/finalCut'

// ============================================================================
// Types
// ============================================================================

export interface ScreeningManagerProps {
  /** Project ID */
  projectId: string
  /** Available streams to screen */
  streams: FinalCutStream[]
  /** Existing screenings */
  screenings: ScreeningSession[]
  /** Callback when screening is created */
  onCreateScreening: (screening: Partial<ScreeningSession>) => Promise<ScreeningSession>
  /** Callback when screening is deleted */
  onDeleteScreening: (screeningId: string) => Promise<void>
  /** Callback when screening is updated */
  onUpdateScreening: (screeningId: string, updates: Partial<ScreeningSession>) => Promise<void>
  /** Callback to view screening details */
  onViewScreening: (screeningId: string) => void
}

// ============================================================================
// Constants
// ============================================================================

const ACCESS_TYPE_OPTIONS: Array<{
  value: ScreeningAccessType
  label: string
  description: string
  icon: React.ReactNode
}> = [
  {
    value: 'public',
    label: 'Public Link',
    description: 'Anyone with the link can view',
    icon: <Globe className="w-5 h-5" />
  },
  {
    value: 'password',
    label: 'Password Protected',
    description: 'Requires password to view',
    icon: <Lock className="w-5 h-5" />
  },
  {
    value: 'invite-only',
    label: 'Invite Only',
    description: 'Only invited emails can view',
    icon: <Mail className="w-5 h-5" />
  },
  {
    value: 'internal',
    label: 'Team Only',
    description: 'Only project collaborators',
    icon: <Users className="w-5 h-5" />
  }
]

const EXPIRY_OPTIONS = [
  { value: 24, label: '24 hours' },
  { value: 72, label: '3 days' },
  { value: 168, label: '1 week' },
  { value: 720, label: '30 days' },
  { value: 0, label: 'Never' }
]

// ============================================================================
// ScreeningManager Component
// ============================================================================

export function ScreeningManager({
  projectId,
  streams,
  screenings,
  onCreateScreening,
  onDeleteScreening,
  onUpdateScreening,
  onViewScreening
}: ScreeningManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Create form state
  const [newScreening, setNewScreening] = useState({
    title: '',
    description: '',
    streamId: streams[0]?.id || '',
    accessType: 'public' as ScreeningAccessType,
    password: '',
    expiryHours: 168,
    feedbackEnabled: true,
    maxViewers: 0
  })
  
  const handleCreate = async () => {
    if (!newScreening.title.trim()) {
      toast.error('Please enter a title')
      return
    }
    
    if (!newScreening.streamId) {
      toast.error('Please select a stream')
      return
    }
    
    if (newScreening.accessType === 'password' && !newScreening.password) {
      toast.error('Please enter a password')
      return
    }
    
    setIsCreating(true)
    try {
      const expiresAt = newScreening.expiryHours > 0
        ? new Date(Date.now() + newScreening.expiryHours * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year for "never"
      
      await onCreateScreening({
        projectId,
        streamId: newScreening.streamId,
        title: newScreening.title,
        description: newScreening.description,
        accessType: newScreening.accessType,
        password: newScreening.accessType === 'password' ? newScreening.password : undefined,
        expiresAt,
        feedbackEnabled: newScreening.feedbackEnabled,
        maxViewers: newScreening.maxViewers > 0 ? newScreening.maxViewers : undefined
      })
      
      toast.success('Screening created!')
      setShowCreateDialog(false)
      
      // Reset form
      setNewScreening({
        title: '',
        description: '',
        streamId: streams[0]?.id || '',
        accessType: 'public',
        password: '',
        expiryHours: 168,
        feedbackEnabled: true,
        maxViewers: 0
      })
    } catch (error) {
      console.error('Failed to create screening:', error)
      toast.error('Failed to create screening')
    } finally {
      setIsCreating(false)
    }
  }
  
  const handleCopyLink = (shareUrl: string) => {
    navigator.clipboard.writeText(shareUrl)
    toast.success('Link copied to clipboard')
  }
  
  const activeScreenings = screenings.filter(s => s.status === 'active')
  const expiredScreenings = screenings.filter(s => s.status !== 'active')
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Test Screenings</h2>
          <p className="text-sm text-gray-400">
            Share your work and collect feedback from reviewers
          </p>
        </div>
        
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Screening
        </Button>
      </div>
      
      {/* Active Screenings */}
      {activeScreenings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Active Screenings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeScreenings.map((screening) => (
              <ScreeningCard
                key={screening.id}
                screening={screening}
                stream={streams.find(s => s.id === screening.streamId)}
                onView={() => onViewScreening(screening.id)}
                onCopyLink={() => handleCopyLink(screening.shareUrl)}
                onDelete={() => onDeleteScreening(screening.id)}
                onToggleStatus={(active) => onUpdateScreening(screening.id, {
                  status: active ? 'active' : 'disabled'
                })}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {screenings.length === 0 && (
        <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <Eye className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            No Screenings Yet
          </h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Create a test screening to share your project with reviewers and collect feedback.
          </p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Screening
          </Button>
        </div>
      )}
      
      {/* Expired/Disabled Screenings */}
      {expiredScreenings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Past Screenings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {expiredScreenings.map((screening) => (
              <ScreeningCard
                key={screening.id}
                screening={screening}
                stream={streams.find(s => s.id === screening.streamId)}
                onView={() => onViewScreening(screening.id)}
                onCopyLink={() => handleCopyLink(screening.shareUrl)}
                onDelete={() => onDeleteScreening(screening.id)}
                onToggleStatus={(active) => onUpdateScreening(screening.id, {
                  status: active ? 'active' : 'disabled'
                })}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Create Screening Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Test Screening</DialogTitle>
            <DialogDescription>
              Create a shareable link to collect feedback on your project.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label>Screening Title</Label>
              <Input
                value={newScreening.title}
                onChange={(e) => setNewScreening(prev => ({
                  ...prev,
                  title: e.target.value
                }))}
                placeholder="e.g., First Cut Review"
                className="bg-gray-800 border-gray-700"
              />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={newScreening.description}
                onChange={(e) => setNewScreening(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                placeholder="Add notes for reviewers..."
                className="bg-gray-800 border-gray-700"
                rows={2}
              />
            </div>
            
            {/* Stream Selection */}
            <div className="space-y-2">
              <Label>Stream to Screen</Label>
              <select
                value={newScreening.streamId}
                onChange={(e) => setNewScreening(prev => ({
                  ...prev,
                  streamId: e.target.value
                }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                {streams.map((stream) => (
                  <option key={stream.id} value={stream.id}>
                    {stream.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Access Type */}
            <div className="space-y-2">
              <Label>Access Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {ACCESS_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setNewScreening(prev => ({
                      ...prev,
                      accessType: option.value
                    }))}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border text-left transition-colors",
                      newScreening.accessType === option.value
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-700 hover:border-gray-600 bg-gray-800"
                    )}
                  >
                    <div className="text-gray-400">{option.icon}</div>
                    <div>
                      <div className="text-sm font-medium text-gray-200">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {option.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Password (if password protected) */}
            {newScreening.accessType === 'password' && (
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="text"
                  value={newScreening.password}
                  onChange={(e) => setNewScreening(prev => ({
                    ...prev,
                    password: e.target.value
                  }))}
                  placeholder="Enter a password"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            )}
            
            {/* Expiry */}
            <div className="space-y-2">
              <Label>Link Expiry</Label>
              <select
                value={newScreening.expiryHours}
                onChange={(e) => setNewScreening(prev => ({
                  ...prev,
                  expiryHours: parseInt(e.target.value)
                }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Feedback Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-200">
                  Enable Feedback
                </div>
                <div className="text-xs text-gray-500">
                  Allow viewers to leave timestamped comments
                </div>
              </div>
              <Switch
                checked={newScreening.feedbackEnabled}
                onCheckedChange={(checked) => setNewScreening(prev => ({
                  ...prev,
                  feedbackEnabled: checked
                }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isCreating ? 'Creating...' : 'Create Screening'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
