'use client'

import { useState } from 'react'
import { DndContext } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, ChevronDown, ChevronUp, Images, Package, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { CharacterLibrary, CharacterLibraryProps } from './CharacterLibrary'
import { VisualReference, VisualReferenceType } from '@/types/visionReferences'

interface VisionReferencesSidebarProps extends Omit<CharacterLibraryProps, 'compact'> {
  sceneReferences: VisualReference[]
  objectReferences: VisualReference[]
  onCreateReference: (type: VisualReferenceType, payload: { name: string; description?: string; file?: File | null }) => Promise<void> | void
  onRemoveReference: (type: VisualReferenceType, referenceId: string) => void
}

interface ReferenceSectionProps {
  title: string
  type: VisualReferenceType
  references: VisualReference[]
  icon: React.ReactNode
  onAdd: (type: VisualReferenceType) => void
  onRemove: (type: VisualReferenceType, id: string) => void
}

function DraggableReferenceCard({ reference }: { reference: VisualReference }) {
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

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.65 : 1,
        cursor: 'grab',
      }}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm"
    >
      <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {reference.imageUrl ? (
          <img src={reference.imageUrl} alt={reference.name} className="w-full h-full object-cover" />
        ) : (
          <Images className="w-5 h-5 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{reference.name}</div>
        {reference.description ? (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{reference.description}</div>
        ) : null}
      </div>
    </div>
  )
}

function ReferenceSection({ title, type, references, icon, onAdd, onRemove }: ReferenceSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onAdd(type)
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Reference
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
              <div key={reference.id} className="flex items-center gap-3">
                <DraggableReferenceCard reference={reference} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(type, reference.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Remove reference"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
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
  } = props

  const [dialogType, setDialogType] = useState<VisualReferenceType | null>(null)
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setSubmitting] = useState(false)

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

  const [castOpen, setCastOpen] = useState(true)

  return (
    <DndContext>
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reference Library</h3>
          
          {/* Cast Section */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
            <button
              onClick={() => setCastOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sf-primary" />
                Cast
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
                  onAddCharacter={onAddCharacter}
                  onRemoveCharacter={onRemoveCharacter}
                  ttsProvider={ttsProvider}
                  uploadingRef={uploadingRef}
                  setUploadingRef={setUploadingRef}
                  enableDrag={enableDrag}
                  compact
                />
              </div>
            )}
          </div>

          <ReferenceSection
            title="Scenes"
            type="scene"
            references={sceneReferences}
            icon={<Images className="w-4 h-4 text-sf-primary" />}
            onAdd={handleOpenDialog}
            onRemove={onRemoveReference}
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
    </DndContext>
  )
}

