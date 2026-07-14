/**
 * ImageEditModal - AI-powered image editing modal
 *
 * Uses Gemini multimodal edit on Vertex for natural language edits with
 * optional identity reference preservation.
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
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
  Package,
  Users,
} from 'lucide-react'
import {
  buildFrameEditReferenceImages,
  frameEditReferenceKeys,
  type FrameEditCharacterReference,
  type FrameEditReferenceSelectionKey,
} from '@/lib/vision/resolveFrameEditCharacterReferences'
import { MAX_REFERENCE_IMAGES_ECO } from '@/lib/vision/referenceLimits'

interface ImageEditModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Called when modal should close */
  onOpenChange: (open: boolean) => void
  /** Source image URL to edit */
  imageUrl: string
  /** Image type for context */
  imageType: 'scene' | 'character' | 'object' | 'location' | 'prop'
  /** Optional subject reference for identity consistency (legacy) */
  subjectReference?: {
    imageUrl: string
    description: string
  }
  /** Character identity + wardrobe refs for the frame cast */
  characterReferences?: FrameEditCharacterReference[]
  /** Object/prop references for visual consistency */
  objectReferences?: Array<{ id: string; name: string; imageUrl: string; description?: string }>
  /** Output aspect ratio (defaults to 16:9 storyboard) */
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4'
  /** Called when edit is saved with new image URL */
  onSave: (newImageUrl: string) => void
  /** Optional custom title */
  title?: string
}

function ReferenceTile({
  imageUrl,
  label,
  sublabel,
  selected,
  onToggle,
}: {
  imageUrl: string
  label: string
  sublabel?: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
        selected
          ? 'border-cyan-500 ring-1 ring-cyan-500/50'
          : 'border-slate-600 hover:border-slate-500'
      }`}
      title={label}
    >
      <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5">
        <div className="text-[8px] text-white truncate font-medium">{label}</div>
        {sublabel && <div className="text-[7px] text-slate-300 truncate">{sublabel}</div>}
      </div>
      {selected && (
        <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-cyan-500 rounded-full flex items-center justify-center">
          <Check className="w-2 h-2 text-white" />
        </div>
      )}
    </button>
  )
}

export function ImageEditModal({
  open,
  onOpenChange,
  imageUrl,
  imageType,
  subjectReference,
  characterReferences,
  objectReferences,
  aspectRatio = '16:9',
  onSave,
  title,
}: ImageEditModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [selectedPropIds, setSelectedPropIds] = useState<string[]>([])
  const [selectedCharRefKeys, setSelectedCharRefKeys] = useState<FrameEditReferenceSelectionKey[]>(
    []
  )

  const defaultCharRefKeys = useMemo(
    () => frameEditReferenceKeys(characterReferences ?? []),
    [characterReferences]
  )

  useEffect(() => {
    if (open) {
      setSelectedCharRefKeys(defaultCharRefKeys)
    }
  }, [open, defaultCharRefKeys])

  const handleOpenChange = (openState: boolean) => {
    if (!openState) {
      setEditedImageUrl(null)
      setShowComparison(false)
      setInstruction('')
      setSelectedPropIds([])
      setSelectedCharRefKeys([])
    }
    onOpenChange(openState)
  }

  const toggleCharRefKey = (key: FrameEditReferenceSelectionKey) => {
    setSelectedCharRefKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const handleEdit = async () => {
    if (!instruction.trim()) {
      toast.error('Please enter an edit instruction')
      return
    }

    setIsProcessing(true)
    try {
      const selectedKeys = new Set(selectedCharRefKeys)
      const prioritizedRefs = buildFrameEditReferenceImages({
        characterReferences: characterReferences ?? [],
        selectedKeys,
        objectReferences,
        selectedPropIds,
      })

      const referenceImages = prioritizedRefs.map((ref) => ({
        imageUrl: ref.imageUrl,
        name: ref.name,
      }))

      const totalRefs = 1 + referenceImages.length
      const modelTier = totalRefs > MAX_REFERENCE_IMAGES_ECO ? 'designer' : 'eco'

      const legacySubject =
        characterReferences?.length || referenceImages.length
          ? undefined
          : subjectReference

      const response = await fetch('/api/image/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'instruction',
          sourceImage: imageUrl,
          instruction: instruction.trim(),
          subjectReference: legacySubject,
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          aspectRatio,
          imageSize: '1K',
          modelTier,
          saveToBlob: true,
          blobPrefix: `edited-${imageType}`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Edit failed')
      }

      setEditedImageUrl(data.imageUrl)
      setShowComparison(true)
      toast.success('Image edited successfully!')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to edit image'
      console.error('[ImageEditModal] Edit failed:', error)
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSave = useCallback(() => {
    if (editedImageUrl) {
      onSave(editedImageUrl)
      handleOpenChange(false)
      toast.success('Changes saved!')
    }
  }, [editedImageUrl, onSave])

  const handleDiscard = useCallback(() => {
    setEditedImageUrl(null)
    setShowComparison(false)
  }, [])

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
  const selectedRefCount =
    selectedCharRefKeys.length + selectedPropIds.length

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

        {showComparison && editedImageUrl ? (
          <div className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Before</Label>
                <div className="aspect-square bg-black rounded-lg overflow-hidden border border-slate-700">
                  <img src={imageUrl} alt="Original" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">After</Label>
                <div className="aspect-square bg-black rounded-lg overflow-hidden border border-green-600">
                  <img src={editedImageUrl} alt="Edited" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleDiscard} className="text-slate-300">
                <RotateCcw className="w-4 h-4 mr-2" />
                Edit Again
              </Button>
              <Button variant="outline" onClick={handleDownload} className="text-slate-300">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Source Image</Label>
                <div className="aspect-square bg-black rounded-lg overflow-hidden border border-slate-700">
                  <img src={imageUrl} alt="Source" className="w-full h-full object-contain" />
                </div>
              </div>

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

                {characterReferences && characterReferences.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      Character References
                    </Label>
                    <div className="space-y-2 max-h-36 overflow-y-auto p-2 bg-slate-800 rounded border border-slate-700">
                      {characterReferences.map((ref) => (
                        <div key={ref.characterName} className="space-y-1">
                          <p className="text-[10px] font-medium text-cyan-200/90 truncate">
                            {ref.characterName}
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {ref.wardrobeDiptychUrl ? (
                              <ReferenceTile
                                imageUrl={ref.wardrobeDiptychUrl}
                                label="Diptych"
                                sublabel="Identity + wardrobe"
                                selected={selectedCharRefKeys.includes(
                                  `diptych:${ref.characterName}`
                                )}
                                onToggle={() =>
                                  toggleCharRefKey(`diptych:${ref.characterName}`)
                                }
                              />
                            ) : (
                              <>
                                {ref.identityImageUrl && (
                                  <ReferenceTile
                                    imageUrl={ref.identityImageUrl}
                                    label="Identity"
                                    selected={selectedCharRefKeys.includes(
                                      `identity:${ref.characterName}`
                                    )}
                                    onToggle={() =>
                                      toggleCharRefKey(`identity:${ref.characterName}`)
                                    }
                                  />
                                )}
                                {ref.wardrobeImageUrl && (
                                  <ReferenceTile
                                    imageUrl={ref.wardrobeImageUrl}
                                    label="Wardrobe"
                                    selected={selectedCharRefKeys.includes(
                                      `wardrobe:${ref.characterName}`
                                    )}
                                    onToggle={() =>
                                      toggleCharRefKey(`wardrobe:${ref.characterName}`)
                                    }
                                  />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Selected references guide identity and outfit during the edit
                    </p>
                  </div>
                )}

                {!characterReferences?.length && subjectReference && (
                  <div className="flex items-center gap-2 p-2 bg-slate-800 rounded text-xs text-slate-400">
                    <Check className="w-3 h-3 text-green-400" />
                    Character identity will be preserved
                  </div>
                )}

                {selectedRefCount > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-slate-800/80 rounded text-xs text-cyan-200/80">
                    <Check className="w-3 h-3 text-cyan-400 shrink-0" />
                    {selectedRefCount} reference{selectedRefCount === 1 ? '' : 's'} included in edit
                  </div>
                )}

                {objectReferences && objectReferences.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      Include Props for Consistency
                    </Label>
                    <div className="grid grid-cols-4 gap-2 max-h-28 overflow-y-auto p-2 bg-slate-800 rounded border border-slate-700">
                      {objectReferences.map((ref) => (
                        <button
                          key={ref.id}
                          type="button"
                          onClick={() =>
                            setSelectedPropIds((prev) =>
                              prev.includes(ref.id)
                                ? prev.filter((id) => id !== ref.id)
                                : [...prev, ref.id]
                            )
                          }
                          className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                            selectedPropIds.includes(ref.id)
                              ? 'border-purple-500 ring-1 ring-purple-500/50'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                          title={ref.name}
                        >
                          <img
                            src={ref.imageUrl}
                            alt={ref.name}
                            className="w-full h-full object-cover"
                          />
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
                    <p className="text-[10px] text-slate-500">
                      Select props to maintain visual consistency in the edit
                    </p>
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
