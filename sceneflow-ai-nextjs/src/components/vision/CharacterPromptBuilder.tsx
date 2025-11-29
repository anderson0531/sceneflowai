"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/Button'
import { Copy, Check, Info, RotateCcw } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { artStylePresets } from '@/constants/artStylePresets'

interface CharacterPromptBuilderProps {
  open: boolean
  onClose: () => void
  character?: any
  isGenerating?: boolean
  onGenerateImage: (payload: {
    character?: any
    characterPrompt: string
    artStyle?: string
    shotType?: string
    cameraAngle?: string
    lighting?: string
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
  // Guided selections
  const [shotType, setShotType] = useState('close-up')
  const [cameraAngle, setCameraAngle] = useState('eye-level')
  const [lighting, setLighting] = useState('natural')
  const [artStyle, setArtStyle] = useState('photorealistic')
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

  // Build base prompt from character attributes when opened
  useEffect(() => {
    if (!open) return
    if (!character) {
      setBasePrompt('')
      return
    }
    const parts: string[] = []
    if (character.name) parts.push(character.name)
    if (character.appearanceDescription) parts.push(character.appearanceDescription)
    const attrKeys = ['ethnicity','hairStyle','hairColor','eyeColor','expression','build','keyFeature']
    attrKeys.forEach(k => {
      const v = character[k]
      if (v && typeof v === 'string' && v.trim()) parts.push(v.trim())
    })
    const constructed = parts.filter(Boolean).join(', ')
    setBasePrompt(constructed)
    if (!hasUserEditedAdvanced) setAdvancedPrompt(constructed)
  }, [open, character, hasUserEditedAdvanced])

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      setAssistInstruction('')
      setCopied(false)
      setIsOptimizing(false)
    }
  }, [open])

  const guidedPrompt = useMemo(() => {
    const shotMap: Record<string, string> = {
      'wide-shot': 'Wide shot',
      'medium-shot': 'Medium shot',
      'medium-close-up': 'Medium close-up',
      'close-up': 'Close-up',
      'extreme-close-up': 'Extreme close-up',
      'over-shoulder': 'Over the shoulder'
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
      'backlit': 'backlit scene'
    }
    const parts: string[] = []
    parts.push(`${shotMap[shotType] || shotType}`)
    if (basePrompt) parts.push(`of ${basePrompt}`)
    if (cameraAngle && cameraAngle !== 'eye-level') parts.push(angleMap[cameraAngle] || cameraAngle)
    if (lighting) parts.push(lightingMap[lighting] || lighting)
    if (additionalDetails) parts.push(additionalDetails)
    const stylePreset = artStylePresets.find(s => s.id === artStyle)
    if (stylePreset) {
      const suffix = stylePreset.promptSuffix
      const existing = parts.join(', ').toLowerCase()
      if (!existing.includes(suffix.toLowerCase())) parts.push(suffix)
    }

    // Normalize, dedupe, and resolve style conflicts
    const tokens = parts
      .join(', ')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    const seen = new Set<string>()
    const out: string[] = []
    const isPhotorealisticMentioned = tokens.some(t => t.toLowerCase().includes('photorealistic'))
    const selectedArtStyle = artStyle

    for (const t of tokens) {
      const key = t.toLowerCase()
      if (seen.has(key)) continue

      // Remove conflicting style words when a non-photorealistic artStyle is selected
      if (selectedArtStyle && selectedArtStyle !== 'photorealistic') {
        if (key.includes('photorealistic')) continue
      }
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
    onGenerateImage({
      character,
      characterPrompt: finalPrompt,
      artStyle,
      shotType,
      cameraAngle,
      lighting,
      additionalDetails
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
          // Append to additional details for guided mode
            setAdditionalDetails(prev => prev ? `${prev}, ${data.optimizedPrompt}` : data.optimizedPrompt)
        }
        setAssistInstruction('')
      }
    } catch (e) {
      console.error('[Character Prompt Assist] Failed:', e)
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleReset = () => {
    if (mode === 'advanced') {
      setAdvancedPrompt(basePrompt)
      setHasUserEditedAdvanced(false)
    } else {
      setShotType('close-up')
      setCameraAngle('eye-level')
      setLighting('natural')
      setArtStyle('photorealistic')
      setAdditionalDetails('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[85vh] bg-gray-900 text-white border-gray-700 flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white">Character Prompt Builder{character?.name ? ` - ${character.name}` : ''}</DialogTitle>
        </DialogHeader>
        {character?.referenceImage && (
          <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-300">
                <p className="font-medium mb-1">Character Reference Active</p>
                <p className="text-blue-400/80">Use Close-Up or Medium Close-Up for strongest facial consistency.</p>
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-0">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'guided' | 'advanced')} className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="guided" className="flex-1">Guided</TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1">Advanced</TabsTrigger>
            </TabsList>
            <TabsContent value="guided" className="space-y-4">
              <div className="mt-4 space-y-4 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Camera & Composition</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Shot Type</label>
                    <Select value={shotType} onValueChange={setShotType}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <div className="mt-4 space-y-4 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Art Style</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {artStylePresets.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setArtStyle(style.id)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition ${artStyle === style.id ? 'border-blue-400 bg-blue-500/10' : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'}`}
                    >
                      <div className="font-semibold text-gray-100">{style.name}</div>
                      <div className="text-[10px] text-gray-400">{style.description}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200">Additional Details</h3>
                <Textarea
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  placeholder="Wardrobe, expression, mood, background blur, lens focal length, etc."
                  className="min-h-[90px]"
                />
              </div>
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
            <TabsContent value="advanced" className="space-y-4">
              <div className="mt-4 p-3 rounded border border-gray-700 bg-gray-800/50 space-y-3">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">Full Prompt Editor <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-200">Manual</span></h3>
                <Textarea
                  value={advancedPrompt}
                  onChange={(e) => { setAdvancedPrompt(e.target.value); setHasUserEditedAdvanced(true) }}
                  placeholder="Edit or rewrite entire prompt. Base description is preloaded."
                  className="min-h-[220px]"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Textarea
                    placeholder="AI Assist instruction (e.g. 'make it cinematic with rim lighting')"
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
                <div className="text-[10px] text-gray-400">Assist replaces advanced prompt. Reset restores base character description.</div>
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
        <div className="flex-shrink-0 mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="sm" onClick={handleReset} title="Reset" className="text-gray-300"><RotateCcw className="w-4 h-4" /></Button>
            <span className="text-[10px] text-gray-400 px-1">{mode === 'guided' ? 'Guided Mode' : 'Advanced Mode'}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="text-gray-300">Cancel</Button>
            <Button onClick={handleGenerate} disabled={isGenerating || !finalPrompt.trim()}>
              {isGenerating ? 'Generating...' : 'Generate Character Image'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CharacterPromptBuilder
