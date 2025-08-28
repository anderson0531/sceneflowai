'use client'

import { motion } from 'framer-motion'
import { 
  FolderOpen, 
  CheckCircle, 
  XCircle, 
  CreditCard, 
  Zap, 
  FileText, 
  Eye, 
  Camera, 
  Film,
  TrendingUp,
  BarChart3,
  Download,
  Settings,
  Plus
} from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export function DashboardOverview() {
  const { projects, user } = useEnhancedStore()

  // Mock data for demonstration - replace with real backend data later
  const mockData = {
    projectCounts: {
      active: projects.filter(p => !p.completedSteps.includes('optimization')).length,
      completed: projects.filter(p => p.completedSteps.includes('optimization')).length,
      canceled: 2 // Mock data
    },
    currentPlan: {
      tier: user?.subscriptionTier || 'Pro',
      monthlyCredits: user?.monthlyCredits || 1000,
      availableCredits: user?.credits || 750,
      nextBilling: '2024-02-15'
    },
    exportedAssets: {
      scripts: 12,
      storyboards: 8,
      sceneDirection: 6,
      videos: 3
    }
  }

  // Calculate project statistics
  const totalProjects = mockData.projectCounts.active + mockData.projectCounts.completed + mockData.projectCounts.canceled
  const completionRate = totalProjects > 0 ? Math.round((mockData.projectCounts.completed / totalProjects) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
            <p className="text-gray-400 mt-1">Your creative workflow at a glance</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600/50 text-gray-300 hover:text-white hover:border-gray-500/70"
            >
              <Settings className="w-4 h-4 mr-2" />
              Customize
            </Button>
            <Button
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </div>

      {/* Row 1: Project Counts */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Project Status</h3>
          <div className="ml-auto">
            <span className="text-sm text-gray-400">Completion Rate:</span>
            <span className="ml-2 text-lg font-bold text-green-400">{completionRate}%</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Active Projects */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-4 rounded-xl border-2 border-blue-500/40 hover:border-blue-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/40">
                <FolderOpen className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-300">{mockData.projectCounts.active}</div>
                <div className="text-sm text-blue-200">Active</div>
              </div>
            </div>
            <div className="text-xs text-blue-300">
              Currently in progress
            </div>
          </motion.div>

          {/* Completed Projects */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-gradient-to-br from-green-900/20 to-green-800/10 p-4 rounded-xl border-2 border-green-500/40 hover:border-green-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/40">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-300">{mockData.projectCounts.completed}</div>
                <div className="text-sm text-green-200">Completed</div>
              </div>
            </div>
            <div className="text-xs text-green-300">
              Successfully finished
            </div>
          </motion.div>

          {/* Canceled Projects */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-gradient-to-br from-red-900/20 to-red-800/10 p-4 rounded-xl border-2 border-red-500/40 hover:border-red-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/40">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-300">{mockData.projectCounts.canceled}</div>
                <div className="text-sm text-red-200">Canceled</div>
              </div>
            </div>
            <div className="text-xs text-red-300">
              Discontinued
            </div>
          </motion.div>
        </div>
      </div>

      {/* Row 2: Current Plan & Credits */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Plan & Credits</h3>
          <div className="ml-auto">
            <span className="text-sm text-gray-400">Next Billing:</span>
            <span className="ml-2 text-sm font-medium text-purple-300">{mockData.currentPlan.nextBilling}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Plan */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-4 rounded-xl border-2 border-purple-500/40 hover:border-purple-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/40">
                <CreditCard className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-purple-300 capitalize">{mockData.currentPlan.tier}</div>
                <div className="text-sm text-purple-200">Current Plan</div>
              </div>
            </div>
            <div className="text-xs text-purple-300 mb-3">
              {mockData.currentPlan.monthlyCredits} credits/month
            </div>
            <Link href="/dashboard/settings/billing">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-purple-500/50 text-purple-300 hover:text-white hover:border-purple-400/70 hover:bg-purple-500/20"
              >
                Manage Plan
              </Button>
            </Link>
          </motion.div>

          {/* Available Credits */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-4 rounded-xl border-2 border-blue-500/40 hover:border-blue-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/40">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-300">{mockData.currentPlan.availableCredits}</div>
                <div className="text-sm text-blue-200">Available Credits</div>
              </div>
            </div>
            <div className="text-xs text-blue-300 mb-3">
              {Math.round((mockData.currentPlan.availableCredits / mockData.currentPlan.monthlyCredits) * 100)}% of monthly allocation
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(mockData.currentPlan.availableCredits / mockData.currentPlan.monthlyCredits) * 100}%` }}
              ></div>
            </div>
          </motion.div>

          {/* Credit Management */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="bg-gradient-to-br from-green-900/20 to-green-800/10 p-4 rounded-xl border-2 border-green-500/40 hover:border-green-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/40">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-green-300">Credit Usage</div>
                <div className="text-sm text-green-200">Analytics</div>
              </div>
            </div>
            <div className="text-xs text-green-300 mb-3">
              Track your credit consumption
            </div>
            <Link href="/dashboard/settings/billing">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-green-500/50 text-green-300 hover:text-white hover:border-green-400/70 hover:bg-green-500/20"
              >
                View Analytics
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Row 3: Exported Assets */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Download className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">Exported Assets</h3>
          <div className="ml-auto">
            <span className="text-sm text-gray-400">Total Exports:</span>
            <span className="ml-2 text-lg font-bold text-orange-300">
              {mockData.exportedAssets.scripts + mockData.exportedAssets.storyboards + mockData.exportedAssets.sceneDirection + mockData.exportedAssets.videos}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Scripts */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 p-4 rounded-xl border-2 border-indigo-500/40 hover:border-indigo-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/40">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-300">{mockData.exportedAssets.scripts}</div>
                <div className="text-sm text-indigo-200">Scripts</div>
              </div>
            </div>
            <div className="text-xs text-indigo-300">
              Finalized scripts
            </div>
          </motion.div>

          {/* Storyboards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-4 rounded-xl border-2 border-purple-500/40 hover:border-purple-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/40">
                <Eye className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-300">{mockData.exportedAssets.storyboards}</div>
                <div className="text-sm text-purple-200">Storyboards</div>
              </div>
            </div>
            <div className="text-xs text-purple-300">
              Visual planning
            </div>
          </motion.div>

          {/* Scene Direction */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            className="bg-gradient-to-br from-green-900/20 to-green-800/10 p-4 rounded-xl border-2 border-green-500/40 hover:border-green-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/40">
                <Camera className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-300">{mockData.exportedAssets.sceneDirection}</div>
                <div className="text-sm text-green-200">Scene Direction</div>
              </div>
            </div>
            <div className="text-xs text-green-300">
              Director's notes
            </div>
          </motion.div>

          {/* Videos */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.0 }}
            className="bg-gradient-to-br from-orange-900/20 to-orange-800/10 p-4 rounded-xl border-2 border-orange-500/40 hover:border-orange-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-500/40">
                <Film className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-300">{mockData.exportedAssets.videos}</div>
                <div className="text-sm text-orange-200">Videos</div>
              </div>
            </div>
            <div className="text-xs text-orange-300">
              Final videos
            </div>
          </motion.div>
        </div>

        {/* Export Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="border-gray-600/50 text-gray-300 hover:text-white hover:border-gray-500/70"
          >
            <Download className="w-4 h-4 mr-2" />
            Export All Assets
          </Button>
          <Button
            variant="outline"
            className="border-gray-600/50 text-gray-300 hover:text-white hover:border-gray-500/70"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Export Analytics
          </Button>
          <Link href="/dashboard/settings/integrations">
            <Button
              variant="outline"
              className="border-gray-600/50 text-gray-300 hover:text-white hover:border-gray-500/70"
            >
              <Settings className="w-4 h-4 mr-2" />
              Export Settings
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
