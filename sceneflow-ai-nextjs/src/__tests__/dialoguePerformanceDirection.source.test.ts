import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const files = [
  'src/app/api/vision/generate-script-v2/route.ts',
  'src/app/api/vision/generate-script/route.ts',
  'src/app/api/vision/optimize-script/route.ts',
  'src/app/api/vision/optimize-scene/route.ts',
  'src/app/api/vision/revise-scene/route.ts',
  'src/app/api/vision/expand-scene/route.ts',
  'src/lib/script/beatPromptBuilder.ts',
]

describe('dialogue performance direction source contracts', () => {
  it('script authors import the shared Gemini brief and do not mention ElevenLabs TTS tags', () => {
    for (const relative of files) {
      const source = readFileSync(path.join(process.cwd(), relative), 'utf8')
      expect(source, relative).toContain('DIALOGUE_PERFORMANCE_DIRECTION_RULES')
      expect(source, relative).not.toContain('CRITICAL FOR ELEVENLABS TTS')
      expect(source, relative).not.toContain('1-3 words max')
    }
  })

  it('generate-script-v2 asks for voiceDirection on dialogue beats', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/app/api/vision/generate-script-v2/route.ts'),
      'utf8'
    )
    expect(source).toContain('"voiceDirection": "1-2 sentences of actor-facing direction for this take."')
  })
})
