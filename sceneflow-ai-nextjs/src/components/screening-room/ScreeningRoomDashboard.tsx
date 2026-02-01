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
}: ScreeningRoomDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>('storyboard')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
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
      <div className="relative aspect-video bg-gray-900">
        {screening.thumbnail ? (
          <img
            src={screening.thumbnail}
            alt={screening.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
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
          <button className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <Play className="w-7 h-7 text-white ml-0.5" fill="white" />
          </button>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white truncate mb-2">
          {screening.title}
        </h3>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{screening.viewerCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            <span>{Math.round(screening.averageCompletion)}%</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewAnalytics?.(screening.id)}
            className="flex-1"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Analytics
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onConfigureABTest?.(screening.id)}
          >
            <FlaskConical className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
  
  // ============================================================================
  // Render: Empty State
  // ============================================================================
  
  const renderEmptyState = () => {
    const tabConfig = TABS.find(t => t.id === activeTab)
    if (!tabConfig) return null
    
    const Icon = tabConfig.icon
    
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          No {tabConfig.label} Screenings
        </h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          {tabConfig.description}. Create your first screening to start collecting audience insights.
        </p>
        <Button onClick={() => onCreateScreening?.(activeTab as ScreeningType)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Screening
        </Button>
      </div>
    )
  }
  
  // ============================================================================
  // Render: External Upload Zone
  // ============================================================================
  
  const renderExternalUpload = () => (
    <div className="mb-8">
      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <Upload className="w-4 h-4" />
        External Video Upload
      </h3>
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
          dragOver
            ? "border-blue-500 bg-blue-500/10"
            : "border-gray-700 hover:border-gray-600",
          isUploading && "pointer-events-none opacity-70"
        )}
      >
        {isUploading ? (
          <div className="space-y-4">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
            <div>
              <p className="text-white font-medium mb-2">Uploading video...</p>
              <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">{uploadProgress}%</p>
            </div>
          </div>
        ) : (
          <>
            <FileVideo className="w-10 h-10 text-gray-500 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">
              Drop your video here
            </p>
            <p className="text-sm text-gray-400 mb-4">
              or click to browse (MP4, MOV • Max 2GB)
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
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
            
            {/* Credits Reminder */}
            <p className="text-xs text-gray-500 mt-4 flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Upload will use 1 screening credit ({screeningCredits} remaining)
            </p>
          </>
        )}
      </div>
    </div>
  )
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  const screenings = getScreeningsForTab()
  
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
