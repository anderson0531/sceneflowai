'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ScenePromptDrawerProps {
  open: boolean
  onClose: () => void
  scene: {
    sceneNumber: number
    heading: string
    summary: string
    visualDescription?: string
    action?: string
    imageUrl?: string
    imagePrompt?: string
  }
  characters: any[]
  visualStyle: string
  projectId: string
  onSceneImageGenerated: (imageUrl: string, sceneNumber: number) => void
}

const DEFAULT_SCENE_PROMPT = (scene: any, visualStyle: string, characters: any[]) => {
  const characterList = characters.length > 0 
    ? `\nCharacters: ${characters.map(c => c.name || c).join(', ')}`
    : ''
  
  return `Generate a cinematic scene image:

Scene: ${scene.heading}
Action: ${scene.visualDescription || scene.action || scene.summary}
Visual Style: ${visualStyle}${characterList}

Requirements:
- Professional film production quality
- Cinematic composition and framing
- ${visualStyle} visual aesthetic
- Proper blocking and staging
- Authentic lighting for scene mood
- 16:9 landscape aspect ratio
- High detail and photorealistic rendering
- No text, titles, or watermarks
- Film-ready production value`
}

export default function ScenePromptDrawer({
  open,
  onClose,
  scene,
  characters,
  visualStyle,
  projectId,
  onSceneImageGenerated
}: ScenePromptDrawerProps) {
  const [tab, setTab] = useState<'edit' | 'ai' | 'review'>('edit')
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [editedPrompt, setEditedPrompt] = useState('')
  const [aiInstructions, setAiInstructions] = useState('')
  const [refinedPrompt, setRefinedPrompt] = useState('')
  const [newImage, setNewImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefining, setIsRefining] = useState(false)

  useEffect(() => {
    if (!open) return
    
    // Initialize prompts
    const storedPrompt = scene.imagePrompt
    const defaultPrompt = DEFAULT_SCENE_PROMPT(scene, visualStyle, characters)
    
    setOriginalPrompt(storedPrompt || defaultPrompt)
    setEditedPrompt(storedPrompt || defaultPrompt)
    setAiInstructions('')
    setRefinedPrompt('')
    setNewImage(null)
    setTab('edit')
  }, [open, scene, visualStyle, characters])

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
      const res = await fetch('/api/prompts/refine-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrompt: editedPrompt,
          instructions: aiInstructions,
          sceneContext: {
            heading: scene.heading,
            action: scene.visualDescription || scene.action,
            visualStyle
          }
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
      const res = await fetch('/api/vision/regenerate-scene-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneNumber: scene.sceneNumber,
          customPrompt: editedPrompt,
          scene,
          visualStyle,
          characters
        })
      })

      const data = await res.json()

      if (data.success) {
        setNewImage(data.imageUrl)
        setTab('review')
        toast.success('Scene image generated successfully')
      } else {
        toast.error(data.error || 'Generation failed')
      }
    } catch (error) {
      console.error('Scene image generation error:', error)
      toast.error('Failed to generate scene image')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = () => {
    if (newImage) {
      onSceneImageGenerated(newImage, scene.sceneNumber)
      toast.success('Scene image applied')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="fixed right-0 left-auto top-0 bottom-0 translate-x-0 translate-y-0 ml-auto w-[min(100vw,800px)] max-w-full overflow-hidden rounded-none border-l bg-gray-950 pr-[env(safe-area-inset-right)]">
        <DialogHeader className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/60">
          <DialogTitle>Edit Scene {scene.sceneNumber} Image</DialogTitle>
          <div className="text-sm text-gray-400">{scene.heading}</div>
        </DialogHeader>

        <div className="flex flex-col h-[calc(100dvh-80px)]">
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
                      placeholder="Edit the scene image generation prompt..."
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
                      onClick={() => appendToPrompt('- Close-up on character facial expression')}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      + Close-up
                    </button>
                    <button
                      onClick={() => appendToPrompt('- Dramatic side lighting with strong shadows')}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      + Dramatic Lighting
                    </button>
                    <button
                      onClick={() => appendToPrompt('- Shallow depth of field, blurred background')}
                      className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      + Depth of Field
                    </button>
                    <button
                      onClick={() => appendToPrompt('- Moody atmospheric haze and fog')}
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
                    placeholder="E.g., 'Add more dramatic lighting', 'Focus on character emotion', 'Make it darker and moodier'"
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
                  {/* Current Image */}
                  <div>
                    <div className="text-xs text-gray-400 mb-2">Current Scene Image</div>
                    {scene.imageUrl ? (
                      <img
                        src={scene.imageUrl}
                        alt={`Scene ${scene.sceneNumber}`}
                        className="w-full aspect-video object-cover rounded border border-gray-800"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-gray-900 border border-gray-800 rounded flex items-center justify-center text-gray-500 text-sm">
                        No image yet
                      </div>
                    )}
                  </div>

                  {/* New Image */}
                  <div>
                    <div className="text-xs text-gray-400 mb-2">New Scene Image</div>
                    {newImage ? (
                      <img
                        src={newImage}
                        alt={`Scene ${scene.sceneNumber} - New`}
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
                  <div className="text-xs text-gray-400 mb-2">Scene Info</div>
                  <div className="p-3 bg-gray-900/50 border border-gray-800 rounded text-gray-300 text-sm">
                    <div className="font-semibold">{scene.heading}</div>
                    <div className="mt-2 text-gray-400">{scene.summary}</div>
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
              {isGenerating && 'Generating scene image...'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-200">
                Close
              </Button>
              {tab === 'review' && newImage && (
                <Button
                  onClick={handleApply}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Apply Scene Image
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
                  'Regenerate Scene Image'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

