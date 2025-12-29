/**
 * VoiceVerificationService
 * 
 * Handles voice consent verification using Azure Speaker Recognition API.
 * Provides voice biometric matching to verify that the person giving consent
 * is the same person whose voice is being cloned.
 * 
 * Features:
 * - Create voice profiles from audio samples
 * - Verify consent recordings match the voice profile
 * - Generate randomized consent phrases
 * - Manage Azure profile lifecycle
 */

import { createHash } from 'crypto';

// Azure Speaker Recognition configuration
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'eastus'
const AZURE_SPEECH_ENDPOINT = `https://${AZURE_SPEECH_REGION}.api.cognitive.microsoft.com`

// Minimum confidence score for verification (0.0 - 1.0)
const MIN_VERIFICATION_SCORE = Number(process.env.VOICE_CONSENT_MIN_SCORE ?? '0.85')

export interface ConsentPhraseResult {
  phrase: string
  verificationCode: string
  expiresAt: Date
}

export interface VoiceProfileResult {
  profileId: string
  enrollmentStatus: 'enrolling' | 'enrolled' | 'failed'
  enrolledDuration?: number // seconds of audio enrolled
}

export interface VerificationResult {
  verified: boolean
  score: number
  decision: 'accept' | 'reject'
  error?: string
}

// Consent phrase templates with placeholders
const CONSENT_TEMPLATES = [
  'I, {actorName}, consent to having my voice cloned by {userName} on SceneFlow AI. Verification code: {code}.',
  'This is {actorName}. I authorize {userName} to create an AI voice clone of my voice on SceneFlow AI. Code: {code}.',
  'I am {actorName} and I give permission for {userName} to clone my voice using SceneFlow AI. Verification: {code}.',
]

/**
 * Generate a random verification code (e.g., "ALPHA-7924")
 */
function generateVerificationCode(): string {
  const words = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL']
  const word = words[Math.floor(Math.random() * words.length)]
  const number = Math.floor(1000 + Math.random() * 9000) // 4-digit number
  return `${word}-${number}`
}

export class VoiceVerificationService {
  /**
   * Check if Azure Speaker Recognition is configured
   */
  static isConfigured(): boolean {
    return !!(AZURE_SPEECH_KEY && AZURE_SPEECH_REGION)
  }

  /**
   * Generate a randomized consent phrase for the user to record
   */
  static generateConsentPhrase(
    actorName: string,
    userName: string,
    expiryMinutes: number = 60
  ): ConsentPhraseResult {
    const template = CONSENT_TEMPLATES[Math.floor(Math.random() * CONSENT_TEMPLATES.length)]
    const verificationCode = generateVerificationCode()
    
    const phrase = template
      .replace('{actorName}', actorName)
      .replace('{userName}', userName)
      .replace('{code}', verificationCode)

    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes)

    return {
      phrase,
      verificationCode,
      expiresAt,
    }
  }

  /**
   * Generate a simplified self-attestation phrase (for cloning own voice)
   */
  static generateSelfAttestationPhrase(userName: string): ConsentPhraseResult {
    const verificationCode = generateVerificationCode()
    const phrase = `I, ${userName}, consent to clone my own voice on SceneFlow AI. Code: ${verificationCode}.`
    
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 60)

    return {
      phrase,
      verificationCode,
      expiresAt,
    }
  }

  /**
   * Create a voice profile in Azure Speaker Recognition from audio samples
   * 
   * @param audioBuffers Array of audio file buffers (WAV format preferred)
   * @returns Profile ID and enrollment status
   */
  static async createVoiceProfile(audioBuffers: Buffer[]): Promise<VoiceProfileResult> {
    if (!this.isConfigured()) {
      throw new Error('Azure Speaker Recognition not configured. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.')
    }

    try {
      // Step 1: Create a new voice profile
      const createResponse = await fetch(
        `${AZURE_SPEECH_ENDPOINT}/speaker/verification/v2.0/text-independent/profiles`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locale: 'en-us' }),
        }
      )

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        throw new Error(`Failed to create voice profile: ${createResponse.status} - ${errorText}`)
      }

      const profileData = await createResponse.json()
      const profileId = profileData.profileId

      console.log(`[VoiceVerification] Created voice profile: ${profileId}`)

      // Step 2: Enroll audio samples into the profile
      let totalEnrolledDuration = 0

      for (const audioBuffer of audioBuffers) {
        const enrollResponse = await fetch(
          `${AZURE_SPEECH_ENDPOINT}/speaker/verification/v2.0/text-independent/profiles/${profileId}/enrollments`,
          {
            method: 'POST',
            headers: {
              'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY!,
              'Content-Type': 'audio/wav',
            },
            body: new Uint8Array(audioBuffer),
          }
        )

        if (!enrollResponse.ok) {
          const errorText = await enrollResponse.text()
          console.warn(`[VoiceVerification] Enrollment failed for sample: ${errorText}`)
          continue
        }

        const enrollData = await enrollResponse.json()
        totalEnrolledDuration += enrollData.enrollmentsSpeechLength || 0
      }

      // Step 3: Check profile status
      const statusResponse = await fetch(
        `${AZURE_SPEECH_ENDPOINT}/speaker/verification/v2.0/text-independent/profiles/${profileId}`,
        {
          method: 'GET',
          headers: {
            'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY!,
          },
        }
      )

      const statusData = await statusResponse.json()
      const enrollmentStatus = statusData.enrollmentStatus === 'Enrolled' ? 'enrolled' : 'enrolling'

      console.log(`[VoiceVerification] Profile ${profileId} status: ${enrollmentStatus}, duration: ${totalEnrolledDuration}s`)

      return {
        profileId,
        enrollmentStatus,
        enrolledDuration: totalEnrolledDuration,
      }
    } catch (error) {
      console.error('[VoiceVerification] Error creating voice profile:', error)
      throw error
    }
  }

  /**
   * Verify a consent recording against a voice profile
   * 
   * @param profileId Azure voice profile ID
   * @param consentAudioBuffer Audio buffer of the consent recording
   * @returns Verification result with confidence score
   */
  static async verifyConsent(
    profileId: string,
    consentAudioBuffer: Buffer
  ): Promise<VerificationResult> {
    if (!this.isConfigured()) {
      throw new Error('Azure Speaker Recognition not configured. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.')
    }

    try {
      const verifyResponse = await fetch(
        `${AZURE_SPEECH_ENDPOINT}/speaker/verification/v2.0/text-independent/profiles/${profileId}/verify`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY!,
            'Content-Type': 'audio/wav',
          },
          body: new Uint8Array(consentAudioBuffer),
        }
      )

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text()
        console.error(`[VoiceVerification] Verification API error: ${verifyResponse.status} - ${errorText}`)
        return {
          verified: false,
          score: 0,
          decision: 'reject',
          error: `Verification failed: ${verifyResponse.status}`,
        }
      }

      const verifyData = await verifyResponse.json()
      const score = verifyData.score || 0
      const azureDecision = verifyData.recognitionResult // 'Accept' or 'Reject'

      // Apply our threshold (may be stricter than Azure's default)
      const verified = score >= MIN_VERIFICATION_SCORE

      console.log(`[VoiceVerification] Verification result: score=${score}, azureDecision=${azureDecision}, ourDecision=${verified ? 'accept' : 'reject'}`)

      return {
        verified,
        score,
        decision: verified ? 'accept' : 'reject',
      }
    } catch (error) {
      console.error('[VoiceVerification] Error verifying consent:', error)
      return {
        verified: false,
        score: 0,
        decision: 'reject',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete a voice profile from Azure (cleanup after verification)
   */
  static async deleteVoiceProfile(profileId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('[VoiceVerification] Azure not configured, skipping profile deletion')
      return false
    }

    try {
      const deleteResponse = await fetch(
        `${AZURE_SPEECH_ENDPOINT}/speaker/verification/v2.0/text-independent/profiles/${profileId}`,
        {
          method: 'DELETE',
          headers: {
            'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY!,
          },
        }
      )

      if (!deleteResponse.ok) {
        console.warn(`[VoiceVerification] Failed to delete profile ${profileId}: ${deleteResponse.status}`)
        return false
      }

      console.log(`[VoiceVerification] Deleted voice profile: ${profileId}`)
      return true
    } catch (error) {
      console.error('[VoiceVerification] Error deleting voice profile:', error)
      return false
    }
  }

  /**
   * Hash content for deduplication/audit purposes
   */
  static hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}

export default VoiceVerificationService
