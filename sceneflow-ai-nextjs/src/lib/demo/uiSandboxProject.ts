/**
 * Self-contained Flagship Sandbox Projects for Zero-GCP / Offline Studio Productivity
 * and Marketing / Landing-Page Feature Screenshots.
 *
 * Works with zero GCP dependencies (no Cloud SQL, no GCS signed URLs, no Vertex AI calls)
 * using static cinema plates in `/images/...`, localized `.mp4` masters in `/videos/...`,
 * narration `.mp3` tracks in `/audio/...`, and inline PCM WAV data URIs.
 */

import {
  DEMO_ANIMATED_SERIES_ID,
  DEMO_SERIES_ID,
} from '@/lib/demo/uiSandboxSeries'
import {
  createAudienceDefinition,
  type AudienceDefinition,
  type PersistedBlueprintAudienceResonance,
} from '@/lib/types/audienceResonance'

export const DEMO_PROJECT_ID = '00000000-0000-4000-8000-000000000001'
export const DEMO_MEMOIR_PROJECT_ID = '00000000-0000-4000-8000-000000000002'
export const DEMO_WHITE_CITY_PROJECT_ID = '00000000-0000-4000-8000-000000000003'
export const DEMO_SILT_LINE_PROJECT_ID = '00000000-0000-4000-8000-000000000004'

export const DEMO_SCREENING_SHARE_TOKEN = 'glass-ledger-screening'
export const SANDBOX_CREDITS = 1_000_000

const ALL_DEMO_PROJECT_IDS = [
  DEMO_PROJECT_ID,
  DEMO_MEMOIR_PROJECT_ID,
  DEMO_WHITE_CITY_PROJECT_ID,
  DEMO_SILT_LINE_PROJECT_ID,
] as const

export function isDemoProjectId(id?: string | null): boolean {
  if (!id) return false
  const normalized = id.trim().toLowerCase()
  return (
    normalized === DEMO_PROJECT_ID ||
    normalized === DEMO_MEMOIR_PROJECT_ID ||
    normalized === DEMO_WHITE_CITY_PROJECT_ID ||
    normalized === DEMO_SILT_LINE_PROJECT_ID ||
    normalized === 'demo' ||
    normalized === 'demo-project' ||
    normalized === 'demo-production-sandbox' ||
    normalized === 'demo-ui-sandbox' ||
    normalized === 'ui-sandbox' ||
    normalized === 'sandbox'
  )
}

export function isDemoShareToken(token?: string | null): boolean {
  if (!token) return false
  const normalized = token.trim().toLowerCase()
  return (
    normalized === DEMO_SCREENING_SHARE_TOKEN ||
    normalized === 'the-glass-ledger-ep1' ||
    normalized === 'demo-screening' ||
    normalized === 'demo'
  )
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Retained helper for programmatic SVG fallback plates when needed by tests/tools.
 */
export function createCinematicSvgDataUri(opts: {
  title: string
  subtitle: string
  badge?: string
  detail?: string
  accentColor?: string
  bgStart?: string
  bgEnd?: string
  aspect?: '16:9' | '3:4'
}): string {
  const width = opts.aspect === '3:4' ? 600 : 1280
  const height = opts.aspect === '3:4' ? 800 : 720
  const accent = opts.accentColor || '#22d3ee'
  const bgStart = opts.bgStart || '#090d16'
  const bgEnd = opts.bgEnd || '#1e293b'
  const badge = opts.badge ? escapeXml(opts.badge) : 'SHOT PRE-VIS'
  const title = escapeXml(opts.title)
  const subtitle = escapeXml(opts.subtitle)
  const detail = opts.detail ? escapeXml(opts.detail) : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgStart}" />
        <stop offset="65%" stop-color="${bgEnd}" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <radialGradient id="glow" cx="68%" cy="38%" r="55%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.28" />
        <stop offset="60%" stop-color="${accent}" stop-opacity="0.06" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" />
    <rect width="${width}" height="${height}" fill="url(#glow)" />
    <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="12" fill="none" stroke="${accent}" stroke-opacity="0.3" stroke-width="1.5" />
    <rect x="48" y="48" width="${Math.min(width - 96, Math.max(150, badge.length * 11 + 32))}" height="34" rx="6" fill="#0f172a" fill-opacity="0.85" stroke="${accent}" stroke-opacity="0.55" stroke-width="1" />
    <text x="64" y="70" fill="${accent}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="1.5">${badge}</text>
    <rect x="24" y="${height - 190}" width="${width - 48}" height="166" rx="10" fill="#020617" fill-opacity="0.76" />
    <text x="52" y="${height - 128}" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="${opts.aspect === '3:4' ? 24 : 28}" font-weight="700">${title}</text>
    <text x="52" y="${height - 90}" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="${opts.aspect === '3:4' ? 15 : 18}" font-weight="500">${subtitle}</text>
    ${
      detail
        ? `<text x="52" y="${height - 54}" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="14">${detail}</text>`
        : ''
    }
  </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/**
 * Generates a valid PCM WAV data URI with a soft warm chord/tone so browser <audio>
 * elements in the Audio tab, Scene Mixer, and Screening Room load real durations offline.
 */
export function createDemoAudioDataUri(durationSeconds = 3.5, freqHz = 220): string {
  const sampleRate = 8000
  const numSamples = Math.max(800, Math.floor(sampleRate * Math.min(durationSeconds, 6)))
  const buffer = new ArrayBuffer(44 + numSamples)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numSamples, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  writeString(36, 'data')
  view.setUint32(40, numSamples, true)

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const envelope = Math.min(1, i / 400) * Math.min(1, (numSamples - i) / 400)
    const sample = 128 + Math.round(Math.sin(2 * Math.PI * freqHz * t) * 10 * envelope)
    view.setUint8(44 + i, sample)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(buffer).toString('base64')
      : btoa(binary)
  return `data:audio/wav;base64,${base64}`
}

const AUDIO_3_5S = createDemoAudioDataUri(3.5, 220)
const AUDIO_4_2S = createDemoAudioDataUri(4.2, 261)
const AUDIO_5_0S = createDemoAudioDataUri(5.0, 196)
const AUDIO_ES_4_0S = createDemoAudioDataUri(4.0, 246)

// Bespoke Photorealistic 35mm Anamorphic Assets for "The Glass Ledger"
const HERO_BILLBOARD_IMG = '/images/sandbox/glass-ledger/hero-billboard.jpg'
const CHAR_ELARA_IMG = '/images/sandbox/glass-ledger/char-elara.jpg'
const CHAR_MARCUS_IMG = '/images/sandbox/glass-ledger/char-marcus.jpg'
const CHAR_ARIS_IMG = '/images/sandbox/glass-ledger/char-aris.jpg'
const LOC_VAULT_IMG = '/images/sandbox/glass-ledger/loc-archive-vault.jpg'
const LOC_DECK_IMG = '/images/sandbox/glass-ledger/loc-observation-deck.jpg'
const PROP_LEDGER_IMG = '/images/sandbox/glass-ledger/prop-glass-ledger.jpg'
const PROP_KEY_IMG = '/images/sandbox/glass-ledger/prop-chrono-key.jpg'

const SCENE_1_STILL_1 = '/images/sandbox/glass-ledger/s1-b1-wide-vault.jpg'
const SCENE_1_STILL_1_ALT_V1 = '/images/sandbox/glass-ledger/s1-b1-alt-v1.jpg'
const SCENE_1_STILL_2 = '/images/sandbox/glass-ledger/s1-b2-twoshot-table.jpg'
const SCENE_1_STILL_3 = '/images/sandbox/glass-ledger/s1-b3-macro-hinge.jpg'
const SCENE_1_STILL_4 = '/images/sandbox/glass-ledger/s1-b4-closeup-elara.jpg'

const SCENE_2_STILL_1 = '/images/sandbox/glass-ledger/s2-b1-deck-ots.jpg'
const SCENE_2_STILL_2 = '/images/sandbox/glass-ledger/s2-b2-deck-twoshot.jpg'
const SCENE_2_STILL_2_ALT_V1 = '/images/sandbox/glass-ledger/s2-b2-alt-v1.jpg'
const SCENE_2_STILL_3 = '/images/sandbox/glass-ledger/s2-b3-key-handoff.jpg'

const SCENE_3_STILL_1 = '/images/sandbox/glass-ledger/s3-b1-corridor-sprint.jpg'
const SCENE_3_STILL_2 = '/images/sandbox/glass-ledger/s3-b2-lift-unlock.jpg'

const LOCALIZED_DRAMA_VIDEOS: Record<string, { label: string; url: string }> = {
  en: { label: 'English', url: '/videos/cinematic-drama-trailer.mp4' },
  es: { label: 'Spanish (Español)', url: '/videos/cinematic-drama-trailer-es.mp4' },
  pt: { label: 'Portuguese (Português)', url: '/videos/cinematic-drama-trailer-pt.mp4' },
  hi: { label: 'Hindi (हिन्दी)', url: '/videos/cinematic-drama-trailer-hi.mp4' },
  zh: { label: 'Chinese (中文)', url: '/videos/cinematic-drama-trailer-zh.mp4' },
  ar: { label: 'Arabic (العربية)', url: '/videos/cinematic-drama-trailer-ar.mp4' },
  th: { label: 'Thai (ไทย)', url: '/videos/cinematic-drama-trailer-th.mp4' },
}

const LOCALIZED_MEMOIR_VIDEOS: Record<string, { label: string; url: string }> = {
  en: { label: 'English', url: '/videos/video-memoir-trailer.mp4' },
  es: { label: 'Spanish (Español)', url: '/videos/video-memoir-trailer-es.mp4' },
  pt: { label: 'Portuguese (Português)', url: '/videos/video-memoir-trailer-pt.mp4' },
  hi: { label: 'Hindi (हिन्दी)', url: '/videos/video-memoir-trailer-hi.mp4' },
  zh: { label: 'Chinese (中文)', url: '/videos/video-memoir-trailer-zh.mp4' },
  ar: { label: 'Arabic (العربية)', url: '/videos/video-memoir-trailer-ar.mp4' },
  th: { label: 'Thai (ไทย)', url: '/videos/video-memoir-trailer-th.mp4' },
}

const LOCALIZED_ANIMATED_VIDEOS: Record<string, { label: string; url: string }> = {
  en: { label: 'English', url: '/videos/animated-series-trailer.mp4' },
  es: { label: 'Spanish (Español)', url: '/videos/animated-series-trailer-es.mp4' },
  pt: { label: 'Portuguese (Português)', url: '/videos/animated-series-trailer-pt.mp4' },
  hi: { label: 'Hindi (हिन्दी)', url: '/videos/animated-series-trailer-hi.mp4' },
  zh: { label: 'Chinese (中文)', url: '/videos/animated-series-trailer-zh.mp4' },
  ar: { label: 'Arabic (العربية)', url: '/videos/animated-series-trailer-ar.mp4' },
  th: { label: 'Thai (ไทย)', url: '/videos/animated-series-trailer-th.mp4' },
}

function buildStillVersions(opts: {
  beatId: string
  v1Url: string
  v2Url?: string
  prompt: string
}) {
  if (!opts.v2Url) {
    const id = `ver_${opts.beatId}_v1`
    return {
      storyboardImageUrl: opts.v1Url,
      storyboardImageVersionId: id,
      storyboardImageVersions: [
        {
          id,
          url: opts.v1Url,
          createdAt: '2026-11-12T16:10:00.000Z',
          selectedAt: '2026-11-12T16:10:00.000Z',
          source: 'generate' as const,
          prompt: opts.prompt,
          tier: 'final' as const,
        },
      ],
    }
  }

  const v1Id = `ver_${opts.beatId}_v1`
  const v2Id = `ver_${opts.beatId}_v2`
  return {
    storyboardImageUrl: opts.v2Url,
    storyboardImageVersionId: v2Id,
    storyboardImageVersions: [
      {
        id: v1Id,
        url: opts.v1Url,
        createdAt: '2026-11-12T15:40:00.000Z',
        source: 'generate' as const,
        prompt: `${opts.prompt} (Alternate framing take 1)`,
        tier: 'draft' as const,
      },
      {
        id: v2Id,
        url: opts.v2Url,
        createdAt: '2026-11-12T16:15:00.000Z',
        selectedAt: '2026-11-12T16:15:00.000Z',
        source: 'generate' as const,
        prompt: opts.prompt,
        tier: 'final' as const,
      },
    ],
  }
}

function buildBlueprintAudienceResonance(opts: {
  overallScore: number
  audienceDescription: string
  summary: string
  strengths: string[]
  recommendations: Array<{
    id: string
    title: string
    text: string
    reason: string
    pointsDeducted: number
    fixSection: 'core' | 'story' | 'tone' | 'beats' | 'characters'
    category: string
  }>
}): {
  audienceDefinition: AudienceDefinition
  blueprintAudienceResonance: PersistedBlueprintAudienceResonance
} {
  const audienceDefinition: AudienceDefinition = createAudienceDefinition({
    description: opts.audienceDescription,
    culturalSignals: {
      languages: ['English', 'Spanish', 'Portuguese', 'Hindi', 'Chinese', 'Arabic', 'Thai'],
      values: ['Craftsmanship', 'Moral Accountability'],
    },
    profile: {
      region: 'global',
      ageRange: 'millennials-25-34',
      gender: 'all-genders',
      educationLevel: 'college-educated',
      community: 'urban-metropolitan',
    },
    source: 'blueprint',
    updatedAt: '2026-11-12T18:00:00.000Z',
  })

  const deductions = opts.recommendations.map((rec) => ({
    reason: rec.reason,
    points: rec.pointsDeducted,
    category: rec.category,
    priority: 'medium' as const,
    recommendationId: rec.id,
  }))

  const analysis = {
    version: 3 as const,
    treatmentId: 'current',
    overallScore: opts.overallScore,
    baseScore: 100 as const,
    deductions,
    recommendations: opts.recommendations.map((rec) => ({
      ...rec,
      priority: 'medium' as const,
      impactSections: [rec.fixSection],
      intentLabel: rec.title,
    })),
    categories: [
      { name: 'Audience Appeal', score: Math.min(98, opts.overallScore + 2), weight: 25 },
      { name: 'Genre & Tone Fit', score: Math.min(97, opts.overallScore + 3), weight: 20 },
      { name: 'Concept Hook', score: Math.min(96, opts.overallScore + 1), weight: 20 },
      { name: 'Character Connection', score: Math.max(85, opts.overallScore - 2), weight: 20 },
      { name: 'Clarity & Structure', score: opts.overallScore, weight: 15 },
    ],
    strengths: opts.strengths,
    improvements: opts.recommendations.map((r) => r.text),
    summary: opts.summary,
    audienceDefinition,
    isReadyForProduction: opts.overallScore >= 80,
    generatedAt: '2026-11-12T18:05:00.000Z',
    creditsUsed: 10,
  }

  return {
    audienceDefinition,
    blueprintAudienceResonance: {
      analysis,
      audienceDefinition,
      appliedRecommendationIds: [],
      iterationCount: 2,
      lastAnalyzedAt: '2026-11-12T18:05:00.000Z',
      lastSavedAt: '2026-11-12T18:05:00.000Z',
    },
  }
}

function buildProjectStreams(videoMap: Record<string, { label: string; url: string }>, shareToken?: string) {
  return Object.entries(videoMap).map(([lang, info]) => ({
    id: `pstream_${lang}_full`,
    language: lang,
    format: 'full-video' as const,
    status: 'ready' as const,
    mp4Url: info.url,
    renderedAt: '2026-11-12T19:00:00.000Z',
    finalCutSnapshot: {
      format: 'video' as const,
      language: lang as any,
      presetId: 'all-video' as const,
    },
    ...(lang === 'en' && shareToken
      ? {
          publish: {
            shareSlug: shareToken,
            shareUrl: `/share/screening-room/${shareToken}`,
            publishedAt: '2026-11-12T19:15:00.000Z',
          },
        }
      : {}),
    ...(lang !== 'en'
      ? {
          localize: {
            mode: 'lipsync' as const,
            speed: 1,
            stemMode: 'keep-background' as const,
            status: 'ready' as const,
            updatedAt: '2026-11-12T19:10:00.000Z',
          },
        }
      : {}),
  }))
}

function buildDemoScenes() {
  const b1Prompt =
    'Wide Shot, low angle, Subterranean Archive Vault at night. Elara Vance leans screen-left over an oak table beside The Glass Ledger; Director Marcus Thorne stands screen-right in the brass aisle shadow holding a silver pocket watch. Warm 2700K banker lamp pool vs cold cyan overhead grate light.'
  const b2Prompt =
    'Medium Two-Shot, eye-level across the oak examination table. Elara Vance screen-left with both palms planted beside The Glass Ledger; Marcus Thorne screen-right extending an open hand. High-contrast neo-noir amber and slate lighting.'
  const b3Prompt =
    'Macro Insert, high angle on the oak table surface. Fractured copper mount of The Glass Ledger reading "PLATE XIV" beside the Brass Chrono-Key engraved "VERITAS IN UMBRA". Hard amber beam refracting through quartz.'
  const b4Prompt =
    'Close-Up on Elara Vance, eye-level, Marcus Thorne’s dark shoulder blurred in right foreground. Elara’s right thumb slips the Brass Chrono-Key into her trench coat pocket as she locks eyes with Marcus.'

  const s2b1Prompt =
    'Over-the-Shoulder Wide Shot inside the Rain-Slicked Observation Deck at night. Dr. Aris Kael screen-right beside a brass telescope; Elara Vance enters screen-left. Neon harbor fog and rain streaks on arched glass.'
  const s2b2Prompt =
    'Medium Two-Shot, eye-level. Elara Vance screen-left holding up the etched quartz plate of The Glass Ledger; Dr. Aris Kael screen-right adjusting his brass loupe with tense shoulders.'
  const s2b3Prompt =
    'Tight Close-Up on Elara Vance and Dr. Aris Kael sealing their pact as rain shadows streak across the glass behind them.'

  const s3b1Prompt =
    'Low-Angle Wide Shot inside the Archive Corridor at night. Elara Vance sprints toward camera clutching The Glass Ledger under her left arm while iron security shutters descend in the background under crimson strobe lights.'
  const s3b2Prompt =
    'Medium Close-Up, slight Dutch angle. Elara Vance turns the Brass Chrono-Key inside the brass service-lift cylinder while looking back down the corridor.'

  return [
    {
      id: 'scene-demo-1',
      sceneId: 'scene-demo-1',
      sceneNumber: 1,
      heading: 'INT. SUBTERRANEAN ARCHIVE VAULT - NIGHT',
      location: 'Subterranean Archive Vault',
      timeOfDay: 'NIGHT',
      duration: 16.5,
      estimatedDuration: 16.5,
      imageUrl: SCENE_1_STILL_1,
      visualDescription:
        'A cavernous subterranean vault lined with towering brass filing tiers. Rainwater beads on dark stone columns while green banker lamps cast pools of warm 2700K amber across an oak examination table.',
      action:
        'Elara Vance leans over the oak table, examining The Glass Ledger under a jeweler’s loupe. She discovers plate #14 has been cleanly snapped from the copper spine. Director Marcus Thorne steps out of the central aisle shadows, his silver pocket watch ticking in his palm.',
      narration:
        'Every empire keeps two histories: the one carved into marble, and the one locked beneath the waterline.',
      narrationAudioUrl: AUDIO_3_5S,
      narrationAudio: {
        en: { url: AUDIO_3_5S, duration: 3.5, startTime: 0 },
        es: { url: AUDIO_ES_4_0S, duration: 4.0, startTime: 0 },
      },
      dialogue: [
        {
          character: 'MARCUS',
          characterId: 'char-marcus',
          line: 'You are three hours past curfew, Elara. Close the vault and hand me the cipher.',
          emotion: 'Controlled authority masking urgency',
        },
        {
          character: 'ELARA',
          characterId: 'char-elara',
          line: 'Plate fourteen didn’t shatter from age, Marcus. Someone cut it out with a rotary key.',
          emotion: 'Defiant precision',
        },
      ],
      dialogueAudio: {
        en: [
          {
            dialogueIndex: 0,
            character: 'MARCUS',
            audioUrl: AUDIO_4_2S,
            duration: 4.2,
            startTime: 4.0,
          },
          {
            dialogueIndex: 1,
            character: 'ELARA',
            audioUrl: AUDIO_4_2S,
            duration: 4.2,
            startTime: 9.0,
          },
        ],
        es: [
          {
            dialogueIndex: 0,
            character: 'MARCUS',
            audioUrl: AUDIO_ES_4_0S,
            duration: 4.8,
            startTime: 4.2,
          },
          {
            dialogueIndex: 1,
            character: 'ELARA',
            audioUrl: AUDIO_ES_4_0S,
            duration: 4.6,
            startTime: 9.5,
          },
        ],
      },
      sfx: [
        {
          description: 'Heavy brass vault relay clicking and quartz plate sliding on oak',
          audioUrl: AUDIO_3_5S,
          startTime: 1.5,
          duration: 3.5,
        },
      ],
      sfxAudio: [AUDIO_3_5S],
      musicAudio: AUDIO_5_0S,
      musicDuration: 16.5,
      musicTitle: 'Subterranean Tension Pulse (Cello & Prepared Piano)',
      characters: ['Elara Vance', 'Marcus Thorne'],
      sceneMovements: [
        {
          id: 'mov_s1_1',
          index: 1,
          title: 'The Discovery in the Vault',
          dramaticFunction: 'Establish the missing quartz plate and Marcus’s intrusion',
          turn: 'Marcus steps from the shadows demanding the cipher before Elara can photograph the fracture',
          emotionalEndState: 'Suspicion crystallizes into an open standoff',
          beatIds: ['bt_s1_1', 'bt_s1_2'],
        },
        {
          id: 'mov_s1_2',
          index: 2,
          title: 'The Accusation & Concealed Key',
          dramaticFunction: 'Elara tests Marcus with the rotary-cut evidence while pocketing the key',
          turn: 'Elara names the rotary key cut and secretly secures the Brass Chrono-Key',
          emotionalEndState: 'Cold defiance',
          beatIds: ['bt_s1_3', 'bt_s1_4'],
        },
      ],
      sceneDirection: {
        sceneDescription:
          'Cavernous subterranean archive vault where warm banker-lamp pools collide with cold overhead rain-grate shafts.',
        mood: 'Noir suspense',
        pacing: 'measured',
        intent: 'Turn a routine forensic audit into a cat-and-mouse confrontation across the examination table.',
        scene: {
          setting: 'INT. SUBTERRANEAN ARCHIVE VAULT - NIGHT',
          location: 'Subterranean Archive Vault',
          timeOfDay: 'NIGHT',
          atmosphere: 'Claustrophobic, damp stone, dust motes suspended in amber lamp beams',
          keyProps: ['The Glass Ledger', 'Brass Chrono-Key'],
          sceneArc:
            'Opens wide on Elara’s solitary discovery, tightens into a 180-degree table axis standoff when Marcus arrives, and lands on an insert/close-up turn as Elara conceals the key.',
        },
        camera: {
          shots: ['Wide Establishing', 'Medium Two-Shot', 'Insert', 'Close-Up'],
          angle: 'Eye-level tightening to low-angle authority and macro insert',
          movement: 'Slow dolly-in opening, locked-off table axis, slow push-in on final turn',
          lensChoice: '35mm & 85mm anamorphic primes',
          focus: 'Deep focus on vault tiers narrowing to shallow DOF on quartz cipher',
          coveragePhilosophy:
            'Preserve strict 180-degree axis across the oak examination table: Elara anchored screen-left, Marcus anchored screen-right.',
        },
        lighting: {
          overallMood: 'High-contrast neo-noir chiaroscuro',
          timeOfDay: 'Night',
          keyLight: 'Warm 2700K banker lamp pool from table center',
          fillLight: 'Soft slate-blue bounce from wet stone columns',
          backlight: '5600K cool cyan shafts through overhead street grates',
          practicals: 'Green glass banker lamps and distant red vault status indicator',
          colorTemperature: 'Warm amber foreground vs. cold cyan background',
        },
        talent: {
          blocking:
            'Elara stands screen-left leaning over the oak table; Marcus enters from deep center-right and halts two paces from the table edge.',
          keyActions: [
            'Elara inspects the snapped copper spine of The Glass Ledger',
            'Marcus checks his silver pocket watch and extends an open palm',
            'Elara slides the Brass Chrono-Key into her coat pocket out of Marcus’s sightline',
          ],
          emotionalBeat: 'Controlled academic calm sharpening into covert defiance',
        },
        audio: {
          priorities: 'Crisp room tone, quartz-on-oak scrape, and rhythmic pocket-watch ticking',
          considerations: 'Keep cello pulse under -18dB during dialogue turns',
        },
        movements: [
          {
            id: 'mov_s1_1',
            index: 1,
            title: 'The Discovery in the Vault',
            dramaticFunction: 'Establish the missing quartz plate and Marcus’s intrusion',
            turn: 'Marcus steps from the shadows demanding the cipher',
            emotionalEndState: 'Suspicion',
          },
          {
            id: 'mov_s1_2',
            index: 2,
            title: 'The Accusation & Concealed Key',
            dramaticFunction: 'Elara confronts Marcus while pocketing the key',
            turn: 'Elara names the rotary cut and secures the Brass Chrono-Key',
            emotionalEndState: 'Cold defiance',
          },
        ],
        beatCoverage: [
          {
            beatIndex: 0,
            shotType: 'Wide Shot',
            cameraAngle: 'Low angle',
            cameraMovement: 'Slow dolly-in',
            coveragePurpose: 'Establish vault geography and Marcus emerging behind Elara',
            lensEnergy: 'push-in',
            spatialRelationship: 'Elara screen-left at oak table; Marcus deep screen-right in aisle shadow',
            blocking: 'Elara bends over the open Glass Ledger; Marcus halts by the brass tier column',
            gaze: 'Elara focused down on the quartz plate; Marcus locked on Elara’s hands',
            emotion: 'Elara: absorbed tension; Marcus: calculating stillness',
            frozenMoment:
              'Elara leans screen-left over the glowing Glass Ledger while Marcus stands screen-right in the aisle shadow holding an open silver watch',
            lightingAccent: 'Warm 2700K banker lamp uplight on Elara’s cheekbones; cyan grate rim on Marcus',
            transition: 'CUT',
          },
          {
            beatIndex: 1,
            shotType: 'Two-Shot',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Static lock-off',
            coveragePurpose: 'Anchor the 180-degree confrontation across the table',
            lensEnergy: 'lock-off',
            spatialRelationship: 'Elara screen-left foreground, Marcus screen-right across the oak table',
            blocking: 'Marcus steps to the right edge of the table; Elara plants both palms beside the ledger',
            gaze: 'Marcus stares directly at Elara; Elara raises her chin toward Marcus',
            emotion: 'Marcus: icy authority; Elara: guarded composure',
            frozenMoment:
              'Marcus stands screen-right extending an open palm across the oak table as Elara braces her hands beside The Glass Ledger screen-left',
            lightingAccent: 'Amber caustic reflections from the quartz plate across both faces',
            transition: 'CUT',
          },
          {
            beatIndex: 2,
            shotType: 'Insert',
            cameraAngle: 'High angle macro',
            cameraMovement: 'Slow focus rack',
            coveragePurpose: 'Pay off the physical clue of the rotary-cut hinge and Brass Chrono-Key',
            lensEnergy: 'lock-off',
            spatialRelationship: 'Macro foreground on fractured copper hinge and Brass Chrono-Key',
            blocking: 'Elara’s gloved fingertips rest beside the jagged copper mount and engraved key',
            gaze: 'Insert shot — no faces in frame',
            emotion: 'Forensic precision',
            frozenMoment:
              'Macro insert of the fractured quartz mount reading "PLATE XIV" beside the Brass Chrono-Key engraved "VERITAS IN UMBRA"',
            lightingAccent: 'Hard amber beam refracting through the bevelled quartz edge',
            transition: 'CUT',
          },
          {
            beatIndex: 3,
            shotType: 'Close-Up',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow push-in',
            coveragePurpose: 'Land the emotional turn as Elara challenges Marcus and conceals the key',
            lensEnergy: 'push-in',
            spatialRelationship: 'Elara centered-left in tight close-up; Marcus’s shoulder blurred right foreground',
            blocking: 'Elara’s right hand slips the Brass Chrono-Key into her trench coat pocket',
            gaze: 'Elara’s eyes locked unwaveringly on Marcus',
            emotion: 'Elara: defiant resolve',
            frozenMoment:
              'Elara holds Marcus’s gaze in tight close-up while her right thumb presses the Brass Chrono-Key into her coat pocket',
            lightingAccent: 'Crisp cyan rim light along Elara’s jawline',
            transition: 'CUT',
          },
        ],
      },
      beats: [
        {
          beatId: 'bt_s1_1',
          sequenceIndex: 0,
          movementId: 'mov_s1_1',
          kind: 'action',
          durationSeconds: 4.0,
          actionDescription:
            'Elara Vance leans screen-left over the oak examination table, inspecting The Glass Ledger as Director Marcus Thorne emerges from the vault aisle shadows screen-right.',
          ...buildStillVersions({
            beatId: 'bt_s1_1',
            v1Url: SCENE_1_STILL_1_ALT_V1,
            v2Url: SCENE_1_STILL_1,
            prompt: b1Prompt,
          }),
          storyboardImagePrompt: b1Prompt,
          videoPrompt:
            'Slow dolly-in wide shot inside the Subterranean Archive Vault. Elara Vance leans screen-left over the glowing Glass Ledger while Marcus Thorne steps out of the deep aisle shadows screen-right. Dust motes drift through warm amber banker-lamp light.',
          beatDirection: {
            shotType: 'Wide Shot',
            cameraAngle: 'Low angle',
            cameraMovement: 'Slow dolly-in',
            blocking: 'Elara bends over the open Glass Ledger screen-left; Marcus halts by the brass tier column screen-right',
            gaze: 'Elara focused down on the quartz plate; Marcus locked on Elara’s hands',
            emotion: 'Elara: absorbed tension; Marcus: calculating stillness',
            frozenMoment:
              'Elara leans screen-left over the glowing Glass Ledger while Marcus stands screen-right in the aisle shadow holding an open silver watch',
            lightingAccent: 'Warm 2700K banker lamp uplight on Elara; cyan grate rim on Marcus',
            transition: 'CUT',
            castInFrame: ['Elara Vance', 'Marcus Thorne'],
            keyProps: ['The Glass Ledger'],
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_s1_2',
          sequenceIndex: 1,
          movementId: 'mov_s1_1',
          kind: 'dialogue',
          character: 'MARCUS',
          characterId: 'char-marcus',
          line: 'You are three hours past curfew, Elara. Close the vault and hand me the cipher.',
          durationSeconds: 4.5,
          ...buildStillVersions({
            beatId: 'bt_s1_2',
            v1Url: SCENE_1_STILL_2,
            prompt: b2Prompt,
          }),
          storyboardImagePrompt: b2Prompt,
          videoPrompt:
            'Locked-off medium two-shot across the oak archive table. Marcus Thorne screen-right speaks with quiet authority while extending his hand toward Elara Vance screen-left, who braces her palms beside The Glass Ledger.',
          beatDirection: {
            shotType: 'Two-Shot',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Static lock-off',
            blocking: 'Marcus steps to the right edge of the table; Elara plants both palms beside the ledger',
            gaze: 'Marcus stares directly at Elara; Elara raises her chin toward Marcus',
            emotion: 'Marcus: icy authority; Elara: guarded composure',
            frozenMoment:
              'Marcus stands screen-right extending an open palm across the oak table as Elara braces her hands beside The Glass Ledger screen-left',
            lightingAccent: 'Amber caustic reflections from the quartz plate across both faces',
            transition: 'CUT',
            castInFrame: ['Elara Vance', 'Marcus Thorne'],
            keyProps: ['The Glass Ledger'],
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_s1_3',
          sequenceIndex: 2,
          movementId: 'mov_s1_2',
          kind: 'action',
          durationSeconds: 3.5,
          actionDescription:
            'Macro insert of The Glass Ledger’s fractured copper hinge marked "PLATE XIV" resting beside the Brass Chrono-Key engraved "VERITAS IN UMBRA".',
          ...buildStillVersions({
            beatId: 'bt_s1_3',
            v1Url: SCENE_1_STILL_3,
            prompt: b3Prompt,
          }),
          storyboardImagePrompt: b3Prompt,
          videoPrompt:
            'High-angle macro insert with a slow focus rack from the sheared copper hinge of The Glass Ledger ("PLATE XIV") to the rotating vernier teeth of the Brass Chrono-Key ("VERITAS IN UMBRA").',
          beatDirection: {
            shotType: 'Insert',
            cameraAngle: 'High angle macro',
            cameraMovement: 'Slow focus rack',
            blocking: 'Settled macro arrangement of the fractured copper mount and Brass Chrono-Key on dark oak',
            propInteraction: 'The Brass Chrono-Key rests parallel to the sheared copper spine of The Glass Ledger',
            frozenMoment:
              'Macro insert of the fractured quartz mount reading "PLATE XIV" beside the Brass Chrono-Key engraved "VERITAS IN UMBRA"',
            lightingAccent: 'Hard amber beam refracting through the bevelled quartz edge',
            transition: 'CUT',
            castInFrame: [],
            keyProps: ['The Glass Ledger', 'Brass Chrono-Key'],
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_s1_4',
          sequenceIndex: 3,
          movementId: 'mov_s1_2',
          kind: 'dialogue',
          character: 'ELARA',
          characterId: 'char-elara',
          line: 'Plate fourteen didn’t shatter from age, Marcus. Someone cut it out with a rotary key.',
          durationSeconds: 4.5,
          ...buildStillVersions({
            beatId: 'bt_s1_4',
            v1Url: SCENE_1_STILL_4,
            prompt: b4Prompt,
          }),
          storyboardImagePrompt: b4Prompt,
          videoPrompt:
            'Slow push-in close-up on Elara Vance speaking with defiant precision while her hand discreetly slides the Brass Chrono-Key into her coat pocket.',
          beatDirection: {
            shotType: 'Close-Up',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow push-in',
            blocking: 'Elara’s right hand slips the Brass Chrono-Key into her trench coat pocket',
            gaze: 'Elara’s eyes locked unwaveringly on Marcus',
            emotion: 'Elara: defiant resolve',
            propInteraction: 'Right hand conceals the Brass Chrono-Key inside trench coat pocket',
            frozenMoment:
              'Elara holds Marcus’s gaze in tight close-up while her right thumb presses the Brass Chrono-Key into her coat pocket',
            lightingAccent: 'Crisp cyan rim light along Elara’s jawline',
            transition: 'CUT',
            castInFrame: ['Elara Vance'],
            keyProps: ['Brass Chrono-Key'],
            generatedBy: 'llm',
          },
        },
      ],
      audienceAnalysis: {
        score: 92,
        pacing: 'moderate',
        tension: 'high',
        characterDevelopment: 'strong',
        visualPotential: 'high',
        notes:
          'Strong cat-and-mouse opening with clear visual storytelling through the fractured quartz plate and concealed key.',
        recommendations: [
          'Let the vault relay click land half a beat before Elara’s final line to heighten the threat of lockdown.',
        ],
      },
      polishAnalysis: {
        issueCount: 1,
        beatFingerprint: 'demo-fp-s1',
        notes: 'Strong neo-noir dialogue rhythm and clear visual staging across the oak examination table.',
        analyzedAt: '2026-11-12T18:00:00.000Z',
        recommendations: [
          {
            id: 'polish-demo-s1-1',
            text: 'In beats 2 and 4, tighten Marcus’s opening line cadence to contrast with the ticking pocket watch.',
            priority: 'medium',
            category: 'action_order',
            beatIndices: [2, 4],
            beatIds: ['bt_s1_2', 'bt_s1_4'],
            reason: 'Sharpens the rhythmic interplay between the pocket watch SFX and Marcus’s entrance.',
          },
        ],
      },
    },
    {
      id: 'scene-demo-2',
      sceneId: 'scene-demo-2',
      sceneNumber: 2,
      heading: 'INT. OBSERVATION DECK - CONTINUOUS',
      location: 'Rain-Slicked Observation Deck',
      timeOfDay: 'NIGHT',
      duration: 13.0,
      estimatedDuration: 13.0,
      imageUrl: SCENE_2_STILL_1,
      visualDescription:
        'Floor-to-ceiling arched windows overlook a fog-shrouded harbor lit by cyan neon beacons. Rain sheets down the glass, casting rippling water shadows across the terrazzo floor.',
      action:
        'Dr. Aris Kael stands by a brass transit telescope, wiping condensation from its lens. Elara emerges from the spiral stairwell and holds up the fractured quartz shard between them.',
      narration:
        'Only three craftsmen in the city could cut quartz without fracturing the cipher lattice—and Aris had built the blade.',
      narrationAudioUrl: AUDIO_3_5S,
      narrationAudio: {
        en: { url: AUDIO_3_5S, duration: 3.5, startTime: 0 },
        es: { url: AUDIO_ES_4_0S, duration: 4.0, startTime: 0 },
      },
      dialogue: [
        {
          character: 'ARIS',
          characterId: 'char-aris',
          line: 'Thorne told me the plate was being transferred to the High Vault. I didn’t know he meant to erase it.',
          emotion: 'Guilt-stricken urgency',
        },
        {
          character: 'ELARA',
          characterId: 'char-elara',
          line: 'Then help me read the twin impression before the midnight purge wipes the index.',
          emotion: 'Fierce determination',
        },
      ],
      dialogueAudio: {
        en: [
          {
            dialogueIndex: 0,
            character: 'ARIS',
            audioUrl: AUDIO_4_2S,
            duration: 4.2,
            startTime: 4.0,
          },
          {
            dialogueIndex: 1,
            character: 'ELARA',
            audioUrl: AUDIO_4_2S,
            duration: 4.2,
            startTime: 8.5,
          },
        ],
        es: [
          {
            dialogueIndex: 0,
            character: 'ARIS',
            audioUrl: AUDIO_ES_4_0S,
            duration: 4.4,
            startTime: 4.0,
          },
          {
            dialogueIndex: 1,
            character: 'ELARA',
            audioUrl: AUDIO_ES_4_0S,
            duration: 4.4,
            startTime: 8.6,
          },
        ],
      },
      sfx: [
        {
          description: 'Rain lashing against arched glass and distant harbor foghorn',
          audioUrl: AUDIO_3_5S,
          startTime: 0,
          duration: 3.5,
        },
      ],
      sfxAudio: [AUDIO_3_5S],
      musicAudio: AUDIO_5_0S,
      musicDuration: 13.0,
      musicTitle: 'Rain on the Glass (Ambient Synth & Solo Viola)',
      characters: ['Elara Vance', 'Dr. Aris Kael'],
      sceneDirection: {
        sceneDescription:
          'Arched glass observation deck where rippling rain shadows and harbor neon frame a fragile alliance.',
        mood: 'Urgent conspiracy',
        pacing: 'fast',
        intent: 'Flip Aris from fearful accomplice to active ally before the midnight purge.',
        scene: {
          setting: 'INT. OBSERVATION DECK - CONTINUOUS',
          location: 'Rain-Slicked Observation Deck',
          timeOfDay: 'NIGHT',
          atmosphere: 'Rippling rain caustics, distant foghorns, cold harbor mist',
          keyProps: ['The Glass Ledger', 'Brass Chrono-Key'],
          sceneArc: 'Starts wide in silhouette against the rain-streaked glass and closes into an urgent pact.',
        },
        camera: {
          shots: ['Over-the-Shoulder', 'Medium Two-Shot', 'Close-Up'],
          angle: 'Eye-level',
          movement: 'Slow lateral track into tight handheld intimacy',
          coveragePhilosophy: 'Use the rain-streaked glass as a kinetic background behind Aris while keeping Elara anchored screen-left.',
        },
        lighting: {
          overallMood: 'Cool cyan harbor neon contrasted with warm brass instrument practicals',
          timeOfDay: 'Night',
          colorTemperature: '5600K cyan rain shadows with 3200K warm key',
        },
        talent: {
          blocking: 'Aris stands screen-right beside the brass telescope; Elara closes the distance from screen-left.',
          emotionalBeat: 'Shared urgency and moral reckoning',
        },
        audio: {
          priorities: 'Rain texture on glass and hushed, urgent vocal delivery',
        },
        movements: [
          {
            id: 'mov_s2_1',
            index: 1,
            title: 'The Confrontation at the Glass',
            dramaticFunction: 'Elara confronts Aris with the rotary-cut quartz shard',
            turn: 'Aris confesses Thorne ordered the transfer',
            emotionalEndState: 'Remorseful urgency',
          },
          {
            id: 'mov_s2_2',
            index: 2,
            title: 'The Midnight Pact',
            dramaticFunction: 'Elara recruits Aris to decode the twin impression before the purge',
            turn: 'Aris accepts the Brass Chrono-Key',
            emotionalEndState: 'Shared resolve',
          },
        ],
        beatCoverage: [
          {
            beatIndex: 0,
            shotType: 'Over-the-Shoulder',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow lateral track',
            coveragePurpose: 'Establish the rain-streaked observation deck and Aris’s isolation',
            lensEnergy: 'push-in',
            spatialRelationship: 'Aris screen-right by brass telescope; Elara entering screen-left',
            blocking: 'Aris pauses at the telescope as Elara steps forward',
            gaze: 'Aris glances back over his shoulder toward Elara',
            emotion: 'Startled apprehension',
            frozenMoment:
              'Aris pauses with his hand on the brass telescope screen-right as Elara halts screen-left framed by rain-streaked arched windows',
            lightingAccent: 'Rippling cyan rain shadows across wet terrazzo',
            transition: 'CUT',
          },
          {
            beatIndex: 1,
            shotType: 'Two-Shot',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Subtle handheld',
            coveragePurpose: 'Frame the confession across The Glass Ledger',
            lensEnergy: 'lock-off',
            spatialRelationship: 'Elara screen-left holding the quartz plate; Aris screen-right',
            blocking: 'Elara raises The Glass Ledger between them as Aris leans in',
            gaze: 'Mutual eyeline across the etched quartz plate',
            emotion: 'Remorseful urgency',
            frozenMoment:
              'Elara holds the glowing Glass Ledger between them screen-left while Aris grips his brass loupe screen-right',
            lightingAccent: 'Warm tungsten instrument glow between their faces',
            transition: 'CUT',
          },
          {
            beatIndex: 2,
            shotType: 'Close-Up',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow push-in',
            coveragePurpose: 'Seal the alliance with the Brass Chrono-Key handoff',
            lensEnergy: 'push-in',
            spatialRelationship: 'Tight close-up on the key handoff and locked eyelines',
            blocking: 'Elara presses the Brass Chrono-Key into Aris’s open palm',
            gaze: 'Direct eyeline lock between Elara and Aris',
            emotion: 'Shared determination',
            frozenMoment:
              'Elara presses the Brass Chrono-Key into Aris’s open palm as rain caustics streak across their faces',
            lightingAccent: 'Cyan harbor reflection rim light',
            transition: 'CUT',
          },
        ],
      },
      beats: [
        {
          beatId: 'bt_s2_1',
          sequenceIndex: 0,
          kind: 'action',
          durationSeconds: 4.0,
          actionDescription:
            'Over-the-shoulder wide shot past Dr. Aris Kael at the brass telescope as Elara Vance steps onto the rain-slicked observation deck.',
          ...buildStillVersions({
            beatId: 'bt_s2_1',
            v1Url: SCENE_2_STILL_1,
            prompt: s2b1Prompt,
          }),
          storyboardImagePrompt: s2b1Prompt,
          videoPrompt:
            'Slow lateral tracking wide shot across the Rain-Slicked Observation Deck as Elara Vance approaches Dr. Aris Kael beside the brass telescope.',
          beatDirection: {
            shotType: 'Over-the-Shoulder',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow lateral track',
            blocking: 'Aris stands screen-right by the telescope; Elara steps forward screen-left',
            gaze: 'Aris turns his head over his shoulder toward Elara',
            emotion: 'Aris: startled apprehension; Elara: focused resolve',
            frozenMoment:
              'Aris pauses with his hand on the brass telescope screen-right as Elara halts screen-left framed by rain-streaked arched windows',
            lightingAccent: 'Rippling cyan rain shadows across wet terrazzo',
            transition: 'CUT',
            castInFrame: ['Elara Vance', 'Dr. Aris Kael'],
            keyProps: [],
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_s2_2',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'ARIS',
          characterId: 'char-aris',
          line: 'Thorne told me the plate was being transferred to the High Vault. I didn’t know he meant to erase it.',
          durationSeconds: 4.5,
          ...buildStillVersions({
            beatId: 'bt_s2_2',
            v1Url: SCENE_2_STILL_2_ALT_V1,
            v2Url: SCENE_2_STILL_2,
            prompt: s2b2Prompt,
          }),
          storyboardImagePrompt: s2b2Prompt,
          videoPrompt:
            'Subtle handheld medium two-shot as Elara Vance raises The Glass Ledger between them and Dr. Aris Kael confesses what Thorne ordered.',
          beatDirection: {
            shotType: 'Two-Shot',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Subtle handheld',
            blocking: 'Elara holds the quartz plate at chest height screen-left; Aris leans in screen-right',
            gaze: 'Both look from the fractured quartz edge into each other’s eyes',
            emotion: 'Aris: remorseful urgency; Elara: searching intensity',
            frozenMoment:
              'Elara holds the glowing Glass Ledger between them screen-left while Aris grips his brass loupe screen-right',
            lightingAccent: 'Warm tungsten instrument glow between their faces',
            transition: 'CUT',
            castInFrame: ['Elara Vance', 'Dr. Aris Kael'],
            keyProps: ['The Glass Ledger'],
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_s2_3',
          sequenceIndex: 2,
          kind: 'dialogue',
          character: 'ELARA',
          characterId: 'char-elara',
          line: 'Then help me read the twin impression before the midnight purge wipes the index.',
          durationSeconds: 4.5,
          ...buildStillVersions({
            beatId: 'bt_s2_3',
            v1Url: SCENE_2_STILL_3,
            prompt: s2b3Prompt,
          }),
          storyboardImagePrompt: s2b3Prompt,
          videoPrompt:
            'Slow push-in close-up as Elara Vance places the Brass Chrono-Key into Dr. Aris Kael’s palm under cyan rain light.',
          beatDirection: {
            shotType: 'Close-Up',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow push-in',
            blocking: 'Elara presses the Brass Chrono-Key into Aris’s open palm',
            gaze: 'Direct eyeline lock between Elara and Aris',
            emotion: 'Shared determination',
            frozenMoment:
              'Elara presses the Brass Chrono-Key into Aris’s open palm as rain caustics streak across their faces',
            lightingAccent: 'Cyan harbor reflection rim light',
            transition: 'CUT',
            castInFrame: ['Elara Vance', 'Dr. Aris Kael'],
            keyProps: ['Brass Chrono-Key'],
            generatedBy: 'director',
          },
        },
      ],
      audienceAnalysis: {
        score: 90,
        pacing: 'fast',
        tension: 'high',
        characterDevelopment: 'strong',
        visualPotential: 'high',
        notes: 'Rain-streaked observation deck provides strong visual contrast to the subterranean vault.',
        recommendations: [],
      },
    },
    {
      id: 'scene-demo-3',
      sceneId: 'scene-demo-3',
      sceneNumber: 3,
      heading: 'INT. ARCHIVE CORRIDOR - NIGHT',
      location: 'Subterranean Archive Vault',
      timeOfDay: 'NIGHT',
      duration: 10.0,
      estimatedDuration: 10.0,
      imageUrl: SCENE_3_STILL_1,
      visualDescription:
        'A long vaulted stone corridor lined with iron security shutters descending in sequence as crimson strobe beacons flash.',
      action:
        'Elara races down the corridor clutching The Glass Ledger while iron shutters clang shut behind her. She reaches the service lift and inserts the Brass Chrono-Key into the rotary cylinder.',
      narration:
        'When the archive seals, nothing leaves—unless you hold the key that wound the clock.',
      narrationAudioUrl: AUDIO_3_5S,
      narrationAudio: {
        en: { url: AUDIO_3_5S, duration: 3.5, startTime: 0 },
        es: { url: AUDIO_ES_4_0S, duration: 4.0, startTime: 0 },
      },
      dialogue: [
        {
          character: 'ELARA',
          characterId: 'char-elara',
          line: 'Come on, Aris—third notch counterclockwise.',
          emotion: 'Breathless focus',
        },
      ],
      dialogueAudio: {
        en: [
          {
            dialogueIndex: 0,
            character: 'ELARA',
            audioUrl: AUDIO_4_2S,
            duration: 4.2,
            startTime: 4.2,
          },
        ],
        es: [
          {
            dialogueIndex: 0,
            character: 'ELARA',
            audioUrl: AUDIO_ES_4_0S,
            duration: 4.4,
            startTime: 4.2,
          },
        ],
      },
      sfx: [
        {
          description: 'Iron security shutters slamming and rotary brass lock engaging',
          audioUrl: AUDIO_3_5S,
          startTime: 0.5,
          duration: 3.5,
        },
      ],
      sfxAudio: [AUDIO_3_5S],
      musicAudio: AUDIO_5_0S,
      musicDuration: 10.0,
      musicTitle: 'Lockdown Pursuit (Percussive Brass & Ostinato Strings)',
      characters: ['Elara Vance'],
      sceneDirection: {
        sceneDescription: 'Kinetic corridor escape under crimson lockdown strobes.',
        mood: 'High-stakes thriller',
        pacing: 'fast',
        intent: 'Drive climax momentum as Elara unlocks the service lift seconds before lockdown.',
        scene: {
          setting: 'INT. ARCHIVE CORRIDOR - NIGHT',
          location: 'Subterranean Archive Vault',
          timeOfDay: 'NIGHT',
          atmosphere: 'Flashing crimson beacons, rising steam, echoing iron shutters',
          keyProps: ['The Glass Ledger', 'Brass Chrono-Key'],
          sceneArc: 'Dynamic wide pursuit resolving in a tactile mechanical unlock.',
        },
        camera: {
          shots: ['Wide Tracking Shot', 'Medium Close-Up'],
          angle: 'Low angle',
          movement: 'Fast Steadicam push-in to whip-pan insert',
          coveragePhilosophy: 'Keep shutters closing in background depth while foreground focuses on the rotary lock.',
        },
        lighting: {
          overallMood: 'Crimson emergency strobes cutting through dark slate shadows',
          timeOfDay: 'Night',
          colorTemperature: 'Crimson 2200K strobe vs 5600K steel shadows',
        },
        talent: {
          blocking: 'Elara sprints center-frame toward camera, then pivots screen-left into the lift alcove.',
          emotionalBeat: 'Adrenaline-fueled precision',
        },
        movements: [
          {
            id: 'mov_s3_1',
            index: 1,
            title: 'The Corridor Lockdown',
            dramaticFunction: 'Elara races the descending iron shutters to reach the lift',
            turn: 'The final corridor shutter slams behind her heels',
            emotionalEndState: 'Breathless urgency',
          },
          {
            id: 'mov_s3_2',
            index: 2,
            title: 'The Rotary Unlock',
            dramaticFunction: 'Elara uses the Brass Chrono-Key to open the service lift',
            turn: 'The third counterclockwise notch releases the lift doors',
            emotionalEndState: 'Fierce relief',
          },
        ],
        beatCoverage: [
          {
            beatIndex: 0,
            shotType: 'Wide Shot',
            cameraAngle: 'Low angle',
            cameraMovement: 'Fast Steadicam pull-back',
            coveragePurpose: 'Capture the scale of the descending iron shutters behind Elara',
            lensEnergy: 'pull-back',
            spatialRelationship: 'Elara center-left sprinting toward lens; shutters dropping in depth',
            blocking: 'Elara sprints with The Glass Ledger tucked against her ribs',
            gaze: 'Fixed ahead on the lift doors',
            emotion: 'Breathless urgency',
            frozenMoment:
              'Elara lunges forward center-left clutching The Glass Ledger as an iron shutter drops into the stone floor behind her',
            lightingAccent: 'Crimson emergency strobe rim light',
            transition: 'CONTINUE',
          },
          {
            beatIndex: 1,
            shotType: 'Medium Close-Up',
            cameraAngle: 'Dutch angle',
            cameraMovement: 'Push-in',
            coveragePurpose: 'Pay off the Brass Chrono-Key unlocking the service lift cylinder',
            lensEnergy: 'push-in',
            spatialRelationship: 'Elara screen-left at rotary lock; corridor strobe in right background',
            blocking: 'Elara turns the Brass Chrono-Key three notches counterclockwise',
            gaze: 'Glancing sharply back down the corridor',
            emotion: 'Fierce concentration',
            frozenMoment:
              'Elara twists the Brass Chrono-Key in the brass lift lock screen-left while glancing back toward the descending shutter screen-right',
            lightingAccent: 'Warm brass reflection on her fingers against crimson strobe',
            transition: 'CUT',
          },
        ],
      },
      beats: [
        {
          beatId: 'bt_s3_1',
          sequenceIndex: 0,
          kind: 'action',
          durationSeconds: 5.0,
          actionDescription:
            'Low-angle tracking wide shot as Elara Vance sprints down the vaulted corridor clutching The Glass Ledger while iron shutters descend behind her.',
          ...buildStillVersions({
            beatId: 'bt_s3_1',
            v1Url: SCENE_3_STILL_1,
            prompt: s3b1Prompt,
          }),
          storyboardImagePrompt: s3b1Prompt,
          videoPrompt:
            'Fast Steadicam low-angle tracking shot pulling backward ahead of Elara Vance as she sprints down the vaulted corridor under flashing crimson strobes.',
          beatDirection: {
            shotType: 'Wide Shot',
            cameraAngle: 'Low angle',
            cameraMovement: 'Fast Steadicam pull-back',
            blocking: 'Elara drives forward center-left with The Glass Ledger tucked against her ribs',
            gaze: 'Elara’s eyes fixed on the service lift doors ahead',
            emotion: 'Elara: breathless urgency',
            frozenMoment:
              'Elara lunges forward center-left clutching The Glass Ledger as an iron shutter drops into the stone floor behind her',
            lightingAccent: 'Crimson emergency strobe rim light across her trench coat',
            transition: 'CONTINUE',
            castInFrame: ['Elara Vance'],
            keyProps: ['The Glass Ledger'],
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_s3_2',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'ELARA',
          characterId: 'char-elara',
          line: 'Come on, Aris—third notch counterclockwise.',
          durationSeconds: 5.0,
          ...buildStillVersions({
            beatId: 'bt_s3_2',
            v1Url: SCENE_3_STILL_2,
            prompt: s3b2Prompt,
          }),
          storyboardImagePrompt: s3b2Prompt,
          videoPrompt:
            'Medium close-up with a tight push-in on Elara Vance’s hands twisting the Brass Chrono-Key three notches counterclockwise as the lift doors part.',
          beatDirection: {
            shotType: 'Medium Close-Up',
            cameraAngle: 'Dutch angle',
            cameraMovement: 'Push-in',
            blocking: 'Elara braces her left shoulder against the lift frame while turning the Brass Chrono-Key with her right hand',
            gaze: 'Elara glances sharply screen-right down the corridor',
            emotion: 'Elara: fierce concentration',
            propInteraction: 'Right hand twists the Brass Chrono-Key in the brass rotary lock',
            frozenMoment:
              'Elara twists the Brass Chrono-Key in the brass lift lock screen-left while glancing back toward the descending shutter screen-right',
            lightingAccent: 'Warm brass reflection on her fingers against crimson corridor strobe',
            transition: 'CUT',
            castInFrame: ['Elara Vance'],
            keyProps: ['Brass Chrono-Key', 'The Glass Ledger'],
            generatedBy: 'director',
          },
        },
      ],
      audienceAnalysis: {
        score: 94,
        pacing: 'fast',
        tension: 'high',
        characterDevelopment: 'strong',
        visualPotential: 'high',
        notes: 'High-energy climax sequence with clear mechanical stakes.',
        recommendations: [],
      },
    },
  ]
}

function buildDemoProductionScenes(
  scenes: Array<{
    id: string
    duration: number
    imageUrl: string
    beats: Array<{
      beatId: string
      durationSeconds?: number
      storyboardImageUrl: string
      storyboardImagePrompt: string
      videoPrompt: string
      beatDirection?: Record<string, any>
    }>
  }>,
  videoMap: Record<string, { label: string; url: string }>
) {
  const productionScenes: Record<string, any> = {}
  const primaryMp4 = videoMap.en?.url || '/videos/cinematic-drama-trailer.mp4'
  const altTakeMp4 = '/demo/hero-demo.mp4'

  for (const scene of scenes) {
    let cursor = 0
    const segments = scene.beats.map((beat, idx) => {
      const duration = beat.durationSeconds || 4.0
      const startTime = cursor
      const endTime = Number((cursor + duration).toFixed(2))
      cursor = endTime
      const segId = `seg_${scene.id}_${beat.beatId}`
      const takeV1Id = `take_${segId}_v1`
      const takeV2Id = `take_${segId}_v2`

      return {
        segmentId: segId,
        beatId: beat.beatId,
        sequenceIndex: idx,
        startTime,
        endTime,
        status: 'COMPLETE',
        assetType: 'video',
        activeAssetUrl: primaryMp4,
        startFrameUrl: beat.storyboardImageUrl,
        endFrameUrl: beat.storyboardImageUrl,
        startFramePrompt: beat.storyboardImagePrompt,
        generatedPrompt: beat.videoPrompt,
        userEditedPrompt: '',
        generationMethod: 'FTV',
        shotType: beat.beatDirection?.shotType,
        cameraMovement: beat.beatDirection?.cameraMovement,
        transitionType: beat.beatDirection?.transition || 'CUT',
        references: {
          sceneImageUrl: scene.imageUrl,
          thumbnailUrl: beat.storyboardImageUrl,
          startFrameUrl: beat.storyboardImageUrl,
          endFrameUrl: beat.storyboardImageUrl,
          characterIds: [],
          sceneRefIds: [],
          objectRefIds: [],
        },
        takes: [
          {
            id: takeV1Id,
            createdAt: '2026-11-12T17:10:00.000Z',
            assetUrl: altTakeMp4,
            videoUrl: altTakeMp4,
            thumbnailUrl: beat.storyboardImageUrl,
            status: 'COMPLETE',
            durationSec: duration,
            notes: 'Draft camera blocking pass (v1)',
          },
          {
            id: takeV2Id,
            createdAt: '2026-11-12T17:45:00.000Z',
            assetUrl: primaryMp4,
            videoUrl: primaryMp4,
            thumbnailUrl: beat.storyboardImageUrl,
            status: 'COMPLETE',
            durationSec: duration,
            notes: 'Anamorphic Final Keyframe Master (v2)',
          },
        ],
        currentTakeId: takeV2Id,
        languageVersions: {
          es: {
            language: 'es',
            videoUrl: videoMap.es?.url || primaryMp4,
            status: 'COMPLETE',
            mode: 'lipsync',
            updatedAt: '2026-11-12T18:30:00.000Z',
          },
          pt: {
            language: 'pt',
            videoUrl: videoMap.pt?.url || primaryMp4,
            status: 'COMPLETE',
            mode: 'dub',
            updatedAt: '2026-11-12T18:35:00.000Z',
          },
        },
      }
    })

    const videoStreams = Object.entries(videoMap).map(([lang, info]) => ({
      id: `stream_${scene.id}_${lang}_video_v1`,
      language: lang,
      languageLabel: info.label,
      streamType: 'video',
      status: 'complete',
      mp4Url: info.url,
      durationSeconds: scene.duration,
      createdAt: '2026-11-12T18:50:00.000Z',
      completedAt: '2026-11-12T18:52:00.000Z',
      streamVersion: 1,
    }))

    const animaticStreams = [
      {
        id: `stream_${scene.id}_en_animatic_v1`,
        language: 'en',
        languageLabel: 'English',
        streamType: 'animatic',
        status: 'complete',
        mp4Url: videoMap.en?.url || primaryMp4,
        durationSeconds: scene.duration,
        createdAt: '2026-11-12T18:10:00.000Z',
        completedAt: '2026-11-12T18:11:00.000Z',
        streamVersion: 1,
      },
      {
        id: `stream_${scene.id}_es_animatic_v1`,
        language: 'es',
        languageLabel: 'Spanish (Español)',
        streamType: 'animatic',
        status: 'complete',
        mp4Url: videoMap.es?.url || primaryMp4,
        durationSeconds: scene.duration + 0.8,
        createdAt: '2026-11-12T18:12:00.000Z',
        completedAt: '2026-11-12T18:13:00.000Z',
        streamVersion: 1,
      },
    ]

    productionScenes[scene.id] = {
      sceneId: scene.id,
      isSegmented: true,
      targetSegmentDuration: 4,
      lastGeneratedAt: '2026-11-12T18:52:00.000Z',
      segments,
      productionStreams: [...videoStreams, ...animaticStreams],
    }
  }

  return productionScenes
}

function buildGlassLedgerProject() {
  const scenes = buildDemoScenes().map((scene) => ({
    ...scene,
    beats: scene.beats.map((beat) => ({
      ...beat,
      endFrameImageUrl: beat.storyboardImageUrl,
    })),
  }))
  const productionScenes = buildDemoProductionScenes(scenes, LOCALIZED_DRAMA_VIDEOS)

  const treatmentVariant = {
    id: 'variant-glass-ledger-1',
    label: 'Neo-Noir Archival Thriller',
    title: 'The Glass Ledger — Ep. 1: Beneath the Waterline',
    logline:
      'When a forensic archivist discovers a missing quartz plate in the city’s subterranean debt codex, she must team up with the guilt-ridden clockmaker who cut it before her own mentor seals the vault at midnight.',
    synopsis:
      'In a rain-drenched maritime capital where property deeds, harbor water rights, and sovereign debt are etched onto indestructible quartz plates, Lead Forensic Archivist Elara Vance uncovers a surgical excision in Ledger XIV. Her mentor, Chief Curator Marcus Thorne, orders the vault sealed past curfew. Concealing the Brass Chrono-Key left beside the sheared hinge, Elara confronts optical restorer Dr. Aris Kael on the harbor observation deck—discovering Thorne has armed a midnight archival purge that will erase three waterfront districts from civic law forever.',
    genre: 'Thriller / Mystery',
    tone: 'High-contrast neo-noir suspense with tactile mechanical craft',
    visual_style:
      '35mm anamorphic chiaroscuro lighting: warm 2700K banker-lamp pools colliding with cold 5600K rain-streaked harbor cyan.',
    setting: 'Subterranean Archive Vault & Rain-Slicked Harbor Observation Deck',
    themes: ['Institutional memory vs. convenience', 'Loyalty vs. truth', 'Tactile forensic craft'],
    total_duration_seconds: 480,
    estimatedDurationMinutes: 8,
    heroImage: {
      id: 'hero-glass-ledger',
      url: HERO_BILLBOARD_IMG,
      status: 'ready',
      prompt: 'Anamorphic wide shot of Elara Vance in the Subterranean Archive Vault illuminated by golden quartz caustics.',
    },
    character_descriptions: [
      {
        name: 'Elara Vance',
        role: 'protagonist',
        description:
          'Lead Forensic Archivist (34). External Want: Expose the Plate XIV excision. Internal Need: Outgrow institutional deference to her mentor Marcus Thorne.',
        appearance:
          'Mixed East Asian and European heritage, sleek chin-length dark espresso bob, slate-gray wool trench coat over charcoal mock-neck, brass optical loupe on cord.',
      },
      {
        name: 'Marcus Thorne',
        role: 'antagonist',
        description:
          'Chief Curator of the Municipal Archive (58). Believes selective historical erasure is the price of civic order.',
        appearance:
          'Silver temples, neatly trimmed salt-and-pepper beard, charcoal bespoke three-piece suit, burgundy silk tie, antique silver pocket watch.',
      },
      {
        name: 'Dr. Aris Kael',
        role: 'supporting',
        description:
          'Master horological restorer (42) who built the rotary quartz blade under false pretenses and risks everything to help Elara decode the twin impression.',
        appearance:
          'South Asian, round wire-rimmed spectacles, tousled wavy dark hair, rolled-sleeve ivory linen shirt under dark tweed waistcoat.',
      },
    ],
    beats: [
      {
        title: '1. The Excised Quartz Plate',
        intent: 'Inciting Discovery',
        eraOrAge: 'Night • 02:40 AM (Curfew)',
        characters: ['Elara Vance', 'Marcus Thorne'],
        minutes: 2.5,
        synopsis:
          'Elara discovers Plate XIV has been cleanly sheared from The Glass Ledger with a horological rotary blade; THEREFORE she refuses to sign off on the audit, BUT Chief Curator Marcus Thorne emerges from the vault shadows.',
      },
      {
        title: '2. Standoff Across the Ledger',
        intent: 'Rising Tension',
        intent_emotion: 'Defiant suspense',
        eraOrAge: 'Night • 02:45 AM',
        characters: ['Elara Vance', 'Marcus Thorne'],
        minutes: 2.0,
        synopsis:
          'Marcus orders Elara out past curfew and demands the cipher; THEREFORE Elara tests him by naming the rotary cut while discreetly pocketing the Brass Chrono-Key.',
      },
      {
        title: '3. Pact on the Harbor Deck',
        intent: 'Midpoint Turn',
        eraOrAge: 'Night • 03:05 AM (Before Purge)',
        characters: ['Elara Vance', 'Dr. Aris Kael'],
        minutes: 2.0,
        synopsis:
          'Elara confronts restorer Dr. Aris Kael on the rain-lashed observation deck; THEREFORE Aris confesses Thorne’s midnight purge protocol and joins her, BUT vault lockdown sirens ignite below.',
      },
      {
        title: '4. Third Notch Counterclockwise',
        intent: 'Climax Escape',
        eraOrAge: 'Night • 03:18 AM (Lockdown)',
        characters: ['Elara Vance', 'Dr. Aris Kael'],
        minutes: 1.5,
        synopsis:
          'Iron shutters slam down sequentially across the subterranean corridor; THEREFORE Elara sprints to the brass service lift and uses the Chrono-Key to escape with The Glass Ledger.',
      },
    ],
  }

  const alternateVariant = {
    ...treatmentVariant,
    id: 'variant-glass-ledger-2',
    label: 'Chronological Heist Cut',
    title: 'The Glass Ledger — Ep. 1: The Midnight Index',
    tone: 'Kinetic procedural heist with ticking-clock cross-cutting',
    heroImage: {
      id: 'hero-glass-ledger-alt',
      url: SCENE_1_STILL_1,
      status: 'ready',
      prompt: 'Low-angle wide shot in the Subterranean Archive Vault.',
    },
  }

  const characters = [
    {
      id: 'char-elara',
      name: 'Elara Vance',
      role: 'protagonist',
      type: 'character',
      gender: 'female',
      age: '34',
      ethnicity: 'Mixed East Asian & European',
      description:
        'Lead Forensic Archivist determined to expose the excision of Plate XIV. Meticulous, observant, and quietly defiant.',
      appearanceDescription:
        '34-year-old woman of East Asian and European heritage, sleek chin-length dark espresso bob, tailored slate-gray wool trench coat over charcoal mock-neck sweater, brass optical loupe on thin cord.',
      referenceImage: CHAR_ELARA_IMG,
      defaultWardrobe: 'Tailored slate-gray wool trench coat over charcoal mock-neck sweater and dark trousers',
      wardrobeAccessories: 'Brass optical loupe, dark leather archive gloves',
      voiceConfig: {
        provider: 'google',
        voiceId: 'en-US-Journey-F',
        voiceName: 'Evelyn (Crisp & Observant)',
      },
      wardrobes: [
        {
          id: 'wardrobe-elara-1',
          name: 'Archive Duty Trench',
          description: 'Tailored slate-gray wool trench coat over charcoal mock-neck with brass loupe',
          accessories: 'Brass optical loupe, dark leather gloves',
          sceneNumbers: [1],
          isDefault: true,
          fullBodyUrl: CHAR_ELARA_IMG,
          headshotUrl: CHAR_ELARA_IMG,
        },
        {
          id: 'wardrobe-elara-2',
          name: 'Harbor Rain Stealth Coat',
          description:
            'Matte-black waterproof storm trench with upturned collar over charcoal knitwear, wet sheen on shoulders',
          accessories: 'Brass Chrono-Key in right pocket, waterproof archive satchel',
          sceneNumbers: [2, 3],
          isDefault: false,
          fullBodyUrl: SCENE_1_STILL_4,
          headshotUrl: CHAR_ELARA_IMG,
        },
      ],
    },
    {
      id: 'char-marcus',
      name: 'Marcus Thorne',
      role: 'main',
      type: 'character',
      gender: 'male',
      age: '58',
      ethnicity: 'European',
      description:
        'Chief Curator of the Subterranean Archive. Paternal, velvet-voiced, and ruthless in protecting the founding record.',
      appearanceDescription:
        '58-year-old silver-templed man with trimmed salt-and-pepper beard, impeccable charcoal three-piece suit, burgundy silk tie, antique silver pocket watch chain.',
      referenceImage: CHAR_MARCUS_IMG,
      defaultWardrobe: 'Charcoal bespoke three-piece suit with crisp white shirt and burgundy silk tie',
      wardrobeAccessories: 'Antique silver pocket watch',
      voiceConfig: {
        provider: 'google',
        voiceId: 'en-US-Studio-Q',
        voiceName: 'Arthur (Measured Authority)',
      },
      wardrobes: [
        {
          id: 'wardrobe-marcus-1',
          name: 'Curator Formal Suit',
          description: 'Charcoal bespoke three-piece suit with silver pocket watch',
          accessories: 'Silver pocket watch',
          sceneNumbers: [1],
          isDefault: true,
          fullBodyUrl: CHAR_MARCUS_IMG,
          headshotUrl: CHAR_MARCUS_IMG,
        },
        {
          id: 'wardrobe-marcus-2',
          name: 'Director Evening Overcoat',
          description:
            'Heavy midnight-navy cashmere overcoat draped over charcoal waistcoat and burgundy silk tie',
          accessories: 'Silver pocket watch, black leather dress gloves',
          sceneNumbers: [],
          isDefault: false,
          fullBodyUrl: CHAR_MARCUS_IMG,
          headshotUrl: CHAR_MARCUS_IMG,
        },
      ],
    },
    {
      id: 'char-aris',
      name: 'Dr. Aris Kael',
      role: 'supporting',
      type: 'character',
      gender: 'male',
      age: '42',
      ethnicity: 'South Asian',
      description:
        'Master horological restorer who built the rotary blade used on The Glass Ledger and risks everything for redemption.',
      appearanceDescription:
        '42-year-old South Asian man with warm brown eyes behind thin round wire-rimmed spectacles, wavy dark hair, rolled-sleeve ivory linen shirt under dark olive-brown tweed waistcoat.',
      referenceImage: CHAR_ARIS_IMG,
      defaultWardrobe: 'Rolled-sleeve ivory linen shirt under dark tweed waistcoat',
      wardrobeAccessories: 'Round wire-rimmed spectacles, brass jeweler’s loupe',
      voiceConfig: {
        provider: 'google',
        voiceId: 'en-US-Journey-D',
        voiceName: 'Julian (Warm & Urgent)',
      },
      wardrobes: [
        {
          id: 'wardrobe-aris-1',
          name: 'Horology Studio Waistcoat',
          description: 'Ivory rolled-sleeve linen shirt under dark tweed waistcoat',
          accessories: 'Wire-rimmed spectacles, brass loupe',
          sceneNumbers: [2],
          isDefault: true,
          fullBodyUrl: CHAR_ARIS_IMG,
          headshotUrl: CHAR_ARIS_IMG,
        },
      ],
    },
    {
      id: 'narrator-1',
      name: 'Narrator',
      type: 'narrator',
      role: 'supporting',
      description: 'Cinematic storytelling voice for atmospheric scene narration',
      voiceConfig: {
        provider: 'google',
        voiceId: 'en-US-Studio-O',
        voiceName: 'Cinematic Narrator',
      },
    },
  ]

  const locationReferences = [
    {
      id: 'loc-archive-vault',
      name: 'Subterranean Archive Vault',
      location: 'Subterranean Archive Vault',
      locationDisplay: 'INT. SUBTERRANEAN ARCHIVE VAULT',
      description:
        'Three-story Neo-Gothic underground archive with cast-iron and brass bookshelves, shallow floor water channels, oak examination tables, and green-shaded banker lamps.',
      imageUrl: LOC_VAULT_IMG,
      sceneNumbers: [1, 3],
    },
    {
      id: 'loc-observation-deck',
      name: 'Rain-Slicked Observation Deck',
      location: 'Rain-Slicked Observation Deck',
      locationDisplay: 'INT. OBSERVATION DECK',
      description:
        'Soaring arched industrial-glass harbor observation gallery lashed by night rain, cyan neon beacons in harbor fog, wet terrazzo floor, and antique brass transit telescope.',
      imageUrl: LOC_DECK_IMG,
      sceneNumbers: [2],
    },
  ]

  const objectReferences = [
    {
      id: 'prop-glass-ledger',
      type: 'object',
      name: 'The Glass Ledger',
      description:
        'Antique municipal codex of bevelled translucent quartz crystal plates bound into an oxidized copper spine; Plate XIV is sheared at the hinge and refracts warm amber caustics.',
      category: 'prop',
      importance: 'critical',
      imageUrl: PROP_LEDGER_IMG,
      sceneNumbers: [1, 2, 3],
    },
    {
      id: 'prop-chrono-key',
      type: 'object',
      name: 'Brass Chrono-Key',
      description:
        'Tarnished horological skeleton key with three concentric rotating vernier rings and precision gear teeth engraved "VERITAS IN UMBRA".',
      category: 'prop',
      importance: 'critical',
      imageUrl: PROP_KEY_IMG,
      sceneNumbers: [1, 2, 3],
    },
  ]

  const arBundle = buildBlueprintAudienceResonance({
    overallScore: 92,
    audienceDescription:
      'Prestige streaming thriller viewers (25–54) drawn to architectural neo-noir, institutional conspiracy mysteries (Severance, Michael Clayton, Silo), and tactile forensic worldbuilding.',
    summary:
      'High-concept visual worldbuilding anchored by a tangible forensic MacGuffin (etched quartz debt plates) and an immediate mentor-protégé betrayal hook.',
    strengths: [
      'Distinctive visual signature pairing warm 2700K quartz caustics against 5600K harbor rain.',
      'Causal THEREFORE/BUT beat progression escalates cleanly from forensic audit to physical lockdown.',
      'Strong ensemble contrast across institutional authority, forensic rigor, and craftsman guilt.',
    ],
    recommendations: [
      {
        id: 'rec-gl-1',
        title: 'Plant Harbor District Stakes Earlier',
        text: 'Name the specific waterfront residential district erased by Plate XIV during Marcus and Elara’s opening exchange.',
        reason: 'Connecting the missing plate to living residents sharpens human stakes alongside the forensic mystery.',
        pointsDeducted: 5,
        fixSection: 'beats',
        category: 'Character Connection',
      },
      {
        id: 'rec-gl-2',
        title: 'Foreshadow Twin Impression Mechanism',
        text: 'Briefly reference the horological carbon-wax backing in Beat 1 so Beat 3’s twin-impression turn feels earned.',
        reason: 'Slightly smoother technical setup for international audiences.',
        pointsDeducted: 3,
        fixSection: 'story',
        category: 'Clarity & Structure',
      },
    ],
  })

  const scriptPayload = {
    title: 'The Glass Ledger — Ep. 1: Beneath the Waterline',
    logline: treatmentVariant.logline,
    genre: 'Thriller / Mystery',
    tone: 'Neo-Noir Suspense',
    visualStyle: treatmentVariant.visual_style,
    characters,
    script: {
      title: 'The Glass Ledger — Ep. 1: Beneath the Waterline',
      logline: treatmentVariant.logline,
      scenes,
    },
  }

  return {
    id: DEMO_PROJECT_ID,
    series_id: DEMO_SERIES_ID,
    seriesId: DEMO_SERIES_ID,
    episode_number: 1,
    episodeNumber: 1,
    title: 'The Glass Ledger — Ep. 1: Beneath the Waterline',
    description:
      'When Lead Forensic Archivist Elara Vance uncovers a surgical rotary excision inside Municipal Debt Codex XIV, she races Chief Curator Marcus Thorne to secure the twin quartz impression before a midnight vault purge.',
    currentStep: 'vision',
    progress: 88,
    status: 'in-progress',
    createdAt: '2026-11-02T14:20:00.000Z',
    updatedAt: '2026-11-13T01:45:00.000Z',
    completedSteps: ['ideation', 'blueprint'],
    metadata: {
      isDemoSandbox: true,
      credits: SANDBOX_CREDITS,
      creditBalance: SANDBOX_CREDITS,
      creditsBudget: 2800,
      creditsUsed: 1820,
      estimatedTotalCredits: 2800,
      sceneCount: 3,
      seriesId: DEMO_SERIES_ID,
      seriesTitle: 'The Glass Ledger',
      episodeNumber: 1,
      genre: 'Thriller / Mystery',
      format: 'Series Episode',
      duration: 8,
      estimatedRuntime: 8,
      aspectRatio: '16:9',
      artStyle: 'realistic',
      billboardUrl: HERO_BILLBOARD_IMG,
      thumbnailUrl: SCENE_1_STILL_1,
      posterUrl: HERO_BILLBOARD_IMG,
      directorScore: 93,
      audienceScore: 92,
      filmTreatment: treatmentVariant.synopsis,
      filmTreatmentVariant: treatmentVariant,
      selectedVariantId: treatmentVariant.id,
      treatmentVariants: [treatmentVariant, alternateVariant],
      beats: treatmentVariant.beats,
      audienceDefinition: arBundle.audienceDefinition,
      blueprintAudienceResonance: arBundle.blueprintAudienceResonance,
      finalCut: {
        format: 'video',
        language: 'en',
        presetId: 'all-video',
      },
      screeningRoomShareLink: {
        shareToken: DEMO_SCREENING_SHARE_TOKEN,
        slug: 'the-glass-ledger-ep1',
        isActive: true,
        createdAt: '2026-11-12T19:15:00.000Z',
        viewCount: 48,
        allowFeedback: true,
        allowedFeatures: {
          translations: true,
          download: true,
          captions: true,
        },
      },
      visionPhase: {
        billboardUrl: HERO_BILLBOARD_IMG,
        thumbnailUrl: SCENE_1_STILL_1,
        scriptGenerated: true,
        charactersGenerated: true,
        scenesGenerated: true,
        scriptUpdatedAt: '2026-11-12T18:30:00.000Z',
        script: scriptPayload,
        scenes,
        characters,
        narrationVoice: {
          provider: 'google',
          voiceId: 'en-US-Studio-O',
          voiceName: 'Cinematic Narrator',
        },
        references: {
          sceneReferences: locationReferences,
          locationReferences,
          objectReferences,
          objectDuplicateIgnores: [],
        },
        production: {
          lastUpdated: '2026-11-12T19:00:00.000Z',
          scenes: productionScenes,
        },
        streams: buildProjectStreams(LOCALIZED_DRAMA_VIDEOS, DEMO_SCREENING_SHARE_TOKEN),
        reviews: {
          director: {
            overallScore: 93,
            summary: 'Disciplined 180-degree table staging and tactile macro prop payoffs.',
          },
          audience: {
            overallScore: 92,
            targetDemographic: 'Prestige Streaming Thriller Viewers (25–54)',
            emotionalImpact:
              'High-tension cat-and-mouse intrigue with tactile visual payoffs and strong causal beat turns.',
            categories: [
              { name: 'Story & Causal Flow', score: 93 },
              { name: 'Character Depth & Subtext', score: 91 },
              { name: 'Visual & Shot Continuity', score: 95 },
              { name: 'Pacing & Escalation', score: 90 },
            ],
            strengths: [
              'Anamorphic amber-vs-cyan lighting grounds every location transition.',
              'Macro insert on Plate XIV and the Brass Chrono-Key pays off cleanly in Scene 3.',
            ],
            improvements: [
              'Hold half a second longer on Marcus’s reaction before cutting out of Scene 1.',
            ],
            sceneAnalysis: [
              {
                sceneNumber: 1,
                score: 92,
                pacing: 'moderate',
                tension: 'high',
                characterDevelopment: 'strong',
                visualPotential: 'high',
                notes: 'Excellent 180-degree table axis and macro insert payoff.',
                recommendations: [],
              },
              {
                sceneNumber: 2,
                score: 90,
                pacing: 'fast',
                tension: 'high',
                characterDevelopment: 'strong',
                visualPotential: 'high',
                notes: 'Strong atmospheric contrast on the rain-slicked observation deck.',
                recommendations: [],
              },
              {
                sceneNumber: 3,
                score: 94,
                pacing: 'fast',
                tension: 'high',
                characterDevelopment: 'strong',
                visualPotential: 'high',
                notes: 'Kinetic corridor finale.',
                recommendations: [],
              },
            ],
          },
        },
        translations: {
          es: {
            0: {
              heading: 'INT. BÓVEDA DEL ARCHIVO SUBTERRÁNEO - NOCHE',
              narration:
                'Todo imperio guarda dos historias: la tallada en mármol y la encerrada bajo la línea de flotación.',
              dialogue: [
                'Pasaste tres horas del toque de queda, Elara. Cierra la bóveda y entrégame el cifrado.',
                'La placa catorce no se rompió por la edad, Marcus. Alguien la cortó con una llave rotatoria.',
              ],
            },
            1: {
              heading: 'INT. CUBIERTA DE OBSERVACIÓN - CONTINUO',
              narration:
                'Solo tres artesanos en la ciudad podían cortar cuarzo sin fracturar la red del cifrado.',
              dialogue: [
                'Thorne me dijo que la placa sería trasladada a la Bóveda Alta. No sabía que planeaba borrarla.',
                'Entonces ayúdame a leer la impresión gemela antes de que la purga de medianoche borre el índice.',
              ],
            },
            2: {
              heading: 'INT. CORREDOR DEL ARCHIVO - NOCHE',
              narration:
                'Cuando el archivo se sella, nada sale, a menos que tengas la llave que dio cuerda al reloj.',
              dialogue: ['Vamos, Aris: tercera muesca en sentido antihorario.'],
            },
          },
        },
      },
    },
  }
}

function buildHarborBooksMemoirProject() {
  const poster = '/images/trailers/video-memoir-poster.webp'
  const altPoster = '/images/trailers/documentary-poster.webp'

  const scenes = [
    {
      id: 'scene-memoir-1',
      sceneId: 'scene-memoir-1',
      sceneNumber: 1,
      heading: 'INT. HARBOR BOOKS — MORNING',
      location: 'Harbor Books Mezzanine',
      timeOfDay: 'MORNING',
      duration: 14.0,
      estimatedDuration: 14.0,
      imageUrl: poster,
      visualDescription:
        'Golden morning sunlight streams through arched bookshop windows onto cedar shelves, brass library ladders, and a worn walnut counter.',
      action:
        'Arthur Lin (Age 78) unlocks the brass front latch for the final Saturday opening while Elena Lin (Age 76) arranges handwritten staff picks.',
      narration:
        'In the autumn of 1976, two suitcases of maritime poetry and a borrowed espresso machine became Harbor Books.',
      narrationAudioUrl: '/audio/use-case-story/knowledge/video-memoirs.mp3',
      narrationAudio: {
        en: { url: '/audio/use-case-story/knowledge/video-memoirs.mp3', duration: 8.0, startTime: 0 },
      },
      dialogue: [
        {
          character: 'ARTHUR LIN (AGE 78)',
          characterId: 'char-arthur-78',
          line: 'Fifty years of rainy mornings, Elena, and the third floorboard by Poetry still sings in F-sharp.',
          emotion: 'Warm nostalgia',
        },
      ],
      dialogueAudio: {
        en: [{ dialogueIndex: 0, character: 'ARTHUR LIN (AGE 78)', audioUrl: AUDIO_4_2S, duration: 4.2, startTime: 8.5 }],
      },
      sfx: [],
      sfxAudio: [],
      musicAudio: AUDIO_5_0S,
      musicDuration: 14.0,
      musicTitle: 'Cedar & Morning Sun (Solo Acoustic Guitar & Strings)',
      characters: ['Arthur Lin (Age 78)', 'Elena Lin (Age 76)'],
      beats: [
        {
          beatId: 'bt_m1_1',
          sequenceIndex: 0,
          kind: 'action',
          durationSeconds: 7.0,
          actionDescription:
            'Sunlight sweeps across cedar bookshelves as Arthur Lin (Age 78) unlocks the front door of Harbor Books.',
          ...buildStillVersions({
            beatId: 'bt_m1_1',
            v1Url: altPoster,
            v2Url: poster,
            prompt: 'Warm sunlit independent bookstore interior with cedar bookshelves and brass ladder, documentary cinema.',
          }),
          endFrameImageUrl: poster,
          storyboardImagePrompt: 'Warm sunlit independent bookstore interior with cedar bookshelves and brass ladder, documentary cinema.',
          videoPrompt: 'Gentle gimbal push-in across sunlit cedar bookshelves as Arthur Lin (Age 78) unlocks the brass front door.',
          beatDirection: {
            shotType: 'Wide Shot',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow dolly-in',
            transition: 'CUT',
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_m1_2',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'ARTHUR LIN (AGE 78)',
          characterId: 'char-arthur-78',
          line: 'Fifty years of rainy mornings, Elena, and the third floorboard by Poetry still sings in F-sharp.',
          durationSeconds: 7.0,
          ...buildStillVersions({
            beatId: 'bt_m1_2',
            v1Url: poster,
            prompt: 'Warm medium portrait of Arthur Lin (Age 78) and Elena Lin (Age 76) behind the walnut bookshop counter.',
          }),
          endFrameImageUrl: poster,
          storyboardImagePrompt: 'Warm medium portrait of Arthur Lin (Age 78) and Elena Lin (Age 76) behind the walnut bookshop counter.',
          videoPrompt: 'Warm medium shot of Arthur Lin (Age 78) smiling toward Elena Lin (Age 76) across stacks of hardcover memoirs.',
          beatDirection: {
            shotType: 'Medium Two-Shot',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Static lock-off',
            transition: 'CUT',
            generatedBy: 'director',
          },
        },
      ],
    },
    {
      id: 'scene-memoir-2',
      sceneId: 'scene-memoir-2',
      sceneNumber: 2,
      heading: 'EXT. PIKE STREET WATERFRONT — 1978 ARCHIVE RECREATION',
      location: 'Pike Street Bookstall',
      timeOfDay: 'AFTERNOON',
      duration: 12.0,
      estimatedDuration: 12.0,
      imageUrl: altPoster,
      visualDescription:
        '16mm archival warmth: Arthur Lin (Age 28) and Elena Lin (Age 26) sheltering canvas book crates beneath an awning during a 1970s Seattle cloudburst.',
      action:
        'Arthur Lin (Age 28) and Elena Lin (Age 26) pass wooden poetry crates up the rain-slicked Pike Street steps from the flooded basement press.',
      narration:
        'When the winter flood of seventy-eight threatened the basement press, Arthur and Elena rallied Pike Street hand-to-hand.',
      narrationAudioUrl: AUDIO_4_2S,
      dialogue: [],
      dialogueAudio: { en: [] },
      sfx: [],
      sfxAudio: [],
      musicAudio: AUDIO_5_0S,
      musicDuration: 12.0,
      musicTitle: 'Human Chain in the Rain (Warm Chamber Strings)',
      characters: ['Arthur Lin (Age 28)', 'Elena Lin (Age 26)'],
      beats: [
        {
          beatId: 'bt_m2_1',
          sequenceIndex: 0,
          kind: 'action',
          durationSeconds: 12.0,
          actionDescription:
            'Arthur Lin (Age 28) and Elena Lin (Age 26) pass wooden crates of books hand-to-hand beneath warm awning lamps in the 1978 rain.',
          ...buildStillVersions({
            beatId: 'bt_m2_1',
            v1Url: altPoster,
            prompt: '1970s Pacific Northwest street scene in warm rain, young booksellers passing wooden crates of books into a cozy storefront.',
          }),
          endFrameImageUrl: altPoster,
          storyboardImagePrompt: '1970s Pacific Northwest street scene in warm rain, young booksellers passing wooden crates of books into a cozy storefront.',
          videoPrompt: 'Slow panning shot of Arthur Lin (Age 28) and Elena Lin (Age 26) passing book crates under warm storefront lights.',
          beatDirection: {
            shotType: 'Wide Tracking Shot',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow pan',
            transition: 'CUT',
            generatedBy: 'director',
          },
        },
      ],
    },
    {
      id: 'scene-memoir-3',
      sceneId: 'scene-memoir-3',
      sceneNumber: 3,
      heading: 'INT. HARBOR BOOKS MEZZANINE — EVENING TOAST',
      location: 'Harbor Books Mezzanine',
      timeOfDay: 'NIGHT',
      duration: 12.0,
      estimatedDuration: 12.0,
      imageUrl: poster,
      visualDescription:
        'Warm tungsten string lights illuminate Arthur Lin (Age 78), Elena Lin (Age 76), and granddaughter Maya Lin (Age 24) raising amber glasses on the mezzanine.',
      action: 'Arthur Lin (Age 78) hands the brass shop keys to granddaughter Maya Lin (Age 24) as Elena Lin (Age 76) beams beside them.',
      narration: 'A bookstore is never really bricks and timber—it is the sum of every conversation sheltered inside its walls.',
      narrationAudioUrl: AUDIO_4_2S,
      dialogue: [],
      dialogueAudio: { en: [] },
      sfx: [],
      sfxAudio: [],
      musicAudio: AUDIO_5_0S,
      musicDuration: 12.0,
      musicTitle: 'Next Chapter Coda (Piano & Warm Cello)',
      characters: ['Arthur Lin (Age 78)', 'Elena Lin (Age 76)', 'Maya Lin (Age 24)'],
      beats: [
        {
          beatId: 'bt_m3_1',
          sequenceIndex: 0,
          kind: 'action',
          durationSeconds: 12.0,
          actionDescription:
            'Arthur Lin (Age 78) places the brass shop keys into Maya Lin (Age 24)’s hand while Elena Lin (Age 76) applauds.',
          ...buildStillVersions({
            beatId: 'bt_m3_1',
            v1Url: poster,
            prompt: 'Intimate celebratory gathering inside an heirloom bookshop at night, warm tungsten string lights.',
          }),
          endFrameImageUrl: poster,
          storyboardImagePrompt: 'Intimate celebratory gathering inside an heirloom bookshop at night, warm tungsten string lights.',
          videoPrompt: 'Slow push-in on Arthur passing the brass keys to Maya surrounded by warm applause.',
          beatDirection: {
            shotType: 'Medium Close-Up',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow push-in',
            transition: 'CUT',
            generatedBy: 'director',
          },
        },
      ],
    },
  ]

  const productionScenes = buildDemoProductionScenes(scenes, LOCALIZED_MEMOIR_VIDEOS)

  const treatmentVariant = {
    id: 'variant-harbor-books-1',
    label: 'Heirloom Documentary Memoir',
    title: 'Harbor Books: Fifty Years on Pike Street',
    logline:
      'An intimate 50th-anniversary family legacy film chronicling how Arthur and Elena Lin turned two suitcases of poetry into Seattle’s beloved neighborhood sanctuary.',
    synopsis:
      'Commissioned by the Lin family for Arthur and Elena’s golden anniversary celebration, this hybrid documentary memoir weaves restored family photographs, spoken oral history, and cinematic recreations of the 1978 Pike Street flood rescue—culminating in the ceremonial passing of the shop keys to the third generation.',
    genre: 'Documentary / Family Memoir',
    tone: 'Heartfelt, luminous, nostalgic, and celebratory',
    visual_style: 'Warm Kodak Vision3 500T documentary intimacy with golden tungsten practicals and gentle 16mm archival grain.',
    setting: 'Pike Street Waterfront & Harbor Books Mezzanine (1976–Present)',
    themes: ['Generational stewardship', 'Community resilience', 'Living family archive'],
    total_duration_seconds: 720,
    estimatedDurationMinutes: 12,
    heroImage: {
      id: 'hero-harbor-books',
      url: poster,
      status: 'ready',
      prompt: 'Warm sunlit independent bookshop interior with brass library ladders.',
    },
    character_descriptions: [
      {
        name: 'Arthur Lin (Age 28)',
        role: 'protagonist',
        age: '28',
        ethnicity: 'East Asian (Taiwanese-American)',
        samePersonGroupId: 'person-arthur-lin',
        description:
          'Arthur Lin in the 1976–1978 founding era: idealistic maritime poet and young bookseller hauling wooden poetry crates up Pike Street.',
        appearance:
          '28-year-old Taiwanese-American man with thick natural dark brown-black hair, warm dark brown eyes, 1970s tan corduroy jacket over rolled chambray work shirt. Longitudinal identity lock: exact same individual human being as Arthur Lin across life stages.',
      },
      {
        name: 'Arthur Lin (Age 78)',
        role: 'protagonist',
        age: '78',
        ethnicity: 'East Asian (Taiwanese-American)',
        samePersonGroupId: 'person-arthur-lin',
        description:
          'Co-founder of Harbor Books at age 78 (2026 golden anniversary). Gentle wit and encyclopedic memory for every reader’s favorite poet.',
        appearance:
          '78-year-old Taiwanese-American man with full silver hair, warm dark brown eyes with deep smile lines, oatmeal cable-knit cardigan over chambray shirt. Longitudinal identity lock: exact same individual human being as Arthur Lin across life stages.',
      },
      {
        name: 'Elena Lin (Age 26)',
        role: 'protagonist',
        age: '26',
        ethnicity: 'East Asian (Taiwanese-American)',
        samePersonGroupId: 'person-elena-lin',
        description:
          'Elena Lin in the 1976–1978 founding era: resourceful architectural drafter and co-founder who hand-built the cedar mezzanine shelves.',
        appearance:
          '26-year-old Taiwanese-American woman with shoulder-length dark espresso waves, warm expressive brown eyes, 1970s olive wool peacoat and rust knit turtleneck. Longitudinal identity lock: exact same individual human being as Elena Lin across life stages.',
      },
      {
        name: 'Elena Lin (Age 76)',
        role: 'protagonist',
        age: '76',
        ethnicity: 'East Asian (Taiwanese-American)',
        samePersonGroupId: 'person-elena-lin',
        description:
          'Co-founder and curator at age 76 (2026 golden anniversary). The architectural and financial backbone who kept Harbor Books independent.',
        appearance:
          '76-year-old Taiwanese-American woman with graceful posture, silver chignon, warm brown eyes behind thin tortoiseshell reading glasses, terracotta silk scarf. Longitudinal identity lock: exact same individual human being as Elena Lin across life stages.',
      },
      {
        name: 'Maya Lin (Age 24)',
        role: 'supporting',
        age: '24',
        ethnicity: 'East Asian (Taiwanese-American)',
        description:
          'Arthur and Elena’s granddaughter (24), raised beneath the cash wrap and stepping forward to steward Harbor Books’ next half-century.',
        appearance:
          '24-year-old Taiwanese-American woman sharing Elena’s cheekbone structure and Arthur’s warm dark eyes, collarbone-length dark hair, forest-green linen blazer.',
      },
    ],
    beats: [
      {
        title: '1. Two Suitcases on Pike Street (1976)',
        intent: 'Origin Story',
        eraOrAge: '1976 • Ages 28 & 26',
        characters: ['Arthur Lin (Age 28)', 'Elena Lin (Age 26)'],
        minutes: 4,
        synopsis: 'Arthur and Elena open Harbor Books with two suitcases of poetry and a borrowed espresso machine.',
      },
      {
        title: '2. The Bucket Brigade of ’78',
        intent: 'Community Crucible',
        eraOrAge: 'Winter 1978 • Founding Era',
        characters: ['Arthur Lin (Age 28)', 'Elena Lin (Age 26)'],
        minutes: 4,
        synopsis: 'Young Arthur and Elena rally Pike Street through winter rain to save the basement poetry press.',
      },
      {
        title: '3. Passing the Brass Keys',
        intent: 'Generational Legacy',
        eraOrAge: '2026 • 50th Anniversary (Ages 78, 76 & 24)',
        characters: ['Arthur Lin (Age 78)', 'Elena Lin (Age 76)', 'Maya Lin (Age 24)'],
        minutes: 4,
        synopsis: 'Under mezzanine string lights, elder Arthur and Elena pass the brass shop keys to granddaughter Maya.',
      },
    ],
  }

  const arBundle = buildBlueprintAudienceResonance({
    overallScore: 94,
    audienceDescription: 'Multi-generational family & community celebration screening (all ages, diaspora & literary heritage focus).',
    summary: 'Deeply resonant heirloom memoir balancing specific sensory details (the F-sharp floorboard) with universal family legacy.',
    strengths: [
      'Tactile sensory anchors make fifty years of history feel immediate and intimate.',
      'Seamless bridge between 1970s archival recreation and contemporary family celebration.',
    ],
    recommendations: [
      {
        id: 'rec-hb-1',
        title: 'Include Granddaughter Maya’s Childhood Memory',
        text: 'Add a brief voiceover beat from Maya recalling reading beneath the cash wrap at age seven.',
        reason: 'Strengthens the emotional baton-pass in the final chapter.',
        pointsDeducted: 6,
        fixSection: 'beats',
        category: 'Character Connection',
      },
    ],
  })

  return {
    id: DEMO_MEMOIR_PROJECT_ID,
    title: 'Harbor Books: Fifty Years on Pike Street',
    description:
      'Commissioned family & community video memoir celebrating Arthur and Elena Lin’s five decades stewarding Pike Street’s landmark independent bookshop.',
    currentStep: 'vision',
    progress: 94,
    status: 'in-progress',
    createdAt: '2026-11-05T09:15:00.000Z',
    updatedAt: '2026-11-12T22:10:00.000Z',
    completedSteps: ['ideation', 'blueprint'],
    metadata: {
      isDemoSandbox: true,
      credits: SANDBOX_CREDITS,
      creditBalance: SANDBOX_CREDITS,
      creditsBudget: 1600,
      creditsUsed: 1120,
      estimatedTotalCredits: 1600,
      sceneCount: 3,
      genre: 'Documentary / Memoir',
      format: 'Video Memoir',
      duration: 12,
      estimatedRuntime: 12,
      aspectRatio: '16:9',
      artStyle: 'realistic',
      billboardUrl: poster,
      thumbnailUrl: poster,
      posterUrl: poster,
      directorScore: 95,
      audienceScore: 94,
      clientOrder: {
        isClientProject: true,
        clientName: 'Elena & Arthur Lin Family',
        clientEmail: 'maya.lin@harborbooks-example.com',
        serviceType: 'video_memoir',
        maxFeedbackRounds: 2,
        blueprintRoundsUsed: 1,
        screeningRoundsUsed: 1,
        blueprintApprovalStatus: 'approved',
        continuityApprovalStatus: 'approved',
        screeningApprovalStatus: 'pending_review',
        quotedPriceUsd: 450,
      },
      filmTreatment: treatmentVariant.synopsis,
      filmTreatmentVariant: treatmentVariant,
      selectedVariantId: treatmentVariant.id,
      treatmentVariants: [treatmentVariant],
      beats: treatmentVariant.beats,
      audienceDefinition: arBundle.audienceDefinition,
      blueprintAudienceResonance: arBundle.blueprintAudienceResonance,
      finalCut: { format: 'video', language: 'en', presetId: 'all-video' },
      visionPhase: {
        billboardUrl: poster,
        thumbnailUrl: poster,
        scriptGenerated: true,
        charactersGenerated: true,
        scenesGenerated: true,
        scriptUpdatedAt: '2026-11-12T20:00:00.000Z',
        script: {
          title: treatmentVariant.title,
          logline: treatmentVariant.logline,
          genre: treatmentVariant.genre,
          tone: treatmentVariant.tone,
          visualStyle: treatmentVariant.visual_style,
          script: { title: treatmentVariant.title, logline: treatmentVariant.logline, scenes },
        },
        scenes,
        characters: [
          {
            id: 'char-arthur-28',
            name: 'Arthur Lin (Age 28)',
            role: 'protagonist',
            type: 'character',
            gender: 'male',
            age: '28',
            ethnicity: 'East Asian (Taiwanese-American)',
            samePersonGroupId: 'person-arthur-lin',
            description: 'Arthur Lin in the 1976–1978 founding era: idealistic maritime poet and young bookseller.',
            appearanceDescription:
              '28-year-old Taiwanese-American man with thick natural dark brown-black hair, warm dark eyes, 1970s tan corduroy jacket over chambray work shirt. Longitudinal identity lock: exact same individual human being as Arthur Lin across life stages.',
            defaultWardrobe: '1970s tan corduroy jacket over rolled-sleeve chambray shirt',
            referenceImage: altPoster,
          },
          {
            id: 'char-arthur-78',
            name: 'Arthur Lin (Age 78)',
            role: 'protagonist',
            type: 'character',
            gender: 'male',
            age: '78',
            ethnicity: 'East Asian (Taiwanese-American)',
            samePersonGroupId: 'person-arthur-lin',
            description: 'Co-founder of Harbor Books at age 78 (2026 golden anniversary). Warm storyteller and poetry archivist.',
            appearanceDescription:
              '78-year-old Taiwanese-American man with silver hair, warm smile lines, oatmeal cable-knit cardigan over chambray shirt. Longitudinal identity lock: exact same individual human being as Arthur Lin across life stages.',
            defaultWardrobe: 'Oatmeal cable-knit cardigan over soft blue chambray shirt',
            referenceImage: poster,
          },
          {
            id: 'char-elena-26',
            name: 'Elena Lin (Age 26)',
            role: 'protagonist',
            type: 'character',
            gender: 'female',
            age: '26',
            ethnicity: 'East Asian (Taiwanese-American)',
            samePersonGroupId: 'person-elena-lin',
            description: 'Elena Lin in the 1976–1978 founding era: co-founder who hand-built the cedar mezzanine shelves.',
            appearanceDescription:
              '26-year-old Taiwanese-American woman with shoulder-length dark espresso waves, warm brown eyes, vintage olive wool peacoat over rust knit turtleneck. Longitudinal identity lock: exact same individual human being as Elena Lin across life stages.',
            defaultWardrobe: '1970s olive wool peacoat over rust turtleneck sweater',
            referenceImage: altPoster,
          },
          {
            id: 'char-elena-76',
            name: 'Elena Lin (Age 76)',
            role: 'protagonist',
            type: 'character',
            gender: 'female',
            age: '76',
            ethnicity: 'East Asian (Taiwanese-American)',
            samePersonGroupId: 'person-elena-lin',
            description: 'Co-founder of Harbor Books at age 76 (2026 golden anniversary). Poised curator and community matriarch.',
            appearanceDescription:
              '76-year-old Taiwanese-American woman with silver chignon, tortoiseshell reading glasses, and terracotta silk scarf. Longitudinal identity lock: exact same individual human being as Elena Lin across life stages.',
            defaultWardrobe: 'Charcoal wool cardigan with terracotta silk scarf',
            referenceImage: poster,
          },
          {
            id: 'char-maya-24',
            name: 'Maya Lin (Age 24)',
            role: 'supporting',
            type: 'character',
            gender: 'female',
            age: '24',
            ethnicity: 'East Asian (Taiwanese-American)',
            description: 'Granddaughter (24) receiving the brass keys to Harbor Books.',
            appearanceDescription:
              '24-year-old Taiwanese-American woman with collarbone-length dark hair, warm dark eyes, forest-green linen blazer.',
            defaultWardrobe: 'Forest-green linen blazer over cream knit top',
            referenceImage: poster,
          },
        ],
        references: { sceneReferences: [], locationReferences: [], objectReferences: [] },
        production: { lastUpdated: '2026-11-12T21:30:00.000Z', scenes: productionScenes },
        streams: buildProjectStreams(LOCALIZED_MEMOIR_VIDEOS),
        reviews: {
          director: { overallScore: 95 },
          audience: {
            overallScore: 94,
            targetDemographic: 'Multi-Generational Family & Heritage Viewers',
            emotionalImpact: 'Warm, deeply personal celebration of marriage, craft, and neighborhood memory.',
            categories: [
              { name: 'Emotional Authenticity', score: 96 },
              { name: 'Narrative Arc', score: 93 },
              { name: 'Visual Warmth', score: 95 },
              { name: 'Pacing', score: 92 },
            ],
          },
        },
      },
    },
  }
}

function buildWhiteCityBlueprintProject() {
  const poster = '/images/trailers/cinematic-drama-poster.webp'
  const altPoster = '/images/trailers/training-series-poster.webp'

  const variantA = {
    id: 'variant-white-city-1',
    label: 'Prestige Infrastructure Thriller',
    title: 'The White City Current — Ep. 1: The Faraday Protocol',
    logline:
      'Hours before a continental solar storm hits the Great Lakes grid, a dissident high-voltage engineer discovers the city’s emergency Faraday relays were quietly rerouted to protect private AI vaults instead of hospitals.',
    synopsis:
      'As a Carrington-class coronal mass ejection barrels toward North America, Senior Grid Dispatcher Nadia Vance runs a routine load-shedding drill inside Chicago’s historic White City Substation—only to uncover an encrypted firmware override known as The Faraday Protocol. With forty minutes before geomagnetically induced currents melt the municipal transformers, Nadia must choose between executing corporate dispatch orders or manually bridging a century-old copper busbar to keep three south-side trauma centers alive.',
    genre: 'Sci-Fi / Thriller',
    tone: 'Taut real-time technical suspense grounded in blue-collar heroism',
    visual_style: 'Large-format digital realism: tungsten substation switchboards, cobalt corona-discharge arcs, and snow-swept Chicago steel.',
    setting: 'Chicago White City Substation & Regional Grid Control Center (Winter Night)',
    themes: ['Public infrastructure vs. private extraction', 'Competence under pressure', 'Moral courage'],
    total_duration_seconds: 600,
    estimatedDurationMinutes: 10,
    heroImage: {
      id: 'hero-white-city-a',
      url: poster,
      status: 'ready',
      prompt: 'Cinematic wide frame inside an industrial electrical substation during a winter geomagnetic storm.',
    },
    character_descriptions: [
      {
        name: 'Nadia Koury',
        role: 'protagonist',
        description: 'Lead High-Voltage Grid Dispatcher (38). Twenty years on the line; knows every analog breaker by sound.',
        appearance: 'Lebanese-American, dark curls tied back, navy FR utility jacket, dielectric safety glasses.',
      },
      {
        name: 'Julian Vane',
        role: 'antagonist',
        description: 'VP of Grid Resilience (45). Smooth crisis-communications executive enforcing the private tier SLA.',
        appearance: 'Tailored camel overcoat over charcoal suit, dual encrypted phones, composed corporate polish.',
      },
      {
        name: 'Mateo Silva',
        role: 'supporting',
        description: 'Substation Apprentice (24).Steady hands under high-voltage pressure; Nadia’s eyes on the transformer yard.',
        appearance: 'Heavy insulated yellow storm parka, headlamp, torque wrench holstered on belt.',
      },
    ],
    beats: [
      {
        title: '1. Anomaly on Feeder Nine',
        intent: 'Inciting Discovery',
        eraOrAge: 'T-Minus 40 Min • Pre-Storm Drill',
        characters: ['Nadia Koury'],
        minutes: 2.5,
        synopsis:
          'During pre-storm load tests, Nadia spots 140 megawatts vanishing into an unlisted subterranean loop; THEREFORE she halts automated dispatch.',
      },
      {
        title: '2. The Private Tier Override',
        intent: 'Escalating Conflict',
        eraOrAge: 'T-Minus 28 Min • Control Balcony',
        characters: ['Nadia Koury', 'Julian Vane'],
        minutes: 2.5,
        synopsis:
          'VP Julian Vane arrives on the glass balcony and locks Nadia’s console under emergency SLA authority, leaving Mercy General Hospital on the shed list.',
      },
      {
        title: '3. Into the 1908 Copper Yard',
        intent: 'Midpoint Gamble',
        eraOrAge: 'T-Minus 15 Min • 1908 Converter Hall',
        characters: ['Nadia Koury', 'Mateo Silva'],
        minutes: 2.5,
        synopsis:
          'Nadia and apprentice Mateo descend into the decommissioned 1908 rotary converter hall to manually bridge the hospital feeder before aurora currents spike.',
      },
      {
        title: '4. Pulling the Manual Knife Switch',
        intent: 'Climax Resolution',
        eraOrAge: 'Impact • Geomagnetic Peak',
        characters: ['Nadia Koury', 'Mateo Silva', 'Julian Vane'],
        minutes: 2.5,
        synopsis:
          'As violet corona arcs dance across the snow-covered yard, Nadia throws the manual brass knife switch—saving the hospital ward while exposing the Faraday ledger.',
      },
    ],
  }

  const variantB = {
    ...variantA,
    id: 'variant-white-city-2',
    label: 'Dual-Timeline Historical Cut',
    title: 'The White City Current — Ep. 1: 1893 / 2026',
    tone: 'Atmospheric mystery intercutting 1893 World’s Fair electrification with modern grid sabotage',
    heroImage: {
      id: 'hero-white-city-b',
      url: altPoster,
      status: 'ready',
      prompt: 'Dual-era electrical hall contrasting vintage brass dynamos with modern digital telemetry.',
    },
  }

  const arBundle = buildBlueprintAudienceResonance({
    overallScore: 90,
    audienceDescription: 'Grounded sci-fi & prestige drama viewers (25–54) who love real-time competence thrillers (Chernobyl, Andor, Hijack).',
    summary:
      'Razor-sharp ticking-clock premise with immediate real-world relevance and visceral analog-vs-digital visual contrast.',
    strengths: [
      'Real-time 40-minute geomagnetic storm countdown creates relentless narrative propulsion.',
      'Analog 1908 copper knife-switch climax delivers a cinematic, physical solution to a software conspiracy.',
    ],
    recommendations: [
      {
        id: 'rec-wc-1',
        title: 'Anchor Hospital Stakes Through One Voice Call',
        text: 'Add a 15-second radio check-in from Mercy General’s NICU facilities chief in Beat 2.',
        reason: 'Gives the megawatt numbers an unforgettable human pulse before Nadia enters the yard.',
        pointsDeducted: 6,
        fixSection: 'beats',
        category: 'Character Connection',
      },
      {
        id: 'rec-wc-2',
        title: 'Clarify Julian Vane’s Personal Liability',
        text: 'Establish that Vane personally signed the private vault waiver so his obstruction is existential, not bureaucratic.',
        reason: 'Elevates the antagonist from middle-manager to desperate adversary.',
        pointsDeducted: 4,
        fixSection: 'characters',
        category: 'Character Connection',
      },
    ],
  })

  return {
    id: DEMO_WHITE_CITY_PROJECT_ID,
    title: 'The White City Current — Ep. 1: The Faraday Protocol',
    description:
      'As a continental solar storm bears down on Chicago’s power grid, a veteran high-voltage dispatcher uncovers a covert firmware override prioritizing private AI vaults over city trauma hospitals.',
    currentStep: 'blueprint',
    progress: 45,
    status: 'in-progress',
    createdAt: '2026-11-08T11:00:00.000Z',
    updatedAt: '2026-11-12T19:40:00.000Z',
    completedSteps: ['ideation'],
    metadata: {
      isDemoSandbox: true,
      credits: SANDBOX_CREDITS,
      creditBalance: SANDBOX_CREDITS,
      creditsBudget: 2200,
      creditsUsed: 420,
      estimatedTotalCredits: 2200,
      sceneCount: 4,
      genre: 'Sci-Fi / Thriller',
      format: 'Series Pilot',
      duration: 10,
      estimatedRuntime: 10,
      aspectRatio: '16:9',
      artStyle: 'realistic',
      billboardUrl: poster,
      thumbnailUrl: poster,
      posterUrl: poster,
      audienceScore: 90,
      filmTreatment: variantA.synopsis,
      filmTreatmentVariant: variantA,
      selectedVariantId: variantA.id,
      treatmentVariants: [variantA, variantB],
      beats: variantA.beats,
      audienceDefinition: arBundle.audienceDefinition,
      blueprintAudienceResonance: arBundle.blueprintAudienceResonance,
    },
  }
}

function buildSiltLineAnimatedProject() {
  const poster = '/images/trailers/animated-series-poster.webp'
  const castJuniper = '/images/cast/silt-line/juniper-finch.webp'
  const castTobias = '/images/cast/silt-line/tobias-wu.webp'
  const castOrville = '/images/cast/silt-line/orville-crane.webp'
  const castJohn = '/images/cast/silt-line/john-anderson.webp'
  const castBram = '/images/cast/silt-line/inspector-bram-halloway.webp'

  const scenes = [
    {
      id: 'scene-silt-1',
      sceneId: 'scene-silt-1',
      sceneNumber: 1,
      heading: 'EXT. LOWER LOCK NINE — DUSK',
      location: 'Lower Lock Nine Silt Gate',
      timeOfDay: 'DUSK',
      duration: 10.0,
      estimatedDuration: 10.0,
      imageUrl: poster,
      visualDescription:
        'Stylized hand-painted 3D maritime locks glowing with bioluminescent teal silt gauges and warm brass lantern light.',
      action:
        'Hydrologist Juniper Finch kneels on the catwalk lowering a glass core sampler into the churning canal while Tobias Wu monitors harmonic pressure.',
      narration:
        'In Oakhaven, the tide doesn’t rise with the moon—it rises when the Lock Guild says you can afford the water.',
      narrationAudioUrl: '/audio/use-case-story/entertainment/animated-web-series.mp3',
      dialogue: [
        {
          character: 'JUNIPER',
          characterId: 'char-juniper',
          line: 'That isn’t river silt, Tobias—it’s crushed ballast quartz from the Upper Spillway.',
          emotion: 'Sharp realization',
        },
      ],
      dialogueAudio: { en: [{ dialogueIndex: 0, character: 'JUNIPER', audioUrl: AUDIO_4_2S, duration: 4.2, startTime: 4.5 }] },
      sfx: [],
      sfxAudio: [],
      musicAudio: AUDIO_5_0S,
      musicDuration: 10.0,
      musicTitle: 'Tidal Clockwork (Pizzicato Strings & Marimba)',
      characters: ['Juniper Finch', 'Tobias Wu'],
      beats: [
        {
          beatId: 'bt_sl1_1',
          sequenceIndex: 0,
          kind: 'action',
          durationSeconds: 5.0,
          actionDescription: 'Juniper Finch pulls up a glowing core tube of crystalline silt above Lock Nine.',
          ...buildStillVersions({
            beatId: 'bt_sl1_1',
            v1Url: poster,
            prompt: 'Stylized 3D animation wide shot at dusk above massive brass canal locks, Juniper Finch inspecting glowing core tube.',
          }),
          endFrameImageUrl: poster,
          storyboardImagePrompt: 'Stylized 3D animation wide shot at dusk above massive brass canal locks, Juniper Finch inspecting glowing core tube.',
          videoPrompt: 'Dynamic crane sweep down to Juniper Finch raising a glowing teal core sampler on the iron catwalk.',
          beatDirection: {
            shotType: 'Wide Shot',
            cameraAngle: 'High angle',
            cameraMovement: 'Crane down',
            transition: 'CUT',
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_sl1_2',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'JUNIPER',
          characterId: 'char-juniper',
          line: 'That isn’t river silt, Tobias—it’s crushed ballast quartz from the Upper Spillway.',
          durationSeconds: 5.0,
          ...buildStillVersions({
            beatId: 'bt_sl1_2',
            v1Url: castJuniper,
            v2Url: poster,
            prompt: 'Stylized 3D animated medium two-shot of Juniper Finch and Tobias Wu by lantern light.',
          }),
          endFrameImageUrl: poster,
          storyboardImagePrompt: 'Stylized 3D animated medium two-shot of Juniper Finch and Tobias Wu by lantern light.',
          videoPrompt: 'Expressive 3D animated medium shot as Juniper holds the glowing sample up to Tobias.',
          beatDirection: {
            shotType: 'Two-Shot',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Subtle push-in',
            transition: 'CUT',
            generatedBy: 'director',
          },
        },
      ],
    },
    {
      id: 'scene-silt-2',
      sceneId: 'scene-silt-2',
      sceneNumber: 2,
      heading: 'INT. GUILD PUMPING CATHEDRAL — NIGHT',
      location: 'Guild Pumping Cathedral',
      timeOfDay: 'NIGHT',
      duration: 10.0,
      estimatedDuration: 10.0,
      imageUrl: poster,
      visualDescription: 'Colossal brass flywheels and emerald pressure tubes tower behind Magistrate Orville Crane.',
      action: 'Inspector Bram Halloway confronts Orville Crane with the falsified floodgate manifest.',
      narration: 'Every valve in the cathedral answered to one signature.',
      narrationAudioUrl: AUDIO_3_5S,
      dialogue: [],
      dialogueAudio: { en: [] },
      sfx: [],
      sfxAudio: [],
      musicAudio: AUDIO_5_0S,
      musicDuration: 10.0,
      musicTitle: 'Brass Flywheel Waltz',
      characters: ['Orville Crane', 'Inspector Bram Halloway'],
      beats: [
        {
          beatId: 'bt_sl2_1',
          sequenceIndex: 0,
          kind: 'action',
          durationSeconds: 10.0,
          actionDescription: 'Inspector Bram Halloway steps into the amber steam light facing Magistrate Orville Crane.',
          ...buildStillVersions({
            beatId: 'bt_sl2_1',
            v1Url: poster,
            prompt: 'Stylized 3D animation low-angle shot inside a giant brass steam pumping cathedral.',
          }),
          endFrameImageUrl: poster,
          storyboardImagePrompt: 'Stylized 3D animation low-angle shot inside a giant brass steam pumping cathedral.',
          videoPrompt: 'Low-angle dolly shot past spinning brass flywheels toward Inspector Halloway and Orville Crane.',
          beatDirection: {
            shotType: 'Wide Shot',
            cameraAngle: 'Low angle',
            cameraMovement: 'Slow dolly-in',
            transition: 'CUT',
            generatedBy: 'director',
          },
        },
      ],
    },
    {
      id: 'scene-silt-3',
      sceneId: 'scene-silt-3',
      sceneNumber: 3,
      heading: 'EXT. TIDEWALL WEIR — NIGHT',
      location: 'Lower Lock Nine Silt Gate',
      timeOfDay: 'NIGHT',
      duration: 8.0,
      estimatedDuration: 8.0,
      imageUrl: poster,
      visualDescription: 'Harbor Master John Anderson reverses the main counterweights as teal floodwaters part.',
      action: 'Juniper, Tobias, and John Anderson lock the auxiliary spillway open to save the artisanal docks.',
      narration: 'For the first time in thirty winters, the lower docks woke to clear water.',
      narrationAudioUrl: AUDIO_3_5S,
      dialogue: [],
      dialogueAudio: { en: [] },
      sfx: [],
      sfxAudio: [],
      musicAudio: AUDIO_5_0S,
      musicDuration: 8.0,
      musicTitle: 'Clear Water Finale',
      characters: ['Juniper Finch', 'Tobias Wu', 'John Anderson'],
      beats: [
        {
          beatId: 'bt_sl3_1',
          sequenceIndex: 0,
          kind: 'action',
          durationSeconds: 8.0,
          actionDescription: 'Juniper and John Anderson throw the bronze counterweight lever above the roaring spillway.',
          ...buildStillVersions({
            beatId: 'bt_sl3_1',
            v1Url: poster,
            prompt: 'Stylized 3D animation heroic wide shot atop a storm-swept canal spillway with glowing teal water.',
          }),
          endFrameImageUrl: poster,
          storyboardImagePrompt: 'Stylized 3D animation heroic wide shot atop a storm-swept canal spillway with glowing teal water.',
          videoPrompt: 'Sweeping orbital camera around Juniper and John releasing the bronze spillway counterweights.',
          beatDirection: {
            shotType: 'Wide Shot',
            cameraAngle: 'Low angle',
            cameraMovement: 'Orbital pan',
            transition: 'CUT',
            generatedBy: 'director',
          },
        },
      ],
    },
  ]

  const productionScenes = buildDemoProductionScenes(scenes, LOCALIZED_ANIMATED_VIDEOS)

  const treatmentVariant = {
    id: 'variant-silt-line-1',
    label: 'Stylized 3D Steampunk Mystery',
    title: 'The Silt Line — Ep. 1: The Manufactured Surge',
    logline:
      'In a vertically tiered canal city, young hydrologist Juniper Finch proves the seasonal silt surges flooding the lower docks are artificially engineered by the Lock Guild.',
    synopsis:
      'Paired with acoustic engineer Tobias Wu, veteran harbor master John Anderson, and conflicted Inspector Bram Halloway, Juniper traces crushed spillway quartz from Lower Lock Nine straight to Magistrate Orville Crane’s pumping cathedral—sparking a six-episode animated adventure with locked 3D character continuity.',
    genre: 'Animation / Adventure Mystery',
    tone: 'Tactile, painterly 3D steampunk intrigue with kinetic adventure',
    visual_style: 'Stylized 3D Animation (Arcane-inspired painterly brushwork on dimensional 3D forms, teal bioluminescence & warm brass).',
    setting: 'Oakhaven Tiered Canal Metropolis',
    themes: ['Shared commons vs. artificial scarcity', 'Found family', 'Ingenious engineering'],
    total_duration_seconds: 360,
    estimatedDurationMinutes: 6,
    heroImage: {
      id: 'hero-silt-line',
      url: poster,
      status: 'ready',
      prompt: 'Painterly 3D animated canal metropolis at dusk with glowing teal waterways.',
    },
    character_descriptions: [
      { name: 'Juniper Finch', role: 'protagonist', description: 'Resourceful canal hydrologist (24).', appearance: 'Copper-red braided hair, teal oilskin coat, brass core gauge.' },
      { name: 'Tobias Wu', role: 'supporting', description: 'Acoustic lock engineer (26).', appearance: 'Round amber goggles, rolled indigo tunic, acoustic tuning forks.' },
      { name: 'Orville Crane', role: 'antagonist', description: 'High Magistrate of the Lock Guild (62).', appearance: 'Sharp velvet guild coat, monocle, gilded cane.' },
      { name: 'John Anderson', role: 'supporting', description: 'Veteran Harbor Master of Dock Four (55).', appearance: 'Weathered sea captain coat, thick salt-and-pepper beard.' },
      { name: 'Inspector Bram Halloway', role: 'supporting', description: 'Canal Watch Inspector (44) torn between law and justice.', appearance: 'High-collared slate inspector trench and brass badge.' },
    ],
    beats: [
      { title: '1. The Quartz Core Sample', intent: 'Inciting Clue', minutes: 2, synopsis: 'Juniper pulls crushed spillway quartz from Lock Nine.' },
      { title: '2. Inside the Pumping Cathedral', intent: 'Confrontation', minutes: 2, synopsis: 'Inspector Halloway confronts Magistrate Crane.' },
      { title: '3. Releasing the Weir', intent: 'Climax', minutes: 2, synopsis: 'Juniper, Tobias, and John open the auxiliary spillway.' },
    ],
  }

  const arBundle = buildBlueprintAudienceResonance({
    overallScore: 91,
    audienceDescription: 'Global animation & sci-fi/fantasy streaming fans (16–44) drawn to painterly 3D worldbuilding (Arcane, Spider-Verse).',
    summary: 'Vibrant 5-character ensemble with locked Global Art Style continuity and clear visual storytelling.',
    strengths: [
      'Locked Stylized 3D Animation aesthetic unifies all five cast portraits and canal environments.',
      'Immediate visual hook through glowing ballast quartz in the opening scene.',
    ],
    recommendations: [
      {
        id: 'rec-sl-1',
        title: 'Give Tobias a Signature Acoustic Gadget Moment',
        text: 'Let Tobias use his brass resonance fork to hear the hidden valve cavity before Scene 3’s lever pull.',
        reason: 'Showcases Tobias’s unique engineering skill alongside Juniper’s hydrology.',
        pointsDeducted: 9,
        fixSection: 'beats',
        category: 'Character Connection',
      },
    ],
  })

  return {
    id: DEMO_SILT_LINE_PROJECT_ID,
    series_id: DEMO_ANIMATED_SERIES_ID,
    seriesId: DEMO_ANIMATED_SERIES_ID,
    episode_number: 1,
    episodeNumber: 1,
    title: 'The Silt Line — Ep. 1: The Manufactured Surge',
    description:
      'Stylized 3D animated pilot: canal hydrologist Juniper Finch and acoustic engineer Tobias Wu uncover artificial floodgate manipulation beneath Oakhaven.',
    currentStep: 'vision',
    progress: 72,
    status: 'in-progress',
    createdAt: '2026-11-06T16:30:00.000Z',
    updatedAt: '2026-11-12T20:50:00.000Z',
    completedSteps: ['ideation', 'blueprint'],
    metadata: {
      isDemoSandbox: true,
      credits: SANDBOX_CREDITS,
      creditBalance: SANDBOX_CREDITS,
      creditsBudget: 2400,
      creditsUsed: 1480,
      estimatedTotalCredits: 2400,
      sceneCount: 3,
      seriesId: DEMO_ANIMATED_SERIES_ID,
      seriesTitle: 'The Silt Line',
      episodeNumber: 1,
      genre: 'Animation / Adventure',
      format: 'Animated Series',
      duration: 6,
      estimatedRuntime: 6,
      aspectRatio: '16:9',
      artStyle: '3d-animation',
      artStyleLocked: true,
      billboardUrl: poster,
      thumbnailUrl: poster,
      posterUrl: poster,
      directorScore: 92,
      audienceScore: 91,
      filmTreatment: treatmentVariant.synopsis,
      filmTreatmentVariant: treatmentVariant,
      selectedVariantId: treatmentVariant.id,
      treatmentVariants: [treatmentVariant],
      beats: treatmentVariant.beats,
      audienceDefinition: arBundle.audienceDefinition,
      blueprintAudienceResonance: arBundle.blueprintAudienceResonance,
      finalCut: { format: 'video', language: 'en', presetId: 'all-video' },
      visionPhase: {
        billboardUrl: poster,
        thumbnailUrl: poster,
        scriptGenerated: true,
        charactersGenerated: true,
        scenesGenerated: true,
        scriptUpdatedAt: '2026-11-12T20:10:00.000Z',
        script: {
          title: treatmentVariant.title,
          logline: treatmentVariant.logline,
          genre: treatmentVariant.genre,
          tone: treatmentVariant.tone,
          visualStyle: treatmentVariant.visual_style,
          script: { title: treatmentVariant.title, logline: treatmentVariant.logline, scenes },
        },
        scenes,
        characters: [
          {
            id: 'char-juniper',
            name: 'Juniper Finch',
            role: 'protagonist',
            type: 'character',
            gender: 'female',
            description: 'Resourceful canal hydrologist determined to expose the Lock Guild’s artificial surges.',
            appearanceDescription: 'Stylized 3D character, copper-red braided hair, teal oilskin coat, brass core sampler.',
            referenceImage: castJuniper,
          },
          {
            id: 'char-tobias',
            name: 'Tobias Wu',
            role: 'supporting',
            type: 'character',
            gender: 'male',
            description: 'Brilliant acoustic engineer who maps subterranean water pressure by harmonic pitch.',
            appearanceDescription: 'Stylized 3D character, amber brass goggles on forehead, indigo workshop tunic.',
            referenceImage: castTobias,
          },
          {
            id: 'char-orville',
            name: 'Orville Crane',
            role: 'main',
            type: 'character',
            gender: 'male',
            description: 'High Magistrate of the Oakhaven Lock Guild.',
            appearanceDescription: 'Stylized 3D character, aristocratic silver sideburns, burgundy-and-gold guild coat.',
            referenceImage: castOrville,
          },
          {
            id: 'char-john',
            name: 'John Anderson',
            role: 'supporting',
            type: 'character',
            gender: 'male',
            description: 'Veteran Harbor Master of Lower Dock Four.',
            appearanceDescription: 'Stylized 3D character, broad shoulders, salt-and-pepper beard, heavy oilskin captain coat.',
            referenceImage: castJohn,
          },
          {
            id: 'char-bram',
            name: 'Inspector Bram Halloway',
            role: 'supporting',
            type: 'character',
            gender: 'male',
            description: 'Canal Watch Inspector torn between guild law and civic conscience.',
            appearanceDescription: 'Stylized 3D character, stern expression, high-collared slate inspector trench coat.',
            referenceImage: castBram,
          },
        ],
        references: { sceneReferences: [], locationReferences: [], objectReferences: [] },
        production: { lastUpdated: '2026-11-12T20:45:00.000Z', scenes: productionScenes },
        streams: buildProjectStreams(LOCALIZED_ANIMATED_VIDEOS),
        reviews: {
          director: { overallScore: 92 },
          audience: {
            overallScore: 91,
            targetDemographic: 'Global Stylized Animation Viewers (16–44)',
            emotionalImpact: 'Kinetic worldbuilding with expressive 3D ensemble chemistry.',
          },
        },
      },
    },
  }
}

export function getUiSandboxProject(id?: string | null): Record<string, any> {
  const normalized = (id || '').trim().toLowerCase()
  if (normalized === DEMO_MEMOIR_PROJECT_ID) return buildHarborBooksMemoirProject()
  if (normalized === DEMO_WHITE_CITY_PROJECT_ID) return buildWhiteCityBlueprintProject()
  if (normalized === DEMO_SILT_LINE_PROJECT_ID) return buildSiltLineAnimatedProject()
  return buildGlassLedgerProject()
}

export function getAllUiSandboxProjects(): Array<Record<string, any>> {
  return ALL_DEMO_PROJECT_IDS.map((id) => getUiSandboxProject(id))
}

function summarizeSandboxProject(full: Record<string, any>) {
  return {
    id: full.id,
    title: full.title,
    description: full.description,
    series_id: full.series_id ?? full.metadata?.seriesId ?? null,
    seriesId: full.seriesId ?? full.metadata?.seriesId ?? null,
    episode_number: full.episode_number ?? full.metadata?.episodeNumber ?? null,
    episodeNumber: full.episodeNumber ?? full.metadata?.episodeNumber ?? null,
    currentStep: full.currentStep,
    progress: full.progress,
    status: full.status,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
    completedSteps: full.completedSteps,
    metadata: {
      isDemoSandbox: true,
      genre: full.metadata.genre,
      format: full.metadata.format,
      duration: full.metadata.duration,
      sceneCount: full.metadata.sceneCount,
      creditsUsed: full.metadata.creditsUsed,
      creditsBudget: full.metadata.creditsBudget,
      estimatedTotalCredits: full.metadata.estimatedTotalCredits,
      directorScore: full.metadata.directorScore,
      audienceScore: full.metadata.audienceScore,
      seriesId: full.metadata.seriesId,
      seriesTitle: full.metadata.seriesTitle,
      episodeNumber: full.metadata.episodeNumber,
      billboardUrl: full.metadata.billboardUrl,
      thumbnailUrl: full.metadata.thumbnailUrl,
      posterUrl: full.metadata.posterUrl,
      ...(full.metadata.clientOrder ? { clientOrder: full.metadata.clientOrder } : {}),
    },
  }
}

export function getUiSandboxProjectSummary(id?: string | null) {
  return summarizeSandboxProject(getUiSandboxProject(id))
}

export function getAllUiSandboxProjectSummaries() {
  return ALL_DEMO_PROJECT_IDS.map((id) => summarizeSandboxProject(getUiSandboxProject(id)))
}

export function directSandboxBeatStillsFallback(request: {
  beats: Array<{ beatIndex: number; beat: Record<string, any> }>
}) {
  const patches = request.beats.map(({ beatIndex, beat }) => {
    const dir = (beat.beatDirection ?? {}) as Record<string, any>
    const shotType = dir.shotType || 'Close-Up'
    const cameraAngle = dir.cameraAngle || 'Eye-level'
    const cameraMovement = dir.cameraMovement || 'Slow push-in'
    const frozenMoment =
      dir.frozenMoment ||
      beat.actionDescription ||
      'Elara Vance holds Marcus’s gaze as her thumb conceals the Brass Chrono-Key inside her coat pocket'
    return {
      beatIndex,
      beatId: beat.beatId,
      patch: {
        shotType,
        cameraAngle,
        cameraMovement,
        blocking:
          dir.blocking ||
          'Elara’s right hand slips the Brass Chrono-Key into her trench coat pocket screen-left',
        gaze: dir.gaze || 'Elara’s eyes locked unwaveringly on Marcus across the oak table',
        emotion: dir.emotion || 'Defiant resolve',
        propInteraction:
          dir.propInteraction || 'Right hand conceals the Brass Chrono-Key inside coat pocket',
        frozenMoment,
        actionFraming: `${shotType}, ${cameraAngle}. ${frozenMoment}`,
        lightingAccent: dir.lightingAccent || 'Crisp cyan rim light along Elara’s jawline',
        transition: dir.transition || 'CUT',
        castInFrame: Array.isArray(dir.castInFrame) ? dir.castInFrame : ['Elara Vance'],
        keyProps: Array.isArray(dir.keyProps) ? dir.keyProps : ['Brass Chrono-Key'],
      },
    }
  })

  return {
    usedAI: true,
    patches,
    fallbackReason: 'Studio offline director',
  }
}
