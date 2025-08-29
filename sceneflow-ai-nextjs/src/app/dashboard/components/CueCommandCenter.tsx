'use client'

import { motion } from 'framer-motion'
import { Sparkles, MessageSquare, Zap, Settings, Send, Lightbulb, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { useState } from 'react'

export function CueCommandCenter() {
  const [userInput, setUserInput] = useState('')
  
  // Mock data for proactive interaction - replace with real backend data
  const insight = "I've analyzed 'Project Alpha'. The script (Step 1) is finalized and ready for the Vision Board (Step 2). Estimated time to completion: 2-3 hours.";
  
  // Suggestions integrated with estimated costs based on the Credit Consumption Model
  const suggestions = [
    { 
      label: "Generate Professional Storyboard", 
      cost: 40,
      description: "Transform script into visual storyboard",
      action: "storyboard"
    },
    { 
      label: "Review Series Bible Consistency", 
      cost: null,
      description: "Analyze project coherence and continuity",
      action: "review"
    },
    { 
      label: "Analyze Scene 4 for Guardrail Compliance", 
      cost: 5,
      description: "Check scene against content guidelines",
      action: "analyze"
    },
    { 
      label: "Start a new project idea", 
      cost: null,
      description: "Begin creative ideation process",
      action: "ideate"
    },
  ];

  const handleSuggestionClick = (suggestion: any) => {
    // Handle suggestion click - could open Cue chat or navigate to specific workflow
    console.log('Suggestion clicked:', suggestion)
    // TODO: Integrate with Cue chat system
  }

  const handleSendMessage = () => {
    if (userInput.trim()) {
      // Handle sending message to Cue
      console.log('Sending message:', userInput)
      // TODO: Integrate with Cue chat system
      setUserInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="w-full bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-2xl border border-indigo-500/30 shadow-2xl overflow-hidden"
    >
      {/* Header with Welcome Message */}
      <div className="p-8 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome back, Demo User 👋</h1>
              <p className="text-gray-400 mt-2 text-lg">Your AI-powered creative workflow hub</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className="border-indigo-500/50 text-indigo-300 hover:text-white hover:border-indigo-400/70"
            >
              <Settings className="w-5 h-5 mr-2" />
              Configure
            </Button>
          </div>
        </div>
      </div>

      {/* Cue's Insight (Proactive Context) */}
      <div className="p-8 border-b border-gray-700/50">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white mb-2">✨ Cue's Insight</h2>
            <p className="text-lg text-gray-200 leading-relaxed">
              {insight}
            </p>
          </div>
        </div>

        {/* Suggestion Chips/Buttons */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-gray-300 text-base font-medium">Recommended Actions:</span>
            <CreditCard className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex flex-wrap gap-3">
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
                onClick={() => handleSuggestionClick(suggestion)}
                className="group bg-indigo-700/50 hover:bg-indigo-700/70 px-5 py-3 rounded-full transition-all duration-200 text-white font-medium border border-indigo-500/30 hover:border-indigo-400/50"
              >
                <div className="flex items-center gap-2">
                  <span>{suggestion.label}</span>
                  {suggestion.cost && (
                    <span className="text-xs text-indigo-200 bg-indigo-800/50 px-2 py-1 rounded-full">
                      Est. {suggestion.cost} Credits
                    </span>
                  )}
                </div>
                <div className="text-xs text-indigo-200 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {suggestion.description}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Conversational Input */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Ask Cue to analyze, create, or execute a task...</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., 'Analyze my script for pacing issues' or 'Create a storyboard for scene 3'..."
                className="w-full p-4 rounded-lg bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 text-white placeholder-gray-400"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!userInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
          </div>
          <div className="mt-3 text-sm text-gray-400">
            💡 <strong>Pro tip:</strong> Be specific about what you want Cue to do. Include context about your project, scene, or workflow step for better results.
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="p-8">
        <h3 className="text-xl font-semibold text-white mb-6">Quick Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Project Management */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-indigo-500/50 transition-all duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white">Project Management</h4>
            </div>
            <div className="space-y-3">
              <Link href="/dashboard/workflow/ideation">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Start New Project
                </Button>
              </Link>
              <Link href="/dashboard/projects">
                <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
                  Continue Project
                </Button>
              </Link>
            </div>
          </div>

          {/* Templates & Inspiration */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-indigo-500/50 transition-all duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white">Templates & Inspiration</h4>
            </div>
            <div className="space-y-3">
              <Link href="/dashboard/templates">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                  Browse Templates
                </Button>
              </Link>
              <Link href="/dashboard/inspiration">
                <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
                  Get Inspired
                </Button>
              </Link>
            </div>
          </div>

          {/* AI Assistance */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-indigo-500/50 transition-all duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white">AI Assistance</h4>
            </div>
            <div className="space-y-3">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                Chat with Cue
              </Button>
              <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
                View Analytics
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
