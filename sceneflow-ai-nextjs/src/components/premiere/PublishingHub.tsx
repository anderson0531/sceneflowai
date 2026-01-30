'use client'

import React, { useState } from 'react'
import {
  Upload,
  Youtube,
  Video,
  Cloud,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Settings,
  Calendar,
  Link as LinkIcon
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type {
  PublishJob,
  PublishDestination,
  PublishStatus,
  FinalCutStream,
  PlatformMetadata
} from '@/lib/types/finalCut'

// ============================================================================
// Types
// ============================================================================

export interface PublishingHubProps {
  /** Project ID */
  projectId: string
  /** Available streams to publish */
  streams: FinalCutStream[]
  /** Existing publish jobs */
  publishJobs: PublishJob[]
  /** Callback to create publish job */
  onPublish: (job: Partial<PublishJob>) => Promise<PublishJob>
  /** Callback to cancel publish job */
  onCancelPublish: (jobId: string) => Promise<void>
  /** Connected platforms */
  connectedPlatforms: PublishDestination[]
  /** Callback to connect a platform */
  onConnectPlatform: (platform: PublishDestination) => Promise<void>
}

// ============================================================================
// Constants
// ============================================================================

interface PlatformConfig {
  id: PublishDestination
  name: string
  icon: React.ReactNode
  color: string
  description: string
  requiresAuth: boolean
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: <Youtube className="w-5 h-5" />,
    color: 'text-red-500',
    description: 'Upload to YouTube',
    requiresAuth: true
  },
  {
    id: 'vimeo',
    name: 'Vimeo',
    icon: <Video className="w-5 h-5" />,
    color: 'text-blue-400',
    description: 'Upload to Vimeo',
    requiresAuth: true
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    icon: <Cloud className="w-5 h-5" />,
    color: 'text-yellow-400',
    description: 'Save to Google Drive',
    requiresAuth: true
  },
  {
    id: 'file-download',
    name: 'Download',
    icon: <Download className="w-5 h-5" />,
    color: 'text-green-400',
    description: 'Download to your device',
    requiresAuth: false
  }
]

const STATUS_CONFIG: Record<PublishStatus, {
  icon: React.ReactNode
  label: string
  color: string
}> = {
  'draft': { icon: <Settings className="w-4 h-4" />, label: 'Draft', color: 'text-gray-400' },
  'scheduled': { icon: <Calendar className="w-4 h-4" />, label: 'Scheduled', color: 'text-blue-400' },
  'uploading': { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'Uploading', color: 'text-amber-400' },
  'processing': { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'Processing', color: 'text-amber-400' },
  'published': { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Published', color: 'text-green-400' },
  'failed': { icon: <AlertCircle className="w-4 h-4" />, label: 'Failed', color: 'text-red-400' },
  'cancelled': { icon: <AlertCircle className="w-4 h-4" />, label: 'Cancelled', color: 'text-gray-400' }
}

// ============================================================================
// PublishingHub Component
// ============================================================================

export function PublishingHub({
  projectId,
  streams,
  publishJobs,
  onPublish,
  onCancelPublish,
  connectedPlatforms,
  onConnectPlatform
}: PublishingHubProps) {
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  
  // Publish form state
  const [publishForm, setPublishForm] = useState({
    streamId: streams[0]?.id || '',
    title: '',
    description: '',
    tags: '',
    thumbnail: '',
    // YouTube specific
    youtubePrivacy: 'unlisted' as 'public' | 'unlisted' | 'private',
    youtubeCategory: 'Film & Animation'
  })
  
  const handleSelectPlatform = (platform: PlatformConfig) => {
    if (platform.requiresAuth && !connectedPlatforms.includes(platform.id)) {
      // Need to connect first
      onConnectPlatform(platform.id)
      return
    }
    
    setSelectedPlatform(platform)
    setShowPublishDialog(true)
    
    // Pre-fill with stream name
    const stream = streams.find(s => s.id === publishForm.streamId)
    if (stream) {
      setPublishForm(prev => ({
        ...prev,
        title: prev.title || stream.name
      }))
    }
  }
  
  const handlePublish = async () => {
    if (!selectedPlatform) return
    if (!publishForm.streamId) {
      toast.error('Please select a stream')
      return
    }
    if (!publishForm.title.trim()) {
      toast.error('Please enter a title')
      return
    }
    
    setIsPublishing(true)
    try {
      const platformMetadata: PlatformMetadata = {}
      
      if (selectedPlatform.id === 'youtube') {
        platformMetadata.youtubePrivacy = publishForm.youtubePrivacy
        platformMetadata.youtubeCategory = publishForm.youtubeCategory
      }
      
      await onPublish({
        projectId,
        streamId: publishForm.streamId,
        destination: selectedPlatform.id,
        title: publishForm.title,
        description: publishForm.description,
        tags: publishForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        thumbnail: publishForm.thumbnail || undefined,
        platformMetadata
      })
      
      toast.success(`Publishing to ${selectedPlatform.name}...`)
      setShowPublishDialog(false)
      
      // Reset form
      setPublishForm({
        streamId: streams[0]?.id || '',
        title: '',
        description: '',
        tags: '',
        thumbnail: '',
        youtubePrivacy: 'unlisted',
        youtubeCategory: 'Film & Animation'
      })
    } catch (error) {
      console.error('Failed to publish:', error)
      toast.error('Failed to start publishing')
    } finally {
      setIsPublishing(false)
    }
  }
  
  const activeJobs = publishJobs.filter(j => 
    j.status === 'uploading' || j.status === 'processing' || j.status === 'scheduled'
  )
  const completedJobs = publishJobs.filter(j => j.status === 'published')
  const failedJobs = publishJobs.filter(j => j.status === 'failed')
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Publishing</h2>
        <p className="text-sm text-gray-400">
          Publish your project to various platforms
        </p>
      </div>
      
      {/* Platform Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PLATFORMS.map((platform) => {
          const isConnected = connectedPlatforms.includes(platform.id)
          
          return (
            <button
              key={platform.id}
              onClick={() => handleSelectPlatform(platform)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                "bg-gray-800/50 hover:bg-gray-800 border-gray-700/50 hover:border-gray-600"
              )}
            >
              <div className={cn(platform.color)}>{platform.icon}</div>
              <div className="text-sm font-medium text-gray-200">{platform.name}</div>
              {platform.requiresAuth && (
                <div className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  isConnected 
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-700 text-gray-400"
                )}>
                  {isConnected ? 'Connected' : 'Connect'}
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            In Progress
          </h3>
          <div className="space-y-2">
            {activeJobs.map((job) => {
              const platform = PLATFORMS.find(p => p.id === job.destination)
              const status = STATUS_CONFIG[job.status]
              
              return (
                <div 
                  key={job.id}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    <span className={platform?.color}>{platform?.icon}</span>
                    <div>
                      <div className="font-medium text-gray-200">{job.title}</div>
                      <div className="text-xs text-gray-500">
                        {platform?.name} • {streams.find(s => s.id === job.streamId)?.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Progress */}
                    {job.progress > 0 && (
                      <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    )}
                    
                    <span className={cn("flex items-center gap-1 text-sm", status.color)}>
                      {status.icon}
                      {status.label}
                    </span>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancelPublish(job.id)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Published
          </h3>
          <div className="space-y-2">
            {completedJobs.map((job) => {
              const platform = PLATFORMS.find(p => p.id === job.destination)
              
              return (
                <div 
                  key={job.id}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    <span className={platform?.color}>{platform?.icon}</span>
                    <div>
                      <div className="font-medium text-gray-200">{job.title}</div>
                      <div className="text-xs text-gray-500">
                        {platform?.name} • Published {job.publishedAt ? new Date(job.publishedAt).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </div>
                  
                  {job.publishedUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(job.publishedUrl, '_blank')}
                      className="text-gray-400 hover:text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {publishJobs.length === 0 && (
        <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <Upload className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-gray-300 font-medium mb-1">No Publishes Yet</h3>
          <p className="text-sm text-gray-500">
            Select a platform above to publish your project
          </p>
        </div>
      )}
      
      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPlatform && (
                <span className={selectedPlatform.color}>{selectedPlatform.icon}</span>
              )}
              Publish to {selectedPlatform?.name}
            </DialogTitle>
            <DialogDescription>
              Configure your publish settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Stream Selection */}
            <div className="space-y-2">
              <Label>Stream</Label>
              <select
                value={publishForm.streamId}
                onChange={(e) => setPublishForm(prev => ({
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
            
            {/* Title */}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={publishForm.title}
                onChange={(e) => setPublishForm(prev => ({
                  ...prev,
                  title: e.target.value
                }))}
                placeholder="Video title"
                className="bg-gray-800 border-gray-700"
              />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={publishForm.description}
                onChange={(e) => setPublishForm(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                placeholder="Video description"
                className="bg-gray-800 border-gray-700"
                rows={3}
              />
            </div>
            
            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={publishForm.tags}
                onChange={(e) => setPublishForm(prev => ({
                  ...prev,
                  tags: e.target.value
                }))}
                placeholder="film, short, drama"
                className="bg-gray-800 border-gray-700"
              />
            </div>
            
            {/* YouTube-specific options */}
            {selectedPlatform?.id === 'youtube' && (
              <>
                <div className="space-y-2">
                  <Label>Privacy</Label>
                  <select
                    value={publishForm.youtubePrivacy}
                    onChange={(e) => setPublishForm(prev => ({
                      ...prev,
                      youtubePrivacy: e.target.value as any
                    }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowPublishDialog(false)}
              disabled={isPublishing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Publish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
