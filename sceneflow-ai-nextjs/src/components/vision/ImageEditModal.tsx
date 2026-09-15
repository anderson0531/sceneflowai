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
import { DictationTextarea } from '@/components/ui/DictationTextarea'
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
  MapPin,
} from 'lucide-react'
import {
  appendUseTheseReferencesClause,
  buildFrameEditCorrectionInstruction,
  buildFrameEditImagesForCorrectionTarget,
  buildFrameEditReferenceImages,
  frameEditCorrectionTargetForCharacter,
  frameEditCorrectionTargetForLocation,
  frameEditCorrectionTargetForProp,
  frameEditReferenceKeys,
  listFrameEditCorrectionTargets,
  type FrameEditCharacterReference,
  type FrameEditCorrectionTarget,
  type FrameEditLocationStill,
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
  /** Character identity + wardrobe refs (full library when provided) */
  characterReferences?: FrameEditCharacterReference[]
  /** Beat-resolved character tiles to select by default */
  defaultSelectedCharRefKeys?: FrameEditReferenceSelectionKey[]
  /** Object/prop references for visual consistency */
  objectReferences?: Array<{ id: string; name: string; imageUrl: string; description?: string }>
  defaultSelectedPropIds?: string[]
  /** Location base + version stills */
  locationStills?: FrameEditLocationStill[]
  defaultSelectedLocationIds?: string[]
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
  onCorrect,
  correctDisabled,
}: {
  imageUrl: string
  label: string
  sublabel?: string
  selected: boolean
  onToggle: () => void
  onCorrect?: () => void
  correctDisabled?: boolean
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`relative aspect-square w-full rounded overflow-hidden border-2 transition-all ${
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
      {onCorrect && (
        <button
          type="button"
          onClick={onCorrect}
          disabled={correctDisabled}
          className="mt-1 w-full text-[9px] px-1 py-0.5 rounded border border-cyan-700/70 text-cyan-200 hover:border-cyan-400 disabled:opacity-50"
        >
          Correct
        </button>
      )}
    </div>
  )
}

function appendChipText(current: string, addition: string): string {
  const trimmed = current.trim()
  if (!trimmed) return addition
  if (trimmed.includes(addition)) return trimmed
  return `${trimmed.replace(/[. ]*$/, '')}. ${addition}`
}

export function ImageEditModal({
  open,
  onOpenChange,
  imageUrl,
  imageType,
  subjectReference,
  characterReferences,
  defaultSelectedCharRefKeys,
  objectReferences,
  defaultSelectedPropIds,
  locationStills,
  defaultSelectedLocationIds,
  aspectRatio = '16:9',
  onSave,
  title,
}: ImageEditModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null)
  const [workingSourceUrl, setWorkingSourceUrl] = useState(imageUrl)
  const [showComparison, setShowComparison] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [selectedPropIds, setSelectedPropIds] = useState<string[]>([])
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [selectedCharRefKeys, setSelectedCharRefKeys] = useState<FrameEditReferenceSelectionKey[]>(
    []
  )
  const [correctionProgress, setCorrectionProgress] = useState<{
    label: string
    index: number
    total: number
  } | null>(null)

  const fallbackCharRefKeys = useMemo(
    () => frameEditReferenceKeys(characterReferences ?? []),
    [characterReferences]
  )

  useEffect(() => {
    if (open) {
      setSelectedCharRefKeys(defaultSelectedCharRefKeys ?? fallbackCharRefKeys)
      setSelectedPropIds(defaultSelectedPropIds ?? [])
      setSelectedLocationIds(defaultSelectedLocationIds ?? [])
    }
  }, [open, defaultSelectedCharRefKeys, fallbackCharRefKeys, defaultSelectedPropIds, defaultSelectedLocationIds])

  useEffect(() => {
    if (open) {
      setWorkingSourceUrl(imageUrl)
      setEditedImageUrl(null)
      setShowComparison(false)
      setCorrectionProgress(null)
    }
  }, [open, imageUrl])

  const handleOpenChange = (openState: boolean) => {
    if (!openState) {
      setEditedImageUrl(null)
      setShowComparison(false)
      setInstruction('')
      setSelectedPropIds([])
      setSelectedLocationIds([])
      setSelectedCharRefKeys([])
      setWorkingSourceUrl(imageUrl)
      setCorrectionProgress(null)
    }
    onOpenChange(openState)
  }

  const toggleCharRefKey = (key: FrameEditReferenceSelectionKey) => {
    setSelectedCharRefKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const selectedObjectNames = useMemo(
    () =>
      (objectReferences || [])
        .filter((ref) => selectedPropIds.includes(ref.id))
        .map((ref) => ref.name)
        .filter(Boolean),
    [objectReferences, selectedPropIds]
  )

  const commonEditChips = useMemo(
    () => [
      {
        id: 'photoreal',
        label: 'Make more photorealistic / live-action',
        text: 'Make this more photorealistic and live-action.',
      },
      {
        id: 'add-object',
        label: 'Add object',
        text: selectedObjectNames[0]
          ? `Add ${selectedObjectNames[0]} into the scene, matching lighting and perspective.`
          : 'Add [object] into the scene, matching lighting and perspective.',
      },
      {
        id: 'remove-object',
        label: 'Remove object',
        text: 'Remove the object from the scene, restoring the background naturally.',
      },
      {
        id: 'lighting',
        label: 'Fix lighting / exposure',
        text: 'Fix lighting and exposure so the scene is evenly lit and cinematic.',
      },
      {
        id: 'sharpen',
        label: 'Sharpen details',
        text: 'Sharpen details while preserving identity, wardrobe, and composition.',
      },
      {
        id: 'remove-people',
        label: 'Remove extra people',
        text: 'Remove extra people who are not in the selected character references.',
      },
      {
        id: 'ground',
        label: 'Ground subjects',
        text: 'Ground subjects: feet on the floor with realistic contact shadows.',
      },
    ],
    [selectedObjectNames]
  )

  const runFrameEdit = async (args: {
    sourceImage: string
    instruction: string
    referenceImages: Array<{ imageUrl: string; name?: string }>
  }): Promise<string> => {
    const totalRefs = 1 + args.referenceImages.length
    const modelTier = totalRefs > MAX_REFERENCE_IMAGES_ECO ? 'designer' : 'eco'

    const legacySubject =
      characterReferences?.length || args.referenceImages.length
        ? undefined
        : subjectReference

    const response = await fetch('/api/image/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'instruction',
        sourceImage: args.sourceImage,
        instruction: args.instruction,
        subjectReference: legacySubject,
        referenceImages: args.referenceImages.length > 0 ? args.referenceImages : undefined,
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
    if (typeof data.imageUrl !== 'string' || !data.imageUrl) {
      throw new Error('Edit failed')
    }
    return data.imageUrl
  }

  const handleEdit = async () => {
    if (!instruction.trim()) {
      toast.error('Please enter a direction')
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
        locationStills,
        selectedLocationIds,
      })

      const referenceImages = prioritizedRefs.map((ref) => ({
        imageUrl: ref.imageUrl,
        name: ref.name,
      }))

      const instructionWithRefs = appendUseTheseReferencesClause(
        instruction.trim(),
        referenceImages
      )

      const imageResultUrl = await runFrameEdit({
        sourceImage: workingSourceUrl || imageUrl,
        instruction: instructionWithRefs,
        referenceImages,
      })

      setWorkingSourceUrl(imageResultUrl)
      setEditedImageUrl(imageResultUrl)
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

  const runCorrectionTargets = async (targets: FrameEditCorrectionTarget[]) => {
    if (targets.length === 0) {
      toast.error('Select a reference to correct')
      return
    }

    setIsProcessing(true)
    let source = workingSourceUrl || imageUrl
    let lastUrl: string | null = null
    let failedLabel: string | null = null
    try {
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i]
        setCorrectionProgress({ label: target.label, index: i + 1, total: targets.length })
        const prioritizedRefs = buildFrameEditImagesForCorrectionTarget(target, {
          characterReferences: characterReferences ?? [],
          objectReferences,
          locationStills,
        })
        const referenceImages = prioritizedRefs.map((ref) => ({
          imageUrl: ref.imageUrl,
          name: ref.name,
        }))
        const instructionWithRefs = appendUseTheseReferencesClause(
          buildFrameEditCorrectionInstruction(target),
          referenceImages
        )
        try {
          lastUrl = await runFrameEdit({
            sourceImage: source,
            instruction: instructionWithRefs,
            referenceImages,
          })
          source = lastUrl
          setWorkingSourceUrl(lastUrl)
        } catch (error: unknown) {
          failedLabel = target.label
          throw error
        }
      }
      if (lastUrl) {
        setEditedImageUrl(lastUrl)
        setShowComparison(true)
        toast.success(
          targets.length === 1
            ? `Corrected ${targets[0].label}`
            : `Corrected ${targets.length} references`
        )
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to edit image'
      console.error('[ImageEditModal] Reference correction failed:', error)
      if (lastUrl) {
        setEditedImageUrl(lastUrl)
        setShowComparison(true)
      }
      toast.error(failedLabel ? `Stopped at ${failedLabel}: ${message}` : message)
    } finally {
      setIsProcessing(false)
      setCorrectionProgress(null)
    }
  }

  const handleCorrectSelected = () => {
    void runCorrectionTargets(selectedCorrectionTargets)
  }

  const handleSave = useCallback(() => {
    if (editedImageUrl) {
      onSave(editedImageUrl)
      handleOpenChange(false)
      toast.success('Changes saved!')
    }
  }, [editedImageUrl, onSave])

  const handleEditAgain = useCallback(() => {
    setShowComparison(false)
  }, [])

  const handleRevertToOriginal = useCallback(() => {
    setEditedImageUrl(null)
    setShowComparison(false)
    setWorkingSourceUrl(imageUrl)
  }, [imageUrl])

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
  const sourceForEdit = workingSourceUrl || imageUrl
  const hasWorkingChanges = sourceForEdit !== imageUrl
  const selectedRefCount =
    selectedCharRefKeys.length + selectedPropIds.length + selectedLocationIds.length
  const selectedCorrectionTargets = useMemo(
    () =>
      listFrameEditCorrectionTargets({
        characterReferences: characterReferences ?? [],
        selectedKeys: selectedCharRefKeys,
        locationStills,
        selectedLocationIds,
        objectReferences,
        selectedPropIds,
      }),
    [
      characterReferences,
      selectedCharRefKeys,
      locationStills,
      selectedLocationIds,
      objectReferences,
      selectedPropIds,
    ]
  )
  const objectsWithImages = (objectReferences || []).filter((ref) => ref.imageUrl)
  const locationsWithImages = (locationStills || []).filter((still) => still.imageUrl)
  const processingLabel = correctionProgress
    ? `Correcting ${correctionProgress.label} (${correctionProgress.index} of ${correctionProgress.total})…`
    : 'Processing...'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-400" />
          {modalTitle}
        </DialogTitle>
        <DialogDescription className="text-slate-400">
          Type a direction, or Correct one reference at a time — the model typically updates a single subject per edit.
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
              <Button variant="outline" onClick={handleRevertToOriginal} className="text-slate-300">
                <RotateCcw className="w-4 h-4 mr-2" />
                Revert to original
              </Button>
              <Button variant="outline" onClick={handleEditAgain} className="text-slate-300">
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
                <Label className="text-slate-300">
                  Source Image{hasWorkingChanges ? ' (latest)' : ''}
                </Label>
                <div className="aspect-square bg-black rounded-lg overflow-hidden border border-slate-700">
                  <img src={sourceForEdit} alt="Source" className="w-full h-full object-contain" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Direction</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {commonEditChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setInstruction((prev) => appendChipText(prev, chip.text))}
                      className="text-[10px] px-2 py-1 rounded-full border border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-cyan-200"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <DictationTextarea
                  value={instruction}
                  onChange={setInstruction}
                  placeholder="Describe the direction, e.g. 'Change the suit to a tuxedo' or 'Make the lighting warmer'"
                  rows={5}
                  className="h-32 bg-slate-800 border-slate-600 text-white resize-none"
                />
                <p className="text-xs text-slate-500">
                  Type or speak your direction in natural language. The AI will understand context.
                </p>

                {characterReferences && characterReferences.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      Character References
                    </Label>
                    <div className="space-y-2 max-h-52 overflow-y-auto p-2 bg-slate-800 rounded border border-slate-700">
                      {characterReferences.map((ref) => (
                        <div key={ref.characterName} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-medium text-cyan-200/90 truncate">
                              {ref.characterName}
                            </p>
                            <button
                              type="button"
                              disabled={isProcessing || !frameEditCorrectionTargetForCharacter(ref)}
                              onClick={() => {
                                const target = frameEditCorrectionTargetForCharacter(ref)
                                if (target) void runCorrectionTargets([target])
                              }}
                              className="shrink-0 text-[9px] px-1.5 py-0.5 rounded border border-cyan-700/70 text-cyan-200 hover:border-cyan-400 disabled:opacity-50"
                            >
                              Correct {ref.characterName}
                            </button>
                          </div>
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
                      Correct one character per edit. Selected tiles are included in Correct selected and in typed directions.
                    </p>
                  </div>
                )}

                {!characterReferences?.length && subjectReference && (
                  <div className="flex items-center gap-2 p-2 bg-slate-800 rounded text-xs text-slate-400">
                    <Check className="w-3 h-3 text-green-400" />
                    Character identity will be preserved
                  </div>
                )}

                {locationsWithImages.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      Location References
                    </Label>
                    <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-800 rounded border border-slate-700">
                      {locationsWithImages.map((still) => (
                        <ReferenceTile
                          key={still.id}
                          imageUrl={still.imageUrl}
                          label={still.name}
                          sublabel={still.kind === 'version' ? 'Set version' : 'Base'}
                          selected={selectedLocationIds.includes(still.id)}
                          onToggle={() =>
                            setSelectedLocationIds((prev) =>
                              prev.includes(still.id)
                                ? prev.filter((id) => id !== still.id)
                                : [...prev, still.id]
                            )
                          }
                          correctDisabled={isProcessing}
                          onCorrect={() => {
                            const target = frameEditCorrectionTargetForLocation(still)
                            if (target) void runCorrectionTargets([target])
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedRefCount > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-slate-800/80 rounded text-xs text-cyan-200/80">
                    <Check className="w-3 h-3 text-cyan-400 shrink-0" />
                    {selectedRefCount} reference{selectedRefCount === 1 ? '' : 's'} included in edit
                  </div>
                )}

                {objectsWithImages.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      Include Objects for Consistency
                    </Label>
                    <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-800 rounded border border-slate-700">
                      {objectsWithImages.map((ref) => (
                        <div key={ref.id} className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPropIds((prev) =>
                                prev.includes(ref.id)
                                  ? prev.filter((id) => id !== ref.id)
                                  : [...prev, ref.id]
                              )
                            }
                            className={`relative aspect-square w-full rounded overflow-hidden border-2 transition-all ${
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
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => {
                              const target = frameEditCorrectionTargetForProp(ref)
                              if (target) void runCorrectionTargets([target])
                            }}
                            className="mt-1 w-full text-[9px] px-1 py-0.5 rounded border border-cyan-700/70 text-cyan-200 hover:border-cyan-400 disabled:opacity-50"
                          >
                            Correct
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Correct one prop per edit. Selected props are included in Correct selected.
                    </p>
                  </div>
                )}

                {hasWorkingChanges && (
                  <button
                    type="button"
                    onClick={handleRevertToOriginal}
                    disabled={isProcessing}
                    className="text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-50"
                  >
                    Revert to original
                  </button>
                )}

                <Button
                  onClick={handleCorrectSelected}
                  disabled={isProcessing || selectedCorrectionTargets.length === 0}
                  variant="outline"
                  className="w-full border-cyan-700 text-cyan-100 hover:bg-cyan-950/40"
                >
                  {isProcessing && correctionProgress ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {processingLabel}
                    </>
                  ) : (
                    <>
                      Correct selected
                      {selectedCorrectionTargets.length > 0
                        ? ` (${selectedCorrectionTargets.length})`
                        : ''}
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleEdit}
                  disabled={isProcessing || !instruction.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isProcessing && !correctionProgress ? (
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
