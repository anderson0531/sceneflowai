import { describe, it, expect } from 'vitest'
import { fdxXmlToFountain, isFdxContent, normalizeImportedScriptText } from '@/lib/script/fdxParser'
import { parseScript } from '@/lib/script/scriptParser'
import { validateScript } from '@/lib/script/scriptValidator'

const SAMPLE_FDX = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
    <Paragraph Type="Scene Heading">
      <Text>Int. Coffee Shop - Day</Text>
    </Paragraph>
    <Paragraph Type="Action">
      <Text>SARAH stirs her latte, distracted.</Text>
    </Paragraph>
    <Paragraph Type="Character">
      <Text>SARAH</Text>
    </Paragraph>
    <Paragraph Type="Parenthetical">
      <Text>(quietly)</Text>
    </Paragraph>
    <Paragraph Type="Dialogue">
      <Text>I cannot believe he said that.</Text>
    </Paragraph>
  </Content>
</FinalDraft>`

describe('fdxParser', () => {
  it('detects FDX content', () => {
    expect(isFdxContent(SAMPLE_FDX)).toBe(true)
    expect(isFdxContent(SAMPLE_FDX, 'script.fdx')).toBe(true)
    expect(isFdxContent('INT. HOUSE - DAY\n\nAction.')).toBe(false)
  })

  it('converts FDX XML to fountain-style text with sluglines and dialogue', () => {
    const fountain = fdxXmlToFountain(SAMPLE_FDX)
    expect(fountain).toContain('INT. COFFEE SHOP - DAY')
    expect(fountain).toContain('SARAH stirs her latte')
    expect(fountain).toContain('SARAH')
    expect(fountain).toContain('(quietly)')
    expect(fountain).toContain('I cannot believe he said that.')
  })

  it('parses normalized FDX through the existing script pipeline', () => {
    const text = normalizeImportedScriptText(SAMPLE_FDX, 'scene.fdx')
    const validation = validateScript(text)
    expect(validation.isValid).toBe(true)
    const parsed = parseScript(text, validation)
    expect(parsed.scenes).toHaveLength(1)
    expect(parsed.scenes[0].heading).toMatch(/INT\. COFFEE SHOP/i)
    expect(parsed.scenes[0].dialogue).toHaveLength(1)
    expect(parsed.scenes[0].dialogue[0].character).toBe('SARAH')
    expect(parsed.scenes[0].dialogue[0].parenthetical).toBe('quietly')
  })
})
