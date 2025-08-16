'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Video, 
  Sparkles, 
  ArrowRight,
  ArrowLeft,
  Film,
  Share2,
  Download,
  Settings,
  Play,
  Clock,
  Star,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { VideoGenerationStatus } from '@/components/workflow/VideoGenerationStatus'
import { FinalCutPlayer } from '@/components/workflow/FinalCutPlayer'
import { VideoGenerationService, VideoGenerationJob, VideoStitchJob, GenerationSettings, OutputSettings } from '@/services/VideoGenerationService'
import { CollaborationService } from '@/services/CollaborationService'
import { ExportService } from '@/services/ExportService'

export default function GenerationPage() {
  const router = useRouter()
  const { currentProject, updateProject, updateStepProgress, stepProgress } = useStore()
  
  // Video generation state
  const [generationJob, setGenerationJob] = useState<VideoGenerationJob | null>(null)
  const [stitchJob, setStitchJob] = useState<VideoStitchJob | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isStitching, setIsStitching] = useState(false)
  const [showBYOKConfig, setShowBYOKConfig] = useState(false)
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings>({
    quality: 'high',
    format: 'mp4',
    aspectRatio: '16:9',
    frameRate: '30'
  })
  
  // Output settings for stitching
  const [outputSettings, setOutputSettings] = useState<OutputSettings>({
    quality: 'high',
    format: 'mp4',
    aspectRatio: '16:9',
    frameRate: '30',
    resolution: '1080p'
  })
  
  // UI state
  const [showSettings, setShowSettings] = useState(false)
  const [showFinalCut, setShowFinalCut] = useState(false)

  useEffect(() => {
    // Check if we have scene directions from the previous step
    if (currentProject?.metadata?.sceneDirections) {
      // Check if video generation is already in progress
      const existingJob = VideoGenerationService.getUserGenerationJobs('demo_user_001')
        .find(job => job.projectId === currentProject.id)
      
      if (existingJob) {
        setGenerationJob(existingJob)
        startStatusPolling(existingJob.generationId)
      }
    }
  }, [currentProject])

  const startStatusPolling = (generationId: string) => {
    const cleanup = VideoGenerationService.startStatusPolling(generationId, (updatedJob) => {
      setGenerationJob(updatedJob)
      
      // Check if all clips are done and we can start stitching
      if (updatedJob.overallStatus === 'done' && !stitchJob) {
        handleAutoStitch(updatedJob.clips)
      }
    })
    
    // Cleanup on unmount
    return cleanup
  }

  const handleStartGeneration = async () => {
    if (!currentProject?.metadata?.sceneDirections) {
      alert('Please complete the scene direction step first')
      return
    }

    setIsGenerating(true)
    
    try {
      const job = await VideoGenerationService.startGeneration(
        'demo_user_001',
        currentProject.id,
        currentProject.metadata.sceneDirections.map(direction => ({
          scene_number: direction.scene_number,
          video_clip_prompt: direction.video_clip_prompt,
          duration: direction.duration || 10,
          strength_rating: direction.strength_rating
        })),
        {
          title: currentProject.title,
          genre: currentProject.metadata?.genre || 'General',
          tone: currentProject.metadata?.tone || 'Professional',
          targetAudience: currentProject.metadata?.targetAudience || 'General'
        },
        generationSettings
      )
      
      setGenerationJob(job)
      
      // Start status polling
      startStatusPolling(job.generationId)
      
      // Update project metadata
      if (currentProject) {
        updateProject(currentProject.id, {
          metadata: {
            ...currentProject.metadata,
            videoGenerationJob: job
          }
        })
      }
      
      // Update progress
      updateStepProgress('video-generation', 50)
      
    } catch (error: any) {
      console.error('Error starting video generation:', error)
      
      if (error.message?.includes('BYOK') || error.message?.includes('API key')) {
        setShowBYOKConfig(true)
      } else {
        alert(`Failed to start video generation: ${error.message}`)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAutoStitch = async (clips: any[]) => {
    if (clips.length === 0) return
    
    setIsStitching(true)
    
    try {
      const stitchJob = await VideoGenerationService.startStitching(
        generationJob!.generationId,
        'demo_user_001',
        clips,
        outputSettings
      )
      
      setStitchJob(stitchJob)
      
      // Start stitching status polling
      const interval = setInterval(async () => {
        try {
          const updatedStitchJob = await VideoGenerationService.checkStitchingStatus(
            stitchJob.stitchId,
            'demo_user_001'
          )
          
          if (updatedStitchJob) {
            setStitchJob(updatedStitchJob)
            
            if (updatedStitchJob.status === 'completed') {
              clearInterval(interval)
              setShowFinalCut(true)
              updateStepProgress('video-generation', 100)
            }
          }
        } catch (error) {
          console.error('Error checking stitching status:', error)
        }
      }, 5000)
      
    } catch (error) {
      console.error('Error starting video stitching:', error)
      alert('Failed to start video stitching')
    } finally {
      setIsStitching(false)
    }
  }

  const handleManualStitch = async () => {
    if (!generationJob) return
    
    const completedClips = generationJob.clips.filter(clip => clip.status === 'done')
    
    if (completedClips.length === 0) {
      alert('No completed clips available for stitching')
      return
    }
    
    await handleAutoStitch(completedClips)
  }

  const handleRegenerateClip = async (clipId: string) => {
    if (!generationJob) return
    
    // In production, this would call the video generation API to regenerate the specific clip
    // For demo purposes, we'll simulate the process
    
    const clip = generationJob.clips.find(c => c.clip_id === clipId)
    if (!clip) return
    
    // Update clip status to queued
    const updatedClips = generationJob.clips.map(c => 
      c.clip_id === clipId ? { ...c, status: 'queued' as const, progress: 0, error: null } : c
    )
    
    const updatedJob = {
      ...generationJob,
      clips: updatedClips,
      overallStatus: 'rendering' as const
    }
    
    setGenerationJob(updatedJob)
    
    // Simulate regeneration
    setTimeout(() => {
      const regeneratedClips = updatedClips.map(c => 
        c.clip_id === clipId ? { ...c, status: 'rendering' as const, progress: 0 } : c
      )
      
      setGenerationJob({
        ...updatedJob,
        clips: regeneratedClips
      })
    }, 2000)
  }

  const handleRegenerateScene = async (sceneNumber: number, newPrompt: string) => {
    if (!generationJob) return
    
    // Find the clip for this scene
    const clip = generationJob.clips.find(c => c.scene_number === sceneNumber)
    if (!clip) return
    
    // Update the scene direction with new prompt
    if (currentProject) {
      const updatedDirections = currentProject.metadata.sceneDirections.map(d => 
        d.scene_number === sceneNumber 
          ? { ...d, video_clip_prompt: newPrompt }
          : d
      )
      
      updateProject(currentProject.id, {
        metadata: {
          ...currentProject.metadata,
          sceneDirections: updatedDirections
        }
      })
    }
    
    // Regenerate the clip
    await handleRegenerateClip(clip.clip_id)
  }

  const handleDownload = () => {
    if (stitchJob?.final_video_url) {
      // Create download link
      const a = document.createElement('a')
      a.href = stitchJob.final_video_url
      a.download = `${currentProject?.title || 'video'}_final_cut.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleShare = async () => {
    if (!currentProject || !stitchJob) return
    
    try {
      const session = await CollaborationService.createSession(
        currentProject.id,
        'demo_user_001',
        `Final Cut Review: ${currentProject.title}`,
        `Review and provide feedback on the final video for ${currentProject.title}`,
        []
      )
      
      // Generate shareable link
      const shareLink = CollaborationService.generateShareLink(session.id)
      navigator.clipboard.writeText(shareLink)
      
      alert('Final cut collaboration link copied to clipboard!')
    } catch (error) {
      console.error('Error creating collaboration session:', error)
    }
  }

  const totalScenes = currentProject?.metadata?.sceneDirections?.length || 0
  const completedClips = generationJob?.clips.filter(clip => clip.status === 'done').length || 0
  const failedClips = generationJob?.clips.filter(clip => clip.status === 'failed').length || 0

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Video className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">The Screening Room</h1>
        <p className="text-xl text-gray-600">Step 4: AI Video Generation & Final Cut</p>
        <p className="text-gray-500 mt-2">Transform your scene directions into AI-generated video clips and create the final cut</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Project Progress</h2>
          <span className="text-sm text-gray-500">Step 4 of 4</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${stepProgress?.['video-generation'] || 0}%` }}
          ></div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {stepProgress?.['video-generation'] || 0}% Complete
        </div>
      </div>

      {/* BYOK Configuration Required */}
      <AnimatePresence>
        {showBYOKConfig && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Video Generation API Key Required
                </h3>
                <p className="text-red-700 mb-4">
                  To proceed with video generation, you must configure your BYOK (Bring Your Own Key) settings 
                  for one of the supported video generation providers:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-white border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-800">RunwayML</h4>
                    <p className="text-sm text-red-600">Professional video generation</p>
                  </div>
                  <div className="p-3 bg-white border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-800">Stability AI</h4>
                    <p className="text-sm text-red-600">High-quality AI video</p>
                  </div>
                  <div className="p-3 bg-white border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-800">Google Veo</h4>
                    <p className="text-sm text-red-600">Google's latest video AI</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Link href="/dashboard/settings">
                    <Button className="bg-red-600 hover:bg-red-700 text-white">
                      Configure BYOK Settings
                    </Button>
                  </Link>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowBYOKConfig(false)}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Generation */}
      {!generationJob && !showBYOKConfig && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-8 text-center"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to Generate Your Video?
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Transform your scene directions into AI-generated video clips using professional video generation models.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleStartGeneration}
              disabled={isGenerating || !currentProject?.metadata?.sceneDirections}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGenerating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Video className="w-4 h-4 mr-2" />
              )}
              Start Video Generation
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowSettings(true)}
              className="border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Generation Settings
            </Button>
          </div>
          
          {!currentProject?.metadata?.sceneDirections && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                ⚠️ Please complete the Director's Chair (Scene Direction) step before generating videos.
              </p>
              <Link href="/dashboard/workflow/direction">
                <Button variant="outline" size="sm" className="mt-2 text-yellow-700 border-yellow-300 hover:bg-yellow-100">
                  Go to Director's Chair
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      )}

      {/* Video Generation Status */}
      {generationJob && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <VideoGenerationStatus
            generationJob={generationJob}
            onStitchRequest={handleManualStitch}
            onRegenerateClip={handleRegenerateClip}
          />
        </motion.div>
      )}

      {/* Video Stitching Status */}
      {stitchJob && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Video Stitching Progress</h3>
              <p className="text-gray-600">
                Combining {stitchJob.metadata.totalClips} clips into final cut
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {stitchJob.status === 'completed' && (
                <Button
                  onClick={() => setShowFinalCut(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  View Final Cut
                </Button>
              )}
            </div>
          </div>
          
          {/* Stitching Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Stitching Progress</span>
              <span className="text-sm text-gray-600">{stitchJob.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className={`h-3 rounded-full ${
                  stitchJob.status === 'completed' ? 'bg-green-500' :
                  stitchJob.status === 'processing' ? 'bg-blue-500' :
                  'bg-yellow-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${stitchJob.progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Status: {stitchJob.status}</span>
              {stitchJob.estimated_completion && (
                <span>ETA: {stitchJob.estimated_completion.toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Final Cut Player */}
      {showFinalCut && stitchJob?.final_video_url && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <FinalCutPlayer
            finalVideoUrl={stitchJob.final_video_url}
            thumbnailUrl={stitchJob.thumbnail_url}
            projectTitle={currentProject?.title || 'Untitled Project'}
            sceneDirections={currentProject?.metadata?.sceneDirections || []}
            onRegenerateScene={handleRegenerateScene}
            onDownload={handleDownload}
          />
        </motion.div>
      )}

      {/* Action Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/workflow/direction">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Director's Chair
              </Button>
            </Link>
            
            <Link href="/dashboard">
              <Button variant="ghost">
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Progress: {stitchJob?.status === 'completed' ? '100%' : '75%'}
            </span>
            
            {stitchJob?.status === 'completed' && (
              <Button 
                onClick={handleShare}
                className="bg-green-600 hover:bg-green-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Final Cut
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-2xl w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Video Generation Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                  <select
                    value={generationSettings.quality}
                    onChange={(e) => setGenerationSettings(prev => ({ ...prev, quality: e.target.value as any }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="standard">Standard</option>
                    <option value="high">High</option>
                    <option value="ultra">Ultra</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <select
                    value={generationSettings.format}
                    onChange={(e) => setGenerationSettings(prev => ({ ...prev, format: e.target.value as any }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="mp4">MP4</option>
                    <option value="mov">MOV</option>
                    <option value="webm">WebM</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
                  <select
                    value={generationSettings.aspectRatio}
                    onChange={(e) => setGenerationSettings(prev => ({ ...prev, aspectRatio: e.target.value as any }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="16:9">16:9 (Widescreen)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:3">4:3 (Standard)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frame Rate</label>
                  <select
                    value={generationSettings.frameRate}
                    onChange={(e) => setGenerationSettings(prev => ({ ...prev, frameRate: e.target.value as any }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="24">24 FPS (Film)</option>
                    <option value="30">30 FPS (Standard)</option>
                    <option value="60">60 FPS (Smooth)</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowSettings(false)}
                  className="flex-1"
                >
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
