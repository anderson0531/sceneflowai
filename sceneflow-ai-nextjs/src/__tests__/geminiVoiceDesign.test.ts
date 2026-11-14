import { readFileSync } from 'fs'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DESIGNED_VOICE_TYPE,
  buildDesignedVoiceSynthesisBody,
  buildNeutralVoiceDesignFallback,
  buildVoiceDesignCreateBody,
  composeVoiceDesignDescription,
  designedVoiceStyle,
  prepareDesignedVoiceLine,
  readDesignedVoiceId,
  sanitizeVoiceDesignDisplayName,
  shortenVoiceDesignDescription,
  isDesignedGeminiVoiceId,
  voiceDesignCreateAttempts,
  voicesToEvict,
  voicesToOverlay,
} from '@/lib/tts/geminiVoiceDesign'
import {
  createDesignedGeminiVoice,
  synthesizeDesignedGeminiVoiceWav,
} from '@/lib/tts/geminiDesignedVoiceTts'

vi.mock('@/lib/vertexai/client', () => ({
  getVertexAIAuthToken: vi.fn().mockResolvedValue('mock-vertex-token'),
}))

describe('composeVoiceDesignDescription', () => {
  it('builds a short persona from the portrait traits and role', () => {
    const description = composeVoiceDesignDescription({
      role: 'defense attorney',
      gender: 'male',
      apparentAge: 'late 40s',
      timbre: 'resonant baritone',
      accent: 'neutral American',
      pace: 'measured',
      emotionalDefault: 'quiet authority',
    })
    expect(description).toBe(
      'A late 40s male defense attorney with a resonant baritone voice and a neutral American accent, speaking at a measured pace with quiet authority.'
    )
    expect(description.length).toBeLessThanOrEqual(220)
    expect(description).not.toContain('Baseline delivery')
    expect(description).not.toContain('wardrobe')
  })

  it('uses An before a vowel and keeps only the role before a slash', () => {
    const description = composeVoiceDesignDescription({
      role: 'primary guide / narrator who uncovers the whole conspiracy',
      gender: 'male',
      apparentAge: 'early 60s',
      timbre: 'resonant baritone',
    })
    expect(description.startsWith('An early 60s male primary guide')).toBe(true)
    expect(description).toContain('resonant baritone')
    expect(description).not.toContain('/')
    expect(description).not.toContain('conspiracy')
  })

  it('falls back to the first vocal clause and drops the attribute tail', () => {
    const description = composeVoiceDesignDescription({
      voiceDescription:
        'Intelligent male voice with a measured pace. Vocal qualities: resonant baritone timbre, low-mid pitch.',
    })
    expect(description).toBe('Intelligent male voice with a measured pace.')
    expect(description).not.toContain('Vocal qualities')
  })

  it('drops the speaking clause for a rephrase retry', () => {
    const full = composeVoiceDesignDescription({
      role: 'guide',
      gender: 'male',
      apparentAge: 'late 50s',
      timbre: 'resonant baritone',
      accent: 'neutral American',
      pace: 'measured',
    })
    const shorter = shortenVoiceDesignDescription(full)
    expect(shorter).toBe(
      'A late 50s male guide with a resonant baritone voice and a neutral American accent.'
    )
    expect(shortenVoiceDesignDescription(shorter)).toBe(shorter)
  })
})

describe('voice design payloads', () => {
  it('creates a prompted voice with no base voice', () => {
    const body = buildVoiceDesignCreateBody({
      description: 'A late 40s male attorney with a resonant baritone.',
      displayName: 'Julian',
    })
    expect(body.store).toBe(true)
    expect(body).not.toHaveProperty('type')
    expect(body).not.toHaveProperty('prompted')
    expect(body).not.toHaveProperty('name')
    const voice = body.voice as {
      type: string
      prompted: { input: string }
    }
    expect(voice).not.toHaveProperty('model')
    expect(voice.type).toBe(DESIGNED_VOICE_TYPE)
    expect(voice.prompted.input).toContain('resonant baritone')
  })

  it('keeps the Vertex voice type when the prompt is shortened', () => {
    const full =
      'An early 60s male protagonist with a neutral, resonant baritone voice and a neutral American accent, speaking at a measured pace with quiet authority.'
    const attempts = voiceDesignCreateAttempts({
      description: full,
      displayName: 'Julian',
    })
    expect(attempts).toHaveLength(2)
    for (const body of attempts) {
      const voice = body.voice as { type: string; prompted: { input: string } }
      expect(voice.type).toBe('VOICE_TYPE_PROMPTED')
      expect(voice.prompted.input.length).toBeGreaterThan(12)
    }
    const shorter = (attempts[1].voice as { prompted: { input: string } }).prompted.input
    expect(shorter).not.toContain('speaking')
  })

  it('puts delivery only in style and cites the designed voice id', () => {
    const body = buildDesignedVoiceSynthesisBody({
      text: 'We need to move now.',
      voiceId: 'voice_abc123',
      style: designedVoiceStyle(['whispered', 'urgent']),
    })
    const part = (
      body.contents as Array<{ parts: Array<{ text: string; speechMetadata?: { style: string } }> }>
    )[0].parts[0]
    expect(part.text).toBe('We need to move now.')
    expect(part.speechMetadata?.style).toBe('whispered, urgent')
    expect(JSON.stringify(body)).not.toContain('Kore')
    expect(JSON.stringify(body)).toContain('voice_abc123')
    expect(isDesignedGeminiVoiceId('voice_abc123')).toBe(true)
    expect(isDesignedGeminiVoiceId('gemini-Kore')).toBe(false)
  })

  it('omits style when the line has no performance cue', () => {
    const body = buildDesignedVoiceSynthesisBody({
      text: 'Hello.',
      voiceId: 'voice_abc123',
      style: designedVoiceStyle([]),
    })
    const part = (body.contents as Array<{ parts: Array<Record<string, unknown>> }>)[0].parts[0]
    expect(part.speechMetadata).toBeUndefined()
  })

  it('speaks the words and keeps whisper with the line cues in style', () => {
    const prepared = prepareDesignedVoiceLine({
      text: "[whispering] I can't hold the baseline, Sarah. The cold is getting in.",
      cues: ['fragile', 'intimate'],
    })
    const body = buildDesignedVoiceSynthesisBody({
      text: prepared.text,
      voiceId: 'voice_8f84d642-7a0f-4094-806d-bf1e7de1bf19',
      style: prepared.style,
    })
    const part = (
      body.contents as Array<{ parts: Array<{ text: string; speechMetadata?: { style: string } }> }>
    )[0].parts[0]
    expect(part.text).toBe("I can't hold the baseline, Sarah. The cold is getting in.")
    expect(part.text).not.toContain('[')
    expect(part.speechMetadata?.style).toBe('whispering, fragile and intimate')
  })

  it('moves pauses and sighs to angle brackets and drops a director paragraph', () => {
    const prepared = prepareDesignedVoiceLine({
      text: '[sigh] Fine. [short pause] Have it your way.',
      cues: [
        'Close-mic, private, strained. Argue with the numbers on leftover air and do not smooth this into a composed read.',
      ],
    })
    expect(prepared.text).toBe('<sigh> Fine. <short pause> Have it your way.')
    expect(prepared.text).not.toContain('[')
    expect(prepared.style).toBeUndefined()
  })
})

describe('Vertex voice create', () => {
  it('lists and creates with VOICE_TYPE_PROMPTED, including the shorter retry', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/tts/geminiDesignedVoiceTts.ts'),
      'utf8'
    )
    expect(source).toContain('DESIGNED_VOICE_TYPE')
    expect(source).toContain('voiceDesignCreateAttempts')
    expect(source).toContain('replaceVoiceId')
    expect(source).toContain('The voice library is full.')
    expect(source).not.toContain("type: 'prompted'")
    expect(source).not.toContain('type: "prompted"')
  })
})

describe('voicesToEvict and voicesToOverlay', () => {
  it('drops the oldest unassigned voices so total stored voices + 1 stays under the cap', () => {
    const voices = Array.from({ length: 181 }, (_, index) => ({
      id: `voice_${index}`,
      createTime: `2026-01-${String((index % 28) + 1).padStart(2, '0')}T00:00:${String(index % 60).padStart(2, '0')}Z`,
    }))
    const dropped = voicesToEvict(voices, ['voice_180'], 180)
    expect(dropped).toHaveLength(2)
    expect(dropped).not.toContain('voice_180')
  })

  it('counts retained voices toward the project cap so multi-cast projects still evict old slots', () => {
    const voices = Array.from({ length: 200 }, (_, index) => ({
      id: `voice_${index}`,
      createTime: `2026-02-01T00:${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}Z`,
    }))
    const retainIds = Array.from({ length: 25 }, (_, i) => `voice_${175 + i}`)
    const dropped = voicesToEvict(voices, retainIds, 180)
    // 200 total + 1 new - 180 cap = 21 oldest unretained slots must be evicted
    expect(dropped).toHaveLength(21)
    expect(dropped[0]).toBe('voice_0')
    expect(dropped[20]).toBe('voice_20')
    for (const retained of retainIds) {
      expect(dropped).not.toContain(retained)
    }
  })

  it('evicts oldest entries using listIndex when Vertex omits createTime on newest-first lists', () => {
    // Vertex returns newest-first: index 0 is newest, index 4 is oldest
    const voices = Array.from({ length: 5 }, (_, index) => ({
      id: `voice_item_${index}`,
      listIndex: index,
    }))
    const dropped = voicesToEvict(voices, [], 4)
    expect(dropped).toEqual(['voice_item_4', 'voice_item_3'])
  })

  it('overlays oldest retained voices when all stored slots are retained', () => {
    const voices = [
      { id: 'voice_old_1', createTime: '2026-01-01T00:00:00Z' },
      { id: 'voice_old_2', createTime: '2026-01-02T00:00:00Z' },
      { id: 'voice_new_3', createTime: '2026-01-03T00:00:00Z' },
    ]
    const overlaid = voicesToOverlay(voices, ['voice_old_1', 'voice_old_2', 'voice_new_3'], 2, true)
    expect(overlaid).toEqual(['voice_old_1', 'voice_old_2'])
  })
})

describe('minor age & safety prompt sanitization', () => {
  it('sanitizes under-20 ages, teen/school labels, and safety words for characters like Age 17', () => {
    const description = composeVoiceDesignDescription({
      role: '17-year-old high school athlete',
      gender: 'boy',
      apparentAge: '17',
      timbre: 'earnest baritone',
      accent: 'Pittsburgh American',
      emotionalDefault: 'predatory focus',
    })
    expect(description).toContain('young adult male athlete')
    expect(description).not.toMatch(/\b17\b/i)
    expect(description).not.toMatch(/high school|teen|boy|predatory/i)

    const displayName = sanitizeVoiceDesignDisplayName('Brian Eric Anderson Sr. (Age 17)')
    expect(displayName).toBe('Brian Eric Anderson Sr')
    expect(displayName).not.toContain('17')

    const ensembleDisplay = sanitizeVoiceDesignDisplayName("Brian's Children & Granddaughter")
    expect(ensembleDisplay).toBe('Brian')
    expect(ensembleDisplay).not.toMatch(/children|granddaughter/i)

    const body = buildVoiceDesignCreateBody({
      description: 'A 17-year-old teenage boy with a clear tenor voice.',
      displayName: 'Brian Eric Anderson Sr. (Age 17)',
    })
    const voice = body.voice as { displayName: string; prompted: { input: string } }
    expect(voice.displayName).not.toContain('17')
    expect(voice.prompted.input).not.toMatch(/\b17\b|teenage|boy/i)
    expect(voice.prompted.input).toContain('young adult')
  })

  it('builds a studio-safe neutral acoustic fallback from persona text', () => {
    const fallback = buildNeutralVoiceDesignFallback(
      'A young adult male protagonist with an earnest baritone voice and a Pittsburgh American accent.'
    )
    expect(fallback).toContain('An adult male speaker')
    expect(fallback).toContain('baritone')
    expect(fallback).toContain('Pittsburgh American accent')
  })

  it('reads voice_ ids across snake_case and nested voice objects', () => {
    expect(readDesignedVoiceId({ voice_id: 'voice_snake_1' })).toBe('voice_snake_1')
    expect(
      readDesignedVoiceId({
        voice: { name: 'projects/demo/locations/global/voices/voice_nested_99' },
      })
    ).toBe('voice_nested_99')
  })
})

describe('createDesignedGeminiVoice & self-healing slot overlay', () => {
  const originalFetch = global.fetch
  const originalProjectId = process.env.VERTEX_PROJECT_ID

  afterEach(() => {
    global.fetch = originalFetch
    if (originalProjectId === undefined) {
      delete process.env.VERTEX_PROJECT_ID
    } else {
      process.env.VERTEX_PROJECT_ID = originalProjectId
    }
    vi.restoreAllMocks()
  })

  it('recovers via neutral studio fallback when Tier 1 and Tier 2 return HTTP 400 rephrase errors', async () => {
    process.env.VERTEX_PROJECT_ID = 'test-gcp-project'
    const postedInputs: string[] = []

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      const url = String(input)
      if (method === 'GET' && url.includes('/voices')) {
        return new Response(JSON.stringify({ voices: [] }), { status: 200 })
      }
      if (method === 'POST' && url.endsWith('/voices')) {
        const parsed = JSON.parse(String(init?.body ?? '{}')) as {
          voice: { displayName: string; prompted: { input: string } }
        }
        postedInputs.push(parsed.voice.prompted.input)
        if (postedInputs.length <= 2) {
          return new Response(
            JSON.stringify({
              error: {
                code: 400,
                message:
                  'Voice generation did not complete, so no voice was created. Try rephrasing the prompt.',
                status: 'INVALID_ARGUMENT',
              },
            }),
            { status: 400 }
          )
        }
        return new Response(
          JSON.stringify({ name: 'projects/test-gcp-project/locations/global/voices/voice_recovered_3' }),
          { status: 200 }
        )
      }
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    const created = await createDesignedGeminiVoice({
      description:
        'A young adult male protagonist with a resonant baritone voice and a neutral American accent, speaking at a measured pace with quiet focus.',
      displayName: 'Brian Eric Anderson Sr. (Age 17)',
    })

    expect(created.voiceId).toBe('voice_recovered_3')
    expect(postedInputs).toHaveLength(3)
    expect(postedInputs[2]).toContain('An adult male speaker')
  })

  it('deletes and overlays old stored voice slots when Vertex returns 429 RESOURCE_EXHAUSTED', async () => {
    process.env.VERTEX_PROJECT_ID = 'test-gcp-project'
    const deletedUrls: string[] = []
    let postAttempts = 0

    // Simulate all 6 cloud voices marked retained so overlay fallback must kick in on 429
    const storedVoices = Array.from({ length: 6 }, (_, i) => ({
      name: `projects/test-gcp-project/locations/global/voices/voice_slot_${i}`,
      createTime: `2026-01-0${i + 1}T00:00:00Z`,
    }))

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      const url = String(input)
      if (method === 'GET' && url.includes('/voices')) {
        return new Response(JSON.stringify({ voices: storedVoices }), { status: 200 })
      }
      if (method === 'DELETE' && url.includes('/voices/')) {
        deletedUrls.push(url)
        return new Response('{}', { status: 200 })
      }
      if (method === 'POST' && url.endsWith('/voices')) {
        postAttempts++
        if (postAttempts === 1) {
          return new Response(
            JSON.stringify({
              error: {
                code: 429,
                message: 'Quota exceeded: maximum active stored voices reached.',
                status: 'RESOURCE_EXHAUSTED',
              },
            }),
            { status: 429 }
          )
        }
        return new Response(
          JSON.stringify({ voice: { id: 'voice_overlaid_new' } }),
          { status: 200 }
        )
      }
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    const retainAll = storedVoices.map((_, i) => `voice_slot_${i}`)
    const created = await createDesignedGeminiVoice({
      description: 'A late 40s male mentor with a warm baritone voice.',
      displayName: 'Curtis Hefflin',
      retainVoiceIds: retainAll,
      replaceVoiceId: 'voice_previous_char',
    })

    expect(created.voiceId).toBe('voice_overlaid_new')
    // Deleted replaceVoiceId upfront + overlaid oldest stored voices on 429
    expect(deletedUrls.some((u) => u.endsWith('/voice_previous_char'))).toBe(true)
    expect(deletedUrls.some((u) => u.endsWith('/voice_slot_0'))).toBe(true)
  })

  it('self-heals an overlaid/deleted voice_ slot during synthesis using designPrompt', async () => {
    process.env.VERTEX_PROJECT_ID = 'test-gcp-project'
    let synthCalls = 0

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      const url = String(input)
      if (url.includes(':generateContent')) {
        synthCalls++
        if (synthCalls === 1) {
          return new Response(
            JSON.stringify({ error: { code: 404, message: 'Voice voice_evicted_old not found' } }),
            { status: 404 }
          )
        }
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { data: Buffer.from('RIFF_WAV_DATA').toString('base64') } }],
                },
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (method === 'GET' && url.includes('/voices')) {
        return new Response(JSON.stringify({ voices: [] }), { status: 200 })
      }
      if (method === 'POST' && url.endsWith('/voices')) {
        return new Response(JSON.stringify({ id: 'voice_recreated_fresh' }), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    const wav = await synthesizeDesignedGeminiVoiceWav({
      text: 'Testing self-healing synthesis.',
      voiceId: 'voice_evicted_old',
      designPrompt: 'A late 40s male speaker with a warm baritone voice.',
      displayName: 'Curtis',
    })

    expect(wav.toString()).toBe('RIFF_WAV_DATA')
    expect(synthCalls).toBe(2)
  })
})
