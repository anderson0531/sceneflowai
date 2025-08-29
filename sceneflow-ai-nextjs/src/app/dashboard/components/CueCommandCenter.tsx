'use client'

import { motion } from 'framer-motion'
import { Sparkles, MessageSquare, Zap, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function CueCommandCenter() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="w-full bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-8 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Cue Command Center</h1>
              <p className="text-gray-400 mt-2 text-lg">Your AI-powered creative workflow hub</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className="border-gray-600/50 text-gray-300 hover:text-white hover:border-gray-500/70"
            >
              <Settings className="w-5 h-5 mr-2" />
              Configure
            </Button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/dashboard/workflow/ideation">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12">
                  <Zap className="w-5 h-5 mr-2" />
                  Start New Project
                </Button>
              </Link>
              <Link href="/dashboard/templates">
                <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 h-12">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Browse Templates
                </Button>
              </Link>
              <Link href="/dashboard/projects">
                <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 h-12">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Continue Project
                </Button>
              </Link>
            </div>
          </div>

          {/* AI Status */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">AI Status</h3>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-medium">All Systems Operational</span>
              </div>
              <div className="space-y-2 text-sm text-gray-300">
                <div>• Gemini 2.0 Flash: Active</div>
                <div>• OpenAI GPT-4o: Standby</div>
                <div>• BYOK Integrations: Ready</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400">2 minutes ago</div>
                <div className="text-white font-medium">Project "Crispr Debate" updated</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400">15 minutes ago</div>
                <div className="text-white font-medium">New template "Educational Series" created</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400">1 hour ago</div>
                <div className="text-white font-medium">Video generation completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
