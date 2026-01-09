'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Send, 
  Sparkles, 
  Mic,
  MicOff,
  Bot,
  User
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import React from 'react'

interface CueMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: string[]
  completeness_score?: number
  analysis?: {
    narrative_strength: number
    audience_alignment: number
    market_potential: number
  }
  next_questions?: string[]
}

interface CueChatInterfaceProps {
  onConceptUpdate?: (concept: string) => void
  onGenerateIdeas?: (ideas: any[]) => void
  onSceneIteration?: (feedback: string) => void
  initialConcept?: string
  currentConcept?: string
  targetAudience?: string
  keyMessage?: string
  tone?: string
  isStoryboardMode?: boolean
  sceneContext?: any
  compact?: boolean
}

const initialSuggestions = [
  "Help me brainstorm video concepts",
  "What makes a compelling opening?",
  "How do I identify my target audience?",
  "What's the best video length for social media?",
  "How can I make my message more memorable?",
  "What visual elements should I consider?"
]

const storyboardSuggestions = [
  "How can I improve the visual flow?",
  "What camera angles would work best?",
  "How should I adjust the pacing?",
  "What lighting would enhance the mood?",
  "How can I make this scene more engaging?",
  "What audio cues would complement this?"
]

const workflowContext = {
  ideation: {
    suggestions: [
      "Let's explore different video formats",
      "What's your main goal for this video?",
      "Who is your ideal viewer?",
      "What emotion do you want to evoke?",
      "How can we make this concept unique?",
      "What's your call-to-action?"
    ],
    context: "You're in Blueprint — ideation & scripting. Let's develop your video concept together."
  },
  storyboard: {
    suggestions: storyboardSuggestions,
    context: "You're in Vision — the interactive storyboard. Let's refine your scenes for maximum visual impact and storytelling effectiveness."
  }
}

export function CueChatInterface({ onConceptUpdate, onGenerateIdeas, onSceneIteration, initialConcept, currentConcept, targetAudience, keyMessage, tone, isStoryboardMode, sceneContext, compact }: CueChatInterfaceProps): React.JSX.Element {
  const { addCueMessage } = useStore()
  const [messages, setMessages] = useState<CueMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [concept] = useState(initialConcept || '')
  const [overallCompleteness, setOverallCompleteness] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const COMPLETENESS_THRESHOLD = 0.8 // 80% threshold for enabling Generate Ideas button

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const context = isStoryboardMode ? workflowContext.storyboard : workflowContext.ideation
      const suggestions = isStoryboardMode ? storyboardSuggestions : initialSuggestions
      
      const welcomeMessage: CueMessage = {
        id: 'welcome',
        type: 'assistant',
        content: `Welcome to ${isStoryboardMode ? 'Production' : 'Blueprint'}! I'm Cue, your AI creative partner. ${context.context}`,
        timestamp: new Date(),
        suggestions: suggestions,
        completeness_score: 0.1,
        analysis: {
          narrative_strength: 0.1,
          audience_alignment: 0.1,
          market_potential: 0.1
        }
      }
      setMessages([welcomeMessage])
    }
  }, [messages.length, isStoryboardMode])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Update concept when it changes
  useEffect(() => {
    if (concept && onConceptUpdate) {
      onConceptUpdate(concept)
    }
  }, [concept, onConceptUpdate])

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMessage: CueMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Add to global store
    addCueMessage({ type: 'user', content })

    try {
      // Call the real Cue API
      const response = await fetch('/api/ideation/cue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'demo_user_001', // In production, get from auth context
          conversationHistory: [
            ...messages.map(msg => ({
              role: msg.type === 'user' ? 'user' : 'assistant',
              content: msg.content,
              timestamp: msg.timestamp.toISOString()
            })),
            {
              role: 'user',
              content,
              timestamp: new Date().toISOString()
            }
          ],
          currentConcept: {
            title: currentConcept,
            description: concept,
            targetAudience,
            keyMessage,
            tone
          },
          isStoryboardMode,
          sceneContext
        })
      })

      if (response.ok) {
        console.log('🧪 Headers → x-seq-api:', response.headers.get('x-seq-api'), 'provider:', response.headers.get('x-llm-provider'), 'model:', response.headers.get('x-llm-model'))
        const data = await response.json()
        console.log('🧪 Debug payload:', (data as any).debug || (data as any).data?.debug)
        const aiResponse = data.data

        const assistantMessage: CueMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: aiResponse.message,
          timestamp: new Date(),
          suggestions: aiResponse.suggestions,
          completeness_score: aiResponse.completeness_score,
          analysis: {
            narrative_strength: aiResponse.analysis.narrative_strength,
            audience_alignment: aiResponse.analysis.audience_alignment,
            market_potential: aiResponse.analysis.market_potential
          },
          next_questions: aiResponse.next_questions
        }

        setMessages(prev => [...prev, assistantMessage])
        setOverallCompleteness(aiResponse.completeness_score)
        
        // Handle storyboard iteration feedback
        if (isStoryboardMode && onSceneIteration && aiResponse.message) {
          onSceneIteration(aiResponse.message)
        }
      } else {
        // Fallback to simulation if API fails
        const aiResponse = generateDualPersonaResponse(content, [...messages, userMessage])
        const assistantMessage: CueMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: aiResponse.message,
          timestamp: new Date(),
          suggestions: aiResponse.suggestions,
          completeness_score: aiResponse.completeness_score,
          analysis: aiResponse.analysis,
          next_questions: aiResponse.next_questions
        }

        setMessages(prev => [...prev, assistantMessage])
        setOverallCompleteness(aiResponse.completeness_score)
        
        // Handle storyboard iteration feedback
        if (isStoryboardMode && onSceneIteration && aiResponse.message) {
          onSceneIteration(aiResponse.message)
        }
      }
    } catch (error) {
      console.error('Error calling Cue API:', error)
      // Fallback to simulation
      const aiResponse = generateDualPersonaResponse(content, [...messages, userMessage])
      const assistantMessage: CueMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponse.message,
        timestamp: new Date(),
        suggestions: aiResponse.suggestions,
        completeness_score: aiResponse.completeness_score,
        analysis: aiResponse.analysis,
        next_questions: aiResponse.next_questions
      }

              setMessages(prev => [...prev, assistantMessage])
        setOverallCompleteness(aiResponse.completeness_score)
        
        // Handle storyboard iteration feedback
        if (isStoryboardMode && onSceneIteration && aiResponse.message) {
          onSceneIteration(aiResponse.message)
        }
    } finally {
      setIsTyping(false)
    }
  }

  const generateDualPersonaResponse = (userMessage: string, conversation: CueMessage[]): {
    message: string
    suggestions: string[]
    completeness_score: number
    next_questions?: string[]
    analysis: {
      narrative_strength: number
      audience_alignment: number
      market_potential: number
    }
  } => {
    const lowerMessage = userMessage.toLowerCase()
    const conversationContext = conversation.map(msg => msg.content).join(' ').toLowerCase()
    
    // Dual persona analysis based on conversation context
    if (lowerMessage.includes('concept') || lowerMessage.includes('idea') || conversationContext.includes('concept')) {
      return {
        message: "🎬 As your Scriptwriter/Director, I see potential for a compelling narrative arc with emotional beats and visual storytelling opportunities. 📊 As your Audience Analyst, I need to understand who we're speaking to so we can position this for maximum engagement. Let's develop this concept from both angles. What's the core story you want to tell, and who is your ideal viewer?",
        suggestions: [
          "Define your main character or protagonist",
          "Identify the central conflict or challenge",
          "Specify your target audience demographics",
          "Clarify your call-to-action"
        ],
        completeness_score: 0.25,
        next_questions: [
          "What transformation or journey will your audience witness?",
          "What emotions do you want to evoke in your viewers?"
        ],
        analysis: {
          narrative_strength: 0.3,
          audience_alignment: 0.2,
          market_potential: 0.25
        }
      }
    }
    
    if (lowerMessage.includes('audience') || lowerMessage.includes('target') || conversationContext.includes('audience')) {
      return {
        message: "🎯 Excellent! From a narrative perspective, knowing your audience helps us craft the right story beats and emotional pacing. 📈 From an audience analysis standpoint, this demographic data will inform our platform strategy, messaging approach, and engagement tactics. Let's dive deeper into their motivations, pain points, and content consumption patterns.",
        suggestions: [
          "Define age range and lifestyle factors",
          "Identify their primary challenges or goals",
          "Specify where they consume content",
          "Understand their decision-making process"
        ],
        completeness_score: 0.45,
        next_questions: [
          "What would make this audience stop scrolling and pay attention?",
          "How does your message solve their specific problem?"
        ],
        analysis: {
          narrative_strength: 0.4,
          audience_alignment: 0.6,
          market_potential: 0.5
        }
      }
    }
    
    if (lowerMessage.includes('message') || lowerMessage.includes('goal') || conversationContext.includes('message')) {
      return {
        message: "✨ Perfect! As your Scriptwriter, I can see the narrative structure taking shape with clear story beats and character development. 🎯 As your Audience Analyst, I'm assessing message resonance, competitive positioning, and market differentiation. Your core message is clear, but let's ensure it's positioned for maximum impact and engagement across your target platforms.",
        suggestions: [
          "Refine your key message into a single sentence",
          "Identify supporting points or evidence",
          "Define your unique value proposition",
          "Craft your call-to-action"
        ],
        completeness_score: 0.65,
        next_questions: [
          "What makes your message different from competitors?",
          "How will you measure the success of this video?"
        ],
        analysis: {
          narrative_strength: 0.7,
          audience_alignment: 0.6,
          market_potential: 0.65
        }
      }
    }
    
    if (lowerMessage.includes('tone') || lowerMessage.includes('style') || conversationContext.includes('tone')) {
      return {
        message: "🎭 As your Scriptwriter, the tone and style will influence everything from dialogue pacing to visual aesthetics and emotional resonance. 📊 As your Audience Analyst, the style must align with platform expectations, audience preferences, and brand positioning. Let's define a tone that serves both your creative vision and strategic goals.",
        suggestions: [
          "Professional and authoritative",
          "Friendly and approachable",
          "Energetic and exciting",
          "Calm and reassuring",
          "Humorous and entertaining"
        ],
        completeness_score: 0.55,
        next_questions: [
          "How does this tone align with your brand voice?",
          "What emotional response are you aiming for?"
        ],
        analysis: {
          narrative_strength: 0.6,
          audience_alignment: 0.5,
          market_potential: 0.55
        }
      }
    }
    
    if (lowerMessage.includes('length') || lowerMessage.includes('duration') || conversationContext.includes('duration')) {
      return {
        message: "⏱️ As your Scriptwriter, video length affects pacing, story structure, and emotional arc development. 📱 As your Audience Analyst, duration impacts platform optimization, viewer retention, and engagement metrics. Let's find the sweet spot that serves both your creative vision and audience behavior patterns.",
        suggestions: [
          "Instagram/TikTok (15-60s) - Hook, story, CTA",
          "YouTube (2-10min) - Deep dive with engagement",
          "LinkedIn (1-3min) - Professional and concise",
          "Website landing page (30s-2min) - Conversion focused",
          "Training material (5-15min) - Educational depth"
        ],
        completeness_score: 0.4,
        next_questions: [
          "What's your primary platform for this video?",
          "How much time do you have to grab attention?"
        ],
        analysis: {
          narrative_strength: 0.4,
          audience_alignment: 0.4,
          market_potential: 0.4
        }
      }
    }
    
    // Default response with dual persona
    return {
      message: "🤔 I'm analyzing this from both creative and strategic perspectives. 🎬 As your Scriptwriter, I'm looking for the story elements that will captivate viewers and create emotional connections. 📊 As your Audience Analyst, I'm assessing market positioning, engagement potential, and competitive landscape. Let's explore this further to develop a concept that's both creatively compelling and strategically sound.",
      suggestions: [
        "Share more about your concept",
        "Define your target audience",
        "Clarify your main message",
        "Specify your goals"
      ],
      completeness_score: 0.15,
      next_questions: [
        "What inspired this video concept?",
        "Who do you imagine watching this?"
      ],
      analysis: {
        narrative_strength: 0.2,
        audience_alignment: 0.1,
        market_potential: 0.15
      }
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  const toggleVoiceInput = () => {
    setIsListening(!isListening)
    // In a real app, this would integrate with speech recognition
  }

  const handleGenerateIdeas = async () => {
    // Allow triggering even if completeness is low; UI still communicates readiness

    setIsGenerating(true)
    
    try {
      // Call the idea generation API
      const response = await fetch('/api/ideation/generate-sequential', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: concept || currentConcept || '',
          targetAudience: targetAudience || 'General Audience',
          keyMessage: keyMessage || (concept || ''),
          tone: tone || 'Professional',
          genre: 'Educational',
          duration: 60,
          platform: 'Multi-platform',
          provider: 'openai',
          model: 'gpt-5'
        })
      })

      if (response.ok) {
        const data = await response.json()
        const { combined_result } = data.data
        const ideas = combined_result.video_concepts
        const conceptSummary = {
          genre: 'Documentary',
          estimatedDuration: 60,
          targetAudience: 'General Audience',
          keyMessage: combined_result.script_analysis.core_themes.join(', '),
          tone: 'Professional'
        }
        const generationMetadata = {
          provider: 'Google Gemini 2.0 Flash',
          timestamp: new Date().toISOString(),
          processingTime: 'Sequential processing',
          totalIdeas: ideas.length,
          averageStrengthRating: ideas.reduce((sum: number, idea: any) => sum + (idea.strength_rating || 4.0), 0) / ideas.length,
          strongestIdea: ideas.reduce((strongest: any, current: any) => 
            (current.strength_rating || 4.0) > (strongest.strength_rating || 4.0) ? current : strongest, 
            ideas[0]
          ),
          generationTimestamp: new Date().toISOString()
        }
        
        // Add a success message with generated ideas
        const successMessage: CueMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `🎉 Excellent! I've generated ${ideas.length} distinct video ideas based on your refined concept. Here's what I created for you:`,
          timestamp: new Date(),
          suggestions: [
            'Review all generated ideas',
            'Select your preferred direction',
            'Move to the next workflow step'
          ],
          completeness_score: overallCompleteness,
          analysis: {
            narrative_strength: 0.9,
            audience_alignment: 0.9,
            market_potential: 0.9
          }
        }
        
        setMessages(prev => [...prev, successMessage])
        
        // Add each generated idea as a separate message
        ideas.forEach((idea: any, index: number) => {
          const ideaMessage: CueMessage = {
            id: `idea-${Date.now()}-${index}`,
            type: 'assistant',
            content: `💡 **${idea.title}** (Rating: ${idea.strength_rating}/5)\n\n${idea.synopsis}\n\n**Scene Outline:**\n${idea.scene_outline.map((scene: string, i: number) => `${i + 1}. ${scene}`).join('\n')}\n\n**Thumbnail Prompt:** ${idea.thumbnail_prompt}`,
            timestamp: new Date(),
            suggestions: [
              'Select this idea',
              'Refine this concept',
              'Generate variations'
            ],
            completeness_score: idea.strength_rating / 5,
            analysis: {
              narrative_strength: idea.strength_rating / 5,
              audience_alignment: idea.strength_rating / 5,
              market_potential: idea.strength_rating / 5
            }
          }
          
          setMessages(prev => [...prev, ideaMessage])
        })
        
        // Add summary message
        const summaryMessage: CueMessage = {
          id: `summary-${Date.now()}`,
          type: 'assistant',
          content: `📊 **Generation Summary:**\n• Total Ideas: ${generationMetadata.totalIdeas}\n• Average Rating: ${generationMetadata.averageStrengthRating}/5\n• Strongest Idea: ${generationMetadata.strongestIdea.title}\n• Generated: ${new Date(generationMetadata.generationTimestamp).toLocaleString()}\n\nYour concept is now ready for the next phase!`,
          timestamp: new Date(),
          suggestions: [
            'Select your favorite idea',
            'Refine any concepts',
            'Proceed to storyboarding'
          ],
          completeness_score: 1.0,
          analysis: {
            narrative_strength: 1.0,
            audience_alignment: 1.0,
            market_potential: 1.0
          }
        }
        
        setMessages(prev => [...prev, summaryMessage])
        
        // Call the onGenerateIdeas callback if provided
        if (onGenerateIdeas) {
          await onGenerateIdeas(ideas)
        }
        
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
    } catch (error) {
      console.error('Error generating ideas:', error)
      
      // Add an error message to the chat
      const errorMessage: CueMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: '❌ Sorry, there was an error generating ideas. Please try again or contact support if the issue persists.',
        timestamp: new Date(),
        suggestions: [
          'Try again',
          'Check your concept details',
          'Contact support'
        ],
        completeness_score: overallCompleteness,
        analysis: {
          narrative_strength: 0.8,
          audience_alignment: 0.8,
          market_potential: 0.8
        }
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className={`rounded-xl overflow-hidden ${compact ? 'bg-sf-surface border border-sf-border' : 'bg-white border border-gray-200'}`}>
      {/* Header */}
      <div className={compact ? 'p-3 border-b border-sf-border' : 'bg-gradient-to-r from-blue-600 to-purple-600 p-4'}>
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${compact ? 'bg-sf-gradient' : 'bg-white/20'}`}>
            <Sparkles className={`w-4 h-4 ${compact ? 'text-sf-background' : 'text-white'}`} />
          </div>
          <div>
            <h3 className={`font-semibold ${compact ? 'text-sf-text-primary' : 'text-white'}`}>Cue AI Assistant</h3>
            <p className={`text-sm ${compact ? 'text-sf-text-secondary' : 'text-blue-100'}`}>Your creative partner for ideation</p>
          </div>
        </div>
        
        {/* Overall Progress */}
        <div className="mt-3">
          <div className={`flex items-center justify-between text-sm mb-1 ${compact ? 'text-sf-text-secondary' : 'text-white'}`}>
            <span>Concept Completeness</span>
            <span>{Math.round(overallCompleteness * 100)}%</span>
          </div>
          <div className={`w-full rounded-full h-2 mb-2 ${compact ? 'bg-sf-surface-light' : 'bg-white/20'}`}>
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                overallCompleteness >= COMPLETENESS_THRESHOLD 
                  ? (compact ? 'bg-sf-primary' : 'bg-green-400') 
                  : overallCompleteness >= 0.6 
                    ? (compact ? 'bg-sf-accent' : 'bg-yellow-400') 
                    : (compact ? 'bg-sf-border' : 'bg-orange-400')
              }`}
              style={{ width: `${overallCompleteness * 100}%` }}
            />
          </div>
          
          {/* Generate Ideas Button */}
          <div className="flex items-center justify-between">
            <div className={`text-sm ${compact ? 'text-sf-text-secondary' : 'text-white/80'}`}>
              {overallCompleteness >= COMPLETENESS_THRESHOLD 
                ? '✅ Concept ready for idea generation!' 
                : `📝 ${Math.round((COMPLETENESS_THRESHOLD - overallCompleteness) * 100)}% more needed`
              }
            </div>
            <Button
              onClick={handleGenerateIdeas}
              disabled={overallCompleteness < COMPLETENESS_THRESHOLD || isGenerating}
              size="sm"
              className={`transition-all duration-200 ${
                overallCompleteness >= COMPLETENESS_THRESHOLD
                  ? (compact ? 'bg-sf-primary hover:bg-sf-accent text-sf-background' : 'bg-sf-primary hover:bg-sf-accent text-sf-background')
                  : (compact ? 'bg-sf-surface-light text-sf-text-secondary cursor-not-allowed' : 'bg-sf-surface-light text-sf-text-secondary cursor-not-allowed')
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-2" />
                  Generate Ideas
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className={`overflow-y-auto p-4 space-y-4 ${compact ? 'h-80' : 'h-96'}`}>
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start space-x-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.type === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-purple-100 text-purple-600'
              }`}>
                {message.type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className={`rounded-lg p-3 ${
                message.type === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm">{message.content}</p>
                
                {/* Analysis Metrics */}
                {message.analysis && message.type === 'assistant' && (
                  <div className="mt-3 p-2 bg-white/10 rounded text-sm">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <div className="text-white/80 mb-1">Narrative</div>
                        <div className="w-full bg-white/20 rounded-full h-1.5">
                          <div 
                            className="bg-blue-400 h-1.5 rounded-full"
                            style={{ width: `${message.analysis.narrative_strength * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-white/80 mb-1">Audience</div>
                        <div className="w-full bg-white/20 rounded-full h-1.5">
                          <div 
                            className="bg-green-400 h-1.5 rounded-full"
                            style={{ width: `${message.analysis.audience_alignment * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-white/80 mb-1">Market</div>
                        <div className="w-full bg-white/20 rounded-full h-1.5">
                          <div 
                            className="bg-purple-400 h-1.5 rounded-full"
                            style={{ width: `${message.analysis.market_potential * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {message.completeness_score && (
                      <div className="text-center text-white/90">
                        Completeness: {Math.round(message.completeness_score * 100)}%
                      </div>
                    )}
                  </div>
                )}
                
                {/* Suggestions */}
                {message.suggestions && message.type === 'assistant' && (
                  <div className="mt-3 space-y-2">
                    {message.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="block w-full text-left p-2 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Next Questions */}
                {message.next_questions && message.type === 'assistant' && (
                  <div className="mt-3 p-2 bg-blue-500/20 rounded border border-blue-500/30">
                    <div className="text-sm text-blue-200 mb-2 font-medium">Next Steps to Consider:</div>
                    {message.next_questions.map((question, index) => (
                      <div key={index} className="text-sm text-blue-100 mb-1">
                        • {question}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2 max-w-[80%]">
              <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`p-4 ${compact ? 'border-t border-sf-border' : 'border-t border-gray-200'}`}>
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
            placeholder="Ask Cue about your video concept..."
            className="flex-1"
          />
          <Button
            onClick={toggleVoiceInput}
            variant="secondary"
            size="sm"
            className={isListening ? 'bg-red-100 border-red-300 text-red-600' : ''}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(isStoryboardMode ? storyboardSuggestions : initialSuggestions).slice(0, 4).map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
                              className={`px-3 py-1 text-sm rounded-full transition-colors ${compact ? 'bg-sf-surface-light hover:bg-sf-border text-sf-text-secondary' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
