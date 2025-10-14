'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Check } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'

interface ScenePromptStructure {
  location: string
  timeOfDay: string
  weather: string
  atmosphere: string
  shotType: string
  cameraAngle: string
  lighting: string
  characters: string[]
  characterActions: string
  artStyle: string
  additionalDetails: string
  negativePrompt: string
}

interface ScenePromptBuilderProps {
  open: boolean
  onClose: () => void
  initialPrompt?: string
  sceneHeading?: string
  availableCharacters?: Array<{ name: string; description: string }>
  onApply: (prompt: string) => void
}

export function ScenePromptBuilder({
  open,
  onClose,
  initialPrompt = '',
  sceneHeading = 'Scene',
  availableCharacters = [],
  onApply
}: ScenePromptBuilderProps) {
  const [mode, setMode] = useState<'guided' | 'advanced'>('guided')
  const [structure, setStructure] = useState<ScenePromptStructure>({
    location: '',
    timeOfDay: 'day',
    weather: 'clear',
    atmosphere: 'neutral',
    shotType: 'wide-shot',
    cameraAngle: 'eye-level',
    lighting: 'natural',
    characters: [],
    characterActions: '',
    artStyle: 'photorealistic',
    additionalDetails: '',
    negativePrompt: 'blurry, low quality, distorted, poor composition'
  })
  
  const [advancedPrompt, setAdvancedPrompt] = useState(initialPrompt)
  const [copied, setCopied] = useState(false)

  // Construct prompt from structure
  const constructPrompt = (): string => {
    const parts: string[] = []
    
    // Shot type
    const shotTypes: Record<string, string> = {
      'wide-shot': 'Wide establishing shot',
      'medium-shot': 'Medium shot',
      'close-up': 'Close-up shot',
      'extreme-wide': 'Extreme wide shot',
      'over-shoulder': 'Over the shoulder shot'
    }
    if (structure.shotType) parts.push(shotTypes[structure.shotType] || structure.shotType)
    
    // Location
    if (structure.location) parts.push(`of ${structure.location}`)
    
    // Time and weather
    const timeWeather: string[] = []
    if (structure.timeOfDay) timeWeather.push(structure.timeOfDay)
    if (structure.weather && structure.weather !== 'clear') timeWeather.push(structure.weather)
    if (timeWeather.length) parts.push(timeWeather.join(', '))
    
    // Characters and actions
    if (structure.characters.length > 0) {
      const charList = structure.characters.join(', ')
      if (structure.characterActions) {
        parts.push(`featuring ${charList} ${structure.characterActions}`)
      } else {
        parts.push(`featuring ${charList}`)
      }
    }
    
    // Atmosphere
    if (structure.atmosphere && structure.atmosphere !== 'neutral') {
      parts.push(`${structure.atmosphere} atmosphere`)
    }
    
    // Camera angle
    const angles: Record<string, string> = {
      'eye-level': 'eye level camera angle',
      'low-angle': 'low angle camera',
      'high-angle': 'high angle camera',
      'birds-eye': "bird's eye view",
      'dutch-angle': 'dutch angle'
    }
    if (structure.cameraAngle && structure.cameraAngle !== 'eye-level') {
      parts.push(angles[structure.cameraAngle] || structure.cameraAngle)
    }
    
    // Lighting
    const lightingTypes: Record<string, string> = {
      'natural': 'natural lighting',
      'golden-hour': 'golden hour lighting',
      'dramatic': 'dramatic cinematic lighting',
      'soft': 'soft diffused lighting',
      'harsh': 'harsh contrast lighting',
      'backlit': 'backlit scene'
    }
    if (structure.lighting) parts.push(lightingTypes[structure.lighting] || structure.lighting)
    
    // Additional details
    if (structure.additionalDetails) parts.push(structure.additionalDetails)
    
    // Art style
    const stylePreset = artStylePresets.find(s => s.id === structure.artStyle)
    if (stylePreset) parts.push(stylePreset.promptSuffix)
    
    return parts.filter(Boolean).join(', ')
  }

  const constructedPrompt = mode === 'guided' ? constructPrompt() : advancedPrompt

  const handleApply = () => {
    onApply(constructedPrompt)
    onClose()
  }

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(constructedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Scene Prompt Builder - {sceneHeading}</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="guided" className="flex-1">Guided Mode</TabsTrigger>
            <TabsTrigger value="advanced" className="flex-1">Advanced Mode</TabsTrigger>
          </TabsList>

          {/* Guided Mode */}
          <TabsContent value="guided" className="space-y-4 mt-4">
            {/* Location & Setting */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200">Location & Setting</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-400">Location/Setting</label>
                  <Input
                    value={structure.location}
                    onChange={(e) => setStructure(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="beach at sunrise, urban street, mountain peak"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Time of Day</label>
                    <Select value={structure.timeOfDay} onValueChange={(v) => setStructure(prev => ({ ...prev, timeOfDay: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dawn">Dawn</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="dusk">Dusk</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                        <SelectItem value="golden-hour">Golden Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Weather</label>
                    <Select value={structure.weather} onValueChange={(v) => setStructure(prev => ({ ...prev, weather: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clear">Clear</SelectItem>
                        <SelectItem value="overcast">Overcast</SelectItem>
                        <SelectItem value="rainy">Rainy</SelectItem>
                        <SelectItem value="stormy">Stormy</SelectItem>
                        <SelectItem value="foggy">Foggy</SelectItem>
                        <SelectItem value="snowy">Snowy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Atmosphere/Mood</label>
                  <Select value={structure.atmosphere} onValueChange={(v) => setStructure(prev => ({ ...prev, atmosphere: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="serene">Serene</SelectItem>
                      <SelectItem value="tense">Tense</SelectItem>
                      <SelectItem value="mysterious">Mysterious</SelectItem>
                      <SelectItem value="energetic">Energetic</SelectItem>
                      <SelectItem value="melancholic">Melancholic</SelectItem>
                      <SelectItem value="hopeful">Hopeful</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Characters */}
            {availableCharacters.length > 0 && (
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Characters in Scene</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-400">Select Characters</label>
                    <div className="mt-1 space-y-1">
                      {availableCharacters.map(char => (
                        <label key={char.name} className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={structure.characters.includes(char.name)}
                            onChange={(e) => {
                              setStructure(prev => ({
                                ...prev,
                                characters: e.target.checked
                                  ? [...prev.characters, char.name]
                                  : prev.characters.filter(n => n !== char.name)
                              }))
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-200">{char.name}</span>
                          <span className="text-xs text-gray-400 truncate">{char.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">What are they doing?</label>
                    <Input
                      value={structure.characterActions}
                      onChange={(e) => setStructure(prev => ({ ...prev, characterActions: e.target.value }))}
                      placeholder="walking along the shore, engaged in conversation"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Camera & Composition */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200">Camera & Composition 🎬</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Shot Type</label>
                  <Select value={structure.shotType} onValueChange={(v) => setStructure(prev => ({ ...prev, shotType: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wide-shot">Wide Shot</SelectItem>
                      <SelectItem value="medium-shot">Medium Shot</SelectItem>
                      <SelectItem value="close-up">Close-up</SelectItem>
                      <SelectItem value="extreme-wide">Extreme Wide</SelectItem>
                      <SelectItem value="over-shoulder">Over Shoulder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Camera Angle</label>
                  <Select value={structure.cameraAngle} onValueChange={(v) => setStructure(prev => ({ ...prev, cameraAngle: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eye-level">Eye Level</SelectItem>
                      <SelectItem value="low-angle">Low Angle</SelectItem>
                      <SelectItem value="high-angle">High Angle</SelectItem>
                      <SelectItem value="birds-eye">Bird's Eye</SelectItem>
                      <SelectItem value="dutch-angle">Dutch Angle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Lighting</label>
                <Select value={structure.lighting} onValueChange={(v) => setStructure(prev => ({ ...prev, lighting: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural">Natural</SelectItem>
                    <SelectItem value="golden-hour">Golden Hour</SelectItem>
                    <SelectItem value="dramatic">Dramatic</SelectItem>
                    <SelectItem value="soft">Soft Diffused</SelectItem>
                    <SelectItem value="harsh">Harsh Contrast</SelectItem>
                    <SelectItem value="backlit">Backlit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Art Style */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200">Art Style 🎨</h3>
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

            {/* Additional Details */}
            <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-200">Additional Details</h3>
              <Textarea
                value={structure.additionalDetails}
                onChange={(e) => setStructure(prev => ({ ...prev, additionalDetails: e.target.value }))}
                placeholder="Add any specific details: props, visual effects, special elements..."
                rows={3}
                className="resize-none"
              />
            </div>
          </TabsContent>

          {/* Advanced Mode */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Scene Prompt</label>
              <Textarea
                value={advancedPrompt}
                onChange={(e) => setAdvancedPrompt(e.target.value)}
                rows={12}
                placeholder="Wide shot of a beach at sunrise, golden hour lighting..."
                className="resize-vertical"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Negative Prompt</label>
              <Textarea
                value={structure.negativePrompt}
                onChange={(e) => setStructure(prev => ({ ...prev, negativePrompt: e.target.value }))}
                rows={3}
                placeholder="blurry, low quality, distorted, poor composition..."
                className="resize-none"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Live Prompt Preview */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-3 -mx-6 -mb-6">
          <label className="text-xs text-gray-400 block mb-1">Generated Prompt</label>
          <div className="text-sm text-gray-200 p-2 bg-gray-800 rounded border border-gray-700 max-h-32 overflow-y-auto leading-relaxed">
            {constructedPrompt || <span className="text-gray-500 italic">Fill in the fields above to build your prompt...</span>}
          </div>
          <div className="flex gap-2 mt-2">
            <Button onClick={handleApply} className="flex-1">
              Apply Prompt
            </Button>
            <Button onClick={handleCopy} variant="outline" className="px-3">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

