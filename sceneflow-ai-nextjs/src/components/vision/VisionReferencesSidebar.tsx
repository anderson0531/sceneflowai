'use client'

import { useState } from 'react'
import { DndContext } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, ChevronDown, ChevronUp, Images, Package, Users, Info, Maximize2, Sparkles, Film } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { CharacterLibrary, CharacterLibraryProps } from './CharacterLibrary'
import { VisualReference, VisualReferenceType } from '@/types/visionReferences'
import { BackdropGeneratorModal, SceneForBackdrop, CharacterForBackdrop } from './BackdropGeneratorModal'
import { BackdropMode } from '@/lib/vision/backdropGenerator'

/** Simplified scene info for timeline selection */
interface TimelineSceneInfo {
  sceneId: string
  sceneNumber: number
  heading?: string
  segments: Array<{
    segmentId: string
    sequenceIndex: number
    label?: string
  }>
}

interface VisionReferencesSidebarProps extends Omit<CharacterLibraryProps, 'compact'> {
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
  /** Scenes with initialized segments for Add to Timeline feature */
  timelineScenes?: TimelineSceneInfo[]
  /** Callback to add backdrop reference to a specific segment */
  onAddReferenceToSegment?: (sceneId: string, segmentId: string, referenceId: string) => void
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
  /** Timeline scenes for Add to Timeline dialog */
  timelineScenes?: TimelineSceneInfo[]
  /** Callback for adding reference to a segment */
  onAddReferenceToSegment?: (sceneId: string, segmentId: string, referenceId: string) => void
}

interface DraggableReferenceCardProps {
  reference: VisualReference
  timelineScenes?: TimelineSceneInfo[]
  onAddReferenceToSegment?: (sceneId: string, segmentId: string, referenceId: string) => void
  onRemove?: () => void
}

function DraggableReferenceCard({ reference, timelineScenes, onAddReferenceToSegment, onRemove }: DraggableReferenceCardProps) {
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
  const [showAddToTimelineDialog, setShowAddToTimelineDialog] = useState(false)
  const [selectedSceneId, setSelectedSceneId] = useState<string>('')
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('')

  // Get segments for selected scene
  const selectedScene = timelineScenes?.find(s => s.sceneId === selectedSceneId)
  const availableSegments = selectedScene?.segments || []

  // Check if we have scenes with segments
  const hasTimelineScenes = timelineScenes && timelineScenes.length > 0 && timelineScenes.some(s => s.segments.length > 0)

  const handleAddToTimeline = () => {
    if (selectedSceneId && selectedSegmentId && onAddReferenceToSegment) {
      onAddReferenceToSegment(selectedSceneId, selectedSegmentId, reference.id)
      setShowAddToTimelineDialog(false)
      setSelectedSceneId('')
      setSelectedSegmentId('')
    }
  }

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
        
        {/* Row 3: Control Buttons */}
        <div className="flex items-center gap-2">
          {hasTimelineScenes && onAddReferenceToSegment && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setShowAddToTimelineDialog(true)
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-sf-primary/10 hover:bg-sf-primary/20 text-sf-primary text-xs font-medium transition-colors"
              title="Add to Timeline"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Add to Timeline</span>
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

      {/* Add to Timeline Dialog */}
      <Dialog open={showAddToTimelineDialog} onOpenChange={setShowAddToTimelineDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Timeline</DialogTitle>
            <DialogDescription>
              Select a scene and segment to add "{reference.name}" as a visual reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Scene Selection */}
            <div className="space-y-2">
              <Label htmlFor="scene-select">Scene</Label>
              <Select value={selectedSceneId} onValueChange={(value) => {
                setSelectedSceneId(value)
                setSelectedSegmentId('') // Reset segment when scene changes
              }}>
                <SelectTrigger id="scene-select">
                  <SelectValue placeholder="Select a scene..." />
                </SelectTrigger>
                <SelectContent>
                  {timelineScenes?.filter(s => s.segments.length > 0).map((scene) => (
                    <SelectItem key={scene.sceneId} value={scene.sceneId}>
                      Scene {scene.sceneNumber}{scene.heading ? `: ${scene.heading}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Segment Selection */}
            {selectedSceneId && (
              <div className="space-y-2">
                <Label htmlFor="segment-select">Segment</Label>
                <Select value={selectedSegmentId} onValueChange={setSelectedSegmentId}>
                  <SelectTrigger id="segment-select">
                    <SelectValue placeholder="Select a segment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSegments.map((segment) => (
                      <SelectItem key={segment.segmentId} value={segment.segmentId}>
                        Segment {segment.sequenceIndex + 1}{segment.label ? `: ${segment.label}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview */}
            {reference.imageUrl && (
              <div className="mt-4">
                <Label>Reference Preview</Label>
                <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img 
                    src={reference.imageUrl} 
                    alt={reference.name}
                    className="w-full h-32 object-cover"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddToTimelineDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddToTimeline}
              disabled={!selectedSceneId || !selectedSegmentId}
            >
              Add to Segment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  )
}

function ReferenceSection({ title, type, references, icon, onAdd, onRemove, showGenerateButton, onGenerate, timelineScenes, onAddReferenceToSegment }: ReferenceSectionProps) {
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
          {/* Generate button for scenes */}
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
              Generate
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
              No references yet. Click “Add Reference” to upload imagery for this section.
            </div>
          ) : (
            references.map((reference) => (
              <DraggableReferenceCard 
                key={reference.id}
                reference={reference} 
                timelineScenes={timelineScenes}
                onAddReferenceToSegment={onAddReferenceToSegment}
                onRemove={() => onRemove(type, reference.id)}
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
  type: VisualReferenceType | null
  isSubmitting: boolean
}

function AddReferenceDialog({ open, onClose, onSubmit, type, isSubmitting }: AddReferenceDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const isScene = type === 'scene'

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (selected) {
      setFile(selected)
      setFilePreview(URL.createObjectURL(selected))
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
    setName('')
    setDescription('')
    setFile(null)
    setFilePreview(null)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {isScene ? 'Scene' : 'Object'} Reference</DialogTitle>
          <DialogDescription>
            Upload a reference image and details to keep visual continuity intact when generating segment prompts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reference Name</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Observation Deck Lighting" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Brief notes about lighting, mood, or prop details."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reference Image</label>
            <Input type="file" accept="image/*" onChange={handleFileChange} />
            {filePreview ? (
              <div className="mt-2">
                <img src={filePreview} alt="Preview" className="w-full rounded-md border border-gray-200 dark:border-gray-800" />
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Adding...' : 'Add Reference'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function VisionReferencesSidebar(props: VisionReferencesSidebarProps) {
  const {
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
    timelineScenes,
    onAddReferenceToSegment,
  } = props

  const [dialogType, setDialogType] = useState<VisualReferenceType | null>(null)
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setSubmitting] = useState(false)
  const [isGeneratorModalOpen, setGeneratorModalOpen] = useState(false)

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

  const handleBackdropGenerated = (reference: { name: string; description?: string; imageUrl: string; sourceSceneNumber?: number; backdropMode: BackdropMode }) => {
    // Forward to parent handler if provided
    if (onBackdropGenerated) {
      onBackdropGenerated(reference)
    }
  }

  const [castOpen, setCastOpen] = useState(false)
  const [showProTips, setShowProTips] = useState(false)

  return (
    <DndContext>
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide sticky top-0 bg-gray-50 dark:bg-gray-950 py-3 -mt-3 z-10">Reference Library</h3>
          
          {/* Cast Section */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
            <button
              onClick={() => setCastOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sf-primary" />
                Cast
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  {characters.length}
                </span>
                {/* Pro Tips Toggle Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowProTips((prev) => !prev)
                  }}
                  className="p-1.5 rounded-full hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 transition-colors"
                  title={showProTips ? "Hide Pro Tips" : "Show Pro Tips"}
                >
                  <Info className="w-4 h-4" />
                </button>
              </span>
              {castOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {castOpen && (
              <div className="px-4 pb-4">
                <CharacterLibrary
                  characters={characters}
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
                  ttsProvider={ttsProvider}
                  uploadingRef={uploadingRef}
                  setUploadingRef={setUploadingRef}
                  enableDrag={enableDrag}
                  compact
                  showProTips={showProTips}
                  screenplayContext={screenplayContext}
                />
              </div>
            )}
          </div>

          <ReferenceSection
            title="Scene Backdrops"
            type="scene"
            references={sceneReferences}
            icon={<Images className="w-4 h-4 text-sf-primary" />}
            onAdd={handleOpenDialog}
            onRemove={onRemoveReference}
            showGenerateButton={scenes.length > 0}
            onGenerate={() => setGeneratorModalOpen(true)}
            timelineScenes={timelineScenes}
            onAddReferenceToSegment={onAddReferenceToSegment}
          />
          <ReferenceSection
            title="Objects"
            type="object"
            references={objectReferences}
            icon={<Package className="w-4 h-4 text-sf-primary" />}
            onAdd={handleOpenDialog}
            onRemove={onRemoveReference}
          />
        </div>
      </div>
      <AddReferenceDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleCreateReference}
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
    </DndContext>
  )
}

