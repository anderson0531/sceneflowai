/**
 * Consent & Calibration Modal
 * 
 * Privacy-first consent collection for the AudiencePlayer.
 * Explains biometric tracking options and allows user choice.
 * 
 * Options:
 * 1. Camera-enabled: Local emotion sensing via MediaPipe (no video sent)
 * 2. Manual-only: Emoji reactions on the timeline
 * 
 * Also collects optional demographics for segmentation.
 * 
 * @see /src/lib/types/behavioralAnalytics.ts for types
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Camera,
  CameraOff,
  Shield,
  ChevronRight,
  Info,
  Smile,
  Lock,
} from 'lucide-react'
import type { 
  SessionDemographics, 
  ViewerConsentState 
} from '@/lib/types/behavioralAnalytics'

// ============================================================================
// Types
// ============================================================================

interface ConsentModalProps {
  onConsentComplete: (consent: {
    cameraConsent: boolean
    demographics?: SessionDemographics
  }) => void
  screeningTitle?: string
  showDemographics?: boolean
}

// ============================================================================
// Age Range Options
// ============================================================================

const AGE_RANGES: SessionDemographics['ageRange'][] = [
  '13-17',
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
]

const GENDER_OPTIONS: SessionDemographics['gender'][] = [
  'male',
  'female',
  'non-binary',
  'prefer-not-to-say',
]

// ============================================================================
// Component
// ============================================================================

export function ConsentModal({
  onConsentComplete,
  screeningTitle,
  showDemographics = true,
}: ConsentModalProps) {
  const [step, setStep] = useState<'camera' | 'demographics'>('camera')
  const [cameraConsent, setCameraConsent] = useState<boolean | null>(null)
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false)
  
  // Demographics
  const [ageRange, setAgeRange] = useState<SessionDemographics['ageRange']>()
  const [gender, setGender] = useState<SessionDemographics['gender']>()
  
  // ============================================================================
  // Handlers
  // ============================================================================
  
  const handleCameraChoice = (consent: boolean) => {
    setCameraConsent(consent)
    
    if (showDemographics) {
      setStep('demographics')
    } else {
      onConsentComplete({ cameraConsent: consent })
    }
  }
  
  const handleDemographicsComplete = (skip: boolean = false) => {
    const demographics: SessionDemographics | undefined = skip
      ? undefined
      : {
          ageRange,
          gender,
        }
    
    onConsentComplete({
      cameraConsent: cameraConsent ?? false,
      demographics,
    })
  }
  
  // ============================================================================
  // Render: Camera Consent Step
  // ============================================================================
  
  if (step === 'camera') {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smile className="w-8 h-8 text-blue-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">
              Help us improve this story
            </h1>
            
            {screeningTitle && (
              <p className="text-sm text-gray-400 mb-4">
                Watching: {screeningTitle}
              </p>
            )}
            
            <p className="text-gray-300">
              Your feedback helps creators understand what works and what doesn&apos;t.
            </p>
          </div>
          
          {/* Options */}
          <div className="px-6 py-4 space-y-3">
            {/* Camera Option */}
            <button
              onClick={() => handleCameraChoice(true)}
              className="w-full p-4 rounded-xl border border-gray-700 hover:border-blue-500 hover:bg-blue-500/5 transition-all group text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <Camera className="w-6 h-6 text-blue-400" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">
                    Enable Reaction Sensing
                  </h3>
                  <p className="text-sm text-gray-400">
                    Your camera detects smiles, frowns, and attention locally. 
                    <span className="text-green-400"> No video is recorded or sent.</span>
                  </p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" />
              </div>
            </button>
            
            {/* Manual Option */}
            <button
              onClick={() => handleCameraChoice(false)}
              className="w-full p-4 rounded-xl border border-gray-700 hover:border-gray-600 hover:bg-gray-800/50 transition-all group text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-gray-700 transition-colors">
                  <CameraOff className="w-6 h-6 text-gray-400" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">
                    No Camera? No Problem
                  </h3>
                  <p className="text-sm text-gray-400">
                    Use the emoji reactions on the timeline to share how you feel at any moment.
                  </p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-gray-400 transition-colors" />
              </div>
            </button>
          </div>
          
          {/* Privacy Explainer */}
          <div className="px-6 pb-6">
            <button
              onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-400 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>How we protect your privacy</span>
              <Info className="w-4 h-4" />
            </button>
            
            {showPrivacyDetails && (
              <div className="mt-3 p-4 bg-gray-800/50 rounded-lg text-sm text-gray-400 space-y-2">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong className="text-gray-300">Local Processing:</strong> All facial analysis happens in your browser using AI. Your camera feed never leaves your device.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong className="text-gray-300">Only Scores:</strong> We only receive simple scores like &quot;smiled at 2:34 with 80% intensity&quot;—no images, no video, no personal data.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong className="text-gray-300">Calibration Period:</strong> The first 5 minutes are used for calibration only and are never used in final reports.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // Render: Demographics Step (Optional)
  // ============================================================================
  
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            Quick Demographics
          </h2>
          <p className="text-sm text-gray-400">
            Optional: Help creators understand their audience better
          </p>
        </div>
        
        {/* Age Range */}
        <div className="px-6 pb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Age Range
          </label>
          <div className="flex flex-wrap gap-2">
            {AGE_RANGES.map((age) => (
              <button
                key={age}
                onClick={() => setAgeRange(age)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  ageRange === age
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {age}
              </button>
            ))}
          </div>
        </div>
        
        {/* Gender */}
        <div className="px-6 pb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Gender
          </label>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                  gender === g
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {g === 'prefer-not-to-say' ? 'Prefer not to say' : g}
              </button>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleDemographicsComplete(true)}
          >
            Skip
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={() => handleDemographicsComplete(false)}
          >
            Start Watching
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConsentModal
