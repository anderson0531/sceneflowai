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
  PlayCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface SceneSelectorScene {
  id: string
  sceneNumber: number
  heading: string
  duration?: number
  status?: 'pending' | 'in-progress' | 'complete'
  hasImage?: boolean
  hasAudio?: boolean
}

interface SceneSelectorProps {
  scenes: SceneSelectorScene[]
  selectedSceneId: string | null
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
  const selectedCardRef = useRef<HTMLDivElement>(null)

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
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' })
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

  const totalDuration = scenes.reduce((acc, s) => acc + (s.duration || 0), 0)

  if (scenes.length === 0) {
    return null
  }

  return (
    <div className={cn("bg-gray-900/95 border-b border-gray-700", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Film className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">Scene Timeline</span>
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
            {scenes.length} scenes
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-400">Total:</span>
            <span className="text-white font-medium">{formatDuration(totalDuration)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollLeft}
              className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollRight}
              className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Scene Cards */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        style={{ scrollbarWidth: 'thin' }}
      >
        {scenes.map((scene) => {
          const isSelected = scene.id === selectedSceneId
          
          return (
            <div
              key={scene.id}
              ref={isSelected ? selectedCardRef : null}
              onClick={() => onSelectScene(scene.id)}
              className={cn(
                "flex-shrink-0 cursor-pointer transition-all duration-200",
                "rounded-lg border px-3 py-2 min-w-[140px] max-w-[180px]",
                isSelected
                  ? "bg-purple-900/40 border-purple-500 ring-1 ring-purple-500/50"
                  : "bg-gray-800/60 border-gray-700 hover:border-gray-600 hover:bg-gray-800"
              )}
            >
              {/* Scene Number & Status */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-bold px-1.5 py-0.5 rounded",
                    isSelected 
                      ? "bg-purple-500 text-white" 
                      : "bg-gray-700 text-gray-300"
                  )}>
                    S{scene.sceneNumber}
                  </span>
                  {getStatusIcon(scene.status)}
                </div>
                <span className="text-[10px] text-gray-500">
                  {formatDuration(scene.duration)}
                </span>
              </div>

              {/* Scene Heading */}
              <p className={cn(
                "text-xs truncate",
                isSelected ? "text-white" : "text-gray-300"
              )}>
                {scene.heading || `Scene ${scene.sceneNumber}`}
              </p>

              {/* Status indicators */}
              <div className="flex items-center gap-2 mt-1.5">
                {scene.hasImage && (
                  <span className="text-[9px] text-green-400 bg-green-900/30 px-1 rounded">IMG</span>
                )}
                {scene.hasAudio && (
                  <span className="text-[9px] text-blue-400 bg-blue-900/30 px-1 rounded">AUD</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
