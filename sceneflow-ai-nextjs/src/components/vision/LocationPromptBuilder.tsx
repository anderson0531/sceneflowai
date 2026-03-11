'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/Button'
import { Copy, Check, Info, RotateCcw } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { artStylePresets } from '@/constants/artStylePresets'
import { LocationReference } from '@/types/visionReferences'

export interface LocationPromptPayload {
  location: LocationReference
  locationPrompt: string
  artStyle?: string
  shotType?: string
  cameraAngle?: string
  lighting?: string
  additionalDetails?: string
  rawMode?: boolean
}

interface LocationPromptBuilderProps {
  open: boolean
  onClose: () => void
  location?: LocationReference | null
  isGenerating?: boolean
  onGenerateImage: (payload: LocationPromptPayload) => void
  /** Screenplay context for richer prompt generation */
  screenplayContext?: {
    genre?: string
    tone?: string
    setting?: string
    visualStyle?: string
  }
}

export function LocationPromptBuilder({
  open,
  onClose,
  location,
  isGenerating = false,
  onGenerateImage,
  screenplayContext
}: LocationPromptBuilderProps) {
  // Guided selections — defaults optimized for location establishing shots
  const [shotType, setShotType] = useState('wide-shot')
  const [cameraAngle, setCameraAngle] = useState('eye-level')
  const [lighting, setLighting] = useState('natural')
  const [artStyle, setArtStyle] = useState('')
  const [additionalDetails, setAdditionalDetails] = useState('')
  // Modes & prompt state
  const [mode, setMode] = useState<'guided' | 'advanced'>('guided')
  const [basePrompt, setBasePrompt] = useState('')
  const [advancedPrompt, setAdvancedPrompt] = useState('')
  const [hasUserEditedAdvanced, setHasUserEditedAdvanced] = useState(false)
  // AI Assist
  const [assistInstruction, setAssistInstruction] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)
  // UI
  const [copied, setCopied] = useState(false)

  // Build base prompt from location attributes when opened
  useEffect(() => {
    if (!open) return
    if (!location) {
      setBasePrompt('')
      return
    }

    const parts: string[] = []

    // Location description or name
    if (location.description) {
      parts.push(location.description)
    } else {
      parts.push(`${location.location} setting`)
    }

    // INT/EXT context
    if (location.intExt) {
      const mapping: Record<string, string> = {
        'INT': 'Interior scene',
        'EXT': 'Exterior scene',
        'INT/EXT': 'Interior/Exterior transitional scene',
        'EXT/INT': 'Exterior/Interior transitional scene'
      }
      const context = mapping[location.intExt]
      if (context) parts.push(context)
    }

    // Time of day lighting
    if (location.timeOfDay) {
      const lightingMap: Record<string, string> = {
        'DAY': 'Natural daylight, bright ambient lighting',
        'NIGHT': 'Nighttime atmosphere, artificial interior lighting or moonlight',
        'MORNING': 'Early morning light, soft golden hour tones',
        'EVENING': 'Evening atmosphere, warm golden lighting',
        'SUNSET': 'Dramatic sunset lighting with warm orange and pink tones',
        'SUNRISE': 'Sunrise atmosphere, soft warm golden light breaking through',
        'DUSK': 'Twilight atmosphere, cool blue-purple tones with fading light',
        'DAWN': 'Pre-dawn atmosphere, soft cool light with hint of warmth'
      }
      const timeLighting = lightingMap[location.timeOfDay.toUpperCase()]
      if (timeLighting) parts.push(timeLighting)
    }

    // Auto-set lighting preset from time of day
    if (location.timeOfDay) {
      const tod = location.timeOfDay.toUpperCase()
      if (['NIGHT', 'DUSK'].includes(tod)) setLighting('dramatic')
      else if (['SUNSET', 'SUNRISE'].includes(tod)) setLighting('golden-hour')
      else if (['MORNING', 'DAWN'].includes(tod)) setLighting('soft')
      else setLighting('natural')
    }

    // Screenplay context enrichment
    if (screenplayContext?.visualStyle) {
      parts.push(`Visual style: ${screenplayContext.visualStyle}`)
    }

    // Production quality — no people
    parts.push('Empty scene with NO people or characters present')
    parts.push('Cinematic production design, professional film set quality')

    const constructed = parts.filter(Boolean).join('. ')
    setBasePrompt(constructed)
    if (!hasUserEditedAdvanced) setAdvancedPrompt(constructed)
  }, [open, location, hasUserEditedAdvanced, screenplayContext])

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      setAssistInstruction('')
      setCopied(false)
      setIsOptimizing(false)
      setHasUserEditedAdvanced(false)
      setAdditionalDetails('')
    }
  }, [open])

  const guidedPrompt = useMemo(() => {
    const shotMap: Record<string, string> = {
      'extreme-wide': 'Extreme wide establishing shot',
      'wide-shot': 'Wide establishing shot',
      'medium-shot': 'Medium shot',
      'medium-close-up': 'Medium close-up',
      'close-up': 'Close-up detail shot',
    }
    const angleMap: Record<string, string> = {
      'eye-level': 'eye level angle',
      'low-angle': 'low angle view',
      'high-angle': 'high angle view',
      'birds-eye': "bird's eye view",
      'dutch-angle': 'dutch angle'
    }
    const lightingMap: Record<string, string> = {
      'natural': 'natural lighting',
      'golden-hour': 'golden hour lighting',
      'dramatic': 'dramatic cinematic lighting',
      'soft': 'soft diffused lighting',
      'harsh': 'harsh contrast lighting',
      'backlit': 'backlit scene',
      'stylized': 'stylized lighting',
      'neon': 'neon lighting',
    }
    const parts: string[] = []
    parts.push(shotMap[shotType] || shotType)
    if (basePrompt) parts.push(`of ${basePrompt}`)
    if (cameraAngle && cameraAngle !== 'eye-level') parts.push(angleMap[cameraAngle] || cameraAngle)
    if (lighting) parts.push(lightingMap[lighting] || lighting)
    if (additionalDetails) parts.push(additionalDetails)

    // Art style
    const stylePreset = artStyle ? artStylePresets.find(s => s.id === artStyle) : null
    if (stylePreset) {
      const existing = parts.join(', ').toLowerCase()
      const primaryTerm = stylePreset.id.split('-')[0]
      const alreadyHasStyle = existing.includes(primaryTerm) ||
                              existing.includes(stylePreset.name.toLowerCase())
      if (!alreadyHasStyle) {
        parts.push(stylePreset.promptSuffix)
      }
    }

    // Deduplicate
    const tokens = parts.join(', ').split(',').map(t => t.trim()).filter(Boolean)
    const seen = new Set<string>()
    const out: string[] = []
    for (const t of tokens) {
      const key = t.toLowerCase()
      if (seen.has(key)) continue
      out.push(t)
      seen.add(key)
    }
    return out.join(', ')
  }, [shotType, cameraAngle, lighting, artStyle, additionalDetails, basePrompt])

  const finalPrompt = mode === 'advanced' ? advancedPrompt : guidedPrompt

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(finalPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerate = () => {
    if (!location) return
    onGenerateImage({
      location,
      locationPrompt: finalPrompt,
      artStyle,
      shotType,
      cameraAngle,
      lighting,
      additionalDetails,
      rawMode: mode === 'advanced'
    })
  }

  const handleAssist = async () => {
    if (!assistInstruction.trim()) return
    setIsOptimizing(true)
    try {
      const res = await fetch('/api/character/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, instruction: assistInstruction })
      })
      const data = await res.json()
      if (data.optimizedPrompt) {
        if (mode === 'advanced') {
          setAdvancedPrompt(data.optimizedPrompt)
          setHasUserEditedAdvanced(true)
        } else {
          setAdditionalDetails(prev => prev ? `${prev}, ${data.optimizedPrompt}` : data.optimizedPrompt)
        }
        setAssistInstruction('')
      }
    } catch (e) {
      console.error('[Location Prompt Assist] Failed:', e)
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleReset = () => {
    if (mode === 'advanced') {
      setAdvancedPrompt(basePrompt)
      setHasUserEditedAdvanced(false)
    } else {
      setShotType('wide-shot')
      setCameraAngle('eye-level')
      setLighting('natural')
      setArtStyle('')
      setAdditionalDetails('')
    }
  }

  const locationLabel = location?.location || 'Location'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[85vh] bg-gray-900 text-white border-gray-700 flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white">Location Prompt Builder — {locationLabel}</DialogTitle>
        </DialogHeader>

        {/* No-people info banner */}
        <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300">
              <p className="font-medium mb-1">Environment Reference</p>
              <p className="text-blue-400/80">
                Location images are generated <span className="font-medium">without people</span> for
                consistent scene environment references across your project.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-0">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'guided' | 'advanced')} className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="guided" className="flex-1">Guided</TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1">Advanced</TabsTrigger>
            </TabsList>

            {/* GUIDED MODE */}
            <TabsContent value="guided" className="space-y-4">
              {/* Camera & Composition */}
              <div className="mt-4 space-y-4 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Camera &amp; Composition</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Shot Type</label>
                    <Select value={shotType} onValueChange={setShotType}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="extreme-wide">Extreme Wide</SelectItem>
                        <SelectItem value="wide-shot">Wide Shot (Establishing)</SelectItem>
                        <SelectItem value="medium-shot">Medium Shot</SelectItem>
                        <SelectItem value="medium-close-up">Medium Close-Up</SelectItem>
                        <SelectItem value="close-up">Close-Up (Detail)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Camera Angle</label>
                    <Select value={cameraAngle} onValueChange={setCameraAngle}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eye-level">Eye Level</SelectItem>
                        <SelectItem value="low-angle">Low Angle</SelectItem>
                        <SelectItem value="high-angle">High Angle</SelectItem>
                        <SelectItem value="birds-eye">Bird&apos;s Eye</SelectItem>
                        <SelectItem value="dutch-angle">Dutch Angle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Lighting</label>
                  <Select value={lighting} onValueChange={setLighting}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="golden-hour">Golden Hour</SelectItem>
                      <SelectItem value="dramatic">Dramatic</SelectItem>
                      <SelectItem value="soft">Soft</SelectItem>
                      <SelectItem value="harsh">Harsh</SelectItem>
                      <SelectItem value="backlit">Backlit</SelectItem>
                      <SelectItem value="stylized">Stylized</SelectItem>
                      <SelectItem value="neon">Neon</SelectItem>
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
                        artStyle === style.id
                          ? 'border-blue-400 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                      }`}
                    >
                      <div className="font-semibold text-gray-100">{style.name}</div>
                      <div className="text-[10px] text-gray-400">{style.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Details */}
              <div className="mt-4 space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Additional Details</h3>
                <Textarea
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  placeholder="Weather, specific set dressing, color palette, architectural details..."
                  className="min-h-[90px]"
                />
              </div>

              {/* Prompt Preview */}
              <div className="mt-4 p-3 rounded border border-gray-700 bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-200">Prompt Preview</h3>
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="text-gray-300">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="mt-2 text-xs text-gray-300 bg-gray-900 rounded p-3 border border-gray-700">{finalPrompt}</div>
              </div>
            </TabsContent>

            {/* ADVANCED MODE */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="mt-4 p-3 rounded border border-gray-700 bg-gray-800/50 space-y-3">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  Full Prompt Editor
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-200">Manual</span>
                </h3>
                <Textarea
                  value={advancedPrompt}
                  onChange={(e) => { setAdvancedPrompt(e.target.value); setHasUserEditedAdvanced(true) }}
                  placeholder="Edit or rewrite entire prompt. Base description is preloaded."
                  className="min-h-[220px]"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Textarea
                    placeholder="AI Assist instruction (e.g. 'add fog and rain')"
                    className="md:col-span-2 min-h-[60px]"
                    value={assistInstruction}
                    onChange={(e) => setAssistInstruction(e.target.value)}
                    disabled={isOptimizing}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAssist}
                    disabled={isOptimizing || !assistInstruction.trim()}
                  >
                    {isOptimizing ? 'Optimizing...' : 'AI Assist'}
                  </Button>
                </div>
                <div className="text-[10px] text-gray-400">
                  Assist replaces advanced prompt. Reset restores base location description.
                </div>
                <div className="mt-2 p-3 rounded border border-gray-700 bg-gray-900/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-200">Current Prompt</span>
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="text-gray-300">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="text-xs text-gray-300 whitespace-pre-wrap">{finalPrompt}</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="sm" onClick={handleReset} title="Reset" className="text-gray-300">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <span className="text-[10px] text-gray-400 px-1">
              {mode === 'guided' ? 'Guided Mode' : 'Advanced Mode'}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="text-gray-300">Cancel</Button>
            <Button onClick={handleGenerate} disabled={isGenerating || !finalPrompt.trim()}>
              {isGenerating ? 'Generating...' : 'Generate Location Image'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LocationPromptBuilder
