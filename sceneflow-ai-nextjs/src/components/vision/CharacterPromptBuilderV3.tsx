"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Sparkles, BrainCircuit } from 'lucide-react'

interface CharacterPromptBuilderV3Props {
  open: boolean
  onClose: () => void
  character?: any
  isGenerating?: boolean
  onGenerateImage: (payload: {
    prompt: string
    aspectRatio: string
    includeThoughts: boolean
    personGeneration: string
    negativePrompt?: string
  }) => void
}

export function CharacterPromptBuilderV3({
  open,
  onClose,
  character,
  isGenerating = false,
  onGenerateImage
}: CharacterPromptBuilderV3Props) {
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [includeThoughts, setIncludeThoughts] = useState(false)
  const [personGeneration, setPersonGeneration] = useState('allow_adult')
  const [negativePrompt, setNegativePrompt] = useState('')

  // Initialize prompt with character name/role if available, but keep it clean
  useEffect(() => {
    if (open && character) {
      // We don't pre-fill too much to avoid "overriding" feeling, 
      // but a basic starting point is helpful.
      // If the user wants to start fresh, they can clear it.
      // Or maybe we start empty? The user complained about overrides.
      // Let's start empty or with a very minimal placeholder.
      setPrompt('') 
    }
  }, [open, character])

  const handleGenerate = () => {
    onGenerateImage({
      prompt,
      aspectRatio,
      includeThoughts,
      personGeneration,
      negativePrompt: negativePrompt || undefined
    })
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Generate Character Image (Nano Banana Pro)
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create high-fidelity character images using Gemini 3 Pro.
            Character attributes will be automatically merged with your prompt.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label htmlFor="prompt" className="text-sm font-medium text-zinc-200">Prompt</label>
            <Textarea
              id="prompt"
              placeholder="Describe the scene, action, or specific details..."
              className="h-32 bg-zinc-900 border-zinc-700 focus:ring-yellow-500/50"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              Tip: Be specific about lighting, camera angle, and style if needed.
            </p>
          </div>

          {/* Negative Prompt (Optional) */}
          <div className="space-y-2">
            <label htmlFor="negative-prompt" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Negative Prompt (Optional)</label>
            <Textarea
              id="negative-prompt"
              placeholder="Things to avoid (e.g. blurry, distorted, text)..."
              className="h-16 bg-zinc-900 border-zinc-700 text-sm"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
            />
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Aspect Ratio</label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Cinematic)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                  <SelectItem value="3:4">3:4 (Vertical)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Person Generation</label>
              <Select value={personGeneration} onValueChange={setPersonGeneration}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow_adult">Allow Adult (Standard)</SelectItem>
                  <SelectItem value="dont_allow">Don't Allow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Thinking Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <div className="space-y-0.5">
              <label className="text-base font-medium text-zinc-200 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                Thinking Mode
              </label>
              <p className="text-xs text-zinc-500">
                Enables the model to reason before generating. Improves adherence to complex prompts.
              </p>
            </div>
            <Checkbox
              checked={includeThoughts}
              onCheckedChange={setIncludeThoughts}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={!prompt.trim() || isGenerating}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
