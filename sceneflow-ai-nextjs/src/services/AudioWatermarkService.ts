/**
 * Audio Watermarking Service
 * 
 * Provides audio provenance and watermarking capabilities for generated TTS content.
 * Embeds metadata to identify AI-generated audio and track its origin.
 * 
 * Approaches:
 * 1. Metadata embedding - ID3 tags for MP3, comment fields for WAV
 * 2. Inaudible watermark - Low-frequency tone patterns (future enhancement)
 * 3. Content hash registry - Track generated audio hashes
 */

import * as crypto from 'crypto'

// Watermark configuration
const WATERMARK_VERSION = '1.0'
const WATERMARK_PREFIX = 'SCENEFLOW_AI_GENERATED'

export interface AudioProvenanceData {
  version: string
  generator: 'sceneflow-ai'
  generatedAt: string
  contentHash: string
  voiceType: 'stock' | 'cloned'
  voiceId: string
  voiceName?: string
  cloneConsentId?: string
  userId: string
  projectId?: string
  sceneId?: string
  textHash: string // Hash of the input text (not the text itself for privacy)
}

export interface WatermarkedAudio {
  data: Buffer
  contentType: string
  provenance: AudioProvenanceData
  signature: string
}

/**
 * Audio Watermarking Service
 * 
 * Handles embedding provenance metadata into generated audio files.
 */
export class AudioWatermarkService {
  private static readonly SIGNING_KEY = process.env.AUDIO_WATERMARK_SECRET || 'sceneflow-watermark-key'

  /**
   * Create provenance data for a generated audio file
   */
  static createProvenance(params: {
    audioData: Buffer
    voiceType: 'stock' | 'cloned'
    voiceId: string
    voiceName?: string
    cloneConsentId?: string
    userId: string
    projectId?: string
    sceneId?: string
    inputText: string
  }): AudioProvenanceData {
    const contentHash = crypto
      .createHash('sha256')
      .update(params.audioData)
      .digest('hex')

    const textHash = crypto
      .createHash('sha256')
      .update(params.inputText)
      .digest('hex')
      .substring(0, 16) // Truncated for privacy

    return {
      version: WATERMARK_VERSION,
      generator: 'sceneflow-ai',
      generatedAt: new Date().toISOString(),
      contentHash,
      voiceType: params.voiceType,
      voiceId: params.voiceId,
      voiceName: params.voiceName,
      cloneConsentId: params.cloneConsentId,
      userId: params.userId,
      projectId: params.projectId,
      sceneId: params.sceneId,
      textHash
    }
  }

  /**
   * Generate a cryptographic signature for the provenance data
   */
  static signProvenance(provenance: AudioProvenanceData): string {
    const dataToSign = JSON.stringify({
      contentHash: provenance.contentHash,
      generatedAt: provenance.generatedAt,
      voiceId: provenance.voiceId,
      userId: provenance.userId
    })

    return crypto
      .createHmac('sha256', this.SIGNING_KEY)
      .update(dataToSign)
      .digest('hex')
  }

  /**
   * Verify a provenance signature
   */
  static verifySignature(provenance: AudioProvenanceData, signature: string): boolean {
    const expectedSignature = this.signProvenance(provenance)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  /**
   * Embed watermark into MP3 audio using ID3v2 tags
   * Uses the TXXX (user-defined text) frame for provenance data
   */
  static embedWatermarkMP3(audioData: Buffer, provenance: AudioProvenanceData): Buffer {
    const signature = this.signProvenance(provenance)
    
    // Create ID3v2 header with TXXX frame
    const provenanceJson = JSON.stringify({
      ...provenance,
      signature
    })

    // TXXX frame structure:
    // Frame ID: TXXX (4 bytes)
    // Size: (4 bytes, syncsafe integer)
    // Flags: (2 bytes)
    // Encoding: (1 byte, 0x03 for UTF-8)
    // Description: (null-terminated string)
    // Value: (string)
    
    const description = Buffer.from(WATERMARK_PREFIX + '\0', 'utf8')
    const value = Buffer.from(provenanceJson, 'utf8')
    
    const frameContent = Buffer.concat([
      Buffer.from([0x03]), // UTF-8 encoding
      description,
      value
    ])

    // Calculate syncsafe size (7 bits per byte)
    const frameSize = frameContent.length
    const syncsafeSize = Buffer.from([
      (frameSize >> 21) & 0x7f,
      (frameSize >> 14) & 0x7f,
      (frameSize >> 7) & 0x7f,
      frameSize & 0x7f
    ])

    const frame = Buffer.concat([
      Buffer.from('TXXX', 'ascii'),
      syncsafeSize,
      Buffer.from([0x00, 0x00]), // Flags
      frameContent
    ])

    // Check if audio already has ID3v2 header
    const hasId3 = audioData.slice(0, 3).toString('ascii') === 'ID3'

    if (hasId3) {
      // Parse existing header size and insert frame
      const existingSize = (
        ((audioData[6] & 0x7f) << 21) |
        ((audioData[7] & 0x7f) << 14) |
        ((audioData[8] & 0x7f) << 7) |
        (audioData[9] & 0x7f)
      )
      
      // Insert frame after header but before existing frames
      const headerEnd = 10 // ID3v2 header is 10 bytes
      const newSize = existingSize + frame.length
      
      const newSyncsafeSize = Buffer.from([
        (newSize >> 21) & 0x7f,
        (newSize >> 14) & 0x7f,
        (newSize >> 7) & 0x7f,
        newSize & 0x7f
      ])

      return Buffer.concat([
        audioData.slice(0, 6),     // ID3 + version + flags
        newSyncsafeSize,           // Updated size
        frame,                      // Our watermark frame
        audioData.slice(10)        // Rest of original data
      ])
    } else {
      // Create new ID3v2.4 header
      const tagSize = frame.length
      const syncsafeTagSize = Buffer.from([
        (tagSize >> 21) & 0x7f,
        (tagSize >> 14) & 0x7f,
        (tagSize >> 7) & 0x7f,
        tagSize & 0x7f
      ])

      const id3Header = Buffer.concat([
        Buffer.from('ID3', 'ascii'),  // ID3 identifier
        Buffer.from([0x04, 0x00]),    // Version 2.4.0
        Buffer.from([0x00]),          // Flags
        syncsafeTagSize               // Tag size
      ])

      return Buffer.concat([id3Header, frame, audioData])
    }
  }

  /**
   * Extract watermark from MP3 audio
   */
  static extractWatermarkMP3(audioData: Buffer): { provenance: AudioProvenanceData; signature: string } | null {
    if (audioData.slice(0, 3).toString('ascii') !== 'ID3') {
      return null
    }

    const tagSize = (
      ((audioData[6] & 0x7f) << 21) |
      ((audioData[7] & 0x7f) << 14) |
      ((audioData[8] & 0x7f) << 7) |
      (audioData[9] & 0x7f)
    )

    let pos = 10 // Start after header
    const end = 10 + tagSize

    while (pos < end) {
      const frameId = audioData.slice(pos, pos + 4).toString('ascii')
      if (frameId === '\0\0\0\0' || frameId.length < 4) break

      const frameSize = (
        ((audioData[pos + 4] & 0x7f) << 21) |
        ((audioData[pos + 5] & 0x7f) << 14) |
        ((audioData[pos + 6] & 0x7f) << 7) |
        (audioData[pos + 7] & 0x7f)
      )

      if (frameId === 'TXXX') {
        const frameData = audioData.slice(pos + 10, pos + 10 + frameSize)
        // Skip encoding byte
        const content = frameData.slice(1).toString('utf8')
        
        // Check if this is our watermark
        if (content.startsWith(WATERMARK_PREFIX)) {
          const jsonStart = content.indexOf('{')
          if (jsonStart !== -1) {
            try {
              const data = JSON.parse(content.slice(jsonStart))
              const { signature, ...provenance } = data
              return { provenance, signature }
            } catch {
              // Invalid JSON, continue searching
            }
          }
        }
      }

      pos += 10 + frameSize
    }

    return null
  }

  /**
   * Create a watermarked audio response with provenance header
   */
  static createWatermarkedResponse(
    audioData: Buffer,
    provenance: AudioProvenanceData,
    contentType: string = 'audio/mpeg'
  ): WatermarkedAudio {
    const signature = this.signProvenance(provenance)
    
    // Embed watermark if MP3
    const watermarkedData = contentType === 'audio/mpeg'
      ? this.embedWatermarkMP3(audioData, provenance)
      : audioData

    return {
      data: watermarkedData,
      contentType,
      provenance,
      signature
    }
  }

  /**
   * Verify audio authenticity from embedded watermark
   */
  static verifyAudio(audioData: Buffer): {
    valid: boolean
    provenance?: AudioProvenanceData
    error?: string
  } {
    const extracted = this.extractWatermarkMP3(audioData)
    
    if (!extracted) {
      return {
        valid: false,
        error: 'No SceneFlow watermark found'
      }
    }

    const isValid = this.verifySignature(extracted.provenance, extracted.signature)
    
    return {
      valid: isValid,
      provenance: extracted.provenance,
      error: isValid ? undefined : 'Invalid signature - audio may have been tampered with'
    }
  }

  /**
   * Generate a verification URL for the audio
   */
  static generateVerificationUrl(provenance: AudioProvenanceData): string {
    const signature = this.signProvenance(provenance)
    const verifyData = Buffer.from(JSON.stringify({
      contentHash: provenance.contentHash,
      generatedAt: provenance.generatedAt,
      signature
    })).toString('base64url')

    return `${process.env.NEXT_PUBLIC_BASE_URL || 'https://sceneflow.ai'}/verify/audio?data=${verifyData}`
  }
}

export default AudioWatermarkService
