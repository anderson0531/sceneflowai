'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { computeDashboardProjectStats } from '@/lib/dashboardStats'
import { normalizeWorkflowStep, WORKFLOW_STEP_LABELS } from '@/constants/workflowSteps'

// Types for dashboard data
export interface DashboardCredits {
  total_credits: number
  addon_credits: number
  subscription_credits: number
  subscription_expires_at: string | null
}

export interface DashboardSubscription {
  tier: {
    id: string
    name: string
    display_name: string
    included_credits_monthly: number
  } | null
  status: string | null
  monthlyCredits: number
}

export interface DashboardProject {
  id: string
  title: string
  description: string
  currentStep: string
  progress: number
  status: string
  createdAt: string
  updatedAt: string
  completedSteps: string[]
  metadata: Record<string, any>
}

export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  archivedProjects: number
  completedProjects: number
  inProduction: number
  totalSeries: number
  byPhase: Record<string, number>
}

export interface DashboardData {
  credits: DashboardCredits | null
  subscription: DashboardSubscription | null
  projects: DashboardProject[]
  recentProjects: DashboardProject[]
  stats: DashboardStats | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useDashboardData(): DashboardData {
  const { data: session, status: authStatus } = useSession()
  const [credits, setCredits] = useState<DashboardCredits | null>(null)
  const [subscription, setSubscription] = useState<DashboardSubscription | null>(null)
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [recentProjects, setRecentProjects] = useState<DashboardProject[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    if (authStatus !== 'authenticated' || !session?.user?.id) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      
      // Fetch all data in parallel
      const userId = session.user.id
      const [creditsRes, subscriptionRes, projectsRes, seriesRes] = await Promise.all([
        fetch('/api/user/credits'),
        fetch('/api/subscription/status'),
        fetch(`/api/projects?userId=${userId}&pageSize=50`),
        fetch(`/api/series?userId=${userId}&pageSize=1`),
      ])

      // Parse credits
      if (creditsRes.ok) {
        const data = await creditsRes.json()
        setCredits({
          total_credits: data.total_credits || 0,
          addon_credits: data.addon_credits || 0,
          subscription_credits: data.subscription_credits || data.subscription_credits_monthly || 0,
          subscription_expires_at: data.subscription_expires_at || null
        })
      }

      // Parse subscription
      if (subscriptionRes.ok) {
        const data = await subscriptionRes.json()
        if (data.success) {
          setSubscription({
            tier: data.subscription?.tier || null,
            status: data.subscription?.status || null,
            monthlyCredits: data.subscription?.monthlyCredits || 
                           data.subscription?.tier?.included_credits_monthly || 0
          })
        }
      }

      let totalSeries = 0
      if (seriesRes.ok) {
        const seriesData = await seriesRes.json()
        if (seriesData.success && typeof seriesData.total === 'number') {
          totalSeries = seriesData.total
        }
      }

      // Parse projects
      if (projectsRes.ok) {
        const data = await projectsRes.json()
        if (data.success && Array.isArray(data.projects)) {
          const allProjects = data.projects as DashboardProject[]
          const sorted = [...allProjects].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          const activeSorted = sorted.filter((p) => p.status !== 'archived')
          const projectStats = computeDashboardProjectStats(allProjects, data.total)

          setProjects(activeSorted)
          setRecentProjects(activeSorted.slice(0, 6))
          setStats({
            totalProjects: projectStats.total,
            activeProjects: projectStats.active,
            archivedProjects: projectStats.archived,
            completedProjects: projectStats.completed,
            inProduction: projectStats.inProduction,
            totalSeries,
            byPhase: projectStats.byPhase,
          })
        }
      } else {
        setStats((prev) =>
          prev
            ? { ...prev, totalSeries }
            : {
                totalProjects: 0,
                activeProjects: 0,
                archivedProjects: 0,
                completedProjects: 0,
                inProduction: 0,
                totalSeries,
                byPhase: {},
              }
        )
      }
    } catch (err: any) {
      console.error('[useDashboardData] Error:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.id, authStatus])

  // Initial fetch
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchDashboardData()
    } else if (authStatus === 'unauthenticated') {
      setIsLoading(false)
    }
  }, [authStatus, fetchDashboardData])

  // Poll every 60 seconds
  useEffect(() => {
    if (authStatus !== 'authenticated') return
    const interval = setInterval(fetchDashboardData, 60000)
    return () => clearInterval(interval)
  }, [authStatus, fetchDashboardData])

  return {
    credits,
    subscription,
    projects,
    recentProjects,
    stats,
    isLoading,
    error,
    refresh: fetchDashboardData,
  }
}

// Helper to format relative time
export function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Helper to map project step to phase name (canonical workflow labels)
export function getPhaseDisplayName(currentStep: string): string {
  const step = normalizeWorkflowStep(currentStep)
  return WORKFLOW_STEP_LABELS[step] || currentStep
}

export function getStepNumber(currentStep: string): number {
  const normalized = currentStep === 'blueprint' || currentStep === 'ideation' ? 'blueprint' : 'production'
  return normalized === 'blueprint' ? 1 : 2
}

export function getTotalSteps(): number {
  return 2
}
