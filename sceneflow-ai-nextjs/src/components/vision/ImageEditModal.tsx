/**
 * ImageEditModal - AI-powered image editing modal
 * 
 * Uses Gemini Studio for natural language image editing with character
 * identity preservation. When a subject reference is provided, the AI
 * will maintain the person's identity while applying the requested edits.
 * 
 * Features:
 * - Natural language edit instructions
 * - Character identity preservation via reference images
 * - Before/after comparison preview
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Wand2,
  Loader2,
  ArrowLeftRight,
  Check,
  RotateCcw,
  Download,
  Save,
  Package
} from 'lucide-react'

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
  /** Object/prop references for visual consistency */
  objectReferences?: Array<{ id: string; name: string; imageUrl: string; description?: string }>
  /** Called when edit is saved with new image URL */
  onSave: (newImageUrl: string) => void
  /** Optional custom title */
  title?: string
}

export function ImageEditModal({
  open,
  onOpenChange,
  imageUrl,
  imageType,
  subjectReference,
  objectReferences,
  onSave,
  title
}: ImageEditModalProps) {
  // State
  const [isProcessing, setIsProcessing] = useState(false)
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  
  // Edit instruction state
  const [instruction, setInstruction] = useState('')
  
  // Prop selection state
  const [selectedPropIds, setSelectedPropIds] = useState<string[]>([])
  
  // Reset state when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset on close
      setEditedImageUrl(null)
      setShowComparison(false)
      setInstruction('')
      setSelectedPropIds([])
    }
    onOpenChange(open)
  }
  
  // Handle edit (instruction-based with Gemini Studio)
  const handleEdit = async () => {
    if (!instruction.trim()) {
      toast.error('Please enter an edit instruction')
      return
    }
    
    setIsProcessing(true)
    try {
      // Get selected prop references
      const selectedProps = objectReferences?.filter(ref => selectedPropIds.includes(ref.id)) || []
      
      const response = await fetch('/api/image/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'instruction',
          sourceImage: imageUrl,
          instruction: instruction.trim(),
          subjectReference,
          objectReferences: selectedProps.length > 0 ? selectedProps : undefined,
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
      console.error('[ImageEditModal] Edit failed:', error)
      toast.error(error.message || 'Failed to edit image')
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
          Edit your image using AI-powered tools. Describe the change you want in natural language.
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
                <div className="aspect-square bg-black rounded-lg overflow-hidden border border-slate-700">
                  <img
                    src={imageUrl}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">After</Label>
                <div className="aspect-square bg-black rounded-lg overflow-hidden border border-green-600">
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
          /* Edit Interface */
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Source image preview */}
              <div className="space-y-2">
                <Label className="text-slate-300">Source Image</Label>
                <div className="aspect-square bg-black rounded-lg overflow-hidden border border-slate-700">
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
                
                {/* Prop Reference Selection */}
                {objectReferences && objectReferences.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      Include Props for Consistency
                    </Label>
                    <div className="grid grid-cols-4 gap-2 max-h-28 overflow-y-auto p-2 bg-slate-800 rounded border border-slate-700">
                      {objectReferences.map(ref => (
                        <button
                          key={ref.id}
                          type="button"
                          onClick={() => setSelectedPropIds(prev => 
                            prev.includes(ref.id) ? prev.filter(id => id !== ref.id) : [...prev, ref.id]
                          )}
                          className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                            selectedPropIds.includes(ref.id)
                              ? 'border-purple-500 ring-1 ring-purple-500/50'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                          title={ref.name}
                        >
                          <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
                            <div className="text-[8px] text-white truncate">{ref.name}</div>
                          </div>
                          {selectedPropIds.includes(ref.id) && (
                            <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                              <Check className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">Select props to maintain visual consistency in the edit</p>
                  </div>
                )}
                
                <Button
                  onClick={handleEdit}
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ImageEditModal
