import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  GEMINI_TEXT_MODEL_CANDIDATES,
  GEMINI_TEXT_MODELS,
  getAudienceResonanceModel,
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
  it('remaps the invalid gemini-3.0-flash id to the flash default', () => {
    expect(normalizeGeminiTextModel('gemini-3.0-flash')).toBe('gemini-3.5-flash')
    expect(normalizeGeminiTextModel('gemini-3.0-flash')).toBe(getGeminiTextModel('flash'))
  })

  it('remaps stale lite-preview to the Gateway lite id', () => {
    expect(normalizeGeminiTextModel('gemini-3.1-flash-lite-preview')).toBe(
      'gemini-3.1-flash-lite'
    )
  })

  it('leaves verified ids unchanged', () => {
    expect(normalizeGeminiTextModel('gemini-3.5-flash')).toBe('gemini-3.5-flash')
    expect(normalizeGeminiTextModel('gemini-2.5-flash')).toBe('gemini-2.5-flash')
  })
})

describe('Gateway-verified Gemini text defaults', () => {
  it('uses gemini-3.5-flash as the flash workhorse', () => {
    expect(getGeminiTextModel('flash')).toBe('gemini-3.5-flash')
    expect(GEMINI_TEXT_MODELS['3-flash']).toBe('gemini-3.5-flash')
    expect(GEMINI_TEXT_MODELS['3-flash-lite']).toBe('gemini-3.1-flash-lite')
    expect(getGeminiTextModel('pro')).toBe('gemini-3.1-pro-preview')
    expect(getAudienceResonanceModel()).toBe('gemini-3.5-flash')
    expect(getScriptGenerationModel()).toBe('gemini-3.5-flash')
  })

  it('keeps defaults and candidates inside the Gateway snapshot', () => {
    const ids = gatewayIds()
    expect(ids.has('gemini-3.0-flash')).toBe(false)
    expect(ids.has(getGeminiTextModel('flash'))).toBe(true)
    expect(ids.has(getGeminiTextModel('pro'))).toBe(true)
    expect(ids.has(GEMINI_TEXT_MODELS['3-flash-lite'])).toBe(true)
    for (const candidate of GEMINI_TEXT_MODEL_CANDIDATES) {
      expect(ids.has(candidate), `${candidate} missing from Gateway fixture`).toBe(true)
    }
  })

  it('ranks candidates newest-first without invented ids', () => {
    expect(GEMINI_TEXT_MODEL_CANDIDATES[0]).toBe('gemini-3.6-flash')
    expect(GEMINI_TEXT_MODEL_CANDIDATES).toContain('gemini-3.5-flash')
    expect(GEMINI_TEXT_MODEL_CANDIDATES).not.toContain('gemini-3.0-flash')
    expect(GEMINI_TEXT_MODEL_CANDIDATES).not.toContain('gemini-3.1-flash-lite-preview')
  })

  it('chains pro → flash → lite → 2.5-flash', () => {
    expect([...GEMINI_QUOTA_FALLBACK_CHAIN]).toEqual([
      'gemini-3.1-pro-preview',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
    ])
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
