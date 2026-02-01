'use client'

import { useMemo } from 'react'
import { useDashboardData } from './useDashboardData'

/**
 * useBudget - Extracted budget calculation logic
 * 
 * Separates data fetching from presentation by computing:
 * - Available/used credits with percentages
 * - Budget status (healthy/warning/critical)
 * - Trend data for sparklines
 * - Projected requirements
 */

export type BudgetStatus = 'healthy' | 'warning' | 'critical'

export interface BudgetData {
  /** Total available credits */
  availableCredits: number
  /** Credits used this period */
  usedCredits: number
  /** Monthly credit allocation */
  monthlyCredits: number
  /** Percentage of budget used */
  percentageUsed: number
  /** Projected credits needed to complete projects */
  projectedRequired: number
  /** Estimated cost in USD */
  estimatedCostUSD: number
  /** Addon credits purchased */
  addonCredits: number
  /** Subscription tier name */
  subscriptionTier?: string
  /** Budget health status */
  status: BudgetStatus
  /** Projects nearing their budget limit */
  projectsNearLimit: number
  /** Trend data for sparkline (last 7 days simulated) */
  usageTrend: number[]
  /** Whether data is still loading */
  isLoading: boolean
  /** Refresh function */
  refresh: () => Promise<void>
}

/**
 * Calculate budget status based on usage projections
 */
function calculateBudgetStatus(
  usedCredits: number,
  projectedRequired: number,
  monthlyCredits: number
): BudgetStatus {
  const totalRequired = usedCredits + projectedRequired
  if (totalRequired <= monthlyCredits * 0.75) return 'healthy'
  if (totalRequired <= monthlyCredits) return 'warning'
  return 'critical'
}

/**
 * Generate simulated usage trend (7 days)
 * In production, this would come from actual historical data
 */
function generateUsageTrend(currentUsed: number): number[] {
  // Simulate a gradual increase over 7 days
  const trend: number[] = []
  const dailyAverage = currentUsed / 7
  
  for (let i = 0; i < 7; i++) {
    // Add some variance to make it look realistic
    const variance = 0.8 + Math.random() * 0.4 // 0.8 to 1.2
    const dayValue = Math.round(dailyAverage * (i + 1) * variance)
    trend.push(Math.min(dayValue, currentUsed))
  }
  
  // Ensure last value matches current
  trend[6] = currentUsed
  
  return trend
}

export function useBudget(): BudgetData {
  const { credits, subscription, projects, isLoading, refresh } = useDashboardData()

  return useMemo(() => {
    // Calculate base metrics
    const monthlyCredits = subscription?.monthlyCredits || 
                           subscription?.tier?.included_credits_monthly || 0
    const subscriptionCreditsRemaining = credits?.subscription_credits || 0
    const usedCredits = Math.max(0, monthlyCredits - subscriptionCreditsRemaining)
    const availableCredits = credits?.total_credits || 0
    const addonCredits = credits?.addon_credits || 0
    const subscriptionTier = subscription?.tier?.display_name

    // Calculate percentage used
    const percentageUsed = monthlyCredits > 0 
      ? Math.round((usedCredits / monthlyCredits) * 100) 
      : 0

    // Estimate projected required based on active projects
    const projectedRequired = projects.reduce((sum, p) => {
      const sceneCount = p.metadata?.visionPhase?.script?.script?.scenes?.length || 
                         p.metadata?.visionPhase?.scenes?.length || 0
      // Estimate ~50 credits per remaining scene
      const completionPct = p.progress / 100
      const remainingScenes = Math.ceil(sceneCount * (1 - completionPct))
      return sum + (remainingScenes * 50)
    }, 0)

    // Calculate estimated cost
    const estimatedCostUSD = Math.round(projectedRequired * 0.01)

    // Calculate projects near budget limit
    const projectsNearLimit = projects.filter(p => {
      const creditsUsed = p.metadata?.creditsUsed || 0
      const estimated = (p.metadata?.visionPhase?.script?.script?.scenes?.length || 5) * 100
      return creditsUsed > estimated * 0.75
    }).length

    // Calculate status
    const status = calculateBudgetStatus(usedCredits, projectedRequired, monthlyCredits || availableCredits || 1000)

    // Generate usage trend
    const usageTrend = generateUsageTrend(usedCredits)

    return {
      availableCredits,
      usedCredits,
      monthlyCredits: monthlyCredits || availableCredits || 1000,
      percentageUsed,
      projectedRequired,
      estimatedCostUSD,
      addonCredits,
      subscriptionTier,
      status,
      projectsNearLimit,
      usageTrend,
      isLoading,
      refresh,
    }
  }, [credits, subscription, projects, isLoading, refresh])
}

export default useBudget
