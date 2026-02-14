'use client'

import React, { useState, useMemo } from 'react'
import { DndContext } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, ChevronDown, ChevronUp, Images, Package, Users, Info, Maximize2, Sparkles, Film, BookOpen, Wand2, Loader2, Upload, Copy, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { CharacterLibrary, CharacterLibraryProps } from './CharacterLibrary'
import { VisualReference, VisualReferenceType, ObjectCategory } from '@/types/visionReferences'
import { BackdropGeneratorModal, SceneForBackdrop, CharacterForBackdrop } from './BackdropGeneratorModal'
import { BackdropMode } from '@/lib/vision/backdropGenerator'
import { ObjectSuggestionPanel } from './ObjectSuggestionPanel'
import { ImageEditModal } from './ImageEditModal'
import { ReadinessProgress, calculateProductionReadiness, ProductionReadinessState } from '@/components/ui/StatusBadge'

interface VisionReferencesSidebarProps extends Omit<CharacterLibraryProps, 'compact'> {
  /** Project ID for uploads */
  projectId?: string
  sceneReferences: VisualReference[]
  objectReferences: VisualReference[]
  onCreateReference: (type: VisualReferenceType, payload: { name: string; description?: string; file?: File | null }) => Promise<void> | void
  onRemoveReference: (type: VisualReferenceType, referenceId: string) => void
  /** Scenes for backdrop generation (with sceneDirection) */
  scenes?: SceneForBackdrop[]
  /** Characters for Silent Portrait mode */
  backdropCharacters?: CharacterForBackdrop[]
  /** Callback when a backdrop is generated */
  onBackdropGenerated?: (reference: { name: string; description?: string; imageUrl: string; sourceSceneNumber?: number; backdropMode: BackdropMode }) => void
  /** Callback to insert a backdrop segment at the beginning of a scene */
  onInsertBackdropSegment?: (sceneId: string, referenceId: string, imageUrl: string, name: string) => void
  /** Callback when an object is generated (for ObjectSuggestionPanel) */
  onObjectGenerated?: (object: {
    name: string
    description: string
    imageUrl: string
    category: ObjectCategory
    importance: 'critical' | 'important' | 'background'
    generationPrompt: string
    aiGenerated: boolean
  }) => void
  /** Callback to update a reference image after editing */
  onUpdateReferenceImage?: (type: 'scene' | 'object', referenceId: string, newImageUrl: string) => void
  /** Callback to edit a character's reference image */
  onEditCharacterImage?: (characterId: string, imageUrl: string) => void
  /** Show production readiness progress section */
  showProductionReadiness?: boolean
  /** All scenes data for readiness calculation */
  allScenes?: Array<{ sceneDirection?: any; imageUrl?: string; narrationAudioUrl?: string; dialogue?: Array<{ audioUrl?: string }> }>
}

interface ReferenceSectionProps {
  title: string
  type: VisualReferenceType
  references: VisualReference[]
  icon: React.ReactNode
  onAdd: (type: VisualReferenceType) => void
  onRemove: (type: VisualReferenceType, id: string) => void
  /** Show "Generate" button for scenes */
  showGenerateButton?: boolean
  onGenerate?: () => void
  /** Scenes for Add to Timeline feature (scene backdrops only) */
  scenes?: SceneForBackdrop[]
  /** Callback to insert a backdrop segment */
  onInsertBackdropSegment?: (sceneId: string, referenceId: string, imageUrl: string, name: string) => void
}

interface DraggableReferenceCardProps {
  reference: VisualReference
  onRemove?: () => void
  /** Scenes for Add to Timeline feature (scene backdrops only) */
  scenes?: SceneForBackdrop[]
  /** Callback to insert a backdrop segment */
  onInsertBackdropSegment?: (sceneId: string, referenceId: string, imageUrl: string, name: string) => void
  /** Callback to edit the reference image */
  onEditImage?: (imageUrl: string, referenceId: string, type: 'scene' | 'object') => void
  /** Reference type for edit context */
  referenceType?: 'scene' | 'object'
  /** Project ID for uploads */
  projectId?: string
  /** Callback when an image is uploaded */
  onImageUploaded?: (referenceId: string, referenceType: 'scene' | 'object', imageUrl: string) => void
}

function DraggableReferenceCard({ reference, onRemove, scenes, onInsertBackdropSegment, onEditImage, referenceType, projectId, onImageUploaded }: DraggableReferenceCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `visual-reference-${reference.id}`,
    data: {
      referenceType: reference.type,
      referenceId: reference.id,
      name: reference.name,
      description: reference.description,
      imageUrl: reference.imageUrl,
    },
  })

  const [isExpanded, setIsExpanded] = useState(false)
  const [showSceneSelector, setShowSceneSelector] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Handle file upload for reference image
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !projectId || !referenceType) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('referenceId', reference.id)
      formData.append('referenceType', referenceType)

      const response = await fetch('/api/reference/upload-image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      toast.success(`${referenceType === 'scene' ? 'Scene' : 'Object'} image uploaded`)
      
      // Notify parent component of the update
      if (onImageUploaded) {
        onImageUploaded(reference.id, referenceType, result.imageUrl)
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image')
    } finally {
      setIsUploading(false)
      // Reset input
      event.target.value = ''
    }
  }

  // Copy generation prompt to clipboard
  const handleCopyPrompt = () => {
    // Build a prompt from the reference data
    const prompt = reference.generationPrompt || reference.description || reference.name
    navigator.clipboard.writeText(prompt)
    toast.success('Prompt copied to clipboard')
  }

  // Helper to get scene label
  const getSceneLabel = (scene: SceneForBackdrop): string => {
    const num = scene.scene_number ?? 0
    const headingText = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text
    return headingText ? `Scene ${num}: ${headingText}` : `Scene ${num}`
  }

  // Check if we can show the Add to Timeline button
  const canAddToTimeline = scenes && scenes.length > 0 && onInsertBackdropSegment && reference.imageUrl

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          transform: transform ? CSS.Translate.toString(transform) : undefined,
          opacity: isDragging ? 0.65 : 1,
          cursor: 'grab',
        }}
        {...listeners}
        {...attributes}
        className="flex flex-col p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm group w-full"
      >
        {/* Row 1: Larger Image */}
        <div className="w-full aspect-video rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative mb-2">
          {reference.imageUrl ? (
            <>
              <img src={reference.imageUrl} alt={reference.name} className="w-full h-full object-cover" />
              {/* Expand button overlay - use onPointerDown to prevent drag interference */}
              <div
                onPointerDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setIsExpanded(true)
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="View full size"
              >
                <Maximize2 className="w-5 h-5 text-white" />
              </div>
            </>
          ) : (
            <Images className="w-8 h-8 text-gray-400" />
          )}
        </div>
        
        {/* Row 2: Name and Description */}
        <div className="mb-2">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{reference.name}</div>
          {reference.description ? (
            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{reference.description}</div>
          ) : null}
        </div>
        
        {/* Row 3: Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Hidden file input for upload */}
          <input
            type="file"
            id={`reference-upload-${reference.id}`}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          {/* Upload button - always show for objects, or if projectId is available */}
          {projectId && referenceType && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                document.getElementById(`reference-upload-${reference.id}`)?.click()
              }}
              disabled={isUploading}
              className="p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
              title="Upload image"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            </button>
          )}
          {/* Copy Prompt button */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleCopyPrompt()
            }}
            className="p-1.5 rounded-md text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            title="Copy prompt"
          >
            <Copy className="w-4 h-4" />
          </button>
          {/* Add to Timeline button - only for scene backdrops */}
          {canAddToTimeline && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setShowSceneSelector(true)
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-sf-primary/10 hover:bg-sf-primary/20 text-sf-primary text-xs font-medium transition-colors"
              title="Add to Timeline"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Add to Timeline</span>
            </button>
          )}
          {/* Edit Image button */}
          {onEditImage && reference.imageUrl && referenceType && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onEditImage(reference.imageUrl!, reference.id, referenceType)
              }}
              className="p-1.5 rounded-md text-sf-primary hover:text-sf-primary/80 hover:bg-sf-primary/10 transition-colors"
              title="Edit image"
            >
              <Wand2 className="w-4 h-4" />
            </button>
          )}
          {onRemove && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onRemove()
              }}
              className="p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Remove reference"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded View Dialog */}
      {reference.imageUrl && (
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black border-none">
            <DialogHeader className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10">
              <DialogTitle className="text-white">{reference.name}</DialogTitle>
              {reference.description && (
                <DialogDescription className="text-gray-300">
                  {reference.description}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="flex items-center justify-center w-full h-full p-4">
              <img
                src={reference.imageUrl}
                alt={reference.name}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Scene Selector Dialog for Add to Timeline */}
      {canAddToTimeline && (
        <Dialog open={showSceneSelector} onOpenChange={setShowSceneSelector}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add to Timeline</DialogTitle>
              <DialogDescription>
                Select a scene to add "{reference.name}" as a new segment at the beginning.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[300px] overflow-y-auto space-y-2 py-2">
              {scenes?.map((scene) => {
                const sceneId = scene.id || `scene-${scene.scene_number}`
                return (
                  <button
                    key={sceneId}
                    onClick={() => {
                      onInsertBackdropSegment!(sceneId, reference.id, reference.imageUrl!, reference.name)
                      setShowSceneSelector(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {getSceneLabel(scene)}
                    </span>
                  </button>
                )
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSceneSelector(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function ReferenceSection({ title, type, references, icon, onAdd, onRemove, showGenerateButton, onGenerate, scenes, onInsertBackdropSegment }: ReferenceSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100"
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          <span className="flex-shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Generate Scene button for scene backdrop images */}
          {showGenerateButton && onGenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onGenerate()
              }}
              className="text-sf-primary border-sf-primary/30 hover:bg-sf-primary/10"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Generate Scene
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onAdd(type)
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open ? (
        <div className="px-4 pb-4 space-y-3">
          {references.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg py-6 text-center">
              No references yet. Click "Add Reference" to upload imagery for this section.
            </div>
          ) : (
            references.map((reference) => (
              <DraggableReferenceCard 
                key={reference.id}
                reference={reference} 
                onRemove={() => onRemove(type, reference.id)}
                scenes={scenes}
                onInsertBackdropSegment={onInsertBackdropSegment}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

interface AddReferenceDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: { name: string; description?: string; file?: File | null }) => Promise<void> | void
  onGenerateObject?: (payload: { name: string; description: string; prompt: string; referenceFile?: File | null }) => Promise<{ imageUrl: string } | null>
  type: VisualReferenceType | null
  isSubmitting: boolean
}

function AddReferenceDialog({ open, onClose, onSubmit, onGenerateObject, type, isSubmitting }: AddReferenceDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState<string | null>(null)
  const [mode, setMode] = useState<'upload' | 'generate'>('upload')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const isScene = type === 'scene'
  const isObject = type === 'object'

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (selected) {
      setFile(selected)
      setFilePreview(URL.createObjectURL(selected))
    }
  }

  const handleReferenceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (selected) {
      setReferenceFile(selected)
      setReferencePreview(URL.createObjectURL(selected))
    }
  }

  // Auto-generate prompt from name and description
  const generatePromptFromDescription = async () => {
    if (!name.trim()) return
    
    setIsGeneratingPrompt(true)
    try {
      // Build a default prompt based on the name and description
      const basePrompt = description.trim() || name.trim()
      const categoryHint = basePrompt.toLowerCase().includes('vehicle') ? 'vehicle' :
                          basePrompt.toLowerCase().includes('costume') ? 'costume' :
                          basePrompt.toLowerCase().includes('technology') ? 'technology' :
                          'prop'
      
      const studioStyle = 'Professional product photography, clean studio lighting with soft shadows, centered composition, high resolution, sharp focus, 8K quality, production reference image.'
      const prompt = `${basePrompt}. ${studioStyle}`
      
      setGeneratedPrompt(prompt)
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      return
    }
    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      file,
    })
    resetForm()
  }

  const handleGenerateAndSubmit = async () => {
    if (!name.trim() || !generatedPrompt.trim() || !onGenerateObject) return
    
    setIsGeneratingImage(true)
    try {
      const result = await onGenerateObject({
        name: name.trim(),
        description: description.trim(),
        prompt: generatedPrompt.trim(),
        referenceFile: referenceFile || undefined
      })
      
      if (result) {
        resetForm()
        onClose()
      }
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setFile(null)
    setFilePreview(null)
    setReferenceFile(null)
    setReferencePreview(null)
    setMode('upload')
    setGeneratedPrompt('')
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !isSubmitting && !isGeneratingImage && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add {isScene ? 'Scene' : 'Object'} Reference</DialogTitle>
          <DialogDescription>
            {isObject 
              ? 'Upload or generate a reference image to maintain visual consistency.'
              : 'Upload a reference image and details to keep visual continuity intact when generating segment prompts.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle for Objects */}
        {isObject && onGenerateObject && (
          <div className="flex items-center gap-2 p-1 bg-slate-800 rounded-lg">
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'upload' 
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
            <button
              onClick={() => setMode('generate')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'generate' 
                  ? 'bg-sf-primary/20 text-sf-primary' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              Generate Image
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reference Name</label>
            <Input 
              value={name} 
              onChange={(event) => setName(event.target.value)} 
              placeholder={isObject ? "e.g. Marcus's Pocket Watch" : "e.g. Observation Deck Lighting"} 
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={isObject 
                ? "Detailed description for image generation (materials, colors, era, condition)..."
                : "Brief notes about lighting, mood, or prop details."
              }
              onBlur={() => {
                if (mode === 'generate' && name.trim() && !generatedPrompt) {
                  generatePromptFromDescription()
                }
              }}
            />
          </div>

          {/* Upload Mode */}
          {mode === 'upload' && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reference Image</label>
              <Input type="file" accept="image/*" onChange={handleFileChange} />
              {filePreview ? (
                <div className="mt-2">
                  <img src={filePreview} alt="Preview" className="w-full rounded-md border border-gray-200 dark:border-gray-800" />
                </div>
              ) : null}
            </div>
          )}

          {/* Generate Mode */}
          {mode === 'generate' && isObject && (
            <>
              {/* Optional Reference Image */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Source Reference Image <span className="text-slate-500">(optional)</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Upload a photo to generate a cleaner, studio-quality version.
                </p>
                <Input type="file" accept="image/*" onChange={handleReferenceFileChange} />
                {referencePreview && (
                  <div className="mt-2">
                    <img src={referencePreview} alt="Reference Preview" className="w-32 h-32 object-cover rounded-md border border-gray-200 dark:border-gray-800" />
                  </div>
                )}
              </div>

              {/* Generated Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Generation Prompt</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generatePromptFromDescription}
                    disabled={!name.trim() || isGeneratingPrompt}
                    className="text-xs h-7"
                  >
                    {isGeneratingPrompt ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    Auto-Generate
                  </Button>
                </div>
                <Textarea
                  value={generatedPrompt}
                  onChange={(e) => setGeneratedPrompt(e.target.value)}
                  placeholder="Image generation prompt will appear here..."
                  className="min-h-[80px]"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting || isGeneratingImage}>
            Cancel
          </Button>
          {mode === 'upload' ? (
            <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Adding...' : 'Add Reference'}
            </Button>
          ) : (
            <Button 
              onClick={handleGenerateAndSubmit} 
              disabled={isGeneratingImage || !name.trim() || !generatedPrompt.trim()}
              className="bg-sf-primary hover:bg-sf-primary/80"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate & Add
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Production Readiness Section
 * Shows progress indicators for voice assignment, scene images, and audio generation
 */
function ProductionReadinessSection({ readiness }: { readiness: ProductionReadinessState }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Only show if there are items to track
  const hasData = readiness.totalCharacters > 0 || readiness.totalScenes > 0
  if (!hasData) return null
  
  return (
    <div className="mb-3 bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-xs font-medium text-gray-400 flex items-center gap-2">
          <Film className="w-3.5 h-3.5 text-purple-400" />
          Production Readiness
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Voice Assignment Progress */}
          {readiness.totalCharacters > 0 && (
            <ReadinessProgress
              label="Character voices"
              current={readiness.voicesAssigned}
              total={readiness.totalCharacters}
              hint={readiness.charactersMissingVoices.length > 0 
                ? `Missing: ${readiness.charactersMissingVoices.slice(0, 2).join(', ')}${readiness.charactersMissingVoices.length > 2 ? '...' : ''}`
                : undefined
              }
            />
          )}
          
          {/* Scene Direction Progress */}
          {readiness.totalScenes > 0 && (
            <ReadinessProgress
              label="Scene direction"
              current={readiness.scenesWithDirection}
              total={readiness.totalScenes}
              hint={readiness.scenesWithDirection === 0 ? 'Generate scene directions first' : undefined}
            />
          )}
          
          {/* Scene Images Progress */}
          {readiness.totalScenes > 0 && (
            <ReadinessProgress
              label="Scene images"
              current={readiness.scenesWithImages}
              total={readiness.totalScenes}
            />
          )}
          
          {/* Audio Generation Progress */}
          {readiness.totalScenes > 0 && (
            <ReadinessProgress
              label="Audio generated"
              current={readiness.scenesWithAudio}
              total={readiness.totalScenes}
              hint={!readiness.isAudioReady ? 'Assign all voices first' : undefined}
            />
          )}
        </div>
      )}
    </div>
  )
}

export function VisionReferencesSidebar(props: VisionReferencesSidebarProps) {
  const {
    projectId,
    characters,
    onRegenerateCharacter,
    onGenerateCharacter,
    onUploadCharacter,
    onApproveCharacter,
    onUpdateCharacterAttributes,
    onUpdateCharacterVoice,
    onUpdateCharacterAppearance,
    onUpdateCharacterName,
    onUpdateCharacterRole,
    onUpdateCharacterWardrobe,
    onAddCharacter,
    onRemoveCharacter,
    ttsProvider,
    uploadingRef,
    setUploadingRef,
    enableDrag = true,
    sceneReferences,
    objectReferences,
    onCreateReference,
    onRemoveReference,
    screenplayContext,
    scenes = [],
    backdropCharacters = [],
    onBackdropGenerated,
    onInsertBackdropSegment,
    onObjectGenerated,
    onUpdateReferenceImage,
    onEditCharacterImage,
    showProductionReadiness = true,
    allScenes = [],
  } = props

  // Calculate production readiness
  const productionReadiness = useMemo(() => {
    if (!showProductionReadiness) return null
    return calculateProductionReadiness(
      characters.map(c => ({
        name: c.name || '',
        type: c.type,
        voiceConfig: c.voiceConfig,
        referenceImageUrl: c.referenceImage
      })),
      allScenes
    )
  }, [characters, allScenes, showProductionReadiness])

  const [dialogType, setDialogType] = useState<VisualReferenceType | null>(null)
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setSubmitting] = useState(false)
  const [isGeneratorModalOpen, setGeneratorModalOpen] = useState(false)
  
  // Image edit modal state
  const [imageEditModalOpen, setImageEditModalOpen] = useState(false)
  const [editingImageData, setEditingImageData] = useState<{
    url: string
    referenceId: string
    type: 'scene' | 'object' | 'character'
    characterId?: string
  } | null>(null)

  // Handler for opening image edit modal
  const handleEditReferenceImage = (imageUrl: string, referenceId: string, type: 'scene' | 'object') => {
    setEditingImageData({ url: imageUrl, referenceId, type })
    setImageEditModalOpen(true)
  }

  // Handler for character image edit (triggered from CharacterLibrary)
  const handleEditCharacterImage = (characterId: string, imageUrl: string) => {
    setEditingImageData({ url: imageUrl, referenceId: characterId, type: 'character', characterId })
    setImageEditModalOpen(true)
  }

  // Handler for saving edited image
  const handleSaveEditedImage = async (newImageUrl: string) => {
    if (!editingImageData) return

    if (editingImageData.type === 'character' && editingImageData.characterId && onEditCharacterImage) {
      onEditCharacterImage(editingImageData.characterId, newImageUrl)
    } else if ((editingImageData.type === 'scene' || editingImageData.type === 'object') && onUpdateReferenceImage) {
      onUpdateReferenceImage(editingImageData.type, editingImageData.referenceId, newImageUrl)
    }

    setImageEditModalOpen(false)
    setEditingImageData(null)
  }

  const handleOpenDialog = (type: VisualReferenceType) => {
    setDialogType(type)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    if (isSubmitting) return
    setDialogOpen(false)
    setDialogType(null)
  }

  const handleCreateReference = async (payload: { name: string; description?: string; file?: File | null }) => {
    if (!dialogType) return
    setSubmitting(true)
    try {
      await onCreateReference(dialogType, payload)
      setDialogOpen(false)
      setDialogType(null)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle object image generation from dialog
  const handleGenerateObject = async (payload: { 
    name: string; 
    description: string; 
    prompt: string; 
    referenceFile?: File | null 
  }): Promise<{ imageUrl: string } | null> => {
    try {
      // Convert reference file to base64 if provided
      let referenceImageBase64: string | undefined
      if (payload.referenceFile) {
        const buffer = await payload.referenceFile.arrayBuffer()
        referenceImageBase64 = Buffer.from(buffer).toString('base64')
      }

      const response = await fetch('/api/vision/generate-object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          description: payload.description,
          prompt: payload.prompt,
          category: 'other',
          referenceImageBase64
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate object')
      }

      const data = await response.json()

      // Add to references via onObjectGenerated
      if (onObjectGenerated) {
        onObjectGenerated({
          name: payload.name,
          description: payload.description,
          imageUrl: data.imageUrl,
          category: 'other',
          importance: 'important',
          generationPrompt: payload.prompt,
          aiGenerated: true
        })
      }

      return { imageUrl: data.imageUrl }
    } catch (error) {
      console.error('[VisionReferencesSidebar] Generate object error:', error)
      return null
    }
  }

  const handleBackdropGenerated = (reference: { name: string; description?: string; imageUrl: string; sourceSceneNumber?: number; backdropMode: BackdropMode }) => {
    // Forward to parent handler if provided
    if (onBackdropGenerated) {
      onBackdropGenerated(reference)
    }
  }

  // Prepare scenes for ObjectSuggestionPanel
  const scenesForSuggestion = scenes.map((s, idx) => ({
    sceneNumber: s.scene_number ?? idx + 1,
    heading: typeof s.heading === 'string' ? s.heading : s.heading?.text,
    action: s.action,
    visualDescription: s.visualDescription || s.visual_description,
    description: s.description
  }))

  const [castOpen, setCastOpen] = useState(false)
  const [showProTips, setShowProTips] = useState(false)
  const [activeReferenceTab, setActiveReferenceTab] = useState<'cast' | 'scene' | 'object'>('cast')

  // Reference tabs matching ScriptPanel folder tab style
  const referenceTabs = [
    { key: 'cast' as const, label: 'Cast', icon: <Users className="w-3.5 h-3.5" />, count: characters.length },
    { key: 'scene' as const, label: 'Scene', icon: <Images className="w-3.5 h-3.5" />, count: sceneReferences.length },
    { key: 'object' as const, label: 'Object', icon: <Package className="w-3.5 h-3.5" />, count: objectReferences.length },
  ]

  return (
    <DndContext>
      <div className="flex flex-col h-full">
        {/* Title - h4 style */}
        <div className="flex items-center gap-2 py-3 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <h4 className="font-bold text-base tracking-tight text-gray-900 dark:text-white leading-none">Production Bible</h4>
          {/* Overall readiness indicator */}
          {productionReadiness && (
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
              productionReadiness.isAudioReady 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {productionReadiness.isAudioReady ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Ready
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {productionReadiness.totalCharacters - productionReadiness.voicesAssigned} voices needed
                </span>
              )}
            </span>
          )}
        </div>
        
        {/* Production Readiness Section - Collapsible */}
        {showProductionReadiness && productionReadiness && productionReadiness.totalScenes > 0 && (
          <ProductionReadinessSection readiness={productionReadiness} />
        )}
        
        {/* Tab Navigation - matching ScriptPanel folder tab style */}
        <div className="flex items-center border-b border-gray-700/50 mb-3 overflow-x-auto">
          <div className="flex items-center flex-shrink-0">
          {referenceTabs.map((tab) => {
            const isActive = activeReferenceTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveReferenceTab(tab.key)}
                className={`
                  relative px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all mr-0.5 flex-shrink-0
                  ${isActive 
                    ? 'bg-slate-800/80 text-white border-t border-x border-gray-600/50 -mb-px' 
                    : 'bg-slate-900/40 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-1.5">
                  {React.cloneElement(tab.icon as React.ReactElement, { className: `w-3 h-3 ${isActive ? 'text-sf-primary' : ''}` })}
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isActive ? 'bg-sf-primary/20 text-sf-primary' : 'bg-gray-700/50 text-gray-500'}`}>
                    {tab.count}
                  </span>
                </div>
              </button>
            )
          })}
          </div>
          {/* Pro Tips Toggle - Cast tab only */}
          {activeReferenceTab === 'cast' && (
            <button
              onClick={() => setShowProTips((prev) => !prev)}
              className="ml-auto p-1 rounded-full hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
              title={showProTips ? "Hide Pro Tips" : "Show Pro Tips"}
            >
              <Info className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {/* Tab Content - independent vertical scroll */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
          {/* Cast Tab Content */}
          {activeReferenceTab === 'cast' && (
            <CharacterLibrary
              characters={characters}
              scenes={scenes}
              onRegenerateCharacter={onRegenerateCharacter}
              onGenerateCharacter={onGenerateCharacter}
              onUploadCharacter={onUploadCharacter}
              onApproveCharacter={onApproveCharacter}
              onUpdateCharacterAttributes={onUpdateCharacterAttributes}
              onUpdateCharacterVoice={onUpdateCharacterVoice}
              onUpdateCharacterAppearance={onUpdateCharacterAppearance}
              onUpdateCharacterName={onUpdateCharacterName}
              onUpdateCharacterRole={onUpdateCharacterRole}
              onUpdateCharacterWardrobe={onUpdateCharacterWardrobe}
              onAddCharacter={onAddCharacter}
              onRemoveCharacter={onRemoveCharacter}
              onEditCharacterImage={handleEditCharacterImage}
              ttsProvider={ttsProvider}
              uploadingRef={uploadingRef}
              setUploadingRef={setUploadingRef}
              enableDrag={enableDrag}
              compact
              showProTips={showProTips}
              screenplayContext={screenplayContext}
            />
          )}
          
          {/* Scene Tab Content */}
          {activeReferenceTab === 'scene' && (
            <div className="space-y-3">
              {/* Action buttons for Scene tab */}
              <div className="flex items-center gap-2">
                {scenes.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGeneratorModalOpen(true)}
                    className="text-sf-primary border-sf-primary/30 hover:bg-sf-primary/10 flex-1"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Generate Scene
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog('scene')}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              {sceneReferences.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg py-6 text-center">
                  No scene backdrops yet. Generate or add scene imagery.
                </div>
              ) : (
                sceneReferences.map((reference) => (
                  <DraggableReferenceCard
                    key={reference.id}
                    reference={reference}
                    onRemove={() => onRemoveReference('scene', reference.id)}
                    scenes={scenes}
                    onInsertBackdropSegment={onInsertBackdropSegment}
                    onEditImage={handleEditReferenceImage}
                    referenceType="scene"
                    projectId={projectId}
                    onImageUploaded={(refId, refType, imageUrl) => {
                      if (onUpdateReferenceImage) {
                        onUpdateReferenceImage(refType, refId, imageUrl)
                      }
                    }}
                  />
                ))
              )}
            </div>
          )}
          
          {/* Object Tab Content */}
          {activeReferenceTab === 'object' && (
            <div className="space-y-3">
              {/* AI Object Suggestions Panel */}
              {scenesForSuggestion.length > 0 && onObjectGenerated && (
                <ObjectSuggestionPanel
                  scenes={scenesForSuggestion}
                  existingObjects={objectReferences}
                  onObjectGenerated={onObjectGenerated}
                  compact
                />
              )}
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog('object')}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Object
                </Button>
              </div>
              {objectReferences.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg py-6 text-center">
                  No object references yet. Add props or set pieces.
                </div>
              ) : (
                objectReferences.map((reference) => (
                  <DraggableReferenceCard
                    key={reference.id}
                    reference={reference}
                    onRemove={() => onRemoveReference('object', reference.id)}
                    onEditImage={handleEditReferenceImage}
                    referenceType="object"
                    projectId={projectId}
                    onImageUploaded={(refId, refType, imageUrl) => {
                      if (onUpdateReferenceImage) {
                        onUpdateReferenceImage(refType, refId, imageUrl)
                      }
                    }}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <AddReferenceDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleCreateReference}
        onGenerateObject={dialogType === 'object' ? handleGenerateObject : undefined}
        type={dialogType}
        isSubmitting={isSubmitting}
      />
      
      {/* Backdrop Generator Modal */}
      <BackdropGeneratorModal
        open={isGeneratorModalOpen}
        onClose={() => setGeneratorModalOpen(false)}
        scenes={scenes}
        characters={backdropCharacters}
        onGenerated={handleBackdropGenerated}
      />

      {/* Image Edit Modal */}
      {editingImageData && (
        <ImageEditModal
          open={imageEditModalOpen}
          onOpenChange={(open) => {
            setImageEditModalOpen(open)
            if (!open) setEditingImageData(null)
          }}
          imageUrl={editingImageData.url}
          imageType={editingImageData.type === 'character' ? 'character' : editingImageData.type}
          onSave={handleSaveEditedImage}
          title={`Edit ${editingImageData.type.charAt(0).toUpperCase() + editingImageData.type.slice(1)} Image`}
          // For character edits, pass the character's image as subject reference for identity preservation
          subjectReference={editingImageData.type === 'character' && editingImageData.characterId ? (() => {
            const character = characters.find(c => c.id === editingImageData.characterId)
            return character?.referenceImage ? {
              imageUrl: character.referenceImage,
              description: character.name || 'character'
            } : undefined
          })() : undefined}
        />
      )}
    </DndContext>
  )
}

