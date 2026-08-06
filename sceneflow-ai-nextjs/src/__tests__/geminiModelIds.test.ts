import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  GEMINI_PRODUCT_MODELS,
  GEMINI_TEXT_MODEL_CANDIDATES,
  GEMINI_TEXT_MODELS,
  getAudienceResonanceModel,
  getGeminiProductModel,
  getGeminiTextModel,
  getScriptGenerationModel,
  normalizeGeminiTextModel,
} from '@/lib/config/modelConfig'
import { GEMINI_QUOTA_FALLBACK_CHAIN } from '@/lib/vertexai/geminiTextFallback'

const fixturePath = path.join(
  process.cwd(),
  'src/lib/config/__fixtures__/aiGatewayGeminiModelIds.json'
)

function gatewayIds(): Set<string> {
  return new Set(JSON.parse(readFileSync(fixturePath, 'utf8')) as string[])
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '__tests__' || name === '.next') continue
      walkTsFiles(full, out)
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.backup')) {
      out.push(full)
    }
  }
  return out
}

describe('normalizeGeminiTextModel', () => {
  it('remaps the invalid gemini-3.0-flash id to the GA workhorse', () => {
    expect(normalizeGeminiTextModel('gemini-3.0-flash')).toBe(GEMINI_PRODUCT_MODELS.workhorse)
    expect(normalizeGeminiTextModel('gemini-3.0-flash')).toBe(getGeminiTextModel('flash'))
  })

  it('remaps stale lite-preview to the Gateway lite id', () => {
    expect(normalizeGeminiTextModel('gemini-3.1-flash-lite-preview')).toBe(
      GEMINI_PRODUCT_MODELS.lite
    )
  })

  it('leaves verified ids unchanged', () => {
    expect(normalizeGeminiTextModel('gemini-3.5-flash')).toBe('gemini-3.5-flash')
    expect(normalizeGeminiTextModel('gemini-2.5-flash')).toBe('gemini-2.5-flash')
  })
})

describe('Gateway-verified Gemini text defaults', () => {
  it('uses gemini-3.6-flash as the GA workhorse', () => {
    expect(GEMINI_PRODUCT_MODELS.workhorse).toBe('gemini-3.6-flash')
    expect(getGeminiProductModel('series')).toBe('gemini-3.6-flash')
    expect(getGeminiTextModel('flash')).toBe('gemini-3.6-flash')
    expect(GEMINI_TEXT_MODELS['3-flash']).toBe('gemini-3.6-flash')
    expect(GEMINI_TEXT_MODELS['3-flash-lite']).toBe('gemini-3.5-flash-lite')
    expect(getGeminiTextModel('pro')).toBe('gemini-3.1-pro-preview')
    expect(getAudienceResonanceModel()).toBe('gemini-3.6-flash')
    expect(getScriptGenerationModel()).toBe('gemini-3.6-flash')
  })

  it('keeps defaults and candidates inside the Gateway snapshot', () => {
    const ids = gatewayIds()
    expect(ids.has('gemini-3.0-flash')).toBe(false)
    expect(ids.has(GEMINI_PRODUCT_MODELS.workhorse)).toBe(true)
    expect(ids.has(getGeminiTextModel('flash'))).toBe(true)
    expect(ids.has(getGeminiTextModel('pro'))).toBe(true)
    expect(ids.has(GEMINI_TEXT_MODELS['3-flash-lite'])).toBe(true)
    for (const candidate of GEMINI_TEXT_MODEL_CANDIDATES) {
      expect(ids.has(candidate), `${candidate} missing from Gateway fixture`).toBe(true)
    }
  })

  it('ranks candidates newest-first without invented ids', () => {
    expect(GEMINI_TEXT_MODEL_CANDIDATES[0]).toBe(GEMINI_PRODUCT_MODELS.workhorse)
    expect(GEMINI_TEXT_MODEL_CANDIDATES).toContain('gemini-3.5-flash')
    expect(GEMINI_TEXT_MODEL_CANDIDATES).not.toContain('gemini-3.0-flash')
    expect(GEMINI_TEXT_MODEL_CANDIDATES).not.toContain('gemini-3.1-flash-lite-preview')
  })

  it('chains pro → workhorse → prior → lite → 2.5-flash', () => {
    expect([...GEMINI_QUOTA_FALLBACK_CHAIN]).toEqual([
      'gemini-3.1-pro-preview',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
    ])
  })
})

describe('product surface model source guard', () => {
  /** Product-surface files that must resolve models via helpers — no `model: 'gemini-…'` literals. */
  const productSurfaceFiles = [
    // series
    'src/app/api/series/[seriesId]/generate/route.ts',
    'src/app/api/series/[seriesId]/apply-fix/route.ts',
    'src/app/api/series/[seriesId]/episodes/add/route.ts',
    'src/app/api/series/[seriesId]/edit-storyline/route.ts',
    'src/app/api/series/[seriesId]/analyze-resonance/route.ts',
    'src/app/api/series/[seriesId]/generate-titles/route.ts',
    // blueprint
    'src/app/api/ideation/film-treatment/route.ts',
    'src/app/api/blueprint/refine-concept/route.ts',
    'src/app/api/blueprint/import-treatment/route.ts',
    'src/app/api/ideation/generate-sequential/route.ts',
    // script
    'src/app/api/vision/generate-script/route.ts',
    'src/app/api/vision/generate-script-v2/route.ts',
    'src/app/api/script/complete-gaps/route.ts',
    'src/app/api/vision/optimize-script/route.ts',
    // audience_resonance
    'src/app/api/treatment/audience-resonance/route.ts',
    'src/app/api/treatment/analyze-resonance/route.ts',
    'src/lib/script/audienceResonance/scenePass.ts',
    'src/lib/script/audienceResonance/synthesisPass.ts',
  ]

  it('forbids hardcoded model: gemini-* literals on product surfaces', () => {
    const offenders: string[] = []
    for (const relative of productSurfaceFiles) {
      const file = path.join(process.cwd(), relative)
      const source = readFileSync(file, 'utf8')
      const hardcoded = source.match(/model:\s*['"]gemini-[^'"]+['"]/g) || []
      if (hardcoded.length > 0) {
        offenders.push(`${relative}: ${hardcoded.join(', ')}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('keeps the workhorse pin inside the Gateway fixture', () => {
    expect(gatewayIds().has(GEMINI_PRODUCT_MODELS.workhorse)).toBe(true)
  })

  it('resolves all four product surfaces through the workhorse pin', () => {
    for (const surface of ['series', 'blueprint', 'script', 'audience_resonance'] as const) {
      expect(getGeminiProductModel(surface)).toBe(GEMINI_PRODUCT_MODELS.workhorse)
    }
  })
})

describe('runtime sources do not hardcode gemini-3.0-flash', () => {
  it('has no request-path literals outside the alias map', () => {
    const roots = [
      path.join(process.cwd(), 'src/app'),
      path.join(process.cwd(), 'src/lib'),
      path.join(process.cwd(), 'src/services'),
    ]
    const offenders: string[] = []
    for (const root of roots) {
      for (const file of walkTsFiles(root)) {
        if (file.endsWith('modelConfig.ts')) continue
        const source = readFileSync(file, 'utf8')
        if (source.includes("'gemini-3.0-flash'") || source.includes('"gemini-3.0-flash"')) {
          offenders.push(path.relative(process.cwd(), file))
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
