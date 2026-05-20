'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  formatRelativeTime,
  getPhaseDisplayName,
  type DashboardProject,
} from '@/hooks/useDashboardData'
import { getProjectResumeUrl } from '@/lib/dashboardStats'
import { cn } from '@/lib/utils'

interface RecentProjectsPanelProps {
  projects: DashboardProject[]
  featuredProjectId?: string
}

function getThumbnail(project: DashboardProject): string | null {
  const visionPhase = project.metadata?.visionPhase
  const scenes = visionPhase?.script?.script?.scenes || visionPhase?.scenes || []
  return (
    project.metadata?.billboardUrl ||
    visionPhase?.billboardUrl ||
    project.metadata?.thumbnailUrl ||
    scenes[0]?.imageUrl ||
    scenes[0]?.generatedImage?.url ||
    null
  )
}

export function RecentProjectsPanel({ projects, featuredProjectId }: RecentProjectsPanelProps) {
  const listProjects = featuredProjectId
    ? projects.filter((p) => p.id !== featuredProjectId).slice(0, 5)
    : projects.slice(0, 6)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/60 shadow-lg overflow-hidden"
    >
      <motion.div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
        <div>
          <h2 className="text-lg font-semibold text-white">Recent projects</h2>
          <p className="text-xs text-gray-500 mt-0.5">Pick up where you left off</p>
        </div>
        <Link
          href="/dashboard/projects"
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>

      {listProjects.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-gray-400 text-sm mb-4">No projects yet. Start your first production.</p>
          <Link href="/dashboard/studio/new-project">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New project
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-700/50">
          {listProjects.map((project) => {
            const thumb = getThumbnail(project)
            const phase = getPhaseDisplayName(project.currentStep)
            const resumeUrl = getProjectResumeUrl(project)

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
                      thumb ? '' : 'flex items-center justify-center text-gray-600 text-xs'
                    )}
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-medium">{project.title.charAt(0).toUpperCase()}</span>
                    )}
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                      {project.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {phase} · {project.progress}% · {formatRelativeTime(project.updatedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:block w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, project.progress)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Resume
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors" />
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
