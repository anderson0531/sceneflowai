import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const softenRoutePath = path.join(
  process.cwd(),
  'src/app/api/character/soften-wardrobe/route.ts',
)
const characterLibraryPath = path.join(
  process.cwd(),
  'src/components/vision/CharacterLibrary.tsx',
)

describe('soften-wardrobe API', () => {
  it('route exists', () => {
    expect(existsSync(softenRoutePath)).toBe(true)
  })

  it('uses getGeminiTextModel flash and visual-preserving safety examples', () => {
    const source = readFileSync(softenRoutePath, 'utf8')
    expect(source).toContain("getGeminiTextModel('flash')")
    expect(source).not.toMatch(/model:\s*['"]gemini-[^'"]+['"]/)
    expect(source).toContain('gun shot hole')
    expect(source).toContain('dark perimeter')
    expect(source).toContain('moderatePrompt')
    expect(source).toContain('POST')
  })
})

describe('CharacterLibrary Soften control', () => {
  it('wires Soften button and soften-wardrobe API with Soften & retry', () => {
    const source = readFileSync(characterLibraryPath, 'utf8')
    expect(source).toContain('/api/character/soften-wardrobe')
    expect(source).toContain('handleSoftenWardrobe')
    expect(source).toContain('Soften')
    expect(source).toContain('Soften & retry')
    expect(source).toContain('isVertexContentPolicyError')
    expect(source).toContain('allowSoftenRetry')
    expect(source).toContain('Wardrobe softened for image safety')
    expect(source).toContain('Shield')
  })
})
