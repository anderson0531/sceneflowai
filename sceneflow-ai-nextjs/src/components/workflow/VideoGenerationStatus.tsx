'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  RefreshCw,
  AlertTriangle,
  Video,
  Film,
  Settings,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { VideoClip, VideoGenerationJob } from '@/services/VideoGenerationService'

interface VideoGenerationStatusProps {
  generationJob: VideoGenerationJob
  onStitchRequest: (clips: VideoClip[]) => void
  onRegenerateClip: (clipId: string) => void
}

export function VideoGenerationStatus({
  generationJob,
  onStitchRequest,
  onRegenerateClip
}: VideoGenerationStatusProps) {
  const [expandedClips, setExpandedClips] = useState<Set<string>>(new Set())
  const [showSettings, setShowSettings] = useState(false)

  const toggleClipExpansion = (clipId: string) => {
    const newSet = new Set(expandedClips)
    if (newSet.has(clipId)) {
      newSet.delete(clipId)
    } else {
      newSet.add(clipId)
    }
    setExpandedClips(newSet)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'text-green-600'
      case 'rendering': return 'text-blue-600'
      case 'queued': return 'text-yellow-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'rendering': return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
      case 'queued': return <Clock className="w-5 h-5 text-yellow-600" />
      case 'failed': return <XCircle className="w-5 h-5 text-red-600" />
      default: return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done': return 'Completed'
      case 'rendering': return 'Rendering'
      case 'queued': return 'Queued'
      case 'failed': return 'Failed'
      default: return 'Unknown'
    }
  }

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-500'
      case 'rendering': return 'bg-blue-500'
      case 'queued': return 'bg-yellow-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const completedClips = generationJob.clips.filter(clip => clip.status === 'done')
  const failedClips = generationJob.clips.filter(clip => clip.status === 'failed')
  const inProgressClips = generationJob.clips.filter(clip => clip.status === 'rendering')
  const queuedClips = generationJob.clips.filter(clip => clip.status === 'queued')

  const canStitch = completedClips.length > 0 && failedClips.length === 0

  return (
    <div className="space-y-6">
      {/* Overall Progress Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Video Generation Progress</h3>
            <p className="text-gray-600">
              {generationJob.metadata.totalClips} scenes • {generationJob.metadata.estimatedTotalDuration}s total
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            
            {canStitch && (
              <Button
                onClick={() => onStitchRequest(completedClips)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Film className="w-4 h-4 mr-2" />
                Stitch Final Cut
              </Button>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-600">{generationJob.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div
              className={`h-3 rounded-full ${getProgressColor(generationJob.overallStatus)}`}
              initial={{ width: 0 }}
              animate={{ width: `${generationJob.progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          
          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{completedClips.length}</div>
              <div className="text-sm text-green-700">Completed</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{inProgressClips.length}</div>
              <div className="text-sm text-blue-700">Rendering</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{queuedClips.length}</div>
              <div className="text-sm text-yellow-700">Queued</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{failedClips.length}</div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
          </div>
        </div>

        {/* Generation Info */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Provider:</span>
              <span className="ml-2 font-medium text-gray-900">{generationJob.metadata.provider}</span>
            </div>
            <div>
              <span className="text-gray-600">Started:</span>
              <span className="ml-2 font-medium text-gray-900">
                {generationJob.metadata.generationStartedAt.toLocaleTimeString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`ml-2 font-medium ${getStatusColor(generationJob.overallStatus)}`}>
                {getStatusLabel(generationJob.overallStatus)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Clip Status */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">Scene Clips</h4>
        
        {generationJob.clips.map((clip) => (
          <motion.div
            key={clip.clip_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            {/* Clip Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{clip.scene_number}</span>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900">
                      Scene {clip.scene_number}
                    </h5>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(clip.status)}
                      <span className={`text-sm font-medium ${getStatusColor(clip.status)}`}>
                        {getStatusLabel(clip.status)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleClipExpansion(clip.clip_id)}
                    className="text-gray-600 hover:text-blue-600"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  
                  {clip.status === 'failed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRegenerateClip(clip.clip_id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Clip Content */}
            <AnimatePresence>
              {expandedClips.has(clip.clip_id) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 border-t border-gray-100"
                >
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-600">{clip.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className={`h-2 rounded-full ${getProgressColor(clip.status)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${clip.progress || 0}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    {/* Status Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Clip ID:</span>
                        <span className="ml-2 text-sm font-mono text-gray-900">{clip.clip_id}</span>
                      </div>
                      
                      {clip.estimated_completion && (
                        <div>
                          <span className="text-sm text-gray-600">Estimated Completion:</span>
                          <span className="ml-2 text-sm text-gray-900">
                            {clip.estimated_completion.toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Error Display */}
                    {clip.error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-800 mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-medium">Generation Error</span>
                        </div>
                        <p className="text-sm text-red-700">{clip.error}</p>
                      </div>
                    )}

                    {/* Video Preview */}
                    {clip.video_url && (
                      <div>
                        <h6 className="font-medium text-gray-900 mb-2">Generated Video</h6>
                        <div className="bg-gray-100 rounded-lg p-4 text-center">
                          <Video className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 mb-2">Video Preview Available</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(clip.video_url, '_blank')}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Preview
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Thumbnail Preview */}
                    {clip.thumbnail_url && (
                      <div>
                        <h6 className="font-medium text-gray-900 mb-2">Thumbnail</h6>
                        <div className="bg-gray-100 rounded-lg p-4 text-center">
                          <img 
                            src={clip.thumbnail_url} 
                            alt={`Scene ${clip.scene_number} thumbnail`}
                            className="w-32 h-20 object-cover rounded mx-auto"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h4 className="font-semibold text-gray-900 mb-4">Generation Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
                <select className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                  <option value="mp4">MP4</option>
                  <option value="mov">MOV</option>
                  <option value="webm">WebM</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aspect Ratio</label>
                <select className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                  <option value="16:9">16:9 (Widescreen)</option>
                  <option value="9:16">9:16 (Portrait)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="4:3">4:3 (Standard)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frame Rate</label>
                <select className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                  <option value="24">24 FPS (Film)</option>
                  <option value="30">30 FPS (Standard)</option>
                  <option value="60">60 FPS (Smooth)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
