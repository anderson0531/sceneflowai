'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Sparkles, Copy, Check, Loader } from 'lucide-react'
import { artStylePresets, shotTypes } from '@/constants/artStylePresets'

interface PromptStructure {
  subject: string
  ethnicity: string
  keyFeature: string
  hairStyle: string
  hairColor: string
  eyeColor: string
  eyeExpression: string
  build: string
  shotType: string
  artStyle: string
  background: string
  negativePrompt: string
}

interface CharacterPromptBuilderProps {
  open: boolean
  onClose: () => void
  initialPrompt?: string
  initialStructure?: Partial<PromptStructure>
  characterName?: string
  onApply: (prompt: string, structure: PromptStructure) => void | Promise<void>
  isGenerating?: boolean
}

export function CharacterPromptBuilder({
  open,
  onClose,
  initialPrompt = '',
  initialStructure,
  characterName = 'Character',
  onApply,
  isGenerating = false
}: CharacterPromptBuilderProps) {
  const [mode, setMode] = useState<'guided' | 'advanced'>('guided')
  const [structure, setStructure] = useState<PromptStructure>({
    subject: initialStructure?.subject || '',
    ethnicity: initialStructure?.ethnicity || '',
    keyFeature: initialStructure?.keyFeature || '',
    hairStyle: initialStructure?.hairStyle || '',
    hairColor: initialStructure?.hairColor || '',
    eyeColor: initialStructure?.eyeColor || '',
    eyeExpression: initialStructure?.eyeExpression || '',
    build: initialStructure?.build || '',
    shotType: initialStructure?.shotType || 'portrait',
    artStyle: initialStructure?.artStyle || 'photorealistic',
    background: initialStructure?.background || '',
    negativePrompt: initialStructure?.negativePrompt || 'ugly, deformed, extra limbs, blurry, low quality'
  })
  
  const [advancedPrompt, setAdvancedPrompt] = useState(initialPrompt)
  const [enhancing, setEnhancing] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({})
  const [copied, setCopied] = useState(false)
  const [isGeneratingInternal, setIsGeneratingInternal] = useState(false)

  // Update structure when initialStructure prop changes (e.g., different character selected)
  useEffect(() => {
    if (initialStructure) {
      setStructure({
        subject: initialStructure.subject || '',
        ethnicity: initialStructure.ethnicity || '',
        keyFeature: initialStructure.keyFeature || '',
        hairStyle: initialStructure.hairStyle || '',
        hairColor: initialStructure.hairColor || '',
        eyeColor: initialStructure.eyeColor || '',
        eyeExpression: initialStructure.eyeExpression || '',
        build: initialStructure.build || '',
        shotType: initialStructure.shotType || 'portrait',
        artStyle: initialStructure.artStyle || 'photorealistic',
        background: initialStructure.background || '',
        negativePrompt: initialStructure.negativePrompt || 'ugly, deformed, extra limbs, blurry, low quality'
      })
    }
  }, [initialStructure])

  // Update advanced prompt when initialPrompt changes
  useEffect(() => {
    if (initialPrompt) {
      setAdvancedPrompt(initialPrompt)
    }
  }, [initialPrompt])

  // Construct prompt from structure
  const constructPrompt = (): string => {
    const parts: string[] = []
    
    // Shot type
    const shot = shotTypes.find(s => s.value === structure.shotType)
    if (shot) parts.push(shot.promptText)
    
    // Core identity
    if (structure.subject) parts.push(`of ${structure.subject}`)
    if (structure.ethnicity) parts.push(`${structure.ethnicity}`)
    if (structure.keyFeature) parts.push(structure.keyFeature)
    
    // Appearance
    const appearance: string[] = []
    if (structure.hairStyle || structure.hairColor) {
      const hair = [structure.hairStyle, structure.hairColor].filter(Boolean).join(' ')
      if (hair) appearance.push(`${hair} hair`)
    }
    if (structure.eyeColor || structure.eyeExpression) {
      const eyes = [structure.eyeExpression, structure.eyeColor].filter(Boolean).join(' ')
      if (eyes) appearance.push(`${eyes} eyes`)
    }
    if (structure.build) appearance.push(`${structure.build} build`)
    
    if (appearance.length) parts.push(appearance.join(', '))
    
    // Background
    if (structure.background) parts.push(`${structure.background}`)
    
    // Art style
    const stylePreset = artStylePresets.find(s => s.id === structure.artStyle)
    if (stylePreset) parts.push(stylePreset.promptSuffix)
    
    return parts.filter(Boolean).join(', ')
  }

  const constructedPrompt = mode === 'guided' ? constructPrompt() : advancedPrompt

  const handleEnhance = async (field: string, value: string) => {
    if (!value.trim()) return
    setEnhancing(field)
    try {
      const res = await fetch('/api/prompt/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value })
      })
      const json = await res.json()
      if (json?.suggestions && Array.isArray(json.suggestions)) {
        setSuggestions(prev => ({ ...prev, [field]: json.suggestions }))
      }
    } catch (error) {
      console.error('Enhancement failed:', error)
    } finally {
      setEnhancing(null)
    }
  }

  const handleApply = async () => {
    setIsGeneratingInternal(true)
    try {
      await onApply(constructedPrompt, structure)
    } catch (error) {
      console.error('[Character Prompt Builder] Apply failed:', error)
    } finally {
      setIsGeneratingInternal(false)
    }
  }

  const isCurrentlyGenerating = isGenerating || isGeneratingInternal

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(constructedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Prevent closing during generation
      if (!isOpen && isCurrentlyGenerating) return
      onClose()
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 text-white border-gray-700 relative">
        <DialogHeader>
          <DialogTitle className="text-white">Character Prompt Builder - {characterName}</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="guided" className="flex-1">Guided Mode</TabsTrigger>
            <TabsTrigger value="advanced" className="flex-1">Advanced Mode</TabsTrigger>
          </TabsList>

          {/* Guided Mode */}
          <TabsContent value="guided" className="space-y-4 mt-4">
            {/* Core Identity */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200">Core Identity</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-400">Subject</label>
                  <Input
                    value={structure.subject}
                    onChange={(e) => setStructure(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="A young woman, An old wizard, A robot detective"
                    className="mt-1 text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Ethnicity/Origin</label>
                  <Input
                    value={structure.ethnicity}
                    onChange={(e) => setStructure(prev => ({ ...prev, ethnicity: e.target.value }))}
                    placeholder="Japanese, Elven, Martian"
                    className="mt-1 text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Key Feature/Role</label>
                  <div className="flex gap-1 mt-1">
                    <Input
                      value={structure.keyFeature}
                      onChange={(e) => setStructure(prev => ({ ...prev, keyFeature: e.target.value }))}
                      placeholder="with glowing tattoos, wearing a space helmet"
                    />
                    <button
                      onClick={() => handleEnhance('keyFeature', structure.keyFeature)}
                      disabled={!structure.keyFeature.trim() || enhancing === 'keyFeature'}
                      className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                      title="AI Enhance"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                  {suggestions.keyFeature && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {suggestions.keyFeature.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setStructure(prev => ({ ...prev, keyFeature: s }))}
                          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Appearance Details */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200">Appearance Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Hair Style</label>
                  <div className="flex gap-1 mt-1">
                    <Input
                      value={structure.hairStyle}
                      onChange={(e) => setStructure(prev => ({ ...prev, hairStyle: e.target.value }))}
                      placeholder="long and wavy, short buzz cut"
                    />
                    <button
                      onClick={() => handleEnhance('hairStyle', structure.hairStyle)}
                      disabled={!structure.hairStyle.trim() || enhancing === 'hairStyle'}
                      className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                      title="AI Enhance"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                  {suggestions.hairStyle && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {suggestions.hairStyle.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setStructure(prev => ({ ...prev, hairStyle: s }))}
                          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-400">Hair Color</label>
                  <Input
                    value={structure.hairColor}
                    onChange={(e) => setStructure(prev => ({ ...prev, hairColor: e.target.value }))}
                    placeholder="crimson red, silver"
                    className="mt-1 text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Eye Color</label>
                  <Input
                    value={structure.eyeColor}
                    onChange={(e) => setStructure(prev => ({ ...prev, eyeColor: e.target.value }))}
                    placeholder="emerald green, piercing blue"
                    className="mt-1 text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Eye Expression</label>
                  <Input
                    value={structure.eyeExpression}
                    onChange={(e) => setStructure(prev => ({ ...prev, eyeExpression: e.target.value }))}
                    placeholder="thoughtful, joyful, stern"
                    className="mt-1 text-gray-200"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-400">Build</label>
                  <Input
                    value={structure.build}
                    onChange={(e) => setStructure(prev => ({ ...prev, build: e.target.value }))}
                    placeholder="athletic, slender, imposing"
                    className="mt-1 text-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Style & Composition */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200">Style & Composition 🎨</h3>
              
              <div>
                <label className="text-xs text-gray-400">Shot Type</label>
                <Select value={structure.shotType} onValueChange={(v) => setStructure(prev => ({ ...prev, shotType: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select shot type" />
                  </SelectTrigger>
                  <SelectContent>
                    {shotTypes.map(shot => (
                      <SelectItem key={shot.value} value={shot.value}>{shot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-2 block">Art Style</label>
                <div className="grid grid-cols-5 gap-2">
                  {artStylePresets.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setStructure(prev => ({ ...prev, artStyle: style.id }))}
                      className={`p-2 rounded border transition-all ${
                        structure.artStyle === style.id
                          ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                      title={style.description}
                    >
                      <div className="aspect-square bg-gray-700 rounded mb-1 flex items-center justify-center text-2xl">
                        {style.name[0]}
                      </div>
                      <div className="text-[10px] text-gray-300 truncate">{style.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400">Background</label>
                <Input
                  value={structure.background}
                  onChange={(e) => setStructure(prev => ({ ...prev, background: e.target.value }))}
                  placeholder="In a neon-lit cyberpunk alley, Plain studio background"
                  className="mt-1"
                />
              </div>
            </div>
          </TabsContent>

          {/* Advanced Mode */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Positive Prompt</label>
              <textarea
                value={advancedPrompt}
                onChange={(e) => setAdvancedPrompt(e.target.value)}
                rows={8}
                placeholder="Full body shot of a young woman..."
                className="w-full text-sm px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 focus:border-gray-600 focus:outline-none"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Negative Prompt</label>
              <textarea
                value={structure.negativePrompt}
                onChange={(e) => setStructure(prev => ({ ...prev, negativePrompt: e.target.value }))}
                rows={4}
                placeholder="ugly, deformed, extra limbs, blurry, low quality..."
                className="w-full text-sm px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 focus:border-gray-600 focus:outline-none"
                style={{ resize: 'vertical' }}
              />
            </div>

            <details className="p-3 rounded border border-gray-700 bg-gray-800/50">
              <summary className="text-sm font-semibold text-gray-200 cursor-pointer">Advanced Settings</summary>
              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-xs text-gray-400">Seed (optional)</label>
                  <Input type="number" placeholder="Random" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">CFG Scale: 7</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    defaultValue="7" 
                    className="w-full mt-1"
                  />
                </div>
              </div>
            </details>
          </TabsContent>
        </Tabs>

        {/* Live Prompt Preview */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-3 -mx-6 -mb-6">
          <label className="text-xs text-gray-400 block mb-1">Generated Prompt</label>
          <div className="text-sm text-gray-200 p-2 bg-gray-800 rounded border border-gray-700 max-h-32 overflow-y-auto leading-relaxed">
            {constructedPrompt || <span className="text-gray-500 italic">Fill in the fields above to build your prompt...</span>}
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              onClick={handleApply} 
              className="flex-1"
              disabled={isCurrentlyGenerating}
            >
              {isCurrentlyGenerating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Apply & Generate'
              )}
            </Button>
            <Button 
              onClick={handleCopy} 
              variant="outline" 
              className="px-3"
              disabled={isCurrentlyGenerating}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isCurrentlyGenerating && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
              <p className="text-sm text-gray-200">Generating character image...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

