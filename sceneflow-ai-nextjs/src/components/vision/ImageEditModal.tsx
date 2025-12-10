/**
 * ImageEditModal - Comprehensive image editing modal
 * 
 * Three editing modes:
 * 1. Quick Edit (Instruction) - Natural language edits without masks
 * 2. Precise Edit (Inpaint) - Mask-based editing for specific regions
 * 3. Outpaint - Expand image to cinematic aspect ratios
 * 
 * Features:
 * - Before/after comparison preview
 * - Mask painting tools for precise edits
 * - Preset cinematic aspect ratios for outpainting
 * - On-the-fly mask generation (no mask storage)
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ImageMaskEditor } from './ImageMaskEditor'
import { ASPECT_RATIO_PRESETS, AspectRatioPreset } from '@/types/imageEdit'
import { toast } from 'sonner'
import {
  Wand2,
  Paintbrush,
  Expand,
  Loader2,
  ArrowLeftRight,
  Check,
  X,
  RotateCcw,
  Download,
  Save
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageEditModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Called when modal should close */
  onOpenChange: (open: boolean) => void
  /** Source image URL to edit */
  imageUrl: string
  /** Image type for context */
  imageType: 'scene' | 'character' | 'object'
  /** Optional subject reference for identity consistency */
  subjectReference?: {
    imageUrl: string
    description: string
  }
  /** Called when edit is saved with new image URL */
  onSave: (newImageUrl: string) => void
  /** Optional custom title */
  title?: string
}

type EditTab = 'quick' | 'precise' | 'outpaint'

export function ImageEditModal({
  open,
  onOpenChange,
  imageUrl,
  imageType,
  subjectReference,
  onSave,
  title
}: ImageEditModalProps) {
  // State
  const [activeTab, setActiveTab] = useState<EditTab>('quick')
  const [isProcessing, setIsProcessing] = useState(false)
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  
  // Quick Edit state
  const [instruction, setInstruction] = useState('')
  
  // Precise Edit state
  const [maskData, setMaskData] = useState<string>('')
  const [inpaintPrompt, setInpaintPrompt] = useState('')
  
  // Outpaint state
  const [targetAspectRatio, setTargetAspectRatio] = useState<AspectRatioPreset>('16:9')
  const [outpaintPrompt, setOutpaintPrompt] = useState('')
  
  // Reset state when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset on close
      setEditedImageUrl(null)
      setShowComparison(false)
      setInstruction('')
      setMaskData('')
      setInpaintPrompt('')
      setOutpaintPrompt('')
    }
    onOpenChange(open)
  }
  
  // Handle Quick Edit (instruction-based)
  const handleQuickEdit = async () => {
    if (!instruction.trim()) {
      toast.error('Please enter an edit instruction')
      return
    }
    
    setIsProcessing(true)
    try {
      const response = await fetch('/api/image/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'instruction',
          sourceImage: imageUrl,
          instruction: instruction.trim(),
          subjectReference,
          saveToBlob: true,
          blobPrefix: `edited-${imageType}`
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Edit failed')
      }
      
      setEditedImageUrl(data.imageUrl)
      setShowComparison(true)
      toast.success('Image edited successfully!')
    } catch (error: any) {
      console.error('[ImageEditModal] Quick edit failed:', error)
      toast.error(error.message || 'Failed to edit image')
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Handle Precise Edit (mask-based inpainting)
  const handlePreciseEdit = async () => {
    if (!maskData) {
      toast.error('Please paint the area you want to edit')
      return
    }
    if (!inpaintPrompt.trim()) {
      toast.error('Please describe what to generate in the painted area')
      return
    }
    
    setIsProcessing(true)
    try {
      const response = await fetch('/api/image/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'inpaint',
          sourceImage: imageUrl,
          maskImage: maskData,
          prompt: inpaintPrompt.trim(),
          saveToBlob: true,
          blobPrefix: `inpaint-${imageType}`
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Inpainting failed')
      }
      
      setEditedImageUrl(data.imageUrl)
      setShowComparison(true)
      toast.success('Image edited successfully!')
    } catch (error: any) {
      console.error('[ImageEditModal] Precise edit failed:', error)
      toast.error(error.message || 'Failed to edit image')
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Handle Outpaint (aspect ratio expansion)
  const handleOutpaint = async () => {
    if (!outpaintPrompt.trim()) {
      toast.error('Please describe the expanded areas')
      return
    }
    
    setIsProcessing(true)
    try {
      const response = await fetch('/api/image/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'outpaint',
          sourceImage: imageUrl,
          targetAspectRatio,
          prompt: outpaintPrompt.trim(),
          saveToBlob: true,
          blobPrefix: `outpaint-${imageType}`
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Outpainting failed')
      }
      
      setEditedImageUrl(data.imageUrl)
      setShowComparison(true)
      toast.success('Image expanded successfully!')
    } catch (error: any) {
      console.error('[ImageEditModal] Outpaint failed:', error)
      toast.error(error.message || 'Failed to expand image')
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Save edited image
  const handleSave = useCallback(() => {
    if (editedImageUrl) {
      onSave(editedImageUrl)
      handleOpenChange(false)
      toast.success('Changes saved!')
    }
  }, [editedImageUrl, onSave])
  
  // Discard edited image and go back to editing
  const handleDiscard = useCallback(() => {
    setEditedImageUrl(null)
    setShowComparison(false)
  }, [])
  
  // Download edited image
  const handleDownload = useCallback(async () => {
    if (!editedImageUrl) return
    
    try {
      const response = await fetch(editedImageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `edited-${imageType}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download image')
    }
  }, [editedImageUrl, imageType])
  
  const modalTitle = title || `Edit ${imageType.charAt(0).toUpperCase() + imageType.slice(1)} Image`
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-400" />
          {modalTitle}
        </DialogTitle>
        <DialogDescription className="text-slate-400">
          Edit your image using AI-powered tools. Choose a method below.
        </DialogDescription>
        
        {/* Comparison View */}
        {showComparison && editedImageUrl ? (
          <div className="space-y-4">
            {/* Before/After Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm text-slate-400">Before / After Comparison</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowComparison(!showComparison)}
                    >
                      <ArrowLeftRight className="w-4 h-4 mr-2" />
                      Toggle View
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Switch between before and after</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Before/After Images */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Before</Label>
                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-700">
                  <img
                    src={imageUrl}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">After</Label>
                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-green-600">
                  <img
                    src={editedImageUrl}
                    alt="Edited"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleDiscard}
                className="text-slate-300"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Edit Again
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="text-slate-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          /* Editing Tabs */
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EditTab)}>
            <TabsList className="grid grid-cols-3 bg-slate-800">
              <TabsTrigger value="quick" className="flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                Quick Edit
              </TabsTrigger>
              <TabsTrigger value="precise" className="flex items-center gap-2">
                <Paintbrush className="w-4 h-4" />
                Precise Edit
              </TabsTrigger>
              <TabsTrigger value="outpaint" className="flex items-center gap-2">
                <Expand className="w-4 h-4" />
                Outpaint
              </TabsTrigger>
            </TabsList>
            
            {/* Quick Edit Tab */}
            <TabsContent value="quick" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Source image preview */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Source Image</Label>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-700">
                    <img
                      src={imageUrl}
                      alt="Source"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                
                {/* Edit instruction */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Edit Instruction</Label>
                  <Textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Describe the change you want, e.g., 'Change the suit to a tuxedo' or 'Make the lighting warmer'"
                    className="h-32 bg-slate-800 border-slate-600 text-white resize-none"
                  />
                  <p className="text-xs text-slate-500">
                    Use natural language to describe your edit. The AI will understand context.
                  </p>
                  
                  {/* Subject reference info */}
                  {subjectReference && (
                    <div className="flex items-center gap-2 p-2 bg-slate-800 rounded text-xs text-slate-400">
                      <Check className="w-3 h-3 text-green-400" />
                      Character identity will be preserved
                    </div>
                  )}
                  
                  <Button
                    onClick={handleQuickEdit}
                    disabled={isProcessing || !instruction.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Apply Edit
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* Precise Edit Tab */}
            <TabsContent value="precise" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  {/* Mask editor */}
                  <div className="flex-1">
                    <Label className="text-slate-300 mb-2 block">Paint the area to edit</Label>
                    <ImageMaskEditor
                      imageUrl={imageUrl}
                      onMaskChange={setMaskData}
                      className="border border-slate-600 rounded-lg p-2"
                    />
                  </div>
                  
                  {/* Prompt input */}
                  <div className="w-64 space-y-2">
                    <Label className="text-slate-300">What to generate</Label>
                    <Textarea
                      value={inpaintPrompt}
                      onChange={(e) => setInpaintPrompt(e.target.value)}
                      placeholder="Describe what should appear in the painted area..."
                      className="h-32 bg-slate-800 border-slate-600 text-white resize-none"
                    />
                    <p className="text-xs text-slate-500">
                      White areas will be replaced with the generated content.
                    </p>
                    <Button
                      onClick={handlePreciseEdit}
                      disabled={isProcessing || !maskData || !inpaintPrompt.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Paintbrush className="w-4 h-4 mr-2" />
                          Apply Inpaint
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Outpaint Tab */}
            <TabsContent value="outpaint" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Source image preview */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Source Image</Label>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-700">
                    <img
                      src={imageUrl}
                      alt="Source"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                
                {/* Outpaint options */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Target Aspect Ratio</Label>
                    <RadioGroup
                      value={targetAspectRatio}
                      onValueChange={(v) => setTargetAspectRatio(v as AspectRatioPreset)}
                      className="grid grid-cols-2 gap-2"
                    >
                      {Object.entries(ASPECT_RATIO_PRESETS).map(([ratio, info]) => (
                        <div key={ratio} className="flex items-center space-x-2">
                          <RadioGroupItem value={ratio} id={`ratio-${ratio}`} />
                          <Label
                            htmlFor={`ratio-${ratio}`}
                            className={cn(
                              'text-sm cursor-pointer',
                              targetAspectRatio === ratio ? 'text-white' : 'text-slate-400'
                            )}
                          >
                            {info.label} ({ratio})
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <p className="text-xs text-slate-500">
                      {ASPECT_RATIO_PRESETS[targetAspectRatio]?.description}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-slate-300">Describe expanded areas</Label>
                    <Textarea
                      value={outpaintPrompt}
                      onChange={(e) => setOutpaintPrompt(e.target.value)}
                      placeholder="Describe what should appear in the expanded areas, e.g., 'A modern office interior with large windows'"
                      className="h-24 bg-slate-800 border-slate-600 text-white resize-none"
                    />
                  </div>
                  
                  <Button
                    onClick={handleOutpaint}
                    disabled={isProcessing || !outpaintPrompt.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Expanding...
                      </>
                    ) : (
                      <>
                        <Expand className="w-4 h-4 mr-2" />
                        Expand Image
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ImageEditModal
