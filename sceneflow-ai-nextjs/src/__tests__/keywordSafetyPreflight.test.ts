import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('keyword content-safety preflight is gone from generate UIs', () => {
  it('Assistant · Blueprint does not import the keyword moderator or alert', () => {
    const dialog = readSource('src/components/blueprint/BlueprintRefineDialog.tsx')
    expect(dialog).not.toContain("from '@/utils/promptModerator'")
    expect(dialog).not.toContain('ContentPolicyAlert')
  })

  it('Segment Prompt Builder generates without a keyword gate', () => {
    const builder = readSource(
      'src/components/vision/scene-production/SegmentPromptBuilder.tsx'
    )
    expect(builder).not.toContain('moderatePrompt')
    expect(builder).not.toContain('ContentPolicyAlert')
    expect(builder).not.toContain('Generate Anyway')
    expect(builder).toContain('The prompt was rejected by Vertex AI safety filters')
  })

  it('Video Edit does not warn on keyword matches', () => {
    const editor = readSource(
      'src/components/vision/scene-production/VideoEditingDialogV2.tsx'
    )
    expect(editor).not.toContain('moderatePrompt')
    expect(editor).not.toContain('ContentPolicyAlert')
    expect(editor).not.toContain('PolicyFixedBanner')
  })

  it('deletes the unused ContentPolicyAlert component', () => {
    expect(
      existsSync(
        path.join(ROOT, 'src/components/vision/scene-production/ContentPolicyAlert.tsx')
      )
    ).toBe(false)
  })
})
