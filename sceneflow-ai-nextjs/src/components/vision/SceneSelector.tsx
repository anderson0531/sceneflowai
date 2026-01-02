'use client'

import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Clock,
  Film,
  CheckCircle2,
  Circle,
  PlayCircle,
  Image,
  Volume2,
  Bookmark,
  FileText,
  Compass,
  Frame,
  Clapperboard,
  List
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface SceneItem {
  id: string
  sceneNumber: number
  name: string
  estimatedDuration?: number
  actualDuration?: number // From segments if available
  startTime?: number // Cumulative start time
  status?: 'not-started' | 'in-progress' | 'complete'
  segmentCount?: number
  hasImage?: boolean
  hasAudio?: boolean
  isBookmarked?: boolean
  // Workflow status indicators
  hasScript?: boolean
  hasDirection?: boolean
  hasFrame?: boolean
  hasCallAction?: boolean
}

interface SceneSelectorProps {
  scenes: SceneItem[]
  selectedSceneId?: string
  onSelectScene: (sceneId: string) => void
  onPrevScene?: () => void
  onNextScene?: () => void
  className?: string
}

export function SceneSelector({ 
  scenes, 
  selectedSceneId, 
  onSelectScene,
  onPrevScene,
  onNextScene,
  className 
}: SceneSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const selectedCardRef = useRef<HTMLButtonElement>(null)
  const [sceneJumpOpen, setSceneJumpOpen] = useState(false)

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
    if (!seconds || seconds <= 0) return '--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return `${secs}s`
  }

  const formatStartTime = (seconds?: number) => {
    if (seconds === undefined || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Use actual duration if available, otherwise estimated
  const getDisplayDuration = (scene: SceneItem) => {
    if (scene.actualDuration && scene.actualDuration > 0) {
      return scene.actualDuration
    }
    return scene.estimatedDuration
  }

  const totalDuration = scenes.reduce((acc, s) => acc + (getDisplayDuration(s) || 0), 0)

  if (scenes.length === 0) {
    return null
  }

  return (
    <div className={cn(
      "bg-gray-900/95 border border-gray-700 rounded-lg overflow-hidden",
      className
    )} style={{ maxWidth: '100%', width: '100%' }}>
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
        className="overflow-x-auto overflow-y-hidden w-full min-w-0"
        style={{ scrollbarWidth: 'thin', maxWidth: '100%' }}
      >
        <div className="flex gap-2 px-3 py-2 w-max min-w-0">
        {scenes.map((scene) => {
          const isSelected = scene.id === selectedSceneId
          const displayDuration = getDisplayDuration(scene)
          const isActualDuration = scene.actualDuration && scene.actualDuration > 0
          
          return (
            <button
              key={scene.id}
              ref={isSelected ? selectedCardRef : null}
              onClick={() => onSelectScene(scene.id)}
              className={cn(
                "relative flex-shrink-0 text-left transition-all duration-150",
                "rounded-lg border px-2.5 py-2 w-[120px]",
                isSelected
                  ? "bg-purple-900/50 border-purple-500 ring-1 ring-purple-500/30"
                  : "bg-gray-800/60 border-gray-700 hover:border-gray-600 hover:bg-gray-800"
              )}
            >
              {/* Bookmark indicator */}
              {scene.isBookmarked && (
                <div className="absolute -top-1 -right-1">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </div>
              )}
              
              {/* Scene Number & Status */}
              <div className="flex items-center justify-between mb-1.5">
                <span className={cn(
                  "text-[11px] font-bold px-1.5 py-0.5 rounded",
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
                "text-[10px] font-medium truncate mb-1.5 leading-tight",
                isSelected ? "text-white" : "text-gray-300"
              )} title={scene.name}>
                {scene.name || `Scene ${scene.sceneNumber}`}
              </p>

              {/* Workflow Status Indicators */}
              <div className="flex items-center gap-1 mb-1.5">
                <div title="Script" className={cn(
                  "w-5 h-5 rounded flex items-center justify-center",
                  scene.hasScript ? "bg-green-500/20" : "bg-gray-700/50"
                )}>
                  <FileText className={cn(
                    "w-3 h-3",
                    scene.hasScript ? "text-green-400" : "text-gray-600"
                  )} />
                </div>
                <div title="Direction" className={cn(
                  "w-5 h-5 rounded flex items-center justify-center",
                  scene.hasDirection ? "bg-blue-500/20" : "bg-gray-700/50"
                )}>
                  <Compass className={cn(
                    "w-3 h-3",
                    scene.hasDirection ? "text-blue-400" : "text-gray-600"
                  )} />
                </div>
                <div title="Frame" className={cn(
                  "w-5 h-5 rounded flex items-center justify-center",
                  scene.hasFrame ? "bg-purple-500/20" : "bg-gray-700/50"
                )}>
                  <Frame className={cn(
                    "w-3 h-3",
                    scene.hasFrame ? "text-purple-400" : "text-gray-600"
                  )} />
                </div>
                <div title="Call Action" className={cn(
                  "w-5 h-5 rounded flex items-center justify-center",
                  scene.hasCallAction ? "bg-amber-500/20" : "bg-gray-700/50"
                )}>
                  <Clapperboard className={cn(
                    "w-3 h-3",
                    scene.hasCallAction ? "text-amber-400" : "text-gray-600"
                  )} />
                </div>
              </div>

              {/* Duration & Start Time */}
              <div className="flex items-center justify-between text-[10px]">
                <span className={cn(
                  "font-medium",
                  isActualDuration ? "text-green-400" : "text-gray-400"
                )} title={isActualDuration ? "Actual duration from segments" : "Estimated duration"}>
                  {formatDuration(displayDuration)}
                </span>
                <span className="text-gray-500" title="Start time">
                  @{formatStartTime(scene.startTime)}
                </span>
              </div>
            </button>
          )
        })}
        </div>
      </div>

      {/* Scene Navigation Bar */}
      {(onPrevScene || onNextScene) && (
        <div className="flex items-center justify-center gap-4 px-3 py-2 border-t border-gray-800 bg-gray-900/80">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrevScene}
            disabled={!selectedSceneId || scenes.findIndex(s => s.id === selectedSceneId) === 0}
            className="h-7 px-3 text-xs text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev Scene
          </Button>
          
          {/* Scene Jump Selector */}
          <Popover open={sceneJumpOpen} onOpenChange={setSceneJumpOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded px-2 py-1 transition-colors cursor-pointer"
                title="Click to jump to any scene"
              >
                <List className="w-3.5 h-3.5" />
                <span>
                  Scene {selectedSceneId ? scenes.findIndex(s => s.id === selectedSceneId) + 1 : '-'} of {scenes.length}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-64 max-h-80 overflow-y-auto p-2 bg-slate-900 border-slate-700"
              align="center"
              sideOffset={8}
            >
              <div className="text-xs text-gray-400 px-2 py-1.5 mb-1 border-b border-gray-700">
                Jump to Scene
              </div>
              <div className="space-y-0.5">
                {scenes.map((scene, index) => {
                  const isSelected = scene.id === selectedSceneId
                  return (
                    <button
                      key={scene.id}
                      onClick={() => {
                        onSelectScene(scene.id)
                        setSceneJumpOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
                        isSelected
                          ? "bg-purple-600/30 text-purple-300"
                          : "hover:bg-gray-800 text-gray-300 hover:text-white"
                      )}
                    >
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[32px] text-center",
                        isSelected ? "bg-purple-500 text-white" : "bg-gray-700 text-gray-300"
                      )}>
                        S{scene.sceneNumber}
                      </span>
                      <span className="text-xs truncate flex-1" title={scene.name}>
                        {scene.name || `Scene ${scene.sceneNumber}`}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onNextScene}
            disabled={!selectedSceneId || scenes.findIndex(s => s.id === selectedSceneId) === scenes.length - 1}
            className="h-7 px-3 text-xs text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-40"
          >
            Next Scene
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
