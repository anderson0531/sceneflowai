'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FolderOpen, Clapperboard, Library, Coins, Film } from 'lucide-react'
import { StatCard, StatCardGrid } from '@/components/dashboard/ui/StatCard'
import { DashboardCard } from '@/components/dashboard/ui/DashboardCard'
import type { DashboardStats } from '@/hooks/useDashboardData'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'

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
        title="Studio Overview"
        icon={<Film className="w-5 h-5" />}
        iconColor="indigo"
        delay={0}
        compact
        action={
          subscriptionTier ? (
            <Link
              href="/dashboard/settings/billing"
              className="text-xs text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 px-2.5 py-1 rounded-md transition-colors"
            >
              {subscriptionTier} Plan
            </Link>
          ) : undefined
        }
      >
        <StatCardGrid columns={4} className="mb-2">
          <Link href="/dashboard/projects" className="block group">
            <StatCard
              value={stats?.activeProjects ?? 0}
              label="Active projects"
              icon={<FolderOpen className="w-3.5 h-3.5 group-hover:text-indigo-400 transition-colors" />}
              status="neutral"
              compact
              className="group-hover:border-gray-600 transition-colors h-full"
            />
          </Link>
          <Link href="/dashboard/projects" className="block group">
            <StatCard
              value={stats?.totalProjects ?? 0}
              label="Total projects"
              icon={<Clapperboard className="w-3.5 h-3.5 group-hover:text-indigo-400 transition-colors" />}
              status="neutral"
              compact
              className="group-hover:border-gray-600 transition-colors h-full"
            />
          </Link>
          <Link href="/dashboard/series" className="block group">
            <StatCard
              value={stats?.totalSeries ?? 0}
              label={STUDIO_DISPLAY_NAMES.series}
              icon={<Library className="w-3.5 h-3.5 group-hover:text-cyan-400 transition-colors" />}
              status="neutral"
              compact
              className="group-hover:border-gray-600 transition-colors h-full"
            />
          </Link>
          <Link href="/dashboard/settings/billing" className="block group">
            <StatCard
              value={availableCredits.toLocaleString()}
              label="Credits available"
              icon={<Coins className="w-3.5 h-3.5 group-hover:text-emerald-400 transition-colors" />}
              status={
                availableCredits < 100
                  ? 'critical'
                  : availableCredits < 500
                    ? 'warning'
                    : 'healthy'
              }
              compact
              className="group-hover:border-gray-600 transition-colors h-full"
            />
          </Link>
        </StatCardGrid>

        {stats && (stats.inProduction > 0 || stats.completedProjects > 0 || phaseSummary) && (
          <p className="text-xs text-gray-400 border-t border-gray-700/50 pt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              <span className="text-indigo-400 font-medium">{stats.inProduction}</span> in production
            </span>
            {stats.completedProjects > 0 && (
              <span>
                · <span className="text-emerald-400 font-medium">{stats.completedProjects}</span> completed
              </span>
            )}
            {phaseSummary && <span className="text-gray-500">· {phaseSummary}</span>}
          </p>
        )}
      </DashboardCard>
    </motion.div>
  )
}
