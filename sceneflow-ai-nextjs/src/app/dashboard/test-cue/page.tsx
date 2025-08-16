'use client'

import { useState } from 'react'
import { CueChatInterface } from '@/components/workflow/CueChatInterface'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function TestCuePage() {
  const [concept, setConcept] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [keyMessage, setKeyMessage] = useState('')
  const [tone, setTone] = useState('')

  const handleGenerateIdeas = async () => {
    // Simulate the next workflow step
    console.log('🎉 Generating ideas with concept:', { concept, targetAudience, keyMessage, tone })
    
    // In a real app, this would trigger the next phase
    alert('🎬 Ideas generated! Moving to the next workflow phase...')
  }

  const resetForm = () => {
    setConcept('')
    setTargetAudience('')
    setKeyMessage('')
    setTone('')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cue Completeness Indicator Test</h1>
          <p className="text-gray-600 mt-2">Test the dual persona AI assistant and completeness tracking</p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Test Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">🧪 Test Instructions</h2>
        <div className="text-blue-800 text-sm space-y-2">
          <p>• Fill out the concept details below to see the completeness score increase</p>
          <p>• Chat with Cue to refine your concept and watch the progress bar</p>
          <p>• The "Generate Ideas" button will be enabled when you reach 80% completeness</p>
          <p>• Test different conversation scenarios to see how Cue responds</p>
        </div>
      </div>

      {/* Concept Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Concept Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
              Concept Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Concept
                </label>
                <textarea
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Describe your video concept..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Young professionals aged 25-35"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Message
                </label>
                <input
                  type="text"
                  value={keyMessage}
                  onChange={(e) => setKeyMessage(e.target.value)}
                  placeholder="e.g., Sustainable living is accessible to everyone"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tone & Style
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a tone...</option>
                  <option value="Professional">Professional</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Inspirational">Inspirational</option>
                  <option value="Educational">Educational</option>
                  <option value="Humorous">Humorous</option>
                  <option value="Serious">Serious</option>
                  <option value="Dynamic">Dynamic</option>
                  <option value="Calm">Calm</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <Button onClick={resetForm} variant="outline">
                Reset Form
              </Button>
            </div>
          </div>

          {/* Sample Concepts */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Sample Concepts to Test</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-white rounded border cursor-pointer hover:bg-blue-50" onClick={() => {
                setConcept('A comprehensive guide to sustainable living for young professionals')
                setTargetAudience('Young professionals aged 25-35 interested in sustainability')
                setKeyMessage('Small changes can make a big impact on the environment')
                setTone('Educational')
              }}>
                <div className="font-medium text-gray-900">Sustainable Living Guide</div>
                <div className="text-gray-600">Educational content for eco-conscious professionals</div>
              </div>
              
              <div className="p-3 bg-white rounded border cursor-pointer hover:bg-blue-50" onClick={() => {
                setConcept('A motivational story about overcoming creative blocks')
                setTargetAudience('Creative professionals and artists')
                setKeyMessage('Creativity is a skill that can be developed and nurtured')
                setTone('Inspirational')
              }}>
                <div className="font-medium text-gray-900">Creative Block Breakthrough</div>
                <div className="text-gray-600">Inspirational content for creative professionals</div>
              </div>
              
              <div className="p-3 bg-white rounded border cursor-pointer hover:bg-blue-50" onClick={() => {
                setConcept('A professional development series for remote workers')
                setTargetAudience('Remote workers and digital nomads')
                setKeyMessage('Remote work success requires intentional skill development')
                setTone('Professional')
              }}>
                <div className="font-medium text-gray-900">Remote Work Mastery</div>
                <div className="text-gray-600">Professional development for remote workers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Cue Chat Interface */}
        <div>
          <CueChatInterface 
            currentConcept={concept}
            targetAudience={targetAudience}
            keyMessage={keyMessage}
            tone={tone}
            onGenerateIdeas={handleGenerateIdeas}
          />
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Test Results & Observations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">What to Watch For:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Completeness score increases as you fill out the form</li>
              <li>• Progress bar changes color (orange → yellow → green)</li>
              <li>• "Generate Ideas" button becomes enabled at 80%</li>
              <li>• Cue provides contextual suggestions based on your input</li>
              <li>• Dual persona responses (Scriptwriter + Audience Analyst)</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Expected Behavior:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Empty form: ~10-20% completeness</li>
              <li>• Partial form: ~30-50% completeness</li>
              <li>• Complete form: ~70-90% completeness</li>
              <li>• Chat refinement: Can reach 100%</li>
              <li>• Button enables at 80% threshold</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
