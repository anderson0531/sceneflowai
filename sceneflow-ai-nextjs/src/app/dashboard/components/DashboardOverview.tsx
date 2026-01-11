'use client'

import { useState } from 'react'
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
  Plus,
  BookOpen,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export function DashboardOverview() {
  const { projects, user } = useEnhancedStore()
  
  // State for section visibility
  const [isProjectStatusExpanded, setIsProjectStatusExpanded] = useState(true)
  const [isPlanCreditsExpanded, setIsPlanCreditsExpanded] = useState(true)
  const [isVideoPlatformsExpanded, setIsVideoPlatformsExpanded] = useState(true)
  const [isProductionAssetsExpanded, setIsProductionAssetsExpanded] = useState(true)

  // Mock data for demonstration - replace with real backend data later
  const mockData = {
    projectCounts: {
      active: projects.filter(p => !p.completedSteps.includes('optimization')).length,
      completed: projects.filter(p => p.completedSteps.includes('optimization')).length,
      canceled: 2 // Mock data for series
    },
    currentPlan: {
      tier: user?.subscriptionTier || 'Pro',
      monthlyCredits: user?.monthlyCredits || 1000,
      availableCredits: user?.credits || 750,
      nextBilling: '2024-02-15'
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
          </div>
        </div>
      </div>

      {/* Row 1: Project Counts */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Project Status</h3>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-400">Completion Rate:</span>
            <span className="text-lg font-bold text-green-400">{completionRate}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsProjectStatusExpanded(!isProjectStatusExpanded)}
              className="text-gray-400 hover:text-white"
            >
              {isProjectStatusExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        {isProjectStatusExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Projects */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{mockData.projectCounts.active}</div>
                  <div className="text-sm text-gray-300">Active</div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-3">
                Currently in progress
              </div>
              <Link href="/dashboard/studio/new-project">
                <Button
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Start Project
                </Button>
              </Link>
            </motion.div>

            {/* Total Projects */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{totalProjects}</div>
                  <div className="text-sm text-gray-300">Total</div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-3">
                All projects
              </div>
              <Link href="/dashboard/projects">
                <Button
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Manage Projects
                </Button>
              </Link>
            </motion.div>

            {/* Series Projects */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{mockData.projectCounts.canceled}</div>
                  <div className="text-sm text-gray-300">Series</div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-3">
                Series bibles
              </div>
              <Link href="/dashboard/projects">
                <Button
                  size="sm"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs"
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  Manage Series
                </Button>
              </Link>
            </motion.div>
          </div>
        )}
      </div>

      {/* Row 2: Current Plan & Credits */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Plan & Credits</h3>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-400">Next Billing:</span>
            <span className="text-sm font-medium text-purple-300">{mockData.currentPlan.nextBilling}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPlanCreditsExpanded(!isPlanCreditsExpanded)}
              className="text-gray-400 hover:text-white"
            >
              {isPlanCreditsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        {isPlanCreditsExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Plan */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white capitalize">{mockData.currentPlan.tier}</div>
                  <div className="text-sm text-gray-300">Current Plan</div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-3">
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
              className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{mockData.currentPlan.availableCredits}</div>
                  <div className="text-sm text-gray-300">Available Credits</div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-3">
                {Math.round((mockData.currentPlan.availableCredits / mockData.currentPlan.monthlyCredits) * 100)}% of monthly allocation
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(mockData.currentPlan.availableCredits / mockData.currentPlan.monthlyCredits) * 100}%` }}
                ></div>
              </div>
              <Link href="/dashboard/settings/billing">
                <Button
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  Manage Credits
                </Button>
              </Link>
            </motion.div>

            {/* Credit Management */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">Credit Usage</div>
                  <div className="text-sm text-gray-300">Analytics</div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-3">
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
        )}
      </div>

      {/* Row 3: Video Generation Platforms */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Film className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">Video Generation Platforms</h3>
          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVideoPlatformsExpanded(!isVideoPlatformsExpanded)}
              className="text-gray-400 hover:text-white"
            >
              {isVideoPlatformsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Link href="/dashboard/settings/byok">
              <Button
                variant="outline"
                size="sm"
                className="border-orange-500/50 text-orange-300 hover:text-white hover:border-orange-400/70"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Platforms
              </Button>
            </Link>
          </div>
        </div>
        
        {isVideoPlatformsExpanded && (
          <>
            {/* Row 1: Runway, Pika Labs, Luma AI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Runway */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <img src="/logos/runway.svg" alt="Runway" className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">Runway</div>
                <div className="text-sm text-gray-300">Creative AI Platform</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-2">
              Advanced video generation
            </div>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold ${
              true ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
            }`}>
              {true ? 'Active' : 'Inactive'}
            </div>
          </motion.div>

          {/* Pika Labs */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <img src="/logos/pika-labs.svg" alt="Pika Labs" className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">Pika Labs</div>
                <div className="text-sm text-gray-300">AI Video Creation</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-2">
              Text-to-video generation
            </div>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold ${
              false ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
            }`}>
              {false ? 'Active' : 'Inactive'}
            </div>
          </motion.div>

          {/* Luma AI */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <img src="/logos/luma-ai.svg" alt="Luma AI" className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">Luma AI</div>
                <div className="text-sm text-gray-300">Dream Machine</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-2">
              High-quality video AI
            </div>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold ${
              true ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
            }`}>
              {true ? 'Active' : 'Inactive'}
            </div>
          </motion.div>
        </div>

        {/* Row 2: OpenAI (Sora), Google (Veo), Stability AI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* OpenAI Sora */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.0 }}
            className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 p-4 rounded-xl border-2 border-indigo-500/40 hover:border-indigo-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/40">
                <img src="/logos/openai.svg" alt="OpenAI Sora" className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-indigo-300">OpenAI (Sora)</div>
                <div className="text-sm text-indigo-200">Advanced Video AI</div>
              </div>
            </div>
            <div className="text-xs text-indigo-300 mb-2">
              State-of-the-art generation
            </div>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold ${
              false ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
            }`}>
              {false ? 'Active' : 'Inactive'}
            </div>
          </motion.div>

          {/* Google Veo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.1 }}
            className="bg-gradient-to-br from-red-900/20 to-red-800/10 p-4 rounded-xl border-2 border-red-500/40 hover:border-red-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/40">
                <img src="/logos/google-veo.svg" alt="Google Veo" className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-red-300">Google (Veo)</div>
                <div className="text-sm text-red-200">Gemini Video</div>
              </div>
            </div>
            <div className="text-xs text-red-300 mb-2">
              Google's video AI
            </div>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold ${
              true ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
            }`}>
              {true ? 'Active' : 'Inactive'}
            </div>
          </motion.div>

          {/* Stability AI */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.2 }}
            className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 p-4 rounded-xl border-2 border-yellow-500/40 hover:border-yellow-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/40">
                <img src="/logos/stability-ai.svg" alt="Stability AI" className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-300">Stability AI</div>
                <div className="text-sm text-yellow-200">Creative AI Tools</div>
              </div>
            </div>
            <div className="text-xs text-yellow-300 mb-2">
              Stable Video Diffusion
            </div>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold ${
              false ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
            }`}>
              {false ? 'Active' : 'Inactive'}
            </div>
          </motion.div>
        </div>

        {/* Row 3: Replicate, Hugging Face, HeyGen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Replicate */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.3 }}
            className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 p-4 rounded-xl border-2 border-cyan-500/40 hover:border-cyan-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/40">
                <img src="/logos/replicate.svg" alt="Replicate" className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-cyan-300">Replicate</div>
                <div className="text-sm text-cyan-200">AI Model Hosting</div>
              </div>
            </div>
            <div className="text-xs text-cyan-300 mb-2">
              Open-source AI models
            </div>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold ${
              true ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
            }`}>
              {true ? 'Active' : 'Inactive'}
            </div>
          </motion.div>

          {/* Hugging Face */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.4 }}
            className="bg-gradient-to-br from-pink-900/20 to-pink-800/10 p-4 rounded-xl border-2 border-pink-500/40 hover:border-pink-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center border border-pink-500/40">
                <img src="/logos/hugging-face.svg" alt="Hugging Face" className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-pink-300">Hugging Face</div>
                <div className="text-sm text-pink-200">AI Model Hub</div>
              </div>
            </div>
            <div className="text-xs text-pink-300 mb-2">
              Community AI models
            </div>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold ${
              false ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
            }`}>
              {false ? 'Active' : 'Inactive'}
            </div>
          </motion.div>

          {/* HeyGen */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.5 }}
            className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 p-4 rounded-xl border-2 border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center border border-emerald-500/40">
                <img src="/logos/heygen.svg" alt="HeyGen" className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-300">HeyGen</div>
                <div className="text-sm text-emerald-200">Avatar Video AI</div>
              </div>
            </div>
            <div className="text-xs text-emerald-300 mb-2">
              Talking avatar videos
            </div>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold ${
              true ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
            }`}>
              {true ? 'Active' : 'Inactive'}
            </div>
          </motion.div>
        </div>

        {/* Row 4: Kaiber, HeyGen (duplicate), D-ID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Kaiber */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.6 }}
            className="bg-gradient-to-br from-violet-900/20 to-violet-800/10 p-4 rounded-xl border-2 border-violet-500/40 hover:border-violet-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center border border-violet-500/40">
                <img src="/logos/kaiber.svg" alt="Kaiber" className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-violet-300">Kaiber</div>
                <div className="text-sm text-violet-200">AI Video Creation</div>
              </div>
            </div>
            <div className="text-xs text-violet-300 mb-2">
              Creative video generation
            </div>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold ${
              false ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
            }`}>
              {false ? 'Active' : 'Inactive'}
            </div>
          </motion.div>

          {/* HeyGen (duplicate - keeping as requested) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.7 }}
            className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 p-4 rounded-xl border-2 border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center border border-emerald-500/40">
                <img src="/logos/heygen.svg" alt="HeyGen" className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-300">HeyGen</div>
                <div className="text-sm text-emerald-200">Avatar Video AI</div>
              </div>
            </div>
            <div className="text-xs text-emerald-300 mb-2">
              Talking avatar videos
            </div>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold ${
              true ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
            }`}>
              {true ? 'Active' : 'Inactive'}
            </div>
          </motion.div>

          {/* D-ID */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.8 }}
            className="bg-gradient-to-br from-rose-900/20 to-rose-800/10 p-4 rounded-xl border-2 border-rose-500/40 hover:border-rose-400/60 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-rose-500/20 rounded-lg flex items-center justify-center border border-rose-500/40">
                <img src="/logos/d-id.svg" alt="D-ID" className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-rose-300">D-ID</div>
                <div className="text-sm text-rose-200">Digital Human AI</div>
              </div>
            </div>
            <div className="text-xs text-rose-300 mb-2">
              Digital human creation
            </div>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold ${
              false ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
            }`}>
              {false ? 'Active' : 'Inactive'}
            </div>
          </motion.div>
        </div>
            </>
          )}
      </div>

      {/* Row 4: Production Assets */}
      <div className="p-6 border-t border-gray-700/50">
        <div className="flex items-center gap-3 mb-4">
          <Download className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Production Assets</h3>
          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsProductionAssetsExpanded(!isProductionAssetsExpanded)}
              className="text-gray-400 hover:text-white"
            >
              {isProductionAssetsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Link href="/dashboard/settings/integrations">
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-500/50 text-emerald-300 hover:text-white hover:border-emerald-400/70"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Assets
              </Button>
            </Link>
          </div>
        </div>
        
        {isProductionAssetsExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Scripts */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.9 }}
            className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">24</div>
                <div className="text-sm text-gray-300">Scripts</div>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              Finalized scripts
            </div>
          </motion.div>

          {/* Storyboards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 2.0 }}
            className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">18</div>
                <div className="text-sm text-gray-300">Storyboards</div>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              Visual planning
            </div>
          </motion.div>

          {/* Scene Direction */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 2.1 }}
            className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">12</div>
                <div className="text-sm text-gray-300">Scene Direction</div>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              Director's notes
            </div>
          </motion.div>

          {/* Videos */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 2.2 }}
            className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">8</div>
                <div className="text-sm text-gray-300">Videos</div>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              Final videos
            </div>
          </motion.div>

          {/* Storage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 2.3 }}
            className="bg-gray-800 p-4 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💾</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">2.4 GB</div>
                <div className="text-sm text-gray-300">Used</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-2">
              of 10 GB available
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                style={{ width: '24%' }}
              ></div>
            </div>
          </motion.div>
        </div>
        )}
      </div>
    </motion.div>
  )
}

