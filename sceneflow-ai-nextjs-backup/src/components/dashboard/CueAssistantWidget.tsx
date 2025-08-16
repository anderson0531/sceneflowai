'use client'

import { useState } from 'react'
// Removed unused useStore import
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  MessageCircle, 
  X, 
  Send, 
  Clapperboard
} from 'lucide-react'
// Removed unused cn import

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const suggestedResponses = [
  'Tell me about pricing plans',
  'What features are included?',
  'How does the $5 trial work?',
  'Show me the workflow steps',
  'Compare Creator vs Pro plans'
]

// Enhanced knowledge base for conversion-focused responses
const featureKnowledge = {
  pricing: {
    trial: "Our $5 trial gives you 7 days of full Creator access with 50 credits. It's perfect for testing our professional-grade AI tools before committing.",
    creator: "The Creator plan ($29/month) includes 150 credits, 1080p rendering, BYOK generation, and multilingual support. Perfect for solo creators.",
    pro: "The Pro plan ($79/month) gives you 500 credits, 4K rendering, team collaboration, advanced analytics, and priority support. Ideal for freelancers.",
    studio: "The Studio plan ($249/month) includes 1600 credits, dedicated account management, white-label options, and custom workflows for agencies."
  },
  features: {
    workflow: "SceneFlow AI has a 4-step workflow: 1) Ideation (AI-powered concept generation), 2) Storyboarding (AI-generated visual planning), 3) Scene Direction (technical specifications), 4) Video Generation (Google Veo-powered clips).",
    byok: "BYOK (Bring Your Own Key) means you use your own Google Gemini API key for generation. This gives you direct control over costs and ensures no rate limiting.",
    credits: "Credits are consumed for AI operations. Each plan includes monthly credits, and you can purchase additional packs ($10 for 100 credits) as needed."
  },
  benefits: {
    time: "Save 80% of pre-production time. What normally takes days now takes minutes with our AI workflow.",
    quality: "Professional-grade output that matches industry standards. Our AI generates production-ready storyboards and technical specs.",
    cost: "The $5 trial is less than a coffee but gives you access to tools that would cost thousands in traditional production."
  }
}

export function CueAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hi! I\'m Cue, your SceneFlow AI expert. I can help you understand our features, pricing, and workflow. What would you like to know about turning your ideas into professional videos?',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const generateExpertResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase()
    
    // Pricing-related responses
    if (message.includes('pricing') || message.includes('plan') || message.includes('cost') || message.includes('price')) {
      if (message.includes('trial') || message.includes('$5')) {
        return featureKnowledge.pricing.trial
      } else if (message.includes('creator')) {
        return featureKnowledge.pricing.creator
      } else if (message.includes('pro')) {
        return featureKnowledge.pricing.pro
      } else if (message.includes('studio') || message.includes('agency')) {
        return featureKnowledge.pricing.studio
      } else {
        return `Here's our pricing structure:\n\n• $5 Trial: 7 days full access, 50 credits\n• Creator: $29/month, 150 credits\n• Pro: $79/month, 500 credits\n• Studio: $249/month, 1600 credits\n\nWhich plan interests you most? I can dive deeper into the details!`
      }
    }
    
    // Feature-related responses
    if (message.includes('feature') || message.includes('workflow') || message.includes('step')) {
      if (message.includes('workflow') || message.includes('step')) {
        return featureKnowledge.features.workflow
      } else if (message.includes('byok')) {
        return featureKnowledge.features.byok
      } else if (message.includes('credit')) {
        return featureKnowledge.features.credits
      } else {
        return `Our key features include:\n\n🎬 AI-powered 4-step workflow\n📱 BYOK integration for cost control\n🎨 Professional storyboard generation\n🎥 High-quality video synthesis\n\nWhat specific aspect would you like me to explain?`
      }
    }
    
    // Benefit-related responses
    if (message.includes('benefit') || message.includes('save') || message.includes('time') || message.includes('quality')) {
      if (message.includes('time')) {
        return featureKnowledge.benefits.time
      } else if (message.includes('quality')) {
        return featureKnowledge.benefits.quality
      } else if (message.includes('cost') || message.includes('value')) {
        return featureKnowledge.benefits.cost
      } else {
        return `The main benefits of SceneFlow AI:\n\n⏰ 80% time savings in pre-production\n🎯 Professional-quality output\n💰 Cost-effective compared to traditional methods\n🚀 Instant AI-powered workflow\n\nWould you like to start with our $5 trial to experience these benefits?`
      }
    }
    
    // Default conversion-focused response
    return `That's a great question! SceneFlow AI is designed to revolutionize your video production workflow. Our $5 trial gives you full access to see the difference.\n\nWhat's your current video production process like? I can show you exactly how we can help!`
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Generate expert response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: generateExpertResponse(content),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 1000)
  }

  const handleSuggestedResponse = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center ${isOpen ? "scale-110" : ""}`}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
        
        {/* Notification Badge */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      </button>

      {/* Chat Interface */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                <Clapperboard className="w-4 h-4 text-gray-900" />
              </div>
              <div>
                <h3 className="font-semibold">Cue AI Assistant</h3>
                <p className="text-xs opacity-90">Your SceneFlow AI Expert</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-3 py-2 rounded-lg text-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggested Responses */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestedResponses.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestedResponse(suggestion)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                placeholder="Ask about features, pricing, or workflow..."
                className="flex-1"
              />
              <Button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim()}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
