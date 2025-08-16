'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  MessageCircle, 
  X, 
  Send, 
  Sparkles,
  Play,
  Settings,
  HelpCircle,
  TrendingUp
} from 'lucide-react'
import { useStore } from '@/store/useStore'

const suggestedResponses = [
  'Start Tour',
  'Social Tips', 
  'How do I configure BYOK?',
  'Show me the workflow steps',
  'What are credits used for?',
  'Help me brainstorm ideas'
]

const dashboardKnowledge = {
  tour: "Welcome to SceneFlow AI! Here's your dashboard tour:\n\n🎯 **Quick Actions**: Start new projects or continue existing ones\n💳 **Credit Status**: Monitor your AI generation credits\n📁 **Project Hub**: Manage your video projects\n⚙️ **Studio Utilities**: Access settings and tools\n\nReady to create your first video? Click 'Create New Project' to get started!",
  byok: "BYOK (Bring Your Own Key) configuration:\n\n1. Go to **Settings** → **BYOK Configuration**\n2. Add your Google Gemini API key for text generation\n3. Add your Google Veo API key for video generation\n4. This gives you direct control over costs and no rate limiting\n\nBenefits: Lower costs, better performance, full control over your AI providers.",
  workflow: "SceneFlow AI has a 4-step workflow:\n\n1️⃣ **Vision Board (Ideation)**: AI-powered concept generation\n2️⃣ **Storyboard**: Visual planning and scene breakdown\n3️⃣ **Director's Chair**: Technical specifications and direction\n4️⃣ **Video Lab**: Final video generation with Google Veo\n\nEach step builds on the previous one, creating a professional video production pipeline.",
  credits: "Credits are consumed for AI operations:\n\n• **Ideation**: 10-25 credits per concept\n• **Storyboarding**: 50-100 credits per storyboard\n• **Scene Direction**: 25-50 credits per scene\n• **Video Generation**: 100-500 credits per video\n\nYour plan includes monthly credits, and you can purchase additional packs ($10 for 100 credits) as needed.",
  social: "Social media video tips:\n\n📱 **Platform Optimization**:\n• Instagram: 15-60 seconds, vertical 9:16\n• TikTok: 15-60 seconds, vertical 9:16\n• YouTube: 15 seconds to 10+ minutes\n• LinkedIn: 30 seconds to 5 minutes\n\n🎬 **Content Strategy**:\n• Hook viewers in first 3 seconds\n• Use trending audio and hashtags\n• Include captions for accessibility\n• End with clear call-to-action"
}

export function CueAssistantWidget() {
  const { 
    cueAssistantOpen, 
    setCueAssistantOpen, 
    cueConversation, 
    addCueMessage, 
    markNotificationsAsRead 
  } = useStore()
  
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [cueConversation.messages])

  useEffect(() => {
    if (cueAssistantOpen) {
      markNotificationsAsRead()
    }
  }, [cueAssistantOpen, markNotificationsAsRead])

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    // Add user message
    addCueMessage({ type: 'user', content })
    setInputValue('')
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const response = generateAIResponse(content)
      addCueMessage({ type: 'assistant', content: response })
      setIsTyping(false)
    }, 1000)
  }

  const generateAIResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase()
    
    if (message.includes('tour') || message.includes('start')) {
      return dashboardKnowledge.tour
    } else if (message.includes('byok') || message.includes('configure') || message.includes('api')) {
      return dashboardKnowledge.byok
    } else if (message.includes('workflow') || message.includes('step')) {
      return dashboardKnowledge.workflow
    } else if (message.includes('credit')) {
      return dashboardKnowledge.credits
    } else if (message.includes('social') || message.includes('tip')) {
      return dashboardKnowledge.social
    } else {
      return "I'm here to help you with SceneFlow AI! I can guide you through the workflow, explain features, help with BYOK configuration, and provide video creation tips. What would you like to know?"
    }
  }

  const handleSuggestedResponse = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <AnimatePresence>
        {!cueAssistantOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              onClick={() => setCueAssistantOpen(true)}
              className="relative w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
            >
              <MessageCircle className="w-6 h-6" />
              
              {/* Notification Badge */}
              {cueConversation.hasUnreadNotifications && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
              
              {/* Hover Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Chat with Cue AI
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Chat Interface */}
      <AnimatePresence>
        {cueAssistantOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col"
          >
            {/* Header */}
            <div className="bg-blue-500 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold">Cue AI Assistant</h3>
                  <p className="text-xs text-blue-100">Your creative partner</p>
                </div>
              </div>
              <button
                onClick={() => setCueAssistantOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {cueConversation.messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Ask me anything about SceneFlow AI!</p>
                </div>
              )}
              
              {cueConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${message.type === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <div
                    className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-800 shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="text-left mb-4">
                  <div className="inline-block bg-white text-gray-800 shadow-sm px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Responses */}
            {cueConversation.messages.length === 0 && (
              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-2">
                  {suggestedResponses.slice(0, 3).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestedResponse(suggestion)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                  placeholder="Ask Cue anything..."
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
