'use client'

import { motion } from 'framer-motion'
import { Plus, Sparkles, Play, Eye } from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'
import Link from 'next/link'
import { ProjectCard } from './ProjectCard'

export function ProjectHub() {
  const { projects } = useEnhancedStore()

  if (projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
      >
        {/* Header - Balanced with top of page */}
        <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">My Projects</h2>
              <p className="text-gray-400 mt-1">Manage your creative workflow</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">No projects yet</span>
            </div>
          </div>
        </div>
        
        {/* Focused CTAs - No marketing text */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* New Project */}
            <Link href="/studio/crispr-debate-001">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="group cursor-pointer"
              >
                <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-6 rounded-xl border-2 border-blue-500/40 hover:border-blue-400/60 transition-all duration-200 h-full">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-500/40">
                    <Plus className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-3">New Project</h3>
                  <div className="text-center">
                    <button className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
                      Start Creating
                    </button>
                  </div>
                </div>
              </motion.div>
            </Link>
            
            {/* Continue Existing Project */}
            <Link href="/dashboard/projects">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="group cursor-pointer"
              >
                <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-6 rounded-xl border-2 border-purple-500/40 hover:border-purple-400/60 transition-all duration-200 h-full">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-purple-500/40">
                    <Play className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-3">Continue Existing Project</h3>
                  <div className="text-center">
                    <button className="w-full bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40">
                      View Projects
                    </button>
                  </div>
                </div>
              </motion.div>
            </Link>
            
            {/* Manage Projects */}
            <Link href="/dashboard/projects">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="group cursor-pointer"
              >
                <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 p-6 rounded-xl border-2 border-green-500/40 hover:border-green-400/60 transition-all duration-200 h-full">
                  <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-green-500/40">
                    <Eye className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-3">Manage Projects</h3>
                  <div className="text-center">
                    <button className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40">
                      Manage
                    </button>
                  </div>
                </div>
              </motion.div>
            </Link>
            
            {/* Manage Production Assets */}
            <Link href="/dashboard/settings/integrations">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="group cursor-pointer"
              >
                <div className="bg-gradient-to-br from-orange-900/20 to-orange-800/10 p-6 rounded-xl border-2 border-orange-500/40 hover:border-orange-400/60 transition-all duration-200 h-full">
                  <div className="w-16 h-16 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-orange-500/40">
                    <span className="text-2xl">🎬</span>
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-3">Manage Production Assets</h3>
                  <div className="text-center">
                    <button className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40">
                      Manage
                    </button>
                  </div>
                </div>
              </motion.div>
            </Link>
            
            {/* Manage Series Bible */}
            <Link href="/dashboard/project-bible">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="group cursor-pointer"
              >
                <div className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 p-6 rounded-xl border-2 border-indigo-500/40 hover:border-indigo-400/60 transition-all duration-200 h-full">
                  <div className="w-16 h-16 bg-indigo-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/40">
                    <span className="text-2xl">📚</span>
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-3">Manage Series Bible</h3>
                  <div className="text-center">
                    <button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40">
                      Manage
                    </button>
                  </div>
                </div>
              </motion.div>
            </Link>
            
            {/* Manage BYOK */}
            <Link href="/dashboard/settings/byok">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="group cursor-pointer"
              >
                <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 p-6 rounded-xl border-2 border-red-500/40 hover:border-red-400/60 transition-all duration-200 h-full">
                  <div className="w-16 h-16 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-500/40">
                    <span className="text-2xl">🔑</span>
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-3">Manage BYOK</h3>
                  <div className="text-center">
                    <button className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40">
                      Manage
                    </button>
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.div>
    )
  }

  // Active State - Display existing projects
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
    >
      {/* Header - Balanced with top of page */}
      <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">My Projects</h2>
            <p className="text-gray-400 mt-1">Jump into your workflow</p>
          </div>
          
          <div className="flex gap-3">
            <Link href="/dashboard/projects/new">
              <button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5" />
                + New Project
              </button>
            </Link>
            
            <Link href="/dashboard/project-bible">
              <button className="bg-gray-700/50 hover:bg-gray-600/50 text-gray-200 px-6 py-3 rounded-xl border border-gray-600/50 transition-all duration-200 font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5" />
                + New Series Bible
              </button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Projects Grid */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.slice(0, 6).map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </div>
        
        {/* Show More Projects Link */}
        {projects.length > 6 && (
          <div className="text-center mt-8">
            <Link href="/dashboard/projects">
              <button className="text-blue-400 hover:text-blue-300 font-semibold transition-colors text-lg">
                View {projects.length - 6} more projects →
              </button>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  )
}
