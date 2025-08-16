'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Lightbulb, 
  Sparkles, 
  ArrowRight,
  Brain,
  Target,
  Users,
  Clock,
  MessageCircle,
  Save,
  Play
} from 'lucide-react'
import Link from 'next/link'

export default function IdeationPage() {
  const router = useRouter()
  const { currentProject, updateProject, updateStepProgress } = useStore()
  const [concept, setConcept] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [keyMessage, setKeyMessage] = useState('')
  const [tone, setTone] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])

  const handleSave = () => {
    if (currentProject) {
      updateProject(currentProject.id, {
        metadata: {
          ...currentProject.metadata,
          concept,
          targetAudience,
          keyMessage,
          tone
        }
      })
      updateStepProgress('ideation', 100)
    }
  }

  const handleNextStep = () => {
    handleSave()
    router.push('/dashboard/workflow/storyboard')
  }

  const generateAISuggestions = () => {
    // Mock AI suggestions - in real app this would call an AI service
    const suggestions = [
      "Consider using emotional storytelling to connect with your audience",
      "Include a clear call-to-action that aligns with your business goals",
      "Use visual metaphors to make complex concepts more accessible",
      "Create a narrative arc that builds anticipation and delivers satisfaction"
    ]
    setAiSuggestions(suggestions)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">The Spark Studio</h1>
        <p className="text-xl text-gray-600">Step 1: Ideation & Brainstorming</p>
        <p className="text-gray-500 mt-2">Develop your video concept and creative direction</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Project Progress</h2>
          <span className="text-sm text-gray-500">Step 1 of 4</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: '25%' }}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Concept Development */}
        <div className="lg:col-span-2 space-y-6">
          {/* Concept Statement */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
              Core Concept
            </h3>
            <textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Describe your video concept in 2-3 sentences. What story are you telling? What's the main message?"
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">
              Be specific about what you want to achieve and how you want your audience to feel.
            </p>
          </div>

          {/* Target Audience & Key Message */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-red-500" />
                Target Audience
              </h3>
              <input
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Who is this video for?"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-2">
                Consider demographics, interests, and pain points.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-green-500" />
                Key Message
              </h3>
              <input
                value={keyMessage}
                onChange={(e) => setKeyMessage(e.target.value)}
                placeholder="What should viewers remember?"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-2">
                The one thing you want your audience to take away.
              </p>
            </div>
          </div>

          {/* Tone & Style */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tone & Style</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Professional', 'Friendly', 'Inspirational', 'Educational', 'Humorous', 'Serious', 'Dynamic', 'Calm'].map(style => (
                <button
                  key={style}
                  onClick={() => setTone(style)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    tone === style
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - AI Assistant & Tools */}
        <div className="space-y-6">
          {/* AI Suggestions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-500" />
              AI Creative Assistant
            </h3>
            <Button 
              onClick={generateAISuggestions}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 mb-4"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Suggestions
            </Button>
            
            {aiSuggestions.length > 0 && (
              <div className="space-y-3">
                {aiSuggestions.map((suggestion, index) => (
                  <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-800">{suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project Info */}
          {currentProject && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Title:</span>
                  <span className="font-medium text-gray-900">{currentProject.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Genre:</span>
                  <span className="font-medium text-gray-900">{currentProject.metadata.genre}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-medium text-gray-900">{currentProject.metadata.duration}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Style:</span>
                  <span className="font-medium text-gray-900">{currentProject.metadata.style}</span>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Ready for the Next Step?</h3>
            <p className="text-blue-700 text-sm mb-4">
              Once you&apos;re satisfied with your concept, move to the Vision Board to start storyboarding.
            </p>
            <Button 
              onClick={handleNextStep}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Continue to Vision Board
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Progress
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost">
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Progress: 25%</span>
            <Button 
              onClick={handleNextStep}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next Step
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
