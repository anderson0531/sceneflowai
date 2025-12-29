'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, X, Play, Pause, Loader, Mic, MicOff, AlertCircle, CheckCircle, RotateCcw, Square, FileAudio, Shield, Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { useAudioRecorder, audioBlob2File, formatRecordingTime } from '@/hooks/useAudioRecorder'
import { useVoiceConsent } from '@/hooks/useVoiceConsent'
import { VoiceConsentWizard } from './VoiceConsentWizard'
import { TierGateModal } from '@/components/ui/TierGateModal'

// Training scripts for voice cloning - phonetically diverse text
const TRAINING_SCRIPTS = [
  {
    id: 'standard',
    name: 'Standard Script',
    text: `The rainbow is a division of white light into many beautiful colors. These take the shape of a long round arch, with its path high above, and its two ends apparently beyond the horizon. There is, according to legend, a boiling pot of gold at one end. People look, but no one ever finds it. When a man looks for something beyond his reach, his friends say he is looking for the pot of gold at the end of the rainbow.`,
    duration: '~45 seconds',
  },
  {
    id: 'dramatic',
    name: 'Dramatic Monologue',
    text: `In the depths of winter, I finally learned that within me there lay an invincible summer. The storm may rage outside, thunder crashing against the sky, lightning illuminating the darkness for brief moments of clarity. Yet here I stand, unwavering. For I have discovered that courage is not the absence of fear, but rather the judgment that something else is more important than fear. The brave may not live forever, but the cautious do not live at all.`,
    duration: '~50 seconds',
  },
  {
    id: 'conversational',
    name: 'Conversational',
    text: `So here's the thing about cooking - it's really not as complicated as people make it out to be. You just need to trust your instincts, you know? Start with good ingredients, keep things simple, and don't be afraid to make mistakes. I've burned more dishes than I can count, but each one taught me something new. The key is to taste as you go, adjust the seasonings, and most importantly, have fun with it. That's what makes a meal memorable.`,
    duration: '~40 seconds',
  },
]

type InputMode = 'upload' | 'record'

interface VoiceClonePanelProps {
  onVoiceCreated: (voiceId: string, voiceName: string) => void
  characterName?: string
}

export function VoiceClonePanel({ onVoiceCreated, characterName }: VoiceClonePanelProps) {
  const [voiceName, setVoiceName] = useState(characterName ? `${characterName}'s Voice` : '')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Recording mode state
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [selectedScript, setSelectedScript] = useState(TRAINING_SCRIPTS[0])
  const audioPlayerRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Consent flow state
  const [showConsentWizard, setShowConsentWizard] = useState(false)
  const [showTierGate, setShowTierGate] = useState(false)
  const [pendingConsentId, setPendingConsentId] = useState<string | null>(null)
  const [pendingCloneId, setPendingCloneId] = useState<string | null>(null)
  
  // Voice consent hook
  const {
    isLoading: isLoadingQuota,
    quota,
    voiceClones,
    canAccess,
    blockers,
    suggestions,
    refreshQuota,
    deleteVoiceClone,
  } = useVoiceConsent()
  
  // Load quota on mount
  useEffect(() => {
    refreshQuota()
  }, [refreshQuota])
  
  // Audio recorder hook
  const {
    state: recorderState,
    isRecording,
    isPreparing,
    elapsedMs,
    audioBlob,
    audioUrl,
    error: recorderError,
    permissionState,
    startRecording,
    stopRecording,
    reset: resetRecording,
  } = useAudioRecorder()

  // Handle using the recorded audio
  const handleUseRecording = useCallback(() => {
    if (!audioBlob) return
    
    const recordedFile = audioBlob2File(audioBlob, 'voice-recording')
    setFiles(prev => [...prev, recordedFile].slice(0, 25))
    toast.success('Recording added to samples')
    resetRecording()
  }, [audioBlob, resetRecording])

  // Toggle audio playback
  const togglePlayback = useCallback(() => {
    if (!audioPlayerRef.current) return
    
    if (isPlaying) {
      audioPlayerRef.current.pause()
    } else {
      audioPlayerRef.current.play()
    }
  }, [isPlaying])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.type.includes('audio')
    )
    
    if (droppedFiles.length === 0) {
      toast.error('Please drop audio files only (MP3, WAV, WebM, OGG)')
      return
    }
    
    setFiles(prev => [...prev, ...droppedFiles].slice(0, 25))
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selectedFiles].slice(0, 25))
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Handle initiating clone - check consent first
  const handleInitiateClone = () => {
    if (!voiceName.trim()) {
      toast.error('Please enter a name for your voice')
      return
    }

    if (files.length === 0) {
      toast.error('Please upload at least one audio sample')
      return
    }

    // Check if user has access
    if (!canAccess) {
      const hasSubscriptionBlocker = blockers.some(b => b.type === 'subscription')
      if (hasSubscriptionBlocker) {
        setShowTierGate(true)
        return
      }
      toast.error(blockers[0]?.message || 'Voice cloning is not available')
      return
    }

    // Check quota
    if (quota && !quota.canCreate) {
      toast.error(`Voice clone limit reached (${quota.used}/${quota.max}). Delete an existing clone or upgrade your plan.`)
      return
    }

    // Show consent wizard
    setShowConsentWizard(true)
  }

  // Handle consent completion - proceed with voice cloning
  const handleConsentComplete = async (voiceCloneId: string, consentId: string) => {
    setShowConsentWizard(false)
    setPendingConsentId(consentId)
    setPendingCloneId(voiceCloneId)
    
    // Now proceed with ElevenLabs cloning
    await handleCloneVoice(consentId, voiceCloneId)
  }

  const handleCloneVoice = async (consentId?: string, voiceCloneId?: string) => {
    if (!voiceName.trim()) {
      toast.error('Please enter a name for your voice')
      return
    }

    if (files.length === 0) {
      toast.error('Please upload at least one audio sample')
      return
    }

    // Require consent for compliance
    const useConsentId = consentId || pendingConsentId
    const useCloneId = voiceCloneId || pendingCloneId
    
    if (!useConsentId && !useCloneId) {
      // Need to go through consent flow first
      handleInitiateClone()
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('name', voiceName.trim())
      formData.append('description', description.trim())
      
      // Include consent/clone IDs for compliance
      if (useConsentId) formData.append('consentId', useConsentId)
      if (useCloneId) formData.append('voiceCloneId', useCloneId)
      
      for (const file of files) {
        formData.append('files', file)
      }

      const response = await fetch('/api/tts/elevenlabs/voice-clone', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clone voice')
      }

      toast.success(`Voice "${voiceName}" created successfully!`)
      
      // Refresh quota after successful clone
      refreshQuota()
      
      // Reset pending IDs
      setPendingConsentId(null)
      setPendingCloneId(null)
      
      onVoiceCreated(data.voice.id, data.voice.name)
    } catch (error) {
      console.error('[Voice Clone] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to clone voice')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Consent Wizard Modal */}
      <VoiceConsentWizard
        isOpen={showConsentWizard}
        characterName={voiceName || characterName}
        onComplete={handleConsentComplete}
        onCancel={() => setShowConsentWizard(false)}
      />
      
      {/* Tier Gate Modal */}
      <TierGateModal
        isOpen={showTierGate}
        onClose={() => setShowTierGate(false)}
        feature="Voice Cloning"
        featureDescription="Clone custom voices for your characters with advanced AI technology."
        blockers={blockers}
        suggestions={suggestions}
        requiredTier="pro"
      />

      {/* Voice Clone Quota Display */}
      {quota && (
        <div className="flex items-center justify-between p-2.5 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-[13px] text-gray-300">Voice Clone Slots</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[13px] font-medium ${quota.canCreate ? 'text-green-400' : 'text-red-400'}`}>
              {quota.used} / {quota.max}
            </span>
            {!quota.canCreate && (
              <span className="text-[11px] text-red-400/70">(Limit reached)</span>
            )}
          </div>
        </div>
      )}

      {/* Existing Voice Clones */}
      {voiceClones.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-gray-400">Your Voice Clones</span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {voiceClones.map((clone) => (
              <div
                key={clone.id}
                className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded border border-gray-700"
              >
                <div className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[12px] text-gray-300">{clone.name}</span>
                  <span className="text-[10px] text-gray-500">
                    ({clone.useCount} uses)
                  </span>
                </div>
                <button
                  onClick={async () => {
                    if (confirm(`Delete voice clone "${clone.name}"? This cannot be undone.`)) {
                      const success = await deleteVoiceClone(clone.id)
                      if (success) {
                        toast.success('Voice clone deleted')
                      } else {
                        toast.error('Failed to delete voice clone')
                      }
                    }
                  }}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                  title="Delete voice clone"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-2.5 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <Mic className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div className="text-[13px] text-blue-300">
          <p className="font-medium mb-0.5">Clone a Voice</p>
          <p className="text-[12px] text-blue-400/80">
            Upload audio recordings or record your voice directly. For best results:
          </p>
          <ul className="text-[11px] text-blue-400/70 mt-1 space-y-0.5 list-disc list-inside">
            <li>Use high-quality recordings with minimal background noise</li>
            <li>Include 30 seconds to 2 minutes of clear speech</li>
            <li>Multiple samples improve accuracy</li>
          </ul>
        </div>
      </div>

      {/* Voice Name */}
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium text-gray-300">Voice Name</label>
        <input
          type="text"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          placeholder="Enter a name for this voice..."
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-[13px] placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Description (Optional) */}
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium text-gray-300">
          Description <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the voice characteristics..."
          rows={2}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {/* Input Mode Toggle */}
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium text-gray-300">Audio Samples</label>
        <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg">
          <button
            onClick={() => setInputMode('upload')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
              inputMode === 'upload'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Files
          </button>
          <button
            onClick={() => setInputMode('record')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
              inputMode === 'record'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            <Mic className="w-4 h-4" />
            Record Voice
          </button>
        </div>
      </div>

      {/* Upload Mode */}
      {inputMode === 'upload' && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${dragActive 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-gray-700 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-800/50'
            }
          `}
        >
          <Upload className={`w-6 h-6 mb-2 ${dragActive ? 'text-blue-400' : 'text-gray-500'}`} />
          <p className="text-[13px] text-gray-400 text-center">
            <span className="text-blue-400 font-medium">Click to upload</span> or drag and drop
          </p>
          <p className="text-[11px] text-gray-500 mt-1">MP3, WAV, WebM, OGG (max 25 files)</p>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Record Mode */}
      {inputMode === 'record' && (
        <div className="space-y-3">
          {/* Script Selection */}
          <div className="space-y-1.5">
            <label className="text-[12px] text-gray-400">Select a script to read:</label>
            <div className="flex gap-2 flex-wrap">
              {TRAINING_SCRIPTS.map((script) => (
                <button
                  key={script.id}
                  onClick={() => setSelectedScript(script)}
                  className={`px-3 py-1.5 rounded-md text-[12px] transition-colors ${
                    selectedScript.id === script.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  {script.name}
                </button>
              ))}
            </div>
          </div>

          {/* Training Script Display */}
          <div className="relative p-4 bg-gray-900/80 border border-gray-700 rounded-lg max-h-36 overflow-y-auto">
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                {selectedScript.duration}
              </span>
            </div>
            <p className="text-[14px] text-gray-200 leading-relaxed pr-16">
              {selectedScript.text}
            </p>
          </div>

          {/* Permission Warning */}
          {permissionState === 'denied' && (
            <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-[12px] text-red-300">
                Microphone access denied. Please allow microphone access in your browser settings.
              </p>
            </div>
          )}

          {/* Recorder Error */}
          {recorderError && (
            <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-[12px] text-red-300">{recorderError}</p>
            </div>
          )}

          {/* Recording Controls */}
          {recorderState === 'idle' && (
            <Button
              onClick={startRecording}
              disabled={permissionState === 'denied'}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <Mic className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          )}

          {isPreparing && (
            <Button disabled className="w-full bg-gray-700 text-gray-400">
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Requesting microphone access...
            </Button>
          )}

          {isRecording && (
            <div className="space-y-3">
              {/* Recording Indicator */}
              <div className="flex items-center justify-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span className="text-red-400 font-medium text-[14px]">Recording...</span>
                </div>
                <span className="text-red-300 font-mono text-lg">
                  {formatRecordingTime(elapsedMs)}
                </span>
              </div>
              
              <Button
                onClick={stopRecording}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white"
              >
                <Square className="w-4 h-4 mr-2 fill-current" />
                Stop Recording
              </Button>
            </div>
          )}

          {/* Playback Review */}
          {recorderState === 'stopped' && audioUrl && (
            <div className="space-y-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-green-400" />
                  <span className="text-[13px] text-gray-300">Recording Complete</span>
                  <span className="text-[12px] text-gray-500">
                    ({formatRecordingTime(elapsedMs)})
                  </span>
                </div>
              </div>
              
              {/* Audio Player */}
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayback}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white" />
                  )}
                </button>
                <audio
                  ref={audioPlayerRef}
                  src={audioUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="flex-1 h-8"
                  controls
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={resetRecording}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Re-record
                </Button>
                <Button
                  onClick={handleUseRecording}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Use Recording
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{files.length} file(s) selected</span>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear all
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded border border-gray-700"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-sm text-gray-300 truncate">{file.name}</span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clone Button */}
      <Button
        onClick={handleInitiateClone}
        disabled={isUploading || !voiceName.trim() || files.length === 0 || (quota && !quota.canCreate)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isUploading ? (
          <>
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            Cloning Voice...
          </>
        ) : !canAccess ? (
          <>
            <Lock className="w-4 h-4 mr-2" />
            Upgrade to Clone Voices
          </>
        ) : quota && !quota.canCreate ? (
          <>
            <AlertCircle className="w-4 h-4 mr-2" />
            Slot Limit Reached
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            Clone Voice
          </>
        )}
      </Button>
    </div>
  )
}
