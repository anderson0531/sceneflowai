'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ThumbnailPromptDrawerProps {
  open: boolean
  onClose: () => void
  project: {
    id: string
    title: string
    description: string
    genre?: string
    metadata?: any
  }
  currentThumbnail?: string
  onThumbnailGenerated: (imageUrl: string) => void
}

const DEFAULT_PROMPT_TEMPLATE = (title: string, genre: string, description: string) => `Create a cinematic billboard image for a film with the following details:

Film Title: ${title}
Genre: ${genre}
Concept: ${description}

Style Requirements:
- Professional film poster quality, suitable for billboard display
- Cinematic lighting with high contrast and dramatic shadows
- Visually striking composition with strong focal point
- Film marketing quality, eye-catching and memorable
- Wide angle cinematic framing
- Professional studio lighting with dramatic highlights
- 16:9 landscape aspect ratio
- No text, titles, or watermarks on the image
- Photorealistic or stylized based on genre appropriateness`

export default function ThumbnailPromptDrawer({
  open,
  onClose,
  project,
  currentThumbnail,
  onThumbnailGenerated
}: ThumbnailPromptDrawerProps) {
  const [tab, setTab] = useState<'edit' | 'ai' | 'review'>('edit')
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [editedPrompt, setEditedPrompt] = useState('')
  const [aiInstructions, setAiInstructions] = useState('')
  const [refinedPrompt, setRefinedPrompt] = useState('')
  const [newThumbnail, setNewThumbnail] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefining, setIsRefining] = useState(false)

  useEffect(() => {
    if (!open) return
    
    // Initialize prompts
    const storedPrompt = project.metadata?.thumbnailPrompt
    const defaultPrompt = DEFAULT_PROMPT_TEMPLATE(
      project.title || 'Untitled',
      project.genre || 'General',
      project.description || ''
    )
    
    setOriginalPrompt(storedPrompt || defaultPrompt)
    setEditedPrompt(storedPrompt || defaultPrompt)
    setAiInstructions('')
    setRefinedPrompt('')
    setNewThumbnail(null)
    setTab('edit')
  }, [open, project])

  const appendToPrompt = (text: string) => {
    setEditedPrompt(prev => prev + '\n' + text)
  }

  const handleAIRefine = async () => {
    if (!aiInstructions.trim()) {
      toast.error('Please provide instructions for AI refinement')
      return
    }

    setIsRefining(true)
    try {
      const res = await fetch('/api/prompts/refine-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrompt: editedPrompt,
          instructions: aiInstructions
        })
      })

      const data = await res.json()

      if (data.success && data.refinedPrompt) {
        setRefinedPrompt(data.refinedPrompt)
        toast.success('AI refinement complete')
      } else {
        toast.error(data.error || 'AI refinement failed')
      }
    } catch (error) {
      console.error('AI refinement error:', error)
      toast.error('Failed to refine prompt')
    } finally {
      setIsRefining(false)
    }
  }

  const handleRegenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/projects/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          customPrompt: editedPrompt,
          title: project.title,
          genre: project.genre,
          description: project.description
        })
      })

      const data = await res.json()

      if (data.success) {
        setNewThumbnail(data.imageUrl)
        setTab('review')
        toast.success('Thumbnail generated successfully')
      } else {
        toast.error(data.error || 'Generation failed')
      }
    } catch (error) {
      console.error('Thumbnail generation error:', error)
      toast.error('Failed to generate thumbnail')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = () => {
    if (newThumbnail) {
      onThumbnailGenerated(newThumbnail)
      toast.success('Thumbnail applied')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="fixed right-0 left-auto top-0 bottom-0 translate-x-0 translate-y-0 ml-auto w-[min(100vw,700px)] max-w-full overflow-hidden rounded-none border-l bg-gray-950 pr-[env(safe-area-inset-right)]">
        <DialogHeader className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/60">
          <DialogTitle>Edit Thumbnail Prompt</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[calc(100dvh-56px)]">
          {/* Tabs */}
          <div className="px-6 sm:px-8 pb-2 border-b border-gray-800 flex items-center gap-2">
            {(['edit', 'ai', 'review'] as const).map(k => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`text-sm px-3 py-1.5 rounded ${
                  tab === k
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800/60'
                }`}
              >
                {k === 'edit' ? 'Direct Edit' : k === 'ai' ? 'AI Assist' : 'Review'}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4 space-y-4">
            {tab === 'edit' && (
              <>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-2">Original Prompt</div>
                    <div className="w-full p-3 bg-gray-900 border border-gray-800 rounded text-gray-300 whitespace-pre-wrap text-sm min-h-[200px] max-h-[300px] overflow-y-auto">
                      {originalPrompt}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-2">Your Prompt</div>
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-gray-100 text-sm min-h-[200px] focus:outline-none focus:border-blue-500"
                      placeholder="Edit the thumbnail generation prompt..."
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {editedPrompt.length} characters
                    </div>
                  </div>
                </div>

                {/* Quick Additions */}
                <div>
                  <div className="text-xs text-gray-400 mb-2">Quick Additions</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => appendToPrompt('- Cinematic color grading with teal and orange tones')}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      + Color Grading
                    </button>
                    <button
                      onClick={() => appendToPrompt('- Golden hour lighting with warm sunset glow')}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      + Golden Hour
                    </button>
                    <button
                      onClick={() => appendToPrompt('- Film noir style with high contrast shadows')}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      + Noir Style
                    </button>
                    <button
                      onClick={() => appendToPrompt('- Moody atmospheric lighting with fog and haze')}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      + Atmospheric
                    </button>
                    <button
                      onClick={() => setEditedPrompt(originalPrompt)}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      ↺ Reset
                    </button>
                  </div>
                </div>
              </>
            )}

            {tab === 'ai' && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-400 mb-2">Current Prompt</div>
                  <div className="p-3 bg-gray-900 border border-gray-800 rounded text-gray-300 text-sm whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                    {editedPrompt}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-2">What should change?</div>
                  <textarea
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-gray-100 text-sm"
                    rows={5}
                    placeholder="E.g., 'Make it more dramatic', 'Focus on the main character', 'Add sunset lighting', 'More vibrant colors'"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAIRefine}
                    disabled={isRefining || !aiInstructions.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isRefining ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Refining...
                      </>
                    ) : (
                      'Refine with AI'
                    )}
                  </Button>
                </div>

                {refinedPrompt && (
                  <div>
                    <div className="text-xs text-gray-400 mb-2">AI Suggestion</div>
                    <div className="p-3 bg-emerald-900/20 border border-emerald-800 rounded text-gray-200 text-sm whitespace-pre-wrap">
                      {refinedPrompt}
                    </div>
                    <button
                      onClick={() => {
                        setEditedPrompt(refinedPrompt)
                        toast.success('AI suggestion applied to prompt')
                      }}
                      className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                      Use This Prompt →
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === 'review' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Current Thumbnail */}
                  <div>
                    <div className="text-xs text-gray-400 mb-2">Current Thumbnail</div>
                    {currentThumbnail ? (
                      <img
                        src={currentThumbnail}
                        alt="Current"
                        className="w-full aspect-video object-cover rounded border border-gray-800"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-gray-900 border border-gray-800 rounded flex items-center justify-center text-gray-500 text-sm">
                        No thumbnail yet
                      </div>
                    )}
                  </div>

                  {/* New Thumbnail */}
                  <div>
                    <div className="text-xs text-gray-400 mb-2">New Thumbnail</div>
                    {newThumbnail ? (
                      <img
                        src={newThumbnail}
                        alt="New"
                        className="w-full aspect-video object-cover rounded border border-green-600"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-gray-900 border border-gray-800 rounded flex items-center justify-center text-gray-500 text-sm">
                        Click "Regenerate" to preview
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-2">Edited Prompt</div>
                  <div className="p-3 bg-gray-900 border border-gray-800 rounded text-gray-300 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {editedPrompt}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-4 border-t border-gray-800 flex items-center justify-between sticky bottom-0 bg-gray-950">
            <div className="text-xs text-gray-400">
              {isGenerating && 'Generating thumbnail...'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-200">
                Close
              </Button>
              {tab === 'review' && newThumbnail && (
                <Button
                  onClick={handleApply}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Apply Thumbnail
                </Button>
              )}
              <Button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Regenerate Thumbnail'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

