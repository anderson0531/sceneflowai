import { describe, expect, it } from 'vitest'
import {
  applyPromotedSubmissionToProjectMetadata,
  inferDefaultAllowVideoClips,
} from '@/lib/continuity/continuityPortalService'
import {
  getGoogleVoiceCloneConsentForLocale,
  resolveGoogleVoiceCloneLanguageCode,
} from '@/lib/continuity/voiceConsentScripts'
import {
  classifyGoogleVoiceCloneError,
  isValid24kMonoLinear16Wav,
  normalizeAcousticVoiceDna,
  parseFfmpegInspection,
} from '@/lib/continuity/voiceDnaService'
import { buildSegmentEnhancedPrompt } from '@/lib/video/buildSegmentEnhancedPrompt'

function makeTestWav(sampleRate: number, channels: number, bits: number): Buffer {
  const buf = Buffer.alloc(44 + 64)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + 64, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(channels, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * channels * (bits / 8), 28)
  buf.writeUInt16LE(channels * (bits / 8), 32)
  buf.writeUInt16LE(bits, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(64, 40)
  return buf
}

describe('Continuity Wave 1 — Voice DNA, Google Voice Clone, & Live Media Clips', () => {
  it('auto-enables live video clips by default for memoir and documentary projects only', () => {
    expect(
      inferDefaultAllowVideoClips({
        genre: 'Memoir',
        metadata: {},
      })
    ).toBe(true)

    expect(
      inferDefaultAllowVideoClips({
        genre: 'Commercial',
        metadata: { clientOrder: { verticalId: 'video_memoir' } },
      })
    ).toBe(true)

    expect(
      inferDefaultAllowVideoClips({
        genre: 'Commercial',
        metadata: { clientOrder: { verticalId: 'real_estate_tour' } },
      })
    ).toBe(false)
  })

  it('promotes character_voice with Tier 1 stateless googleVoiceCloningKey onto the target character', () => {
    const baseMeta = {
      visionPhase: {
        characters: [{ id: 'char-grandpa', name: 'Robert (Age 74)', description: 'Narrator' }],
      },
    }

    const updated = applyPromotedSubmissionToProjectMetadata(baseMeta, {
      id: 'sub-voice-1',
      slot_id: 'voice:char-grandpa',
      slot_type: 'character_voice',
      slot_name: 'Robert (Age 74)',
      blob_url: 'https://blob.test/raw-voice.webm',
      metadata: {
        mediaKind: 'audio',
        extractedAudioUrl: 'https://blob.test/clean-stem.mp3',
        consentAudioBlobUrl: 'https://blob.test/consent.webm',
        googleVoiceCloningKey: 'AbCdEfGhIjKlMnOpQrStUvWxYz123456',
        voiceCloneStatus: 'minted',
        languageCode: 'en-US',
        transcript: 'I grew up near Lake Erie in the summer of fifty-eight.',
        acousticVoiceDna: {
          summary: 'Warm 70s Midwestern baritone, unhurried ~118 WPM',
          gender: 'male',
          apparentAge: 'early 70s',
          vocalAttributes: {
            register: 'low-mid',
            vocalWeight: 'heavy',
            timbre: 'warm, gently gravelly baritone',
            accent: 'Midwestern American',
            cadence: 'unhurried, reflective',
            wpm: 118,
            emotionalState: 'warm and nostalgic',
            inflection: 'gentle downward resolution',
            tone: 'intimate storytelling',
          },
          voiceDesignPrompt:
            'Early 70s male, low-mid warm gravelly baritone, Midwestern American accent, unhurried 118 WPM nostalgic storytelling.',
          veoVoiceCue:
            'Warm early-70s Midwestern baritone with gentle gravel and unhurried storytelling pace.',
          recommendedGeminiBaseVoice: 'gemini-Charon',
        },
      },
    })

    const char = updated.visionPhase.characters[0]
    expect(char.voiceProvider).toBe('google')
    expect(char.voiceId).toBe('AbCdEfGhIjKlMnOpQrStUvWxYz123456')
    expect(char.googleVoiceCloningKey).toBe('AbCdEfGhIjKlMnOpQrStUvWxYz123456')
    expect(char.voiceReferenceAudioUrl).toBe('https://blob.test/clean-stem.mp3')
    expect(char.veoVoiceCue).toContain('Midwestern baritone')
    expect(char.voiceDesignPrompt).toContain('118 WPM')
  })

  it('promotes character_voice with Tier 2 Acoustic Voice DNA fallback when Google clone key is not yet minted', () => {
    const updated = applyPromotedSubmissionToProjectMetadata(
      { visionPhase: { characters: [{ id: 'char-1', name: 'Elena' }] } },
      {
        slot_id: 'voice:char-1',
        slot_type: 'character_voice',
        slot_name: 'Elena',
        blob_url: 'https://blob.test/elena.m4a',
        metadata: {
          mediaKind: 'audio',
          voiceCloneStatus: 'tier2_dna_ready',
          acousticVoiceDna: {
            summary: 'Crisp warm mezzo, Iberian Spanish accent',
            gender: 'female',
            vocalAttributes: {
              register: 'mid',
              vocalWeight: 'medium',
              timbre: 'warm, clear mezzo-soprano',
              accent: 'Spanish',
              cadence: 'expressive and steady',
              wpm: 140,
              emotionalState: 'warm, engaging',
              inflection: 'melodic phrasing',
              tone: 'sincere documentary',
            },
            voiceDesignPrompt: 'Adult female, mid register warm clear mezzo, Spanish accent.',
            veoVoiceCue: 'Warm clear female mezzo with natural Spanish accent and steady cadence.',
            recommendedGeminiBaseVoice: 'gemini-Kore',
          },
        },
      }
    )

    const char = updated.visionPhase.characters[0]
    expect(char.voiceProvider).toBe('google')
    expect(char.voiceId).toBe('gemini-Kore')
    expect(char.googleVoiceCloningKey).toBeUndefined()
    expect(char.voiceDesignPrompt).toContain('warm clear mezzo')
    expect(char.veoVoiceCue).toContain('Spanish accent')
  })

  it('promotes live_video to clientMediaClips and seeds linked character Voice DNA automatically', () => {
    const updated = applyPromotedSubmissionToProjectMetadata(
      { visionPhase: { characters: [{ id: 'char-1', name: 'Arthur' }] } },
      {
        id: 'sub-vid-1',
        slot_id: 'live_video:123',
        slot_type: 'live_video',
        slot_name: 'Chapter 1 Intro — The Bakery',
        blob_url: 'https://blob.test/intro.mp4',
        customer_name: 'Arthur',
        metadata: {
          mediaKind: 'video',
          usageIntent: 'live_intro',
          extractedAudioUrl: 'https://blob.test/intro-stem.mp3',
          durationSeconds: 24.5,
          aspectOrientation: 'portrait',
          transcript: 'Every morning at four AM my father fired up the brick ovens.',
          targetCharacterId: 'char-1',
          acousticVoiceDna: {
            summary: 'Gentle Brooklyn baritone, 122 WPM',
            vocalAttributes: {
              register: 'low-mid',
              vocalWeight: 'medium',
              timbre: 'gentle raspy baritone',
              accent: 'Brooklyn New York',
              cadence: 'measured',
              wpm: 122,
              emotionalState: 'fond',
              inflection: 'conversational',
              tone: 'nostalgic',
            },
            voiceDesignPrompt: 'Gentle raspy baritone, Brooklyn New York accent, 122 WPM.',
            veoVoiceCue: 'Gentle raspy Brooklyn baritone speaking warmly.',
          },
        },
      }
    )

    const clips = updated.visionPhase.references.clientMediaClips
    expect(clips).toHaveLength(1)
    expect(clips[0].mediaUrl).toBe('https://blob.test/intro.mp4')
    expect(clips[0].extractedAudioUrl).toBe('https://blob.test/intro-stem.mp3')
    expect(clips[0].usageIntent).toBe('live_intro')
    expect(clips[0].aspectOrientation).toBe('portrait')

    // Linked character automatically received Voice DNA ("Record Once, Unlock Everything")
    expect(updated.visionPhase.characters[0].veoVoiceCue).toBe(
      'Gentle raspy Brooklyn baritone speaking warmly.'
    )
    expect(updated.visionPhase.characters[0].voiceReferenceAudioUrl).toBe(
      'https://blob.test/intro-stem.mp3'
    )
  })

  it('validates 24kHz mono LINEAR16 WAV headers and parses FFmpeg inspection metadata', () => {
    expect(isValid24kMonoLinear16Wav(makeTestWav(24000, 1, 16))).toBe(true)
    expect(isValid24kMonoLinear16Wav(makeTestWav(48000, 1, 16))).toBe(false)
    expect(isValid24kMonoLinear16Wav(makeTestWav(24000, 2, 16))).toBe(false)

    const portraitStderr = `
      Duration: 00:00:24.50, start: 0.000000, bitrate: 4200 kb/s
      Stream #0:0(und): Video: h264, yuv420p, 1920x1080, 30 fps
      displaymatrix: rotation of -90.00 degrees
    `
    const parsed = parseFfmpegInspection(portraitStderr)
    expect(parsed.durationSeconds).toBe(24.5)
    expect(parsed.aspectOrientation).toBe('portrait')
  })

  it('classifies Google voice clone errors cleanly for automatic Tier 2 cascade', () => {
    expect(
      classifyGoogleVoiceCloneError(403, 'This API method requires billing to be enabled. BILLING_DISABLED')
    ).toBe('billing_disabled')
    expect(
      classifyGoogleVoiceCloneError(403, 'Project is not allowlisted for instant custom voice')
    ).toBe('not_allowlisted')
    expect(
      classifyGoogleVoiceCloneError(400, 'voiceTalentConsent verification failed: script mismatch')
    ).toBe('consent_mismatch')
    expect(classifyGoogleVoiceCloneError(400, 'referenceAudio is too short')).toBe('audio_invalid')
  })

  it('localizes Google consent scripts and normalizes Acoustic Voice DNA payloads', () => {
    expect(getGoogleVoiceCloneConsentForLocale('es').languageCode).toBe('es-ES')
    expect(getGoogleVoiceCloneConsentForLocale('pt').script).toContain('proprietário')
    expect(resolveGoogleVoiceCloneLanguageCode('en')).toBe('en-US')
    expect(resolveGoogleVoiceCloneLanguageCode('fr-CA')).toBe('fr-CA')

    const { dna, transcript } = normalizeAcousticVoiceDna(
      {
        gender: 'male',
        apparentAge: 'mid 70s',
        vocalAttributes: {
          register: 'low',
          vocalWeight: 'heavy',
          timbre: 'deep resonant baritone',
          accent: 'Southern American',
          cadence: 'slow and deliberate',
          wpm: 108,
          emotionalState: 'calm, reflective',
          inflection: 'soft downward cadence',
          tone: 'warm documentary',
        },
        transcript: 'We built that porch in 1969.',
      },
      'Grandpa Joe'
    )
    expect(dna.vocalAttributes.register).toBe('low')
    expect(dna.vocalAttributes.wpm).toBe(108)
    expect(dna.voiceDesignPrompt.length).toBeLessThanOrEqual(285)
    expect(dna.recommendedGeminiBaseVoice).toMatch(/^gemini-/)
    expect(transcript).toBe('We built that porch in 1969.')
  })

  it('injects measured Veo voice matching cues into non-FTV segment prompts', () => {
    const result = buildSegmentEnhancedPrompt({
      prompt: 'Robert smiles warmly in the kitchen and says, "We made it home."',
      method: 'I2V',
      referenceImages: [
        {
          url: 'https://blob.test/robert.jpg',
          type: 'character',
          characterName: 'Robert',
          veoVoiceCue: 'Warm early-70s Midwestern baritone with gentle gravel, unhurried pace.',
        },
      ],
    })
    expect(result.enhancedPrompt).toContain('[Audio-Visual Sync Context]')
    expect(result.enhancedPrompt).toContain(
      'Character vocal delivery: Robert: Warm early-70s Midwestern baritone with gentle gravel, unhurried pace.'
    )

    const ftvResult = buildSegmentEnhancedPrompt({
      prompt: 'Smooth transition between frames.',
      method: 'FTV',
      referenceImages: [
        {
          url: 'https://blob.test/robert.jpg',
          type: 'character',
          characterName: 'Robert',
          veoVoiceCue: 'Warm early-70s Midwestern baritone',
        },
      ],
    })
    expect(ftvResult.enhancedPrompt).not.toContain('Character vocal delivery:')
  })
})
