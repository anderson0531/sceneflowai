'use client'

import { motion } from 'framer-motion'
import { FolderOpen, Clapperboard, Library, Coins, Film } from 'lucide-react'
import { StatCard, StatCardGrid } from '@/components/dashboard/ui/StatCard'
import { DashboardCard } from '@/components/dashboard/ui/DashboardCard'
import type { DashboardStats } from '@/hooks/useDashboardData'

interface DashboardOverviewStatsProps {
  stats: DashboardStats | null
  availableCredits: number
  subscriptionTier?: string
}

export function DashboardOverviewStats({
  stats,
  availableCredits,
  subscriptionTier,
}: DashboardOverviewStatsProps) {
  const phaseSummary = stats
    ? Object.entries(stats.byPhase)
        .filter(([, count]) => count > 0)
        .map(([phase, count]) => `${count} ${phase}`)
        .join(' · ')
    : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      <DashboardCard
        title="Overview"
        icon={<Film className="w-5 h-5" />}
        iconColor="indigo"
        delay={0}
        action={
          subscriptionTier ? (
            <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">
              {subscriptionTier}
            </span>
          ) : undefined
        }
      >
        <StatCardGrid columns={4} className="mb-3">
          <StatCard
            value={stats?.activeProjects ?? 0}
            label="Active projects"
            icon={<FolderOpen className="w-3.5 h-3.5" />}
            status="neutral"
          />
          <StatCard
            value={stats?.totalProjects ?? 0}
            label="Total projects"
            icon={<Clapperboard className="w-3.5 h-3.5" />}
            status="neutral"
          />
          <StatCard
            value={stats?.totalSeries ?? 0}
            label="Series"
            icon={<Library className="w-3.5 h-3.5" />}
            status="neutral"
          />
          <StatCard
            value={availableCredits.toLocaleString()}
            label="Credits available"
            icon={<Coins className="w-3.5 h-3.5" />}
            status={
              availableCredits < 500
                ? 'warning'
                : availableCredits < 100
                  ? 'critical'
                  : 'healthy'
            }
          />
        </StatCardGrid>

        {stats && stats.inProduction > 0 && (
          <p className="text-xs text-gray-500 border-t border-gray-700/50 pt-3">
            <span className="text-indigo-400 font-medium">{stats.inProduction}</span> in
            production
            {stats.completedProjects > 0 && (
              <>
                {' '}
                · <span className="text-emerald-400 font-medium">{stats.completedProjects}</span>{' '}
                completed
              </>
            )}
            {phaseSummary && <span className="block mt-1 text-gray-600">{phaseSummary}</span>}
          </p>
        )}
      </DashboardCard>
    </motion.div>
  )
}
