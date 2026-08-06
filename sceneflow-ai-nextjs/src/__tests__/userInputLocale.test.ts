import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..')
const API_ROOT = join(ROOT, 'src', 'app', 'api')

/**
 * Guard for the two seams in `src/i18n/server/requestLocale.ts`.
 *
 * A route that accepts typed text and forgets them fails silently: the creator
 * types Spanish and gets English prose back, or a Spanish prompt reaches Imagen
 * and the render quality drops with nothing pointing at a language setting.
 * Neither shows up as an error, so the rule is enforced here instead.
 *
 * Adding a route with one of these body fields means either wiring the seam or
 * adding the route to the allowlist below with the reason.
 */

/** Body fields that carry text a creator typed. */
const USER_TEXT_FIELDS = [
  'customInstruction',
  'customInstructions',
  'customPrompt',
  'editInstruction',
  'fixSuggestion',
  'instruction',
  'instructions',
  'locationPrompt',
  'scenePrompt',
  'userIntent',
]

/** Clients that mean the text ends up in a generation prompt. */
const RENDER_CLIENTS = [
  'generateImageWithGemini',
  'generateImageWithGeminiStudio',
  'editImageWithGeminiStudio',
  'generateProductionVideo',
  'generateSeriesThumbnailImage',
]

const LOCALE_SEAM = /resolveRequestStoryLocale|resolveStoryLocale/
const ENGLISH_SEAM = /englishForModel/

/**
 * Routes that legitimately need neither seam, with the reason. Each one either
 * carries no creative text or produces instructions consumed by a model rather
 * than prose for the creator.
 */
const ALLOWLIST: Record<string, string> = {
  'i18n/content/route.ts': 'the translation endpoint itself',
  'translate/route.ts': 'delivery-language translation endpoint',
  'translate/google/route.ts': 'delivery-language translation endpoint',
  'translate/vertex/route.ts': 'delivery-language translation endpoint',
  'translate/test/route.ts': 'diagnostic endpoint',
  'tts/blueprint/route.ts': 'prompt is a TTS style instruction consumed by the speech model',
  'tts/edge/route.ts': 'synthesizes text that is already in its final language',
  'tts/google/route.ts': 'prompt is a TTS style instruction consumed by the speech model',
  'tts/google/music/route.ts': 'prompt is a Lyria instruction, not creator prose',
  'tts/google/director-prompt/route.ts':
    'output is a speech-model instruction, which stays English',
  'tts/voice-profile/generate/route.ts':
    'output is an ElevenLabs voice-design brief, which stays English',
  'tts/elevenlabs/route.ts': 'synthesizes text that is already in its final language',
  'tts/elevenlabs/music/route.ts': 'prompt is a music-model instruction',
  'tts/elevenlabs/sound-effects/route.ts': 'prompt is an SFX-model instruction',
  'tts/elevenlabs/voice-design/preview/route.ts': 'voice design brief stays English',
  'tts/table-read/route.ts': 'synthesizes text that is already in its final language',
  'vision/generate-scene-audio/route.ts':
    'synthesizes script lines that are already in their final language',
  'vision/suggest-objects/route.ts':
    'names and descriptions feed reference-image prompts, so they stay English',
  'scene/generate-direction/route.ts':
    'emits camera and staging direction consumed by the image and video models',
  'vision/analyze-narration-beats/route.ts':
    'emits videoPrompt for Veo; the prompt itself states those fields stay English',
  'image/analyze-vertex-risk/route.ts': 'inspects a prompt for policy risk rather than authoring',
  'moderation/validate/route.ts': 'classifies text rather than authoring it',
  'vision/generate-all-images/route.ts':
    'fans out to scene/generate-image, which normalizes each prompt',
  'setup/migrate-projects/route.ts': 'returns setup instructions rather than reading any',
  'voice/consent/initiate/route.ts': 'returns consent instructions rather than reading any',
  'test/reference-image/route.ts': 'diagnostic endpoint for reference image plumbing',
}

function routeFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...routeFiles(full))
    else if (entry === 'route.ts') out.push(full)
  }
  return out
}

const routes = routeFiles(API_ROOT).map((file) => ({
  key: relative(API_ROOT, file).split(/[\\/]/).join('/'),
  source: readFileSync(file, 'utf8'),
}))

/** Matches `field,` / `field:` / `field =` in a destructure or body type. */
function readsUserText(source: string): string | null {
  for (const field of USER_TEXT_FIELDS) {
    if (new RegExp(`\\b${field}\\s*[,:?}]`).test(source)) return field
  }
  return null
}

function callsRenderClient(source: string): boolean {
  return RENDER_CLIENTS.some((client) => source.includes(client))
}

describe('user-entered text carries the creator’s language', () => {
  it('finds routes to check, so a bad glob cannot make this vacuous', () => {
    expect(routes.length).toBeGreaterThan(50)
  })

  it('every route reading typed text resolves the story language', () => {
    const missing = routes
      .filter(({ key }) => !(key in ALLOWLIST))
      .filter(({ source }) => readsUserText(source))
      .filter(({ source }) => !LOCALE_SEAM.test(source))
      .map(({ key, source }) => `${key} (reads ${readsUserText(source)})`)

    expect(missing).toEqual([])
  })

  it('every route sending typed text to a render model normalizes it to English', () => {
    const missing = routes
      .filter(({ key }) => !(key in ALLOWLIST))
      .filter(({ source }) => readsUserText(source) && callsRenderClient(source))
      .filter(({ source }) => !ENGLISH_SEAM.test(source))
      .map(({ key }) => key)

    expect(missing).toEqual([])
  })

  it('allowlist entries name a real route and a reason', () => {
    const keys = new Set(routes.map((r) => r.key))
    for (const [key, reason] of Object.entries(ALLOWLIST)) {
      expect(keys.has(key), `${key} is allowlisted but does not exist`).toBe(true)
      expect(reason.length, `${key} needs a reason`).toBeGreaterThan(10)
    }
  })
})

describe('the seams keep their contract', () => {
  const seam = readFileSync(
    join(ROOT, 'src', 'i18n', 'server', 'requestLocale.ts'),
    'utf8'
  )

  it('consults the interface cookie only after the authoritative chain', () => {
    expect(seam).toContain("if (resolved.source !== 'default') return resolved")
  })

  it('leaves English prompts untouched so they stay byte-identical', () => {
    expect(seam).toContain('if (storyLocale === DEFAULT_LOCALE) return text')
  })
})
