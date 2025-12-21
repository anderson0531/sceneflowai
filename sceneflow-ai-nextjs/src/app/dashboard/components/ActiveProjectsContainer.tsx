'use client'

import { motion } from 'framer-motion'
import { ActiveProjectCard } from './ActiveProjectCard'
import { Filter, ArrowUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

// Mock data - will be replaced with real data from store
const mockProjects = [
  {
    id: '1',
    title: 'Sci-Fi Pilot: The Arrival',
    description: 'Space exploration series pilot episode',
    currentStep: 2,
    totalSteps: 4,
    phaseName: 'Vision Board',
    progressPercent: 50,
    scores: { director: 85, audience: 78, avgScene: 82 },
    nextStep: {
      name: "Director's Chair",
      description: 'Define camera angles, lighting & movement for each scene',
      estimatedCredits: 35,
      actionLabel: 'Start Step',
      actionUrl: '/dashboard/workflow/direction/1',
      isComplete: false
    },
    cueTip: {
      message: 'Audience score is 78—add an emotional beat in Scene 3 to boost engagement. Click to see AI recommendations.',
      primaryAction: { label: 'View Tips', url: '/dashboard/workflow/vision/1?tab=review' },
      type: 'tip' as const
    },
    estimatedCredits: 1500,
    lastActive: '1 hour ago',
    budgetStatus: 'on-track' as const
  },
  {
    id: '2',
    title: 'YouTube Promo Ad',
    description: 'Product promotion video for social media',
    currentStep: 4,
    totalSteps: 4,
    phaseName: 'Video Generation',
    progressPercent: 85,
    scores: { director: 92, audience: 88, avgScene: 90 },
    nextStep: {
      name: 'Export Video',
      description: 'HD/4K available',
      estimatedCredits: 0,
      actionLabel: 'Export Video',
      actionUrl: '/dashboard/workflow/export/2',
      isComplete: true
    },
    cueTip: {
      message: 'Great scores! Use BYOK to save 40% on final render. Switch provider before export.',
      primaryAction: { label: 'Switch to BYOK', url: '/dashboard/settings/byok' },
      type: 'tip' as const
    },
    estimatedCredits: 450,
    lastActive: 'Yesterday',
    budgetStatus: 'near-limit' as const
  },
  {
    id: '3',
    title: 'Documentary: Climate Impact',
    description: 'Environmental documentary feature',
    currentStep: 3,
    totalSteps: 4,
    phaseName: "Director's Chair",
    progressPercent: 75,
    scores: { director: 68, audience: 71, avgScene: 70 },
    nextStep: {
      name: 'Revise Scenes 2, 5',
      description: 'Scores below 75—AI detected pacing issues',
      estimatedCredits: 15,
      actionLabel: 'Fix Scenes',
      actionUrl: '/dashboard/workflow/vision/3?fix=true',
      isComplete: false
    },
    cueTip: {
      message: 'Director score 68 is below threshold. Scene 2 has weak conflict arc. Scene 5 pacing feels rushed.',
      primaryAction: { label: 'Apply AI Fixes', url: '/dashboard/workflow/vision/3?autofix=true' },
      type: 'alert' as const
    },
    estimatedCredits: 1200,
    lastActive: '3 days ago',
    budgetStatus: 'over-budget' as const
  }
]

export function ActiveProjectsContainer() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Active Projects</h2>
            <p className="text-gray-400 mt-1">Track progress, scores, and next steps</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:text-white">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:text-white">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              Sort by Score
            </Button>
            <Link href="/dashboard/studio/new-project">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Project Cards */}
      <div className="p-6 space-y-4">
        {mockProjects.map((project, index) => (
          <ActiveProjectCard
            key={project.id}
            {...project}
            index={index}
          />
        ))}
      </div>

      {/* Empty State */}
      {mockProjects.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Active Projects</h3>
          <p className="text-gray-400 mb-6">Start your first project to see it here</p>
          <Link href="/dashboard/studio/new-project">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Create New Project
            </Button>
          </Link>
        </div>
      )}
    </motion.div>
  )
}
