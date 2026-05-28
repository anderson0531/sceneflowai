'use client'

import { useEffect } from 'react'
import { CueCommandBar } from './components/CueCommandBar'
import { BudgetHealthWidget } from './components/BudgetHealthWidget'
import { ActiveProjectsContainer } from './components/ActiveProjectsContainer'
import { DashboardOverviewStats } from './components/DashboardOverviewStats'
import { RecentProjectsPanel } from './components/RecentProjectsPanel'
import { DashboardQuickStart } from './components/DashboardQuickStart'
import { useDashboardData } from '@/hooks/useDashboardData'
import { DashboardRedirectGuard } from '@/components/auth/DashboardRedirectGuard'
import { getProjectCreditsUsed } from '@/lib/credits/projectBudgetShared'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle } from 'lucide-react'

export default function ClientDashboard() {
  const { credits, subscription, projects, recentProjects, stats, isLoading, error, refresh } =
    useDashboardData()

  const featuredProject = recentProjects[0] ?? null

  const monthlyCredits =
    subscription?.monthlyCredits || subscription?.tier?.included_credits_monthly || 0
  const subscriptionCreditsRemaining = credits?.subscription_credits || 0
  const usedCredits = Math.max(0, monthlyCredits - subscriptionCreditsRemaining)
  const availableCredits = credits?.total_credits || 0
  const addonCredits = credits?.addon_credits || 0

  useEffect(() => {
    const handleProjectUpdated = () => {
      void refresh()
    }
    window.addEventListener('project-updated', handleProjectUpdated)
    return () => window.removeEventListener('project-updated', handleProjectUpdated)
  }, [refresh])

  const projectedRequired = projects.reduce((sum, p) => {
    const sceneCount =
      p.metadata?.visionPhase?.script?.script?.scenes?.length ||
      p.metadata?.visionPhase?.scenes?.length ||
      0
    const completionPct = p.progress / 100
    const remainingScenes = Math.ceil(sceneCount * (1 - completionPct))
    return sum + remainingScenes * 50
  }, 0)

  const projectsNearLimit = projects.filter((p) => {
    const creditsUsed = getProjectCreditsUsed(p.metadata)
    const estimated = (p.metadata?.visionPhase?.script?.script?.scenes?.length || 5) * 100
    return creditsUsed > estimated * 0.75
  }).length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <motion.div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-gray-400">Loading dashboard...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8 font-sans">
      <DashboardRedirectGuard />
      <div className="max-w-7xl mx-auto space-y-6">
        <CueCommandBar />

        {error && (
          <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Some data could not be loaded. Showing available information.</span>
          </div>
        )}

        <DashboardOverviewStats
          stats={stats}
          availableCredits={availableCredits}
          subscriptionTier={subscription?.tier?.display_name}
        />

        {featuredProject && (
          <section>
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-1">
              Continue working
            </h2>
            <ActiveProjectsContainer
              projects={[featuredProject]}
              onProjectUpdated={refresh}
            />
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <RecentProjectsPanel
              projects={recentProjects}
              featuredProjectId={featuredProject?.id}
            />
          </div>
          <motion.div className="lg:col-span-2">
            <DashboardQuickStart />
          </motion.div>
        </div>

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
      </div>
    </div>
  )
}
