'use client'

import { motion } from 'framer-motion'
import { FolderOpen, Play, Eye, MoreHorizontal, Plus, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function ProductionProjectsTable() {
  // Mock Data with enhanced project information
  const projects = [
    { 
      id: 1, 
      title: "Sci-Fi Pilot: The Arrival", 
      lastActive: "1 hour ago", 
      phase: 1, 
      step: 2, 
      stepName: "2. Production", 
      projectedCredits: 1500,
      status: "In Progress",
      description: "Space exploration series pilot episode"
    },
    { 
      id: 2, 
      title: "YouTube Promo Ad", 
      lastActive: "Yesterday", 
      phase: 2, 
      step: 4, 
      stepName: "4. Video Generation (BYOK)", 
      projectedCredits: 450,
      status: "Active",
      description: "Product promotion video for social media"
    },
    { 
      id: 3, 
      title: "Series Bible: The Crew (Shared)", 
      lastActive: "Aug 27", 
      phase: 1, 
      step: 3, 
      stepName: "3. Director's Chair", 
      projectedCredits: 800,
      status: "Planning",
      description: "Collaborative series development document"
    },
    { 
      id: 4, 
      title: "Documentary: Climate Impact", 
      lastActive: "3 days ago", 
      phase: 2, 
      step: 5, 
      stepName: "5. Post-Production", 
      projectedCredits: 1200,
      status: "In Progress",
      description: "Environmental documentary feature"
    },
    { 
      id: 5, 
      title: "Corporate Training Series", 
      lastActive: "1 week ago", 
      phase: 1, 
      step: 1, 
      stepName: "1. Ideation", 
      projectedCredits: 600,
      status: "Planning",
      description: "Employee onboarding video series"
    }
  ];

  const getPhaseColor = (phase: number) => {
    return phase === 1 
      ? 'bg-purple-900 text-purple-300 border-purple-700' 
      : 'bg-green-900 text-green-300 border-green-700'
  }

  const getPhaseLabel = (phase: number) => {
    return phase === 1 ? 'Phase 1: Pre-Production' : 'Phase 2: Generation & Post'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500/20 text-green-300 border-green-500/40'
      case 'In Progress':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      case 'Active':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      case 'Planning':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Recent Projects</h2>
            <p className="text-gray-400 mt-1">Manage your active video production workflow</p>
          </div>
          <Link href="/dashboard/studio/new-project">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Start Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="bg-gray-800 shadow-xl rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Project Name
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Workflow Status
                </th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Est. Credits
                </th>
                <th className="px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {projects.map((project, index) => (
                <motion.tr
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
                  className="hover:bg-gray-700/30 transition duration-150 cursor-pointer"
                  onClick={() => window.open(`/dashboard/studio/${project.id}`, '_blank')}
                >
                  <td className="px-4 md:px-6 py-4 text-sm font-medium text-white">
                    <div className="flex items-center">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <FolderOpen className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-white truncate">{project.title}</div>
                        <div className="text-xs text-gray-500 truncate">Last active: {project.lastActive}</div>
                        <div className="text-xs text-gray-400 mt-1 truncate">{project.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <div className="space-y-1">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getPhaseColor(project.phase)}`}>
                        {getPhaseLabel(project.phase)}
                      </span>
                      <div className="text-sm text-gray-300 truncate">
                        {project.stepName}
                      </div>
                      <div className="text-xs text-gray-400">
                        Step {project.step} of 6
                      </div>
                    </div>
                  </td>
                  {/* Budget Estimation */}
                  <td className="px-4 md:px-6 py-4 text-right text-sm font-semibold text-yellow-400">
                    <div className="text-sm">~{project.projectedCredits.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">credits</div>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Link href={`/dashboard/studio/${project.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-indigo-500 hover:text-indigo-400 font-medium hover:bg-indigo-500/20"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/projects/${project.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-gray-300 hover:bg-gray-500/20"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-300 hover:bg-gray-500/20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer */}
        <div className="p-4 bg-gray-700/50 text-center">
          <Link href="/dashboard/projects" className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-2">
            View All Projects
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No projects yet</h3>
          <p className="text-gray-400 mb-6">Get started by creating your first video project</p>
          <Link href="/dashboard/projects/new">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          </Link>
        </div>
      )}
    </motion.div>
  )
}
