'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Film,
  CheckCircle2,
  Circle,
  PlayCircle,
  Image,
  Volume2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface SceneItem {
  id: string
  sceneNumber: number
  name: string
  estimatedDuration?: number
  actualDuration?: number
  status?: 'not-started' | 'in-progress' | 'complete'
  segmentCount?: number
  hasImage?: boolean
  hasAudio?: boolean
}

interface SceneSelectorProps {
  scenes: SceneItem[]
  selectedSceneId?: string
  onSelectScene: (sceneId: string) => void
  className?: string
}

export function SceneSelector({ 
  scenes, 
  selectedSceneId, 
  onSelectScene,
  className 
}: SceneSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const selectedCardRef = useRef<HTMLButtonElement>(null)

  // Auto-scroll to selected scene
  useEffect(() => {
    if (selectedCardRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const card = selectedCardRef.current
      const containerRect = container.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      
      if (cardRect.left < containerRect.left || cardRect.right > containerRect.right) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [selectedSceneId])

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' })
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />
      case 'in-progress':
        return <PlayCircle className="w-3 h-3 text-amber-500" />
      default:
        return <Circle className="w-3 h-3 text-gray-500" />
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return `${secs}s`
  }

  const totalDuration = scenes.reduce((acc, s) => acc + (s.estimatedDuration || 0), 0)

  if (scenes.length === 0) {
    return null
  }

  return (
    <div className={cn(
      "bg-gray-900/95 border border-gray-700 rounded-lg flex-shrink-0 w-full max-w-full overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Film className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-medium text-white">Scenes</span>
          <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
            {scenes.length}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Duration Summary */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400">Total:</span>
            <span className="text-white font-medium">{formatDuration(totalDuration)}</span>
          </div>
          
          {/* Scroll Controls */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollLeft}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollRight}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Scene Cards */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        style={{ scrollbarWidth: 'thin' }}
      >
        {scenes.map((scene) => {
          const isSelected = scene.id === selectedSceneId
          
          return (
            <button
              key={scene.id}
              ref={isSelected ? selectedCardRef : null}
              onClick={() => onSelectScene(scene.id)}
              className={cn(
                "flex-shrink-0 text-left transition-all duration-150",
                "rounded-md border px-2 py-1.5 min-w-[100px] max-w-[120px]",
                isSelected
                  ? "bg-purple-900/50 border-purple-500 ring-1 ring-purple-500/30"
                  : "bg-gray-800/60 border-gray-700 hover:border-gray-600 hover:bg-gray-800"
              )}
            >
              {/* Scene Number & Status */}
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-[10px] font-bold px-1 py-0.5 rounded",
                  isSelected 
                    ? "bg-purple-500 text-white" 
                    : "bg-gray-700 text-gray-300"
                )}>
                  S{scene.sceneNumber}
                </span>
                {getStatusIcon(scene.status)}
              </div>

              {/* Scene Name - truncated */}
              <p className={cn(
                "text-[10px] font-medium truncate mb-1",
                isSelected ? "text-white" : "text-gray-300"
              )}>
                {scene.name || `Scene ${scene.sceneNumber}`}
              </p>

              {/* Duration & Info */}
              <div className="flex items-center justify-between text-[9px] text-gray-500">
                <span>{formatDuration(scene.estimatedDuration)}</span>
                <div className="flex items-center gap-1">
                  {scene.hasImage && <Image className="w-2.5 h-2.5 text-blue-400" />}
                  {scene.hasAudio && <Volume2 className="w-2.5 h-2.5 text-green-400" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
