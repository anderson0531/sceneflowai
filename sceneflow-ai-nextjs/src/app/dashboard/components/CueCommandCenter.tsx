'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Lightbulb, CreditCard, MessageSquare, Send } from 'lucide-react'
import ClapperIcon from '@/components/icons/ClapperIcon'
import { useAuth } from '@/contexts/AuthContext'

export default function CueCommandCenter() {
  const { user } = useAuth()
  const [userInput, setUserInput] = useState('')
  const [insight, setInsight] = useState('Based on your recent activity, I notice you\'ve been working on video projects. Would you like me to help you optimize your workflow or suggest some creative ideas for your next project?')
  const [suggestions] = useState([
    {
      label: 'Generate Storyboard',
      description: 'Create a detailed storyboard for your video concept',
      action: 'generate-storyboard',
      cost: 50
    },
    {
      label: 'Script Analysis',
      description: 'Get AI-powered feedback on your script structure and pacing',
      action: 'analyze-script',
      cost: 25
    },
    {
      label: 'Video Concept',
      description: 'Develop a creative video concept from your initial idea',
      action: 'concept-development',
      cost: 75
    },
    {
      label: 'Workflow Optimization',
      description: 'Optimize your production workflow for efficiency',
      action: 'optimize-workflow',
      cost: 30
    }
  ])

  // Mock data for proactive interaction - replace with real backend data
  // const insight = "I've analyzed 'Project Alpha'. The script (Step 1) is finalized and ready for the Vision Board (Step 2). Estimated time to completion: 2-3 hours.";
  
  // Suggestions integrated with estimated costs based on the Credit Consumption Model
  // const suggestions = [
  //   { 
  //     label: "Generate Professional Storyboard", 
  //     cost: 40,
  //     description: "Transform script into visual storyboard",
  //     action: "storyboard"
  //   },
  //   { 
  //     label: "Review Series Bible Consistency", 
  //     cost: null,
  //     description: "Analyze project coherence and continuity",
  //     action: "review"
  //   },
  //   { 
  //     label: "Analyze Scene 4 for Guardrail Compliance", 
  //     cost: 5,
  //     description: "Check scene against content guidelines",
  //     action: "analyze"
  //   },
  //   { 
  //     label: "Start a new project idea", 
  //     cost: null,
  //     description: "Begin creative ideation process",
  //     action: "ideate"
  //   },
  // ];

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
      className="w-full bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-2xl border border-indigo-500/10 shadow-2xl overflow-hidden"
    >
      {/* Header with Welcome Message */}
      <div className="relative isolate overflow-hidden py-16 md:py-20 border-b border-blue-500/10 bg-gradient-to-r from-gray-700/90 via-gray-800/85 to-gray-900/95 backdrop-blur-sm">
        {/* Atmospheric Background Effect */}
        <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
          <div className="relative left-[calc(25%)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tl from-indigo-600 to-purple-600 opacity-20 sm:w-[72.1875rem]"
               style={{clipPath: "polygon(25.9% 44.1%, 0% 61.6%, 2.5% 26.9%, 14.5% 0.1%, 19.3% 2%, 27.5% 32.5%, 39.8% 62.4%, 47.6% 68.1%, 52.5% 58.3%, 54.8% 34.5%, 72.5% 76.7%, 99.9% 64.9%, 82.1% 100%, 72.4% 76.8%, 23.9% 97.7%, 25.9% 44.1%)"}}>
          </div>
        </div>
        
        {/* Content Container */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-6 mb-2">
            <div className="w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
              {/* Professional Scene Clapperboard Icon */}
              <ClapperIcon className="w-120 h-120 md:w-144 md:h-144 text-gray-100 transition duration-300 ease-in-out hover:scale-110" />
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-gray-200 to-white tracking-tight">
                Welcome back, {(user?.first_name || user?.name?.split(' ')[0] || 'Friend')}
              </h1>
              <p className="text-gray-300 text-2xl md:text-3xl mt-3 font-medium">Your AI-powered creative expert production studio</p>
            </div>
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
                 <div className="bg-gray-800/50 rounded-xl p-4 md:p-5 border border-gray-700 text-center">
                   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                     <div className="flex-1 text-left">
                       <h3 className="text-base md:text-lg font-semibold text-white mb-1">Need help with your project?</h3>
                       <p className="text-xs md:text-sm text-gray-400">
                         💡 Cue can help analyze scripts, create storyboards, and guide your workflow
                       </p>
                     </div>
                     <Button
                       onClick={() => handleSuggestionClick({ action: 'ask-cue' })}
                       size="sm"
                       className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 flex-shrink-0"
                     >
                       <MessageSquare className="w-4 h-4" />
                       Ask Cue
                     </Button>
                   </div>
                 </div>
      </div>

                     {/* Production Analytics */}
               <div className="p-6 md:p-8">
                 <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                     <h3 className="text-xl font-semibold text-white">Production Analytics</h3>
                     <span className="text-sm text-gray-400">(Last 30 Days)</span>
                   </div>
                   {/* <Link href="/dashboard/analytics" className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200">
                     Go to Analytics Hub →
                   </Link> */}
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

                   {/* Total Output Screenplays */}
                   <div className="bg-gray-800/50 rounded-xl p-4 md:p-6 border border-gray-700">
                     <div className="text-sm text-gray-400 mb-2">Total Output Screenplays</div>
                     <div className="text-2xl md:text-3xl font-bold text-green-400 mb-2">12 Scripts</div>
                     <div className="text-xs text-gray-400">Completed story development</div>
                   </div>

                   {/* Total Output Storyboards */}
                   <div className="bg-gray-800/50 rounded-xl p-4 md:p-6 border border-gray-700">
                     <div className="text-sm text-gray-400 mb-2">Total Output Storyboards</div>
                     <div className="text-2xl md:text-3xl font-bold text-purple-400 mb-2">8 Boards</div>
                     <div className="text-xs text-gray-400">Visual planning completed</div>
                   </div>

                   {/* Total Output Scene Direction */}
                   <div className="bg-gray-800/50 rounded-xl p-4 md:p-6 border border-gray-700">
                     <div className="text-sm text-gray-400 mb-2">Total Output Scene Direction</div>
                     <div className="text-2xl md:text-3xl font-bold text-orange-400 mb-2">6 Scenes</div>
                     <div className="text-xs text-gray-400">Direction & control setup</div>
                   </div>

                   {/* Total Output Videos */}
                   <div className="bg-gray-800/50 rounded-xl p-4 md:p-6 border border-gray-700">
                     <div className="text-sm text-gray-400 mb-2">Total Output Videos</div>
                     <div className="text-2xl md:text-3xl font-bold text-white mb-2">8 Videos</div>
                     <div className="text-xs text-gray-400">Totaling 24 minutes generated</div>
                   </div>
                 </div>
               </div>
    </motion.div>
  )
}
