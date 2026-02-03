'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  Film,
  Scissors,
  Video,
  Users,
  Eye,
  TrendingUp,
  TrendingDown,
  Clock,
  Play,
  ExternalLink,
  ChevronDown,
  Filter,
  FolderOpen,
  Activity,
  Smile,
  Sparkles,
  ArrowRight,
  Loader2,
  Plus,
  Share2,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { CreateScreeningModal } from '@/components/screening-room'
import { useDashboardData, type DashboardProject } from '@/hooks/useDashboardData'

// ============================================================================
// Types
// ============================================================================

interface Project {
  id: string
  name: string
  thumbnail?: string
}

interface ScreeningItem {
  id: string
  projectId: string
  projectName: string
  title: string
  type: 'storyboard' | 'scenes' | 'premiere'
  status: 'active' | 'draft' | 'completed' | 'expired'
  viewerCount: number
  averageCompletion: number
  avgWatchTime: number
  createdAt: string
  thumbnail?: string
}

interface AggregatedStats {
  totalScreenings: number
  totalViewers: number
  averageCompletion: number
  averageWatchTime: number
  emotionBreakdown: {
    happy: number
    surprised: number
    engaged: number
    neutral: number
    confused: number
    bored: number
  }
  completionTrend: 'up' | 'down' | 'stable'
  viewerTrend: 'up' | 'down' | 'stable'
}

// ============================================================================
// Helper: Convert Dashboard Projects to Screening Items
// ============================================================================

function projectToScreeningItem(project: DashboardProject): ScreeningItem {
  // Determine status based on project progress
  let status: ScreeningItem['status'] = 'draft'
  if (project.progress >= 100) {
    status = 'completed'
  } else if (project.progress > 0) {
    status = 'active'
  }

  // Get thumbnail from metadata if available
  const thumbnail = project.metadata?.thumbnailUrl || project.metadata?.thumbnail || undefined

  return {
    id: project.id,
    projectId: project.id,
    projectName: project.title,
    title: project.title,
    type: 'storyboard', // Projects in Production phase are storyboard screenings
    status,
    viewerCount: 0, // Will be populated when analytics are implemented
    averageCompletion: 0,
    avgWatchTime: 0,
    createdAt: project.createdAt,
    thumbnail,
  }
}

// ============================================================================
// Default Stats (for when no analytics data exists)
// ============================================================================

const DEFAULT_STATS: AggregatedStats = {
  totalScreenings: 0,
  totalViewers: 0,
  averageCompletion: 0,
  averageWatchTime: 0,
  emotionBreakdown: {
    happy: 0,
    surprised: 0,
    engaged: 0,
    neutral: 0,
    confused: 0,
    bored: 0,
  },
  completionTrend: 'stable',
  viewerTrend: 'stable',
}

// ============================================================================
// Tab Configuration
// ============================================================================

const SCREENING_TABS = [
  {
    id: 'all',
    label: 'All Screenings',
    icon: Eye,
    description: 'All screenings across projects',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'storyboard',
    label: 'Storyboard',
    icon: Film,
    description: 'Animatic & storyboard screenings',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'scenes',
    label: 'Scenes',
    icon: Scissors,
    description: 'Pre-cut & rough cut screenings',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'premiere',
    label: 'Premiere',
    icon: Video,
    description: 'Final cut & external uploads',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
] as const

// ============================================================================
// Helper Components
// ============================================================================

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Aggregated Statistics Card
 */
function StatCard({
  icon,
  label,
  value,
  subValue,
  trend,
  color = 'emerald',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'stable'
  color?: 'emerald' | 'blue' | 'purple' | 'amber' | 'gray'
}) {
  const colorClasses = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    gray: 'text-gray-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800 hover:border-gray-700 transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={colorClasses[color]}>{icon}</span>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold text-white">{value}</div>
          {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs flex items-center gap-1 px-2 py-1 rounded-full',
              trend === 'up' ? 'text-green-400 bg-green-500/10' : 
              trend === 'down' ? 'text-red-400 bg-red-500/10' : 
              'text-gray-400 bg-gray-500/10'
            )}
          >
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : 
             trend === 'down' ? <TrendingDown className="w-3 h-3" /> : 
             <Activity className="w-3 h-3" />}
            {trend === 'up' ? '+12%' : trend === 'down' ? '-5%' : '0%'}
          </span>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Emotion Breakdown Mini Chart
 */
function EmotionBreakdown({ data }: { data: AggregatedStats['emotionBreakdown'] }) {
  const emotions = [
    { key: 'engaged', label: 'Engaged', emoji: '🎯', color: 'bg-emerald-500' },
    { key: 'happy', label: 'Happy', emoji: '😊', color: 'bg-yellow-500' },
    { key: 'surprised', label: 'Surprised', emoji: '😲', color: 'bg-blue-500' },
    { key: 'neutral', label: 'Neutral', emoji: '😐', color: 'bg-gray-500' },
    { key: 'confused', label: 'Confused', emoji: '😕', color: 'bg-orange-500' },
    { key: 'bored', label: 'Bored', emoji: '🥱', color: 'bg-red-500' },
  ]
  
  const total = Object.values(data).reduce((sum, val) => sum + val, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800"
    >
      <div className="flex items-center gap-2 mb-4">
        <Smile className="w-5 h-5 text-emerald-400" />
        <span className="text-sm font-medium text-white">Audience Emotions</span>
      </div>
      
      {/* Stacked Bar */}
      <div className="h-4 rounded-full overflow-hidden flex mb-4">
        {emotions.map(({ key, color }) => {
          const percentage = total > 0 ? (data[key as keyof typeof data] / total) * 100 : 0
          return (
            <div
              key={key}
              className={cn(color, 'transition-all duration-300')}
              style={{ width: `${percentage}%` }}
            />
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="grid grid-cols-3 gap-2">
        {emotions.map(({ key, label, emoji }) => {
          const percentage = total > 0 ? Math.round((data[key as keyof typeof data] / total) * 100) : 0
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <span>{emoji}</span>
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-medium ml-auto">{percentage}%</span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/**
 * Project Filter Dropdown
 */
function ProjectFilter({
  projects,
  selectedProjectId,
  onSelect,
}: {
  projects: Project[]
  selectedProjectId: string | null
  onSelect: (projectId: string | null) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
      >
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-white">
          {selectedProject ? selectedProject.name : 'All Projects'}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <button
              onClick={() => {
                onSelect(null)
                setIsOpen(false)
              }}
              className={cn(
                'w-full px-4 py-2.5 text-left text-sm hover:bg-gray-700 transition-colors flex items-center gap-2',
                !selectedProjectId && 'bg-emerald-500/10 text-emerald-400'
              )}
            >
              <FolderOpen className="w-4 h-4" />
              All Projects
            </button>
            <div className="border-t border-gray-700" />
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  onSelect(project.id)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full px-4 py-2.5 text-left text-sm hover:bg-gray-700 transition-colors flex items-center gap-2',
                  selectedProjectId === project.id && 'bg-emerald-500/10 text-emerald-400'
                )}
              >
                <Film className="w-4 h-4" />
                {project.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  )
}

/**
 * Screening Card
 */
function ScreeningCard({ screening }: { screening: ScreeningItem }) {
  const router = useRouter()
  const tabConfig = SCREENING_TABS.find((t) => t.id === screening.type)
  const Icon = tabConfig?.icon || Eye

  // Handle play button click - route to appropriate player
  const handlePlay = () => {
    if (screening.type === 'storyboard') {
      // Route to Vision page with openPlayer query param to auto-open the Screening Room player
      router.push(`/dashboard/workflow/vision/${screening.projectId}?openPlayer=true`)
    } else if (screening.type === 'scenes') {
      // Route to Final Cut editor
      router.push(`/dashboard/workflow/final-cut?projectId=${screening.projectId}`)
    } else {
      // Route to Premiere
      router.push(`/dashboard/workflow/premiere?projectId=${screening.projectId}`)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors group"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-800">
        {screening.thumbnail ? (
          <img src={screening.thumbnail} alt={screening.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className={cn('w-12 h-12', tabConfig?.color || 'text-gray-600')} />
          </div>
        )}

        {/* Status Badge */}
        <div
          className={cn(
            'absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium',
            screening.status === 'active' && 'bg-green-500/20 text-green-400',
            screening.status === 'draft' && 'bg-gray-500/20 text-gray-400',
            screening.status === 'completed' && 'bg-blue-500/20 text-blue-400',
            screening.status === 'expired' && 'bg-red-500/20 text-red-400'
          )}
        >
          {screening.status}
        </div>

        {/* Type Badge */}
        <div className={cn('absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium', tabConfig?.bgColor, tabConfig?.color)}>
          {screening.type}
        </div>

        {/* Play Overlay */}
        <div 
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 cursor-pointer"
          onClick={handlePlay}
        >
          <button className="w-14 h-14 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center transition-colors">
            <Play className="w-7 h-7 text-emerald-400 ml-0.5" fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white truncate mb-1">{screening.title}</h3>
        <p className="text-sm text-gray-500 truncate mb-3">{screening.projectName}</p>

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
          <div className="flex items-center gap-1 ml-auto text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{formatDate(screening.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={handlePlay}>
            <Play className="w-4 h-4 mr-1" />
            Play
          </Button>
          <Link href={`/dashboard/workflow/vision/${screening.projectId}`}>
            <Button size="sm" variant="outline">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Analytics Data Type
// ============================================================================

interface ScreeningAnalyticsData {
  screeningId: string
  projectId: string
  title: string
  screeningType: string
  viewerCount: number
  avgCompletion: number
  avgWatchTime: number
  emotionBreakdown: {
    happy: number
    surprised: number
    engaged: number
    neutral: number
    confused: number
    bored: number
  }
}

interface DashboardAnalyticsResponse {
  totalScreenings: number
  totalViewers: number
  averageCompletion: number
  averageWatchTime: number
  emotionBreakdown: {
    happy: number
    surprised: number
    engaged: number
    neutral: number
    confused: number
    bored: number
  }
  screeningStats: Record<string, ScreeningAnalyticsData>
}

// ============================================================================
// Main Component
// ============================================================================

export default function ScreeningRoomDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<DashboardAnalyticsResponse | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  
  // Fetch real projects from the API
  const { projects: dashboardProjects, isLoading, refresh } = useDashboardData()

  // Fetch analytics data when projects load
  useEffect(() => {
    async function fetchAnalytics() {
      if (dashboardProjects.length === 0) return
      
      setIsLoadingAnalytics(true)
      try {
        const url = selectedProjectId 
          ? `/api/analytics/dashboard?projectId=${selectedProjectId}`
          : '/api/analytics/dashboard'
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setAnalyticsData(data)
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
      } finally {
        setIsLoadingAnalytics(false)
      }
    }
    
    fetchAnalytics()
  }, [dashboardProjects, selectedProjectId])

  // Convert dashboard projects to Project format for filter
  const projects: Project[] = useMemo(() => {
    return dashboardProjects.map(p => ({
      id: p.id,
      name: p.title,
      thumbnail: p.metadata?.thumbnailUrl || p.metadata?.thumbnail,
    }))
  }, [dashboardProjects])

  // Convert projects to screening items and merge with analytics
  const screenings: ScreeningItem[] = useMemo(() => {
    return dashboardProjects.map(project => {
      const baseItem = projectToScreeningItem(project)
      
      // Try to find analytics for this project's screenings
      if (analyticsData?.screeningStats) {
        // Look for any screening matching this project
        const projectStats = Object.values(analyticsData.screeningStats).find(
          s => s.projectId === project.id
        )
        if (projectStats) {
          return {
            ...baseItem,
            viewerCount: projectStats.viewerCount,
            averageCompletion: projectStats.avgCompletion,
            avgWatchTime: projectStats.avgWatchTime,
            type: (projectStats.screeningType || 'storyboard') as ScreeningItem['type'],
          }
        }
      }
      
      return baseItem
    })
  }, [dashboardProjects, analyticsData])

  // Filter screenings based on tab and project selection
  const filteredScreenings = useMemo(() => {
    return screenings.filter((screening) => {
      const matchesTab = activeTab === 'all' || screening.type === activeTab
      const matchesProject = !selectedProjectId || screening.projectId === selectedProjectId
      return matchesTab && matchesProject
    })
  }, [screenings, activeTab, selectedProjectId])

  // Calculate filtered stats - use analytics data when available
  const filteredStats = useMemo((): AggregatedStats => {
    // If we have analytics data from the API, use it
    if (analyticsData) {
      return {
        totalScreenings: analyticsData.totalScreenings || filteredScreenings.length,
        totalViewers: analyticsData.totalViewers,
        averageCompletion: Math.round(analyticsData.averageCompletion * 100) / 100,
        averageWatchTime: Math.round(analyticsData.averageWatchTime),
        emotionBreakdown: analyticsData.emotionBreakdown || DEFAULT_STATS.emotionBreakdown,
        completionTrend: analyticsData.averageCompletion > 50 ? 'up' : analyticsData.averageCompletion > 0 ? 'stable' : 'stable',
        viewerTrend: analyticsData.totalViewers > 0 ? 'up' : 'stable',
      }
    }
    
    // Fallback to calculating from screenings
    if (filteredScreenings.length === 0) {
      return DEFAULT_STATS
    }

    const totalViewers = filteredScreenings.reduce((sum, s) => sum + s.viewerCount, 0)
    const avgCompletion = filteredScreenings.length > 0
      ? filteredScreenings.reduce((sum, s) => sum + s.averageCompletion, 0) / filteredScreenings.length
      : 0
    const avgWatchTime = filteredScreenings.length > 0
      ? filteredScreenings.reduce((sum, s) => sum + s.avgWatchTime, 0) / filteredScreenings.length
      : 0

    return {
      ...DEFAULT_STATS,
      totalScreenings: filteredScreenings.length,
      totalViewers,
      averageCompletion: Math.round(avgCompletion * 10) / 10,
      averageWatchTime: Math.round(avgWatchTime),
    }
  }, [filteredScreenings, analyticsData])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
              </div>
              Screening Room
            </h1>
            
            <div className="flex items-center gap-3">
              <ProjectFilter
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelect={setSelectedProjectId}
              />
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Screening
              </Button>
            </div>
          </div>
          <p className="text-gray-400">
            Test your content with audiences and gather valuable feedback across all your projects.
          </p>
        </motion.div>

        {/* Aggregated Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Eye className="w-5 h-5" />}
            label="Total Screenings"
            value={filteredStats.totalScreenings}
            subValue="Active & completed"
            color="emerald"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total Viewers"
            value={filteredStats.totalViewers}
            subValue="Unique test audience"
            trend={filteredStats.viewerTrend}
            color="blue"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Avg. Completion"
            value={`${filteredStats.averageCompletion}%`}
            subValue="Watch-through rate"
            trend={filteredStats.completionTrend}
            color="purple"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Avg. Watch Time"
            value={formatDuration(filteredStats.averageWatchTime)}
            subValue="Per screening session"
            color="amber"
          />
        </div>

        {/* Emotion Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2">
            <EmotionBreakdown data={filteredStats.emotionBreakdown} />
          </div>
          
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-white">Quick Actions</span>
            </div>
            <div className="space-y-2">
              <Link href="/dashboard/studio/new-project" className="block">
                <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors text-left">
                  <Film className="w-5 h-5 text-amber-400" />
                  <span className="text-sm text-white flex-1">Create Storyboard Project</span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                </button>
              </Link>
              <Link href="/dashboard/workflow/final-cut" className="block">
                <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors text-left">
                  <Scissors className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-white flex-1">Open Final Cut Editor</span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                </button>
              </Link>
              <Link href="/dashboard/workflow/premiere" className="block">
                <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors text-left">
                  <Video className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-white flex-1">Create Premiere Screening</span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                </button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Screenings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-gray-900/60 border border-gray-800">
            {SCREENING_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400"
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content */}
          {SCREENING_TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              {filteredScreenings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredScreenings.map((screening) => (
                    <ScreeningCard key={screening.id} screening={screening} />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <tab.icon className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No {tab.label}
                  </h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    {tab.description}. Create your first project to start collecting audience insights.
                  </p>
                  <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Screening
                  </Button>
                </motion.div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Create Screening Modal */}
      <CreateScreeningModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projects={projects.map(p => ({ id: p.id, title: p.name }))}
        onSuccess={() => {
          // Refetch to show new screening
          refresh?.()
        }}
      />
    </div>
  )
}
