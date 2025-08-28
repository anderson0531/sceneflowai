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
        className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">My Projects</h2>
          <p className="text-gray-400">Jump into your workflow</p>
        </div>
        
        {/* Enhanced CTA for First-Time and Existing Users */}
        <div className="text-center py-20 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-blue-800/20 rounded-2xl border-2 border-blue-500/30 shadow-2xl">
          <div className="w-32 h-32 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-blue-400/40 shadow-2xl">
            <Sparkles className="w-20 h-20 text-blue-300" />
          </div>
          
          <h3 className="text-4xl font-bold text-white mb-6">
            Ready to Create Your Next Video?
          </h3>
          
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed text-xl">
            Start your creative journey with SceneFlow AI. Our guided workflow will help you transform your ideas into professional videos.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
            {/* Start New Project */}
            <div className="text-center p-6 bg-gradient-to-br from-blue-900/20 to-blue-800/10 rounded-xl border border-blue-500/30">
              <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-500/40">
                <Plus className="w-8 h-8 text-blue-400" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Start New Project</h4>
              <p className="text-blue-100 text-sm mb-4">Create from scratch, use a template, or import your script</p>
              <Link href="/studio/crispr-debate-001">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
                  Start Creating
                </button>
              </Link>
            </div>
            
            {/* Continue Existing Project */}
            <div className="text-center p-6 bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl border border-purple-500/30">
              <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-purple-500/40">
                <Play className="w-8 h-8 text-purple-400" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Continue Project</h4>
              <p className="text-purple-100 text-sm mb-4">Resume where you left off or check your project status</p>
              <Link href="/dashboard/projects">
                <button className="w-full bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40">
                  View Projects
                </button>
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-blue-500/40">
                <span className="text-2xl">🎬</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Pre-Production Suite</h4>
              <p className="text-blue-100 text-sm">Script analysis, storyboarding, and scene direction</p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-orange-500/40">
                <span className="text-2xl">🎥</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">AI Generation</h4>
              <p className="text-orange-100 text-sm">Video generation with BYOK for cost control</p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-green-500/40">
                <span className="text-2xl">📁</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Export Assets</h4>
              <p className="text-green-100 text-sm">Download materials for external filming teams</p>
            </div>
          </div>
          
          <p className="text-xs text-blue-200 mt-6 max-w-md mx-auto">
            💡 <strong>Pro tip:</strong> Use our AI-powered "The Spark Studio" to generate unique video concepts from any topic.
          </p>
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
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl p-8"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">My Projects</h2>
          <p className="text-gray-400">Jump into your workflow</p>
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
      
      {/* Projects Grid */}
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
    </motion.div>
  )
}
