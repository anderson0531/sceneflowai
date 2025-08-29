'use client'

import { motion } from 'framer-motion'
import { FolderOpen, Play, Eye, MoreHorizontal, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function ProductionProjectsTable() {
  // Mock data - replace with real backend data
  const projects = [
    {
      id: '1',
      title: 'Crispr Debate Series',
      description: 'Educational series on genetic engineering ethics',
      status: 'In Progress',
      progress: 75,
      lastUpdated: '2 hours ago',
      workflowStep: 'Scene Direction'
    },
    {
      id: '2',
      title: 'Climate Change Documentary',
      description: 'Feature-length documentary on climate science',
      status: 'Planning',
      progress: 25,
      lastUpdated: '1 day ago',
      workflowStep: 'Storyboard'
    },
    {
      id: '3',
      title: 'Tech Startup Pitch',
      description: 'Video pitch for AI-powered startup',
      status: 'Completed',
      progress: 100,
      lastUpdated: '3 days ago',
      workflowStep: 'Video Generation'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500/20 text-green-300 border-green-500/40'
      case 'In Progress':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      case 'Planning':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40'
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 50) return 'bg-blue-500'
    return 'bg-yellow-500'
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
            <h2 className="text-2xl font-bold text-white">Production Projects</h2>
            <p className="text-gray-400 mt-1">Manage your active video production workflow</p>
          </div>
          <Link href="/dashboard/projects/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50 border-b border-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Workflow Step
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
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
                className="hover:bg-gray-800/30 transition-colors duration-200"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center mr-3">
                      <FolderOpen className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{project.title}</div>
                      <div className="text-sm text-gray-400">{project.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-700 rounded-full h-2 mr-3">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(project.progress)}`}
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-300">{project.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-300">{project.workflowStep}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-400">{project.lastUpdated}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Link href={`/studio/${project.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/projects/${project.id}`}>
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

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No projects yet</h3>
          <p className="text-gray-400 mb-6">Get started by creating your first video project</p>
          <Link href="/dashboard/projects/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          </Link>
        </div>
      )}
    </motion.div>
  )
}
