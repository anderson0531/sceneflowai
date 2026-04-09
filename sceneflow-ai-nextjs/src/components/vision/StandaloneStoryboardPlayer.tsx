'use client'

import React, { useState } from 'react'
import { AudioGalleryPlayer } from './AudioGalleryPlayer'
import { Button } from '@/components/ui/Button'
import { Star, MessageSquare, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StandaloneStoryboardPlayerProps {
  projectData: any
  shareToken: string
}

export function StandaloneStoryboardPlayer({ projectData, shareToken }: StandaloneStoryboardPlayerProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  
  // Feedback state per scene
  const [feedbacks, setFeedbacks] = useState<Record<number, { rating: number, comment: string }>>({})
  const [reviewerName, setReviewerName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  const currentFeedback = feedbacks[currentSceneIndex] || { rating: 0, comment: '' }
  
  const handleRatingChange = (rating: number) => {
    setFeedbacks(prev => ({
      ...prev,
      [currentSceneIndex]: { ...currentFeedback, rating }
    }))
  }
  
  const handleCommentChange = (comment: string) => {
    setFeedbacks(prev => ({
      ...prev,
      [currentSceneIndex]: { ...currentFeedback, comment }
    }))
  }

  const handleSubmitFeedback = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      const response = await fetch(`/api/vision/shared-project/${shareToken}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbacks, reviewerName })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }
      
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (err: any) {
      console.error('[Submit Feedback]', err)
      setSubmitError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Derive available languages from project data
  const availableLanguages = ['en'] // Assuming English by default, extend if project data includes others

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Top Banner */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
        <div>
          <h1 className="text-xl font-semibold text-white">{projectData.title}</h1>
          <p className="text-sm text-gray-400">Storyboard Review</p>
        </div>
        <div className="text-right">
          <Button 
            onClick={handleSubmitFeedback}
            disabled={isSubmitting || Object.keys(feedbacks).length === 0}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {isSubmitting ? 'Submitting...' : submitSuccess ? 'Submitted!' : 'Submit All Feedback'}
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main Player Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <AudioGalleryPlayer
              scenes={projectData.script?.script?.scenes || projectData.script?.scenes || projectData.sceneProductionState || []}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              availableLanguages={availableLanguages}
              onSceneChange={setCurrentSceneIndex}
              isSharedView={true}
            />
          </div>
        </div>
        
        {/* Feedback Sidebar */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Scene {currentSceneIndex + 1} Feedback
            </h2>
          </div>
          
          <div className="p-4 flex-1 flex flex-col gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Name (Optional)
              </label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingChange(star)}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      className={cn(
                        "w-6 h-6 transition-colors",
                        star <= currentFeedback.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-600 hover:text-gray-400"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Comments
              </label>
              <textarea
                value={currentFeedback.comment}
                onChange={(e) => handleCommentChange(e.target.value)}
                placeholder="Leave feedback for this scene..."
                className="flex-1 w-full bg-gray-800 border border-gray-700 rounded-md p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
            
            <p className="text-xs text-gray-500 text-center">
              Your feedback is saved locally until you click "Submit All Feedback".
            </p>
            {submitError && (
              <p className="text-sm text-red-400 text-center bg-red-900/20 p-2 rounded">
                {submitError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
