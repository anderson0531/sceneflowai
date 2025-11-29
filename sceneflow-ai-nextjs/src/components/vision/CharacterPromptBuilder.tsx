'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/Button'
import { Copy, Check, Info } from 'lucide-react'
import { artStylePresets } from '@/constants/artStylePresets'

interface CharacterPromptBuilderProps {
  open: boolean
  onClose: () => void
  character?: {
    id?: string
    name: string
    appearanceDescription?: string
    referenceImage?: string
    referenceImageGCS?: string
  }
  isGenerating?: boolean
  onGenerateImage: (payload: {
    character?: any
    characterPrompt: string
    artStyle: string
    shotType: string
    cameraAngle: string
    lighting: string
    additionalDetails?: string
  }) => void
}

export function CharacterPromptBuilder({
  open,
  onClose,
  character,
  isGenerating = false,
  onGenerateImage
}: CharacterPromptBuilderProps) {
  const [shotType, setShotType] = useState('close-up')
  const [cameraAngle, setCameraAngle] = useState('eye-level')
  const [lighting, setLighting] = useState('natural')
  const [artStyle, setArtStyle] = useState('photorealistic')
  const [additionalDetails, setAdditionalDetails] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setCopied(false)
    }
  }, [open])

  const promptPreview = useMemo(() => {
    const shotMap: Record<string, string> = {
      'wide-shot': 'Wide shot',
      'medium-shot': 'Medium shot',
      'medium-close-up': 'Medium close-up',
      'close-up': 'Close-up',
      'extreme-close-up': 'Extreme close-up',
      'over-shoulder': 'Over the shoulder'
    }

    const angleMap: Record<string, string> = {
      'eye-level': 'eye level camera angle',
      'low-angle': 'low angle camera',
      'high-angle': 'high angle camera',
      'birds-eye': "bird's eye view",
      'dutch-angle': 'dutch angle'
    }

    const lightingMap: Record<string, string> = {
      'natural': 'natural lighting',
      'golden-hour': 'golden hour lighting',
      'dramatic': 'dramatic cinematic lighting',
      'soft': 'soft diffused lighting',
      'harsh': 'harsh contrast lighting',
      'backlit': 'backlit scene'
    }

    const parts: string[] = []
    parts.push(`${shotMap[shotType] || shotType}`)

    if (character?.name) {
      parts.push(`of ${character.name}`)
    }

    // include appearance description if available
    if (character?.appearanceDescription) {
      parts.push(character.appearanceDescription)
    }

    if (cameraAngle && cameraAngle !== 'eye-level') {
      parts.push(angleMap[cameraAngle] || cameraAngle)
    }

    if (lighting) {
      parts.push(lightingMap[lighting] || lighting)
    }

    if (additionalDetails) {
      parts.push(additionalDetails)
    }

    const stylePreset = artStylePresets.find(s => s.id === artStyle)
    if (stylePreset) parts.push(stylePreset.promptSuffix)

    return parts.filter(Boolean).join(', ')
  }, [shotType, cameraAngle, lighting, artStyle, additionalDetails, character])

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(promptPreview)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerate = async () => {
    onGenerateImage({
      character,
      characterPrompt: promptPreview,
      artStyle,
      shotType,
      cameraAngle,
      lighting,
      additionalDetails
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[85vh] bg-gray-900 text-white border-gray-700 flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white">Character Prompt Builder{character?.name ? ` - ${character.name}` : ''}</DialogTitle>
        </DialogHeader>
        
        {/* Guidance Banner when character has reference image */}
        {character?.referenceImage && (
          <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-300">
                <p className="font-medium mb-1">Character Reference Active</p>
                <p className="text-blue-400/80">
                  Use <span className="font-medium">Close-Up</span> or <span className="font-medium">Medium Close-Up</span> for best facial consistency.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-0">
        {/* Camera & Composition */}
        <div className="mt-4 space-y-4 p-3 rounded border border-gray-700 bg-gray-800/50">
          <h3 className="text-sm font-semibold text-gray-200">Camera & Composition</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Shot Type</label>
              <Select value={shotType} onValueChange={setShotType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="close-up">Close-Up (CU)</SelectItem>
                  <SelectItem value="medium-close-up">Medium Close-Up (MCU)</SelectItem>
                  <SelectItem value="medium-shot">Medium Shot (MS)</SelectItem>
                  <SelectItem value="over-shoulder">Over the Shoulder (OTS)</SelectItem>
                  <SelectItem value="extreme-close-up">Extreme Close-Up (ECU)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Camera Angle</label>
              <Select value={cameraAngle} onValueChange={setCameraAngle}>
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
            <Select value={lighting} onValueChange={setLighting}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="natural">Natural</SelectItem>
                <SelectItem value="golden-hour">Golden Hour</SelectItem>
                <SelectItem value="dramatic">Dramatic</SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="harsh">Harsh</SelectItem>
                <SelectItem value="backlit">Backlit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Art Style */}
        <div className="mt-4 space-y-4 p-3 rounded border border-gray-700 bg-gray-800/50">
          <h3 className="text-sm font-semibold text-gray-200">Art Style</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {artStylePresets.map(style => (
              <button
                key={style.id}
                onClick={() => setArtStyle(style.id)}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  artStyle === style.id ? 'border-blue-400 bg-blue-500/10' : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                }`}
              >
                <div className="font-semibold text-gray-100">{style.name}</div>
                <div className="text-[10px] text-gray-400">{style.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Details (AI Assist Instructions) */}
        <div className="mt-4 space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
          <h3 className="text-sm font-semibold text-gray-200">Additional Details (AI Assist Instructions)</h3>
          <Textarea
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
            placeholder="Add specifics: wardrobe, expression, mood, background blur, bokeh, studio lighting setup, lens focal length, etc."
            className="min-h-[90px]"
          />
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
            <Textarea
              placeholder="AI Assist: describe changes to the prompt (e.g., 'make lighting softer, add studio background')"
              className="md:col-span-2 min-h-[60px]"
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {/* no-op: additionalDetails already reflects assist */}}
            >
              Apply Assist
            </Button>
          </div>
        </div>

        {/* Prompt Preview */}
        <div className="mt-4 p-3 rounded border border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-200">Prompt Preview</h3>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="text-gray-300">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="mt-2 text-xs text-gray-300 bg-gray-900 rounded p-3 border border-gray-700">
            {promptPreview}
          </div>
        </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="text-gray-300">Cancel</Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            Generate Character Image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CharacterPromptBuilder
