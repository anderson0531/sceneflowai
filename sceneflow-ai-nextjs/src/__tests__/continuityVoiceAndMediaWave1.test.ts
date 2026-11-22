import { describe, expect, it } from 'vitest'
import {
  applyPromotedSubmissionToProjectMetadata,
  extractScenePromptCardsFromProject,
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
  normalizeClientMediaChapters,
  parseFfmpegInspection,
} from '@/lib/continuity/voiceDnaService'
import {
  deriveEraAdjustedVoiceDna,
  parseCharacterNameAndAge,
} from '@/lib/continuity/eraVoicePropagation'
import {
  buildLiveIntroToReenactmentBridge,
  buildPortraitTo16x9DocumentaryFilter,
} from '@/lib/continuity/documentaryBridge'
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

  it('extracts Guided Teleprompter Scene Prompt Cards from script scenes and intake beats', () => {
    const fromScript = extractScenePromptCardsFromProject({
      metadata: {
        visionPhase: {
          script: {
            script: {
              scenes: [
                {
                  id: 'sc-1',
                  sceneNumber: 1,
                  heading: 'INT. GRANDPA BAKERY - 1962',
                  narration: 'Every morning before sunrise, the smell of sourdough filled the street.',
                  location: 'Cleveland, Ohio',
                },
              ],
            },
          },
        },
      },
    })
    expect(fromScript).toHaveLength(1)
    expect(fromScript[0].sceneId).toBe('sc-1')
    expect(fromScript[0].sceneNumber).toBe(1)
    expect(fromScript[0].promptCue).toContain('smell of sourdough')

    const fromIntake = extractScenePromptCardsFromProject({
      metadata: {
        clientOrder: {
          resonatingBeats: [
            {
              id: 'beat-1',
              title: 'The First Car',
              eraOrAge: '1968 (Age 21)',
              summary: 'Buying a rusted blue Mustang with summer factory wages.',
              deliveryFormatHint: 'live_subject_intro',
            },
          ],
        },
      },
    })
    expect(fromIntake).toHaveLength(1)
    expect(fromIntake[0].title).toBe('The First Car')
    expect(fromIntake[0].deliveryFormatHint).toBe('live_subject_intro')
  })

  it('normalizes auto-chapters & bestVoiceSliceWindow and promotes photo voice stories into clientMediaClips', () => {
    const chapters = normalizeClientMediaChapters(
      [
        {
          title: 'Arriving at the Harbor',
          startSeconds: 0,
          endSeconds: 22.4,
          quote: 'We stepped off the boat with two suitcases.',
          suggestedUsage: 'live_intro',
        },
        {
          title: 'First Apartment',
          startSeconds: 22.4,
          endSeconds: 99,
          quote: 'Three flights up with no elevator.',
          suggestedUsage: 'reenactment_vo',
        },
      ],
      45
    )
    expect(chapters).toHaveLength(2)
    expect(chapters[0].suggestedUsage).toBe('live_intro')
    expect(chapters[1].endSeconds).toBe(45)

    const promotedPhoto = applyPromotedSubmissionToProjectMetadata(
      { visionPhase: { characters: [{ id: 'char-1', name: 'Grandpa' }] } },
      {
        id: 'sub-photo-1',
        slot_id: 'char-1',
        slot_type: 'character',
        slot_name: 'Grandpa',
        blob_url: 'https://blob.test/vintage-1964.jpg',
        customer_name: 'Aunt Maria',
        metadata: {
          mediaKind: 'image',
          archivalDisplayMode: 'archival_ken_burns',
          photoVoiceNoteUrl: 'https://blob.test/photo-story.webm',
          photoVoiceNoteTranscript: 'This was taken the day he opened the shop in 1964.',
          photoVoiceNoteDurationSec: 14,
        },
      }
    )

    expect(promotedPhoto.visionPhase.characters[0].archivalDisplayMode).toBe('archival_ken_burns')
    expect(promotedPhoto.visionPhase.characters[0].photoVoiceNoteUrl).toBe(
      'https://blob.test/photo-story.webm'
    )
    expect(promotedPhoto.visionPhase.references.clientMediaClips).toHaveLength(1)
    expect(promotedPhoto.visionPhase.references.clientMediaClips[0].transcript).toContain(
      'opened the shop in 1964'
    )
    expect(promotedPhoto.visionPhase.references.clientMediaClips[0].customerName).toBe('Aunt Maria')
  })

  it('derives and propagates Era-Linked Younger Voice DNA from a senior master to sibling era characters', () => {
    expect(parseCharacterNameAndAge('Robert (Age 74)')).toEqual({ baseName: 'Robert', age: 74 })
    expect(parseCharacterNameAndAge('Young Robert')).toEqual({ baseName: 'Robert', age: 24 })

    const seniorDna = {
      summary: 'Warm 70s Midwestern gravelly baritone · ~115 WPM',
      gender: 'male',
      apparentAge: 'early 70s',
      vocalAttributes: {
        register: 'low' as const,
        vocalWeight: 'heavy' as const,
        timbre: 'warm, gravelly baritone',
        accent: 'Midwestern American',
        cadence: 'slow, deliberate storytelling',
        wpm: 115,
        emotionalState: 'warm and nostalgic',
        inflection: 'gentle downward resolution',
        tone: 'intimate documentary',
      },
      voiceDesignPrompt: 'Early 70s male, low heavy gravelly baritone, Midwestern American accent.',
      veoVoiceCue: 'Warm early-70s Midwestern gravelly baritone.',
      recommendedGeminiBaseVoice: 'gemini-Charon',
    }

    const younger = deriveEraAdjustedVoiceDna({
      sourceDna: seniorDna,
      sourceAge: 74,
      targetAge: 25,
      targetName: 'Robert (Age 25)',
    })
    expect(younger.vocalAttributes.register).toBe('mid')
    expect(younger.vocalAttributes.vocalWeight).toBe('medium')
    expect(younger.vocalAttributes.wpm).toBeGreaterThan(115)
    expect(younger.vocalAttributes.accent).toBe('Midwestern American')
    expect(younger.vocalAttributes.timbre.toLowerCase()).not.toContain('gravelly')
    expect(younger.veoVoiceCue).toContain('Midwestern American')

    // Automatic sibling propagation when promoting master character voice
    const updated = applyPromotedSubmissionToProjectMetadata(
      {
        visionPhase: {
          characters: [
            { id: 'char-74', name: 'Robert (Age 74)' },
            { id: 'char-25', name: 'Robert (Age 25)' },
            { id: 'char-other', name: 'Mary (Age 70)' },
          ],
        },
      },
      {
        slot_id: 'voice:char-74',
        slot_type: 'character_voice',
        slot_name: 'Robert (Age 74)',
        blob_url: 'https://blob.test/robert-74.webm',
        metadata: {
          mediaKind: 'audio',
          acousticVoiceDna: seniorDna,
          googleVoiceCloningKey: 'statelessKey12345678901234567890',
        },
      }
    )

    expect(updated.visionPhase.characters[0].voiceId).toBe('statelessKey12345678901234567890')
    expect(updated.visionPhase.characters[1].voiceDerivedFromCharacterId).toBe('char-74')
    expect(updated.visionPhase.characters[1].veoVoiceCue).toContain('Midwestern American')
    expect(updated.visionPhase.characters[1].voiceAcousticDna.vocalAttributes.wpm).toBeGreaterThan(115)
    // Unrelated character untouched
    expect(updated.visionPhase.characters[2].voiceAcousticDna).toBeUndefined()
  })

  it('builds Vertical-to-16:9 Documentary Framing Guard & J-Cut Live-to-AI Audio Bleed presets', () => {
    const bridged = buildLiveIntroToReenactmentBridge({
      liveIntroSegment: {
        segmentId: 'seg-live-1',
        sequenceIndex: 0,
        videoUrl: 'https://blob.test/grandpa-vertical.mov',
        startTime: 0,
        duration: 12,
      },
      reenactmentSegment: {
        segmentId: 'seg-ai-2',
        sequenceIndex: 1,
        videoUrl: 'https://blob.test/1958-harbor-4k.mp4',
        startTime: 12,
        duration: 8,
      },
      aspectOrientation: 'portrait',
      extractedAudioUrl: 'https://blob.test/grandpa-stem.mp3',
      config: {
        audioBleedSec: 2.5,
        dissolveSec: 0.75,
        lowerThirdTitle: 'Robert Miller',
        lowerThirdSubtitle: 'Chapter 1 · Summer of 1958',
      },
    })

    expect(bridged.liveIntroSegment.audioTailOutSec).toBe(2.5)
    expect(bridged.liveIntroSegment.portraitFramingMode).toBe('documentary_matte')
    expect(bridged.liveIntroSegment.lowerThirdTitle).toBe('Robert Miller')
    expect(bridged.reenactmentSegment.transitionIn).toBe('dissolve')
    expect(bridged.reenactmentSegment.transitionInSec).toBe(0.75)
    expect(bridged.reenactmentSegment.audioSource).toBe('voiceover')
    expect(bridged.reenactmentSegment.voiceoverUrl).toBe('https://blob.test/grandpa-stem.mp3')

    const matteFilter = buildPortraitTo16x9DocumentaryFilter({ width: 3840, height: 2160 })
    expect(matteFilter).toContain('gblur=sigma=28')
    expect(matteFilter).toContain('overlay=(W-w)/2:(H-h)/2')
  })
})
