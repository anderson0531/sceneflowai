'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Save,
  Film,
  Eye,
  BarChart3,
  Upload,
  MessageSquare,
  Loader2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ScreeningManager } from '@/components/premiere/ScreeningManager'
import { AnalyticsDashboard } from '@/components/premiere/AnalyticsDashboard'
import { PublishingHub } from '@/components/premiere/PublishingHub'
import { FeedbackPanel } from '@/components/premiere/FeedbackPanel'
import type {
  FinalCutStream,
  ScreeningSession,
  ScreeningAnalytics,
  PublishJob,
  PublishDestination,
  TimestampedComment,
  ScreeningReaction
} from '@/lib/types/finalCut'

// ============================================================================
// Mock Data (for development)
// ============================================================================

function createMockAnalytics(screeningId: string): ScreeningAnalytics {
  return {
    screeningId,
    totalViews: 47,
    uniqueViewers: 32,
    averageWatchTime: 245,
    completionRate: 68,
    totalComments: 12,
    totalReactions: 89,
    engagementRate: 35,
    retentionCurve: Array.from({ length: 20 }, (_, i) => ({
      timestamp: i * 15,
      percentage: 100 - (i * 3) - Math.random() * 10
    })),
    dropOffPoints: [
      { timestamp: 45, dropOffCount: 5, sceneNumber: 2 },
      { timestamp: 120, dropOffCount: 8, sceneNumber: 4 },
      { timestamp: 210, dropOffCount: 3, sceneNumber: 7 }
    ],
    commentDensity: [],
    deviceBreakdown: {
      desktop: 18,
      mobile: 12,
      tablet: 2,
      tv: 0,
      unknown: 0
    },
    geoBreakdown: []
  }
}

// ============================================================================
// PremierePage Component
// ============================================================================

export default function PremierePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentProject, updateProject } = useStore()
  
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('screenings')
  
  // Data state
  const [streams, setStreams] = useState<FinalCutStream[]>([])
  const [screenings, setScreenings] = useState<ScreeningSession[]>([])
  const [publishJobs, setPublishJobs] = useState<PublishJob[]>([])
  const [connectedPlatforms, setConnectedPlatforms] = useState<PublishDestination[]>(['file-download'])
  const [selectedScreeningId, setSelectedScreeningId] = useState<string | null>(null)
  
  // Get project ID from URL or current project
  const projectId = searchParams.get('projectId') || currentProject?.id
  
  // ============================================================================
  // Initialize from project data
  // ============================================================================
  
  useEffect(() => {
    if (!currentProject) {
      router.push('/dashboard')
      return
    }
    
    const initialize = async () => {
      setIsLoading(true)
      
      try {
        // Load Final Cut streams
        const existingStreams = currentProject.metadata?.finalCutStreams as FinalCutStream[] | undefined
        setStreams(existingStreams || [])
        
        // Load screenings
        const existingScreenings = currentProject.metadata?.screenings as ScreeningSession[] | undefined
        setScreenings(existingScreenings || [])
        
        // Load publish jobs
        const existingJobs = currentProject.metadata?.publishJobs as PublishJob[] | undefined
        setPublishJobs(existingJobs || [])
        
        // Load connected platforms
        const platforms = currentProject.metadata?.connectedPlatforms as PublishDestination[] | undefined
        setConnectedPlatforms(platforms || ['file-download'])
      } catch (error) {
        console.error('Failed to initialize Premiere:', error)
        toast.error('Failed to load project data')
      } finally {
        setIsLoading(false)
      }
    }
    
    initialize()
  }, [currentProject, router])
  
  // ============================================================================
  // Screening Management
  // ============================================================================
  
  const handleCreateScreening = useCallback(async (
    screeningData: Partial<ScreeningSession>
  ): Promise<ScreeningSession> => {
    const newScreening: ScreeningSession = {
      id: `screening-${Date.now()}`,
      projectId: projectId || '',
      streamId: screeningData.streamId || streams[0]?.id || '',
      title: screeningData.title || 'New Screening',
      description: screeningData.description,
      createdAt: new Date().toISOString(),
      expiresAt: screeningData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accessType: screeningData.accessType || 'public',
      password: screeningData.password,
      maxViewers: screeningData.maxViewers,
      shareUrl: `${window.location.origin}/s/${Date.now().toString(36)}`,
      viewerCount: 0,
      viewers: [],
      feedbackEnabled: screeningData.feedbackEnabled ?? true,
      comments: [],
      reactions: [],
      status: 'active'
    }
    
    setScreenings(prev => [...prev, newScreening])
    return newScreening
  }, [projectId, streams])
  
  const handleDeleteScreening = useCallback(async (screeningId: string) => {
    setScreenings(prev => prev.filter(s => s.id !== screeningId))
    if (selectedScreeningId === screeningId) {
      setSelectedScreeningId(null)
    }
    toast.success('Screening deleted')
  }, [selectedScreeningId])
  
  const handleUpdateScreening = useCallback(async (
    screeningId: string, 
    updates: Partial<ScreeningSession>
  ) => {
    setScreenings(prev => prev.map(s => 
      s.id === screeningId ? { ...s, ...updates } : s
    ))
  }, [])
  
  const handleViewScreening = useCallback((screeningId: string) => {
    setSelectedScreeningId(screeningId)
    setActiveTab('analytics')
  }, [])
  
  // ============================================================================
  // Publishing
  // ============================================================================
  
  const handlePublish = useCallback(async (
    jobData: Partial<PublishJob>
  ): Promise<PublishJob> => {
    const newJob: PublishJob = {
      id: `publish-${Date.now()}`,
      projectId: projectId || '',
      streamId: jobData.streamId || streams[0]?.id || '',
      createdAt: new Date().toISOString(),
      destination: jobData.destination || 'file-download',
      title: jobData.title || 'Untitled',
      description: jobData.description || '',
      tags: jobData.tags || [],
      thumbnail: jobData.thumbnail,
      platformMetadata: jobData.platformMetadata || {},
      status: 'uploading',
      progress: 0
    }
    
    setPublishJobs(prev => [...prev, newJob])
    
    // Simulate upload progress
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 20
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setPublishJobs(prev => prev.map(j => 
          j.id === newJob.id 
            ? { ...j, status: 'published', progress: 100, publishedAt: new Date().toISOString(), publishedUrl: '#' }
            : j
        ))
        toast.success('Published successfully!')
      } else {
        setPublishJobs(prev => prev.map(j => 
          j.id === newJob.id ? { ...j, progress: Math.min(progress, 99) } : j
        ))
      }
    }, 500)
    
    return newJob
  }, [projectId, streams])
  
  const handleCancelPublish = useCallback(async (jobId: string) => {
    setPublishJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'cancelled' } : j
    ))
    toast.info('Publishing cancelled')
  }, [])
  
  const handleConnectPlatform = useCallback(async (platform: PublishDestination) => {
    toast.info(`Connect ${platform} - Coming soon!`)
  }, [])
  
  // ============================================================================
  // Save
  // ============================================================================
  
  const handleSave = useCallback(async () => {
    if (!currentProject) return
    
    setIsSaving(true)
    try {
      await updateProject({
        ...currentProject,
        metadata: {
          ...currentProject.metadata,
          screenings,
          publishJobs,
          connectedPlatforms
        }
      })
      
      toast.success('Premiere saved')
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [currentProject, screenings, publishJobs, connectedPlatforms, updateProject])
  
  // ============================================================================
  // Selected screening data
  // ============================================================================
  
  const selectedScreening = useMemo(() => 
    screenings.find(s => s.id === selectedScreeningId),
    [screenings, selectedScreeningId]
  )
  
  const selectedAnalytics = useMemo(() => 
    selectedScreeningId ? createMockAnalytics(selectedScreeningId) : null,
    [selectedScreeningId]
  )
  
  // ============================================================================
  // Render
  // ============================================================================
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-sf-primary mx-auto mb-4" />
          <p className="text-gray-400">Loading Premiere...</p>
        </div>
      </div>
    )
  }
  
  if (!currentProject) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
          <p className="text-gray-400 mb-4">Please select a project from the dashboard.</p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }
  
  if (streams.length === 0) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center text-white max-w-md">
          <Film className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Streams Available</h2>
          <p className="text-gray-400 mb-4">
            Create a Final Cut stream first before setting up screenings and publishing.
          </p>
          <Link href={`/dashboard/workflow/final-cut?projectId=${projectId}`}>
            <Button className="bg-purple-600 hover:bg-purple-700">
              Go to Final Cut
            </Button>
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/workflow/final-cut?projectId=${projectId}`}>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Final Cut
            </Button>
          </Link>
          
          <div className="h-6 w-px bg-gray-700" />
          
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Premiere</h1>
              <p className="text-xs text-gray-500">{currentProject.title}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-gray-400 hover:text-white"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab Navigation */}
          <div className="border-b border-gray-800 px-4">
            <TabsList className="bg-transparent border-0 h-12">
              <TabsTrigger 
                value="screenings" 
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
              >
                <Eye className="w-4 h-4 mr-2" />
                Test Screenings
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="feedback" 
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Feedback
              </TabsTrigger>
              <TabsTrigger 
                value="publish" 
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Publish
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-6">
            <TabsContent value="screenings" className="mt-0 h-full">
              <ScreeningManager
                projectId={projectId || ''}
                streams={streams}
                screenings={screenings}
                onCreateScreening={handleCreateScreening}
                onDeleteScreening={handleDeleteScreening}
                onUpdateScreening={handleUpdateScreening}
                onViewScreening={handleViewScreening}
              />
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-0 h-full">
              {selectedAnalytics ? (
                <AnalyticsDashboard
                  analytics={selectedAnalytics}
                  screeningTitle={selectedScreening?.title}
                />
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <h3 className="text-gray-300 font-medium mb-1">Select a Screening</h3>
                  <p className="text-sm text-gray-500">
                    Choose a screening from the Test Screenings tab to view analytics
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="feedback" className="mt-0 h-full">
              {selectedScreening ? (
                <div className="max-w-2xl mx-auto bg-gray-900/50 rounded-lg border border-gray-800 h-[600px]">
                  <FeedbackPanel
                    comments={selectedScreening.comments}
                    reactions={selectedScreening.reactions}
                    onSeekToTimestamp={(ts) => console.log('Seek to', ts)}
                    onResolveComment={(id) => {
                      handleUpdateScreening(selectedScreening.id, {
                        comments: selectedScreening.comments.map(c => 
                          c.id === id ? { ...c, isResolved: true } : c
                        )
                      })
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <h3 className="text-gray-300 font-medium mb-1">Select a Screening</h3>
                  <p className="text-sm text-gray-500">
                    Choose a screening from the Test Screenings tab to view feedback
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="publish" className="mt-0 h-full">
              <PublishingHub
                projectId={projectId || ''}
                streams={streams}
                publishJobs={publishJobs}
                onPublish={handlePublish}
                onCancelPublish={handleCancelPublish}
                connectedPlatforms={connectedPlatforms}
                onConnectPlatform={handleConnectPlatform}
              />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  )
}
