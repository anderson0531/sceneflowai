'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import {
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDropzone } from 'react-dropzone'
import { 
  GripVertical, 
  Play, 
  Clock, 
  Camera, 
  Lightbulb, 
  Music, 
  Edit3, 
  Image as ImageIcon,
  Upload,
  X,
  Save,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ThumbnailGenerationService } from '@/services/ThumbnailGenerationService'

export interface StoryboardScene {
  id: string
  scene_number: number
  description: string
  audio_cues: string
  image_prompt: string
  duration?: number
  camera_angle?: string
  lighting?: string
  mood?: string
  image_url?: string
  isEditing?: boolean
}

interface InteractiveStoryboardProps {
  scenes: StoryboardScene[]
  onScenesUpdate: (scenes: StoryboardScene[]) => void
  onSceneEdit: (scene: StoryboardScene) => void
  userId: string
  projectId: string
  style?: 'timeline' | 'grid'
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3'
}

// Sortable Scene Item Component
function SortableSceneItem({ 
  scene, 
  onEdit, 
  onImageGenerate, 
  onImageUpload,
  aspectRatio = '16:9'
}: { 
  scene: StoryboardScene
  onEdit: (scene: StoryboardScene) => void
  onImageGenerate: (scene: StoryboardScene) => void
  onImageUpload: (scene: StoryboardScene, file: File) => void
  aspectRatio: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: scene.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const [isUploading, setIsUploading] = useState(false)
  const [showImageOptions, setShowImageOptions] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setIsUploading(true)
        try {
          await onImageUpload(scene, acceptedFiles[0])
        } finally {
          setIsUploading(false)
          setShowImageOptions(false)
        }
      }
    }
  })

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '16:9': return 'aspect-video'
      case '9:16': return 'aspect-[9/16]'
      case '1:1': return 'aspect-square'
      case '4:3': return 'aspect-[4/3]'
      default: return 'aspect-video'
    }
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 ${
        isDragging ? 'shadow-lg scale-105' : ''
      }`}
      layout
    >
      {/* Scene Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
          >
            <GripVertical className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Scene</span>
            <span className="text-lg font-bold text-blue-600">{scene.scene_number}</span>
          </div>
          {scene.duration && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{scene.duration}s</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(scene)}
            className="text-gray-600 hover:text-blue-600"
          >
            <Edit3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Scene Content */}
      <div className="p-4 space-y-4">
        {/* Image Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Visual Frame</h4>
            <div className="flex items-center gap-2">
              {scene.image_url ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImageOptions(!showImageOptions)}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Change
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImageOptions(!showImageOptions)}
                  className="text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Add Image
                </Button>
              )}
            </div>
          </div>

          {/* Image Display or Upload Area */}
          {scene.image_url ? (
            <div className={`${getAspectRatioClass()} bg-gray-100 rounded-lg overflow-hidden relative group`}>
              <img
                src={scene.image_url}
                alt={`Scene ${scene.scene_number}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            </div>
          ) : (
            <div className={`${getAspectRatioClass()} bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center`}>
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No image yet</p>
                <p className="text-xs text-gray-400">Upload or generate with AI</p>
              </div>
            </div>
          )}

          {/* Image Options */}
          <AnimatePresence>
            {showImageOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-3 border-t border-gray-100"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onImageGenerate(scene)}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    disabled={isUploading}
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Generate AI
                  </Button>
                  
                  <div {...getRootProps()} className="w-full">
                    <input {...getInputProps()} />
                    <Button
                      variant="outline"
                      size="sm"
                      className={`w-full text-green-600 border-green-300 hover:bg-green-50 ${
                        isDragActive ? 'bg-green-50 border-green-400' : ''
                      }`}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Upload
                    </Button>
                  </div>
                </div>
                
                {scene.image_prompt && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <strong>AI Prompt:</strong> {scene.image_prompt}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scene Description */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Visual Description</h4>
          <p className="text-sm text-gray-700 leading-relaxed">{scene.description}</p>
        </div>

        {/* Technical Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Camera className="w-4 h-4" />
              Camera
            </h5>
            <p className="text-gray-600">{scene.camera_angle || 'Not specified'}</p>
          </div>
          
          <div>
            <h5 className="font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Lightbulb className="w-4 h-4" />
              Lighting
            </h5>
            <p className="text-gray-600">{scene.lighting || 'Not specified'}</p>
          </div>
        </div>

        {/* Audio Cues */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Music className="w-4 h-4" />
            Audio Cues
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed">{scene.audio_cues}</p>
        </div>

        {/* Mood */}
        {scene.mood && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Mood & Tone</h4>
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {scene.mood}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function InteractiveStoryboard({
  scenes,
  onScenesUpdate,
  onSceneEdit,
  userId,
  projectId,
  style = 'timeline',
  aspectRatio = '16:9'
}: InteractiveStoryboardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isGeneratingImages, setIsGeneratingImages] = useState<Set<string>>(new Set())
  const [showGrid, setShowGrid] = useState(style === 'grid')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex(scene => scene.id === active.id)
      const newIndex = scenes.findIndex(scene => scene.id === over.id)

      const newScenes = arrayMove(scenes, oldIndex, newIndex)
      
      // Update scene numbers
      newScenes.forEach((scene, index) => {
        scene.scene_number = index + 1
      })
      
      onScenesUpdate(newScenes)
    }

    setActiveId(null)
  }

  const handleImageGenerate = async (scene: StoryboardScene) => {
    setIsGeneratingImages(prev => new Set(prev).add(scene.id))
    
    try {
      const result = await ThumbnailGenerationService.generateThumbnail(
        userId,
        scene.id,
        {
          prompt: scene.image_prompt,
          aspectRatio,
          style: 'cinematic'
        }
      )
      
      if (result.success && result.imageUrl) {
        const updatedScenes = scenes.map(s => 
          s.id === scene.id ? { ...s, image_url: result.imageUrl } : s
        )
        onScenesUpdate(updatedScenes)
      }
    } catch (error) {
      console.error('Error generating image:', error)
    } finally {
      setIsGeneratingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(scene.id)
        return newSet
      })
    }
  }

  const handleImageUpload = async (scene: StoryboardScene, file: File) => {
    try {
      // In production, upload to CDN/storage service
      // For now, create a local URL
      const imageUrl = URL.createObjectURL(file)
      
      const updatedScenes = scenes.map(s => 
        s.id === scene.id ? { ...s, image_url: imageUrl } : s
      )
      onScenesUpdate(updatedScenes)
    } catch (error) {
      console.error('Error uploading image:', error)
    }
  }

  const handleSceneReorder = (sceneIds: string[]) => {
    const newScenes = sceneIds.map(id => scenes.find(s => s.id === id)!)
    newScenes.forEach((scene, index) => {
      scene.scene_number = index + 1
    })
    onScenesUpdate(newScenes)
  }

  const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Storyboard</h2>
          <p className="text-gray-600">
            {scenes.length} scenes • {totalDuration}s total duration
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            className="flex items-center gap-2"
          >
            {showGrid ? 'Timeline View' : 'Grid View'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const reversed = [...scenes].reverse()
              reversed.forEach((scene, index) => {
                scene.scene_number = index + 1
              })
              onScenesUpdate(reversed)
            }}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reverse Order
          </Button>
        </div>
      </div>

      {/* Storyboard Content */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={scenes.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={showGrid ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {scenes.map((scene) => (
              <SortableSceneItem
                key={scene.id}
                scene={scene}
                onEdit={onSceneEdit}
                onImageGenerate={handleImageGenerate}
                onImageUpload={handleImageUpload}
                aspectRatio={aspectRatio}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div className="opacity-50">
              {(() => {
                const scene = scenes.find(s => s.id === activeId)
                return scene ? (
                  <SortableSceneItem
                    scene={scene}
                    onEdit={onSceneEdit}
                    onImageGenerate={handleImageGenerate}
                    onImageUpload={handleImageUpload}
                    aspectRatio={aspectRatio}
                  />
                ) : null
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {scenes.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No scenes yet</h3>
          <p className="text-gray-600">
            Generate a storyboard from your selected idea to get started.
          </p>
        </div>
      )}

      {/* Progress Summary */}
      {scenes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Storyboard Progress</h3>
              <p className="text-sm text-blue-700">
                {scenes.filter(s => s.image_url).length} of {scenes.length} scenes have visuals
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{totalDuration}s</div>
              <div className="text-sm text-blue-700">Total Duration</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ 
                width: `${(scenes.filter(s => s.image_url).length / scenes.length) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  )
}
