'use client'

/**
 * useVoiceConsent Hook
 * 
 * React hook for managing the voice consent flow.
 * Handles consent initiation, completion, and quota checking.
 */

import { useState, useCallback } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface TrustBlocker {
  type: 'account_age' | 'verification' | 'subscription' | 'trust_score' | 'quota'
  message: string
  canResolve: boolean
  resolution?: string
}

export interface VoiceQuota {
  used: number
  max: number
  available: number
  canCreate: boolean
  lockedSlots?: number
}

export interface VoiceCloneInfo {
  id: string
  name: string
  isActive: boolean
  useCount: number
  createdAt: string
  elevenLabsId?: string
}

export interface ConsentInfo {
  id: string
  phrase?: string
  verificationCode?: string
  expiresAt?: string
  isSelfClone: boolean
  status?: 'pending' | 'verified' | 'failed' | 'expired'
}

export interface VoiceConsentState {
  // Loading states
  isLoading: boolean
  isInitiating: boolean
  isCompleting: boolean
  isCheckingEligibility: boolean
  
  // Access control
  canAccess: boolean
  blockers: TrustBlocker[]
  suggestions: string[]
  
  // Quota
  quota: VoiceQuota | null
  voiceClones: VoiceCloneInfo[]
  
  // Current consent flow
  currentConsent: ConsentInfo | null
  
  // Errors
  error: string | null
  errorCode: string | null
}

export interface UseVoiceConsentReturn extends VoiceConsentState {
  // Actions
  checkEligibility: () => Promise<boolean>
  initiateConsent: (actorName: string, isSelfClone?: boolean) => Promise<ConsentInfo | null>
  completeConsent: (consentId: string, options: CompleteConsentOptions) => Promise<{ success: boolean; cloneId?: string; error?: string }>
  deleteVoiceClone: (cloneId: string) => Promise<boolean>
  refreshQuota: () => Promise<void>
  clearError: () => void
  resetConsent: () => void
}

export interface CompleteConsentOptions {
  selfAttestationConfirmed?: boolean
  audioFiles?: File[]
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVoiceConsent(): UseVoiceConsentReturn {
  const [state, setState] = useState<VoiceConsentState>({
    isLoading: false,
    isInitiating: false,
    isCompleting: false,
    isCheckingEligibility: false,
    canAccess: false,
    blockers: [],
    suggestions: [],
    quota: null,
    voiceClones: [],
    currentConsent: null,
    error: null,
    errorCode: null,
  })

  // --------------------------------------------------------------------------
  // Check Eligibility
  // --------------------------------------------------------------------------
  
  const checkEligibility = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isCheckingEligibility: true, error: null, errorCode: null }))
    
    try {
      const response = await fetch('/api/voice/consent/initiate', {
        method: 'GET',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setState(prev => ({
          ...prev,
          isCheckingEligibility: false,
          canAccess: false,
          error: data.error || 'Failed to check eligibility',
          errorCode: data.code || 'UNKNOWN_ERROR',
        }))
        return false
      }
      
      setState(prev => ({
        ...prev,
        isCheckingEligibility: false,
        canAccess: data.canInitiate,
        blockers: data.trustGate?.blockers || [],
        suggestions: data.trustGate?.suggestions || [],
        quota: data.quota || null,
      }))
      
      return data.canInitiate
    } catch (error) {
      console.error('[useVoiceConsent] checkEligibility error:', error)
      setState(prev => ({
        ...prev,
        isCheckingEligibility: false,
        error: 'Network error checking eligibility',
        errorCode: 'NETWORK_ERROR',
      }))
      return false
    }
  }, [])

  // --------------------------------------------------------------------------
  // Initiate Consent
  // --------------------------------------------------------------------------
  
  const initiateConsent = useCallback(async (
    actorName: string,
    isSelfClone: boolean = false
  ): Promise<ConsentInfo | null> => {
    setState(prev => ({ ...prev, isInitiating: true, error: null, errorCode: null }))
    
    try {
      const response = await fetch('/api/voice/consent/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorName, isSelfClone }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setState(prev => ({
          ...prev,
          isInitiating: false,
          error: data.error || 'Failed to initiate consent',
          errorCode: data.code || 'UNKNOWN_ERROR',
        }))
        return null
      }
      
      const consentInfo: ConsentInfo = {
        id: data.consent.id,
        phrase: data.consent.phrase,
        verificationCode: data.consent.verificationCode,
        expiresAt: data.consent.expiresAt,
        isSelfClone,
        status: 'pending',
      }
      
      setState(prev => ({
        ...prev,
        isInitiating: false,
        currentConsent: consentInfo,
      }))
      
      return consentInfo
    } catch (error) {
      console.error('[useVoiceConsent] initiateConsent error:', error)
      setState(prev => ({
        ...prev,
        isInitiating: false,
        error: 'Network error initiating consent',
        errorCode: 'NETWORK_ERROR',
      }))
      return null
    }
  }, [])

  // --------------------------------------------------------------------------
  // Complete Consent
  // --------------------------------------------------------------------------
  
  const completeConsent = useCallback(async (
    consentId: string,
    options: CompleteConsentOptions
  ): Promise<{ success: boolean; cloneId?: string; error?: string }> => {
    setState(prev => ({ ...prev, isCompleting: true, error: null, errorCode: null }))
    
    try {
      let response: Response
      
      if (options.audioFiles && options.audioFiles.length > 0) {
        // Multipart form data for audio files
        const formData = new FormData()
        formData.append('consentId', consentId)
        formData.append('selfAttestationConfirmed', String(options.selfAttestationConfirmed || false))
        
        for (const file of options.audioFiles) {
          formData.append('files', file)
        }
        
        response = await fetch('/api/voice/consent/complete', {
          method: 'POST',
          body: formData,
        })
      } else {
        // JSON body for self-attestation
        response = await fetch('/api/voice/consent/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consentId,
            selfAttestationConfirmed: options.selfAttestationConfirmed,
          }),
        })
      }
      
      const data = await response.json()
      
      if (!response.ok) {
        setState(prev => ({
          ...prev,
          isCompleting: false,
          error: data.error || 'Failed to complete consent',
          errorCode: data.code || 'UNKNOWN_ERROR',
          currentConsent: prev.currentConsent 
            ? { ...prev.currentConsent, status: 'failed' }
            : null,
        }))
        return { success: false, error: data.error }
      }
      
      setState(prev => ({
        ...prev,
        isCompleting: false,
        currentConsent: prev.currentConsent 
          ? { ...prev.currentConsent, status: 'verified' }
          : null,
      }))
      
      return { success: true, cloneId: data.voiceClone?.id }
    } catch (error) {
      console.error('[useVoiceConsent] completeConsent error:', error)
      const errorMessage = 'Network error completing consent'
      setState(prev => ({
        ...prev,
        isCompleting: false,
        error: errorMessage,
        errorCode: 'NETWORK_ERROR',
      }))
      return { success: false, error: errorMessage }
    }
  }, [])

  // --------------------------------------------------------------------------
  // Delete Voice Clone
  // --------------------------------------------------------------------------
  
  const deleteVoiceClone = useCallback(async (cloneId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, errorCode: null }))
    
    try {
      const response = await fetch(`/api/voice/quota?cloneId=${cloneId}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Failed to delete voice clone',
          errorCode: data.code || 'UNKNOWN_ERROR',
        }))
        return false
      }
      
      // Update quota from response
      setState(prev => ({
        ...prev,
        isLoading: false,
        quota: data.quota || prev.quota,
        voiceClones: prev.voiceClones.filter(v => v.id !== cloneId),
      }))
      
      return true
    } catch (error) {
      console.error('[useVoiceConsent] deleteVoiceClone error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Network error deleting voice clone',
        errorCode: 'NETWORK_ERROR',
      }))
      return false
    }
  }, [])

  // --------------------------------------------------------------------------
  // Refresh Quota
  // --------------------------------------------------------------------------
  
  const refreshQuota = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, errorCode: null }))
    
    try {
      const response = await fetch('/api/voice/quota')
      const data = await response.json()
      
      if (!response.ok) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Failed to fetch quota',
          errorCode: data.code || 'UNKNOWN_ERROR',
        }))
        return
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        quota: data.quota || null,
        canAccess: data.access?.allowed || false,
        blockers: data.access?.blockers || [],
        suggestions: data.access?.suggestions || [],
        voiceClones: data.voiceClones || [],
      }))
    } catch (error) {
      console.error('[useVoiceConsent] refreshQuota error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Network error fetching quota',
        errorCode: 'NETWORK_ERROR',
      }))
    }
  }, [])

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------
  
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null, errorCode: null }))
  }, [])

  const resetConsent = useCallback(() => {
    setState(prev => ({ ...prev, currentConsent: null, error: null, errorCode: null }))
  }, [])

  // --------------------------------------------------------------------------
  // Return
  // --------------------------------------------------------------------------
  
  return {
    ...state,
    checkEligibility,
    initiateConsent,
    completeConsent,
    deleteVoiceClone,
    refreshQuota,
    clearError,
    resetConsent,
  }
}

export default useVoiceConsent
