'use client'

import { CueCommandBar } from './components/CueCommandBar'
import { BudgetHealthWidget } from './components/BudgetHealthWidget'
import { ActiveProjectsContainer } from './components/ActiveProjectsContainer'
import { SpendingAnalyticsWidget } from './components/SpendingAnalyticsWidget'
import { QuickActionsGrid } from './components/QuickActionsGrid'
import { BYOKIntegrationStatus } from './components/BYOKIntegrationStatus'
import { useDashboardData } from '@/hooks/useDashboardData'
import { Loader2 } from 'lucide-react'

export default function ClientDashboard() {
  const { credits, subscription, projects, isLoading } = useDashboardData()

  // Calculate budget metrics from live data
  const monthlyCredits = subscription?.monthlyCredits || 
                         subscription?.tier?.included_credits_monthly || 0
  const subscriptionCreditsRemaining = credits?.subscription_credits || 0
  const usedCredits = Math.max(0, monthlyCredits - subscriptionCreditsRemaining)
  const availableCredits = credits?.total_credits || 0
  const addonCredits = credits?.addon_credits || 0
  
  // Estimate projected required based on active projects
  const projectedRequired = projects.reduce((sum, p) => {
    const sceneCount = p.metadata?.visionPhase?.script?.script?.scenes?.length || 
                       p.metadata?.visionPhase?.scenes?.length || 0
    // Estimate ~50 credits per remaining scene
    const completionPct = p.progress / 100
    const remainingScenes = Math.ceil(sceneCount * (1 - completionPct))
    return sum + (remainingScenes * 50)
  }, 0)

  // Calculate projects near budget limit
  const projectsNearLimit = projects.filter(p => {
    const creditsUsed = p.metadata?.creditsUsed || 0
    const estimated = (p.metadata?.visionPhase?.script?.script?.scenes?.length || 5) * 100
    return creditsUsed > estimated * 0.75
  }).length

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Row 1: Cue Command Bar */}
        <CueCommandBar />
        
        {/* Row 2: Budget Health Widget - Live Data */}
        <BudgetHealthWidget 
          availableCredits={availableCredits}
          usedCredits={usedCredits}
          monthlyCredits={monthlyCredits || availableCredits || 1000}
          projectedRequired={projectedRequired}
          estimatedCostUSD={Math.round(projectedRequired * 0.01)}
          projectsNearLimit={projectsNearLimit}
          subscriptionTier={subscription?.tier?.display_name}
          addonCredits={addonCredits}
        />
        
        {/* Row 3: Active Projects - Live Data */}
        <ActiveProjectsContainer projects={projects} />
        
        {/* Row 4: Analytics + Quick Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendingAnalyticsWidget usedCredits={usedCredits} />
          <QuickActionsGrid />
        </div>
        
        {/* Row 5: BYOK Status */}
        <BYOKIntegrationStatus />
      </div>
    </div>
  )
}
