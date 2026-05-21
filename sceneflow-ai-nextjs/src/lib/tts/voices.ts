export type ElevenVoice = { id: string; name: string }
export type CuratedKey = 'Autumn Veil'|'William'|'Arabella'|'David'|'Creator'
export type CuratedVoice = { id: string; key: CuratedKey; name: string }

export const SCENEFLOW_CREATOR_DISPLAY_NAME = 'SceneFlow Creator'

/** ElevenLabs voice ID for SceneFlow AI Creator (signature narrator). */
export const SCENEFLOW_CREATOR_VOICE_ID = '2WZUpLnG1rGcQpTL3sVC'

const DEFAULT_CURATED_VOICE_IDS: Partial<Record<CuratedKey, string>> = {
  Creator: SCENEFLOW_CREATOR_VOICE_ID,
}

export const CURATED_TTS_VOICES: Array<{ key: CuratedKey; matchers: string[] }> = [
  { key: 'Autumn Veil', matchers: ['autumn', 'veil'] },
  { key: 'William', matchers: ['william'] },
  { key: 'Arabella', matchers: ['arabella'] },
  { key: 'David', matchers: ['david'] },
  { key: 'Creator', matchers: ['creator', 'sceneflow'] },
]

function curatedDisplayName(key: CuratedKey, fallback?: string): string {
  if (key === 'Creator') return SCENEFLOW_CREATOR_DISPLAY_NAME
  return fallback ?? key
}

function normalize(s: string): string { return (s || '').toLowerCase() }

export function filterCuratedVoices(
  allVoices: ElevenVoice[],
  overrides?: Record<string, string>
): CuratedVoice[] {
  const byName = new Map(allVoices.map(v => [normalize(v.name), v]))
  const result: CuratedVoice[] = []
  for (const spec of CURATED_TTS_VOICES) {
    const overrideId = overrides?.[spec.key] ?? DEFAULT_CURATED_VOICE_IDS[spec.key]
    if (spec.key === 'Creator' && overrideId) {
      result.push({
        id: overrideId,
        key: spec.key,
        name: curatedDisplayName(spec.key),
      })
      continue
    }
    let found: ElevenVoice | undefined
    for (const m of spec.matchers) {
      const hit = [...byName.values()].find(v => normalize(v.name).includes(normalize(m)))
      if (hit) { found = hit; break }
    }
    if (overrideId) {
      result.push({
        id: overrideId,
        key: spec.key,
        name: curatedDisplayName(spec.key),
      })
    } else if (found) {
      result.push({
        id: found.id,
        key: spec.key,
        name: curatedDisplayName(spec.key, found.name),
      })
    }
  }
  return result.slice(0, 5)
}

export function pickDefaultVoice(voices: CuratedVoice[]): string | null {
  const preferred: CuratedKey[] = ['Creator', 'Autumn Veil', 'William', 'Arabella', 'David']
  for (const key of preferred) {
    const v = voices.find(x => x.key === key)
    if (v) return v.id
  }
  return voices[0]?.id || null
}

export async function getCuratedElevenVoices(
  fetchVoices: () => Promise<ElevenVoice[]>,
  overrides?: Record<string,string>
): Promise<{ voices: CuratedVoice[]; defaultVoiceId: string | null }> {
  const list = await fetchVoices()
  const envOverrides = (() => {
    try {
      const raw = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_MAP || process.env.ELEVENLABS_VOICE_MAP
      return raw ? JSON.parse(String(raw)) : undefined
    } catch { return overrides }
  })()
  const voices = filterCuratedVoices(list, envOverrides || overrides)
  return { voices, defaultVoiceId: pickDefaultVoice(voices) }
}


