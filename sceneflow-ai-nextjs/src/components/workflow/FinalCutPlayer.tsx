'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Download,
  RefreshCw,
  Edit3,
  Share2,
  Eye,
  Clock,
  Film
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CueChatInterface } from './CueChatInterface'
import { VideoClip } from '@/services/VideoGenerationService'

interface FinalCutPlayerProps {
  finalVideoUrl: string
  thumbnailUrl?: string
  projectTitle: string
  sceneDirections: Array<{
    scene_number: number
    video_clip_prompt: string
    duration: number
  }>
  onRegenerateScene: (sceneNumber: number, newPrompt: string) => Promise<void>
  onDownload: () => void
}

export function FinalCutPlayer({
  finalVideoUrl,
  thumbnailUrl,
  projectTitle,
  sceneDirections,
  onRegenerateScene,
  onDownload
}: FinalCutPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showCueInterface, setShowCueInterface] = useState(false)
  const [selectedScene, setSelectedScene] = useState<number | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showSceneSelector, setShowSceneSelector] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => setDuration(video.duration)
    const handleEnded = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getCurrentScene = (): number | null => {
    if (!duration) return null
    
    const sceneDurations = sceneDirections.map(dir => dir.duration)
    let accumulatedTime = 0
    
    for (let i = 0; i < sceneDurations.length; i++) {
      accumulatedTime += sceneDurations[i]
      if (currentTime <= accumulatedTime) {
        return i + 1
      }
    }
    
    return sceneDurations.length
  }

  const handleSceneRegeneration = async (sceneNumber: number, newPrompt: string) => {
    setIsRegenerating(true)
    try {
      await onRegenerateScene(sceneNumber, newPrompt)
      setShowCueInterface(false)
      setSelectedScene(null)
    } catch (error) {
      console.error('Error regenerating scene:', error)
    } finally {
      setIsRegenerating(false)
    }
  }

  const currentScene = getCurrentScene()

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <div className="bg-black rounded-xl overflow-hidden" ref={containerRef}>
        <div className="relative">
          {/* Video Element */}
          <video
            ref={videoRef}
            src={finalVideoUrl}
            poster={thumbnailUrl}
            className="w-full h-auto max-h-[70vh]"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          {/* Video Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            {/* Progress Bar */}
            <div className="mb-3">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(currentTime / (duration || 1)) * 100}%, #4b5563 ${(currentTime / (duration || 1)) * 100}%, #4b5563 100%)`
                }}
              />
            </div>
            
            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  onClick={togglePlay}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                
                <Button
                  onClick={toggleMute}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
                
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
                
                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={toggleFullscreen}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Current Scene Indicator */}
          {currentScene && (
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg">
              <span className="text-sm font-medium">Scene {currentScene}</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Info and Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{projectTitle}</h3>
            <p className="text-gray-600">Final Cut • {formatTime(duration)} • {sceneDirections.length} scenes</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSceneSelector(!showSceneSelector)}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Scenes
            </Button>
            
            <Button
              variant="outline"
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            
            <Button
              onClick={onDownload}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Final Cut
            </Button>
          </div>
        </div>

        {/* Scene Timeline */}
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Scene Timeline</h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sceneDirections.map((scene, index) => {
              const sceneStart = sceneDirections
                .slice(0, index)
                .reduce((sum, s) => sum + s.duration, 0)
              const sceneEnd = sceneStart + scene.duration
              const isCurrentScene = currentTime >= sceneStart && currentTime < sceneEnd
              
              return (
                <div
                  key={scene.scene_number}
                  className={`flex-shrink-0 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isCurrentScene 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = sceneStart
                      setCurrentTime(sceneStart)
                    }
                  }}
                >
                  <div className="text-center">
                    <div className="font-medium text-gray-900">Scene {scene.scene_number}</div>
                    <div className="text-sm text-gray-600">{scene.duration}s</div>
                    <div className="text-xs text-gray-500">
                      {formatTime(sceneStart)} - {formatTime(sceneEnd)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Scene Selector for Regeneration */}
      <AnimatePresence>
        {showSceneSelector && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h4 className="font-semibold text-gray-900 mb-4">Scene Regeneration</h4>
            <p className="text-gray-600 mb-4">
              Select a scene to regenerate with AI. You can modify the video prompt and regenerate only that specific scene.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sceneDirections.map((scene) => (
                <div
                  key={scene.scene_number}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedScene === scene.scene_number
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedScene(scene.scene_number)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{scene.scene_number}</span>
                    </div>
                    
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">Scene {scene.scene_number}</h5>
                      <p className="text-sm text-gray-600">{scene.duration}s</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {scene.video_clip_prompt}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedScene && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-3">
                  Regenerate Scene {selectedScene}
                </h5>
                <p className="text-sm text-blue-700 mb-4">
                  Current prompt: {sceneDirections.find(s => s.scene_number === selectedScene)?.video_clip_prompt}
                </p>
                
                <Button
                  onClick={() => setShowCueInterface(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Edit3 className="w-4 h-4 mr-2" />
                  )}
                  Modify & Regenerate
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cue Interface for Scene Regeneration */}
      <AnimatePresence>
        {showCueInterface && selectedScene && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">
                AI Assistant - Scene {selectedScene} Regeneration
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCueInterface(false)}
                className="text-gray-600 hover:text-gray-700"
              >
                Close
              </Button>
            </div>
            
            <CueChatInterface
              currentConcept={sceneDirections.find(s => s.scene_number === selectedScene)?.video_clip_prompt || ''}
              targetAudience="General"
              keyMessage="Video generation"
              tone="Professional"
              onGenerateIdeas={() => {}}
              onConceptUpdate={(updatedConcept) => {
                // Handle concept updates
                console.log('Concept updated:', updatedConcept)
              }}
              initialConcept={`Regenerate Scene ${selectedScene}: ${sceneDirections.find(s => s.scene_number === selectedScene)?.video_clip_prompt}`}
              isStoryboardMode={false}
              sceneContext={{ scene_number: selectedScene }}
              onSceneIteration={(feedback) => {
                // Handle regeneration feedback
                const newPrompt = feedback
                handleSceneRegeneration(selectedScene, newPrompt)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom CSS for video controls */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
