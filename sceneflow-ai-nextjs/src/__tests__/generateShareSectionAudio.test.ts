import { describe, it, expect } from 'vitest'
import {
  computeSectionNarrationPlan,
  hashShareAudioContent,
  isShareSectionAudioCurrent,
  planWithLanguageHashes,
  scheduleShareSectionAudioGeneration,
  runShareSectionAudioGeneration,
} from '@/lib/blueprint/generateShareSectionAudio'
import { DEFAULT_BLUEPRINT_GEMINI_VOICE } from '@/lib/tts/geminiFlashTts'
import { hashForLanguage, normalizeShareAudioPayload } from '@/lib/blueprint/shareAudioPayload'
import { hashSectionNarrationText } from '@/lib/blueprint/sectionNarrationText'
import type { BlueprintSectionAudioMap, BlueprintSessionPayload } from '@/lib/blueprint/shareTypes'

const fixture: Record<string, unknown> = {
  title: 'Midnight Run',
  logline: 'A courier races against dawn.',
  genre: 'Thriller',
  synopsis: 'Alex Chen delivers a package.',
  setting: 'Neo-Tokyo',
  protagonist: 'Alex Chen',
  beats: [
    { title: 'Opening', synopsis: 'The job begins.' },
    { title: 'Midpoint', synopsis: 'Everything shifts.' },
  ],
  tone: 'Tense',
}

describe('scheduleShareSectionAudioGeneration', () => {
  it('delegates to runShareSectionAudioGeneration', () => {
    expect(scheduleShareSectionAudioGeneration).toBe(runShareSectionAudioGeneration)
  })
})

describe('computeSectionNarrationPlan', () => {
  it('returns sections with stable text hashes', () => {
    const plan = computeSectionNarrationPlan(fixture)
    expect(plan.length).toBeGreaterThan(0)
    expect(plan[0]?.textHash).toBe(hashSectionNarrationText(plan[0]!.text))
  })
})

describe('isShareSectionAudioCurrent', () => {
  it('returns true when ready and all hashes match', () => {
    const plan = computeSectionNarrationPlan(fixture)
    const sectionAudio: BlueprintSectionAudioMap = {}
    for (const { section, textHash } of plan) {
      sectionAudio[section] = { url: `https://example.com/${section}.mp3`, textHash }
    }
    expect(isShareSectionAudioCurrent(sectionAudio, 'ready', plan)).toBe(true)
  })

  it('returns false when a section hash differs', () => {
    const plan = computeSectionNarrationPlan(fixture)
    const sectionAudio: BlueprintSectionAudioMap = {}
    for (const { section, textHash } of plan) {
      sectionAudio[section] = { url: `https://example.com/${section}.mp3`, textHash }
    }
    const first = plan[0]!
    sectionAudio[first.section] = {
      url: sectionAudio[first.section]!.url,
      textHash: 'outdated',
    }
    expect(isShareSectionAudioCurrent(sectionAudio, 'ready', plan)).toBe(false)
  })

  it('returns false when status is pending', () => {
    const plan = computeSectionNarrationPlan(fixture)
    expect(isShareSectionAudioCurrent({}, 'pending', plan)).toBe(false)
  })

  it('uses language-prefixed hashes', () => {
    const plan = planWithLanguageHashes(computeSectionNarrationPlan(fixture), 'es')
    const sectionAudio: BlueprintSectionAudioMap = {}
    for (const { section, textHash } of plan) {
      sectionAudio[section] = { url: `https://example.com/${section}.mp3`, textHash }
    }
    expect(isShareSectionAudioCurrent(sectionAudio, 'ready', plan)).toBe(true)
    expect(sectionAudio.core?.textHash).toMatch(/^es:/)
  })

  it('invalidates cache when voice or director notes change', () => {
    const basePlan = computeSectionNarrationPlan(fixture)
    const first = basePlan[0]!
    const voiceA = DEFAULT_BLUEPRINT_GEMINI_VOICE
    const voiceB = 'gemini-Puck'
    const hashA = hashShareAudioContent(first.text, voiceA, 'warm')
    const hashB = hashShareAudioContent(first.text, voiceB, 'warm')
    const hashC = hashShareAudioContent(first.text, voiceA, 'dramatic')
    expect(hashA).not.toBe(hashB)
    expect(hashA).not.toBe(hashC)

    const planA = planWithLanguageHashes(basePlan, 'en', voiceA, 'warm')
    const planB = planWithLanguageHashes(basePlan, 'en', voiceB, 'warm')
    const sectionAudio: BlueprintSectionAudioMap = {}
    for (const { section, textHash } of planA) {
      sectionAudio[section] = { url: `https://example.com/${section}.mp3`, textHash }
    }
    expect(isShareSectionAudioCurrent(sectionAudio, 'ready', planA)).toBe(true)
    expect(isShareSectionAudioCurrent(sectionAudio, 'ready', planB)).toBe(false)
  })
})

describe('hashShareAudioContent', () => {
  it('is stable for the same inputs', () => {
    const h1 = hashShareAudioContent('Hello world', DEFAULT_BLUEPRINT_GEMINI_VOICE, 'notes')
    const h2 = hashShareAudioContent('Hello world', DEFAULT_BLUEPRINT_GEMINI_VOICE, 'notes')
    expect(h1).toBe(h2)
  })
})

describe('normalizeShareAudioPayload', () => {
  it('maps phantom pending without startedAt to idle', () => {
    const payload: BlueprintSessionPayload = {
      type: 'blueprint',
      projectId: 'p1',
      variantId: 'v1',
      treatment: fixture,
      sectionAudioStatus: 'pending',
    }
    const normalized = normalizeShareAudioPayload(payload)
    expect(normalized.sectionAudioStatus).toBe('idle')
  })

  it('migrates legacy sectionAudio to sectionAudioByLanguage.en', () => {
    const payload: BlueprintSessionPayload = {
      type: 'blueprint',
      projectId: 'p1',
      variantId: 'v1',
      treatment: fixture,
      sectionAudio: {
        core: { url: 'https://x/core.mp3', textHash: hashForLanguage('abc', 'en') },
      },
    }
    const normalized = normalizeShareAudioPayload(payload)
    expect(normalized.sectionAudioByLanguage?.en?.core?.url).toBe('https://x/core.mp3')
  })
})
