'use client'

/**
 * VoiceConsentWizard Component
 * 
 * Multi-step wizard for the voice consent verification flow.
 * Steps:
 * 1. Enter voice/actor name
 * 2. Display consent phrase for recording
 * 3. Record or upload consent audio
 * 4. Verify and complete
 */

import React, { useState, useCallback, useEffect } from 'react'
import { 
  Shield, 
  Mic, 
  MicOff, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  Check,
  Loader,
  User,
  Clock,
  X,
  Upload,
  FileAudio,
  RotateCcw,
  Play,
  Square,
  Pause
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useVoiceConsent, type ConsentInfo } from '@/hooks/useVoiceConsent'
import { useAudioRecorder, audioBlob2File, formatRecordingTime } from '@/hooks/useAudioRecorder'
import { toast } from 'sonner'

// ============================================================================
// Types
// ============================================================================

export interface VoiceConsentWizardProps {
  characterName?: string
  onComplete: (voiceCloneId: string, consentId: string) => void
  onCancel: () => void
  isOpen: boolean
}

type WizardStep = 'name' | 'phrase' | 'record' | 'verify' | 'complete'

// ============================================================================
// Component
// ============================================================================

export function VoiceConsentWizard({
  characterName,
  onComplete,
  onCancel,
  isOpen,
}: VoiceConsentWizardProps) {
  // State
  const [step, setStep] = useState<WizardStep>('name')
  const [actorName, setActorName] = useState(characterName || '')
  const [isSelfClone, setIsSelfClone] = useState(false)
  const [selfAttestationConfirmed, setSelfAttestationConfirmed] = useState(false)
  const [copiedPhrase, setCopiedPhrase] = useState(false)
  const [audioFiles, setAudioFiles] = useState<File[]>([])
  const [completedCloneId, setCompletedCloneId] = useState<string | null>(null)
  
  // Hooks
  const {
    isInitiating,
    isCompleting,
    currentConsent,
    error,
    blockers,
    initiateConsent,
    completeConsent,
    clearError,
    resetConsent,
  } = useVoiceConsent()
  
  const {
    isRecording,
    isPreparing,
    elapsedMs,
    audioBlob,
    audioUrl,
    error: recorderError,
    startRecording,
    stopRecording,
    reset: resetRecording,
  } = useAudioRecorder()

  // Reset state when wizard opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('name')
      setActorName(characterName || '')
      setIsSelfClone(false)
      setSelfAttestationConfirmed(false)
      setAudioFiles([])
      setCompletedCloneId(null)
      resetConsent()
      resetRecording()
    }
  }, [isOpen, characterName, resetConsent, resetRecording])

  // Handle consent initiation
  const handleInitiateConsent = useCallback(async () => {
    if (!actorName.trim()) {
      toast.error('Please enter a name for the voice')
      return
    }
    
    clearError()
    const consent = await initiateConsent(actorName.trim(), isSelfClone)
    
    if (consent) {
      if (isSelfClone) {
        setStep('verify')
      } else {
        setStep('phrase')
      }
    }
  }, [actorName, isSelfClone, initiateConsent, clearError])

  // Handle copying phrase to clipboard
  const handleCopyPhrase = useCallback(async () => {
    if (!currentConsent?.phrase) return
    
    try {
      await navigator.clipboard.writeText(currentConsent.phrase)
      setCopiedPhrase(true)
      toast.success('Consent phrase copied to clipboard')
      setTimeout(() => setCopiedPhrase(false), 3000)
    } catch {
      toast.error('Failed to copy phrase')
    }
  }, [currentConsent?.phrase])

  // Handle adding recorded audio to files
  const handleUseRecording = useCallback(() => {
    if (!audioBlob) return
    
    const recordedFile = audioBlob2File(audioBlob, 'consent-recording')
    setAudioFiles(prev => [...prev, recordedFile])
    toast.success('Recording added')
    resetRecording()
  }, [audioBlob, resetRecording])

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const audioFiles = files.filter(f => f.type.includes('audio'))
    
    if (audioFiles.length === 0) {
      toast.error('Please select audio files only')
      return
    }
    
    setAudioFiles(prev => [...prev, ...audioFiles])
  }, [])

  // Handle consent completion
  const handleComplete = useCallback(async () => {
    if (!currentConsent) return
    
    const result = await completeConsent(currentConsent.id, {
      selfAttestationConfirmed: isSelfClone ? selfAttestationConfirmed : undefined,
      audioFiles: !isSelfClone ? audioFiles : undefined,
    })
    
    if (result.success && result.cloneId) {
      setCompletedCloneId(result.cloneId)
      setStep('complete')
    } else {
      toast.error(result.error || 'Failed to complete consent verification')
    }
  }, [currentConsent, isSelfClone, selfAttestationConfirmed, audioFiles, completeConsent])

  // Handle final completion
  const handleFinish = useCallback(() => {
    if (completedCloneId && currentConsent) {
      onComplete(completedCloneId, currentConsent.id)
    }
  }, [completedCloneId, currentConsent, onComplete])

  // Don't render if not open
  if (!isOpen) return null

  // Calculate time remaining for consent
  const expiresAt = currentConsent?.expiresAt ? new Date(currentConsent.expiresAt) : null
  const timeRemaining = expiresAt ? Math.max(0, expiresAt.getTime() - Date.now()) : 0
  const minutesRemaining = Math.ceil(timeRemaining / 1000 / 60)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Voice Consent Verification</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-5 py-3 border-b border-gray-800">
          <div className="flex items-center justify-between">
            {['name', 'phrase', 'record', 'verify', 'complete'].map((s, i) => {
              const stepLabels = ['Name', 'Phrase', 'Record', 'Verify', 'Done']
              const isActive = step === s
              const isCompleted = ['name', 'phrase', 'record', 'verify', 'complete'].indexOf(step) > i
              
              // Skip phrase and record steps for self-clone
              if (isSelfClone && (s === 'phrase' || s === 'record')) {
                return null
              }
              
              return (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className={`ml-2 text-xs ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {stepLabels[i]}
                  </span>
                  {i < 4 && !isSelfClone && (
                    <div className={`w-8 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-700'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 min-h-[300px]">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div className="text-sm text-red-300">{error}</div>
            </div>
          )}

          {/* Step: Name */}
          {step === 'name' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Who's voice are you cloning?</h3>
                <p className="text-sm text-gray-400">
                  Enter the name of the person whose voice will be cloned.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Voice Name</label>
                <input
                  type="text"
                  value={actorName}
                  onChange={(e) => setActorName(e.target.value)}
                  placeholder="e.g., John Smith, Character Name"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelfClone}
                    onChange={(e) => setIsSelfClone(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-blue-300">This is my own voice</span>
                    <p className="text-xs text-blue-400/70 mt-0.5">
                      Self-attestation flow - no third-party verification required
                    </p>
                  </div>
                </label>
              </div>

              {blockers.length > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
                    <AlertCircle className="w-4 h-4" />
                    Requirements Not Met
                  </div>
                  <ul className="text-xs text-yellow-300/80 space-y-1">
                    {blockers.map((b, i) => (
                      <li key={i}>• {b.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Step: Phrase (only for third-party) */}
          {step === 'phrase' && currentConsent && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Consent Phrase</h3>
                <p className="text-sm text-gray-400">
                  Have <strong className="text-white">{actorName}</strong> read and record this phrase:
                </p>
              </div>

              <div className="relative p-4 bg-gray-800 border border-gray-600 rounded-lg">
                <p className="text-white leading-relaxed pr-10">
                  "{currentConsent.phrase}"
                </p>
                <button
                  onClick={handleCopyPhrase}
                  className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Copy phrase"
                >
                  {copiedPhrase ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {currentConsent.verificationCode && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Verification Code:</span>
                  <code className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded font-mono">
                    {currentConsent.verificationCode}
                  </code>
                </div>
              )}

              {expiresAt && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>This phrase expires in {minutesRemaining} minutes</span>
                </div>
              )}
            </div>
          )}

          {/* Step: Record (only for third-party) */}
          {step === 'record' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Record Consent</h3>
                <p className="text-sm text-gray-400">
                  Record {actorName} saying the consent phrase, or upload an audio file.
                </p>
              </div>

              {/* Recording Controls */}
              <div className="flex items-center justify-center gap-4 py-4">
                {!isRecording && !audioBlob && (
                  <Button
                    onClick={startRecording}
                    disabled={isPreparing}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600"
                  >
                    {isPreparing ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                    Start Recording
                  </Button>
                )}

                {isRecording && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-400 font-mono text-sm">
                        {formatRecordingTime(elapsedMs)}
                      </span>
                    </div>
                    <Button
                      onClick={stopRecording}
                      className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </Button>
                  </div>
                )}

                {audioBlob && !isRecording && (
                  <div className="flex items-center gap-3">
                    <audio src={audioUrl || undefined} controls className="h-10" />
                    <Button
                      onClick={handleUseRecording}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Use Recording
                    </Button>
                    <Button
                      onClick={resetRecording}
                      variant="ghost"
                      className="flex items-center gap-2 text-gray-400"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {recorderError && (
                <div className="text-center text-sm text-red-400">
                  {recorderError}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-xs text-gray-500">or</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>

              {/* File Upload */}
              <div>
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-gray-800/50 transition-colors">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Upload audio file</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Added Files */}
              {audioFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-300">Audio Files ({audioFiles.length})</div>
                  <div className="space-y-1">
                    {audioFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileAudio className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-gray-300 truncate max-w-[200px]">
                            {file.name}
                          </span>
                        </div>
                        <button
                          onClick={() => setAudioFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="p-1 text-gray-500 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Verify */}
          {step === 'verify' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">
                  {isSelfClone ? 'Confirm Self-Attestation' : 'Verify Consent'}
                </h3>
                <p className="text-sm text-gray-400">
                  {isSelfClone
                    ? 'Please confirm that you have the right to clone this voice.'
                    : `Review the audio and verify ${actorName}'s consent.`}
                </p>
              </div>

              {isSelfClone ? (
                <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selfAttestationConfirmed}
                      onChange={(e) => setSelfAttestationConfirmed(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <div className="space-y-2">
                      <span className="text-white font-medium">I confirm that:</span>
                      <ul className="text-sm text-gray-400 space-y-1">
                        <li>• This is my own voice</li>
                        <li>• I have the right to create an AI voice clone of my voice</li>
                        <li>• I understand the voice clone will be used for AI-generated audio</li>
                        <li>• I agree to the <a href="/terms" className="text-blue-400 hover:underline">Terms of Service</a> and <a href="/trust-safety" className="text-blue-400 hover:underline">Trust & Safety Policy</a></li>
                      </ul>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-800 border border-gray-600 rounded-lg">
                    <div className="text-sm text-gray-400 mb-2">Consent from: <strong className="text-white">{actorName}</strong></div>
                    <div className="text-sm text-gray-400">Audio files: <strong className="text-white">{audioFiles.length}</strong></div>
                  </div>
                  
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
                    <p>
                      By proceeding, you confirm that the voice actor has given explicit consent to clone their voice
                      and that the audio recording contains the consent phrase.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-medium text-white">Consent Verified!</h3>
              <p className="text-sm text-gray-400 text-center max-w-sm">
                Voice consent for <strong className="text-white">{actorName}</strong> has been verified.
                You can now proceed with voice cloning.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-700">
          <div>
            {step !== 'name' && step !== 'complete' && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (step === 'phrase') setStep('name')
                  else if (step === 'record') setStep('phrase')
                  else if (step === 'verify') setStep(isSelfClone ? 'name' : 'record')
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 'name' && (
              <Button
                onClick={handleInitiateConsent}
                disabled={!actorName.trim() || isInitiating || blockers.length > 0}
                className="flex items-center gap-2"
              >
                {isInitiating ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Continue
              </Button>
            )}

            {step === 'phrase' && (
              <Button
                onClick={() => setStep('record')}
                className="flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Next: Record
              </Button>
            )}

            {step === 'record' && (
              <Button
                onClick={() => setStep('verify')}
                disabled={audioFiles.length === 0}
                className="flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Next: Verify
              </Button>
            )}

            {step === 'verify' && (
              <Button
                onClick={handleComplete}
                disabled={isCompleting || (isSelfClone && !selfAttestationConfirmed) || (!isSelfClone && audioFiles.length === 0)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {isCompleting ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Complete Verification
              </Button>
            )}

            {step === 'complete' && (
              <Button
                onClick={handleFinish}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <ArrowRight className="w-4 h-4" />
                Proceed to Clone Voice
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoiceConsentWizard
