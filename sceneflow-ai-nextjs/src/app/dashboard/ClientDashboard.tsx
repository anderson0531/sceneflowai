'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CueCommandBar } from './components/CueCommandBar'
import { BudgetHealthWidget } from './components/BudgetHealthWidget'
import { ActiveProjectsContainer } from './components/ActiveProjectsContainer'
import { DashboardOverviewStats } from './components/DashboardOverviewStats'
import { RecentProjectsPanel } from './components/RecentProjectsPanel'
import { DashboardQuickStart } from './components/DashboardQuickStart'
import { useDashboardData } from '@/hooks/useDashboardData'
import { DashboardRedirectGuard } from '@/components/auth/DashboardRedirectGuard'
import { ProjectLimitBanner } from '@/components/dashboard/ProjectLimitBanner'
import {
  getProjectBudgetStatus,
  getProjectEstimatedRemainingCredits,
} from '@/lib/credits/projectBudgetShared'
import { useEnhancedStore } from '@/store/enhancedStore'
import { ProductPageShell, ProductSection } from '@/components/product'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard data">
      <div className="h-32 rounded-xl bg-gray-900/80 border border-gray-800" />
      <div className="h-64 rounded-2xl bg-gray-900/80 border border-gray-800" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 h-72 rounded-xl bg-gray-900/80 border border-gray-800" />
        <div className="lg:col-span-2 h-72 rounded-xl bg-gray-900/80 border border-gray-800" />
      </div>
    </div>
  )
}

export default function ClientDashboard() {
  const {
    credits,
    subscription,
    projects,
    recentProjects,
    recentSeries,
    stats,
    isLoading,
    error,
    refresh,
  } = useDashboardData()

  const { data: session } = useSession()
  const selectedProjectId = useEnhancedStore((s: any) => s.selectedProjectId)

  // Honor pinned/selected project from Projects page if it exists among active projects
  const featuredProject =
    (selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : null) ??
    recentProjects[0] ??
    null

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

  const projectedRequired = projects.reduce(
    (sum, p) => sum + getProjectEstimatedRemainingCredits(p.metadata, p.progress),
    0
  )

  const projectsNearLimit = projects.filter((p) => {
    const status = getProjectBudgetStatus(p.metadata)
    return status === 'near-limit' || status === 'over-budget'
  }).length

  return (
    <ProductPageShell className="font-sans">
      <DashboardRedirectGuard />
      <div className="space-y-6">
        <CueCommandBar />

        {session?.user?.id && <ProjectLimitBanner userId={session.user.id} />}

        {error && (
          <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Some data could not be loaded. Showing available information.</span>
          </div>
        )}

        {isLoading ? (
          <DashboardLoadingSkeleton />
        ) : (
          <>
            <DashboardOverviewStats
              stats={stats}
              availableCredits={availableCredits}
              subscriptionTier={subscription?.tier?.display_name}
            />

            {featuredProject && (
              <ProductSection
                label={
                  selectedProjectId && featuredProject.id === selectedProjectId
                    ? 'Continue working · Pinned project'
                    : 'Continue working'
                }
              >
                <ActiveProjectsContainer
                  projects={[featuredProject]}
                  selectedProjectId={selectedProjectId}
                  onProjectUpdated={refresh}
                />
              </ProductSection>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <RecentProjectsPanel
                  projects={recentProjects}
                  series={recentSeries}
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
          </>
        )}
      </div>
    </ProductPageShell>
  )
}
