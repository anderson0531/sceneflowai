'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Send, Mic, Plus, Zap, TrendingUp, Lightbulb, Play } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

interface QuickAction {
  label: string
  icon: React.ReactNode
  action: string
  description?: string
}

export function CueCommandBar() {
  const { data: session } = useSession()
  const [userInput, setUserInput] = useState('')
  
  // Get user's first name from session
  // If name looks like a username (no spaces, matches email prefix), use a friendly fallback
  const userName = useMemo(() => {
    const name = session?.user?.name
    const email = session?.user?.email
    
    // If we have a proper name with spaces, use the first part
    if (name && name.includes(' ')) {
      return name.split(' ')[0]
    }
    
    // If name equals email prefix (username fallback from auth), try to make it friendlier
    const emailPrefix = email?.split('@')[0]
    if (name && name === emailPrefix) {
      // Known user mapping for existing accounts without first_name in DB
      const knownUsers: Record<string, string> = {
        'anderson0531': 'Brian',
      }
      if (knownUsers[name]) {
        return knownUsers[name]
      }
    }
    
    // Use whatever name we have
    if (name) {
      return name.split(' ')[0]
    }
    
    return 'there'
  }, [session?.user?.name, session?.user?.email])

  const quickActions: QuickAction[] = [
    { label: 'Save Credits', icon: <Zap className="w-3 h-3" />, action: 'save-credits', description: 'Optimize for cost' },
    { label: 'Improve Scores', icon: <TrendingUp className="w-3 h-3" />, action: 'improve-scores', description: 'Boost review ratings' },
    { label: 'Budget Tips', icon: <Lightbulb className="w-3 h-3" />, action: 'budget-tips', description: 'AI recommendations' },
    { label: 'Continue Project', icon: <Play className="w-3 h-3" />, action: 'continue', description: 'Resume workflow' },
  ]

  const handleSendMessage = () => {
    if (userInput.trim()) {
      console.log('Sending message to Cue:', userInput)
      setUserInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }

  const handleQuickAction = (action: string) => {
    console.log('Quick action:', action)
    // TODO: Integrate with Cue chat system
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-xl border border-indigo-500/20 shadow-lg p-4"
    >
      <div className="flex items-center gap-4">
        {/* Welcome + Input */}
        <div className="flex-1 flex items-center gap-4">
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-white">
              Welcome back, <span className="text-indigo-400">{userName}</span>
            </h2>
          </div>
          
          <div className="flex-1 relative">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="💬 How can I help today?"
              className="bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button 
                onClick={handleSendMessage}
                className="p-1.5 text-gray-400 hover:text-indigo-400 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-gray-400 hover:text-indigo-400 transition-colors">
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="hidden lg:flex items-center gap-2">
          {quickActions.map((action) => (
            <button
              key={action.action}
              onClick={() => handleQuickAction(action.action)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/80 hover:bg-indigo-600/20 border border-gray-700 hover:border-indigo-500/50 rounded-lg text-xs text-gray-300 hover:text-indigo-300 transition-all duration-200"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* New Project Button */}
        <Link href="/dashboard/studio/new-project">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Project</span>
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

export default CueCommandBar
