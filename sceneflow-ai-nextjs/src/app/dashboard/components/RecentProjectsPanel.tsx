'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Plus, Library, FolderOpen, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  formatRelativeTime,
  getPhaseDisplayName,
  type DashboardProject,
  type DashboardSeries,
} from '@/hooks/useDashboardData'
import { getResumeRouteForStep } from '@/constants/workflowRoutes'
import { DEMO_PROJECT_ID } from '@/lib/demo/uiSandboxProject'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'
import { cn } from '@/lib/utils'

interface RecentProjectsPanelProps {
  projects: DashboardProject[]
  series?: DashboardSeries[]
  featuredProjectId?: string
}

function getThumbnail(project: DashboardProject): string | null {
  const visionPhase = project.metadata?.visionPhase
  const scenes = visionPhase?.script?.script?.scenes || visionPhase?.scenes || []
  return (
    project.metadata?.billboardUrl ||
    visionPhase?.billboardUrl ||
    project.metadata?.thumbnailUrl ||
    project.metadata?.thumbnail ||
    scenes[0]?.imageUrl ||
    scenes[0]?.generatedImage?.url ||
    null
  )
}

export function RecentProjectsPanel({
  projects,
  series = [],
  featuredProjectId,
}: RecentProjectsPanelProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'series'>(() =>
    projects.length === 0 && series.length > 0 ? 'series' : 'projects'
  )

  const listProjects = featuredProjectId
    ? projects.filter((p) => p.id !== featuredProjectId).slice(0, 5)
    : projects.slice(0, 6)

  const hasSingleFeaturedOnly = projects.length === 1 && listProjects.length === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/60 shadow-lg overflow-hidden h-full flex flex-col"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-700/60">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Work</h2>
            <p className="text-xs text-gray-400 mt-0.5">Jump back into films or multi-episode series</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher: Projects vs Series */}
          <div className="inline-flex rounded-lg bg-gray-900/80 p-0.5 border border-gray-700/60">
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                activeTab === 'projects'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Projects
              <span className="text-[10px] opacity-80">({projects.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('series')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                activeTab === 'series'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              <Library className="w-3.5 h-3.5" />
              {STUDIO_DISPLAY_NAMES.series}
              <span className="text-[10px] opacity-80">({series.length})</span>
            </button>
          </div>

          <Link
            href={activeTab === 'projects' ? '/dashboard/projects' : '/dashboard/series'}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {activeTab === 'projects' ? (
        listProjects.length === 0 ? (
          <div className="px-5 py-9 text-center flex-1 flex flex-col items-center justify-center">
            {hasSingleFeaturedOnly ? (
              <>
                <p className="text-gray-300 text-sm font-medium mb-1">
                  Your active project is featured above
                </p>
                <p className="text-gray-400 text-xs mb-5 max-w-sm">
                  Start another standalone film, explore the interactive UI Sandbox, or switch to the{' '}
                  {STUDIO_DISPLAY_NAMES.series} tab for multi-episode stories.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <Link href="/dashboard/studio/new-project">
                    <Button size="sm" variant="primary">
                      <Plus className="w-4 h-4 mr-1.5" />
                      New Project
                    </Button>
                  </Link>
                  <Link href={`/dashboard/workflow/vision/${DEMO_PROJECT_ID}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      UI Sandbox Demo
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-300 text-sm font-medium mb-1">No projects yet</p>
                <p className="text-gray-400 text-xs mb-5 max-w-sm">
                  Start your first production from a 1-sentence concept or explore the UI Sandbox Demo.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <Link href="/dashboard/studio/new-project">
                    <Button size="sm" variant="primary">
                      <Plus className="w-4 h-4 mr-1.5" />
                      New Project
                    </Button>
                  </Link>
                  <Link href={`/dashboard/workflow/vision/${DEMO_PROJECT_ID}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      UI Sandbox Demo
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-700/50">
            {listProjects.map((project) => {
              const thumb = getThumbnail(project)
              const phase = getPhaseDisplayName(project.currentStep)
              const resumeUrl = getResumeRouteForStep(project.id, project.currentStep)

              return (
                <li key={project.id}>
                  <Link
                    href={resumeUrl}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-700/30 transition-colors group"
                  >
                    <motion.div
                      initial={false}
                      className={cn(
                        'w-12 h-12 rounded-lg shrink-0 overflow-hidden bg-gray-900 border border-gray-700/50',
                        thumb ? '' : 'flex items-center justify-center text-gray-500 text-xs'
                      )}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-semibold">{project.title.charAt(0).toUpperCase()}</span>
                      )}
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                        {project.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {phase} · {project.progress}% · {formatRelativeTime(project.updatedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:block w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(5, project.progress))}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-indigo-400 opacity-85 sm:opacity-75 group-hover:opacity-100 transition-opacity">
                        Resume
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )
      ) : series.length === 0 ? (
        <div className="px-5 py-9 text-center flex-1 flex flex-col items-center justify-center">
          <p className="text-gray-300 text-sm font-medium mb-1">No series bibles yet</p>
          <p className="text-gray-400 text-xs mb-5 max-w-sm">
            Plan a multi-episode arc once in {STUDIO_DISPLAY_NAMES.series} so characters and locations stay locked across episodes.
          </p>
          <Link href="/dashboard/series">
            <Button size="sm" variant="primary">
              <Plus className="w-4 h-4 mr-1.5" />
              Open {STUDIO_DISPLAY_NAMES.series}
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-700/50">
          {series.map((item) => {
            const epTotal = item.episodeCount || item.maxEpisodes || 0
            const epStarted = item.startedCount || 0
            return (
              <li key={item.id}>
                <Link
                  href={`/dashboard/series/${item.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-700/30 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-lg shrink-0 bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                    <Library className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {epTotal} {epTotal === 1 ? 'episode' : 'episodes'}
                      {epStarted > 0 ? ` · ${epStarted} started` : ''}
                      {item.genre ? ` · ${item.genre}` : ''}
                      {item.updatedAt ? ` · ${formatRelativeTime(item.updatedAt)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-cyan-400 opacity-85 sm:opacity-75 group-hover:opacity-100 transition-opacity">
                      Open Series
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </motion.div>
  )
}
