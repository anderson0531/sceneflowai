'use client'

import { motion } from 'framer-motion'
import { Sparkles, MessageSquare, Zap, Settings, Send, Lightbulb, CreditCard, Menu, HelpCircle } from 'lucide-react'
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
      <div className="p-6 md:p-8 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Welcome back, Demo User 👋</h1>
              <p className="text-gray-400 mt-2 text-base md:text-lg">Your AI-powered creative workflow hub</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-indigo-500/50 text-indigo-300 hover:text-white hover:border-indigo-400/70"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </Button>
            <Link href="/help" className="text-gray-300 hover:text-white transition-colors duration-200">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-500/50 text-gray-300 hover:text-white hover:border-gray-400/70"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-500/50 text-gray-300 hover:text-white hover:border-gray-400/70"
            >
              <Menu className="w-4 h-4 mr-2" />
              Menu
            </Button>
          </div>
        </div>
      </div>

                     {/* Cue's Insight (Proactive Context) */}
               <div className="p-6 md:p-8 border-b border-gray-700/50">
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

                         {/* Suggestion Cards - Only 2 */}
                 <div className="mb-8">
                   <div className="flex items-center gap-3 mb-4">
                     <span className="text-gray-300 text-base font-medium">Recommended Actions:</span>
                     <CreditCard className="w-5 h-5 text-indigo-400" />
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {suggestions.slice(0, 2).map((suggestion, index) => (
                       <motion.div
                         key={index}
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
                         className="group bg-indigo-700/20 hover:bg-indigo-700/30 p-4 rounded-xl transition-all duration-200 border border-indigo-500/30 hover:border-indigo-400/50 cursor-pointer"
                         onClick={() => handleSuggestionClick(suggestion)}
                       >
                         <div className="flex items-start justify-between mb-3">
                           <h4 className="text-sm font-semibold text-white">{suggestion.label}</h4>
                           {suggestion.cost && (
                             <span className="text-xs text-indigo-200 bg-indigo-800/50 px-2 py-1 rounded-full">
                               Est. {suggestion.cost} Credits
                             </span>
                           )}
                         </div>
                         <p className="text-xs text-indigo-200 leading-relaxed">
                           {suggestion.description}
                         </p>
                       </motion.div>
                     ))}
                   </div>
                 </div>

                         {/* Ask Cue Button */}
                 <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
                   <h3 className="text-lg font-semibold text-white mb-4">Need help with your project?</h3>
                   <Button
                     onClick={() => handleSuggestionClick({ action: 'ask-cue' })}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg transition-all duration-200 flex items-center gap-2 mx-auto"
                   >
                     <MessageSquare className="w-5 h-5" />
                     Ask Cue
                   </Button>
                   <div className="mt-3 text-sm text-gray-400">
                     💡 <strong>Pro tip:</strong> Cue can help analyze scripts, create storyboards, and guide your workflow
                   </div>
                 </div>
      </div>

                     {/* Quick Access Grid */}
               <div className="p-6 md:p-8">
                 <h3 className="text-xl font-semibold text-white mb-6">Quick Access</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                   {/* Project Management */}
                   <div className="bg-gray-800/50 rounded-xl p-4 md:p-6 border border-gray-700 hover:border-indigo-500/50 transition-all duration-200">
                     <div className="flex items-center gap-3 mb-4">
                       <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                         <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" />
                       </div>
                       <h4 className="text-base md:text-lg font-semibold text-white">Project Management</h4>
                     </div>
                     <div className="space-y-3">
                       <Link href="/dashboard/projects/new">
                         <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                           The Spark Studio
                         </Button>
                       </Link>
                       <Link href="/dashboard/projects">
                         <Button size="sm" variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
                           Continue Project
                         </Button>
                       </Link>
                     </div>
                   </div>

                   {/* Templates & Inspiration */}
                   <div className="bg-gray-800/50 rounded-xl p-4 md:p-6 border border-gray-700 hover:border-indigo-500/50 transition-all duration-200">
                     <div className="flex items-center gap-3 mb-4">
                       <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                         <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                       </div>
                       <h4 className="text-base md:text-lg font-semibold text-white">Templates & Inspiration</h4>
                     </div>
                     <div className="space-y-3">
                       <Link href="/dashboard/templates">
                         <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                           Browse Templates
                         </Button>
                       </Link>
                       <Link href="/dashboard/inspiration">
                         <Button size="sm" variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
                           Get Inspired
                         </Button>
                       </Link>
                     </div>
                   </div>

                   {/* AI Assistance */}
                   <div className="bg-gray-800/50 rounded-xl p-4 md:p-6 border border-gray-700 hover:border-indigo-500/50 transition-all duration-200 sm:col-span-2 lg:col-span-1">
                     <div className="flex items-center gap-3 mb-4">
                       <div className="w-8 h-8 md:w-10 md:h-10 bg-green-600 rounded-lg flex items-center justify-center">
                         <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-white" />
                       </div>
                       <h4 className="text-base md:text-lg font-semibold text-white">AI Assistance</h4>
                     </div>
                     <div className="space-y-3">
                       <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white">
                         Chat with Cue
                       </Button>
                       <Button size="sm" variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
                         View Analytics
                       </Button>
                     </div>
                   </div>
                 </div>
               </div>
    </motion.div>
  )
}
