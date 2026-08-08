import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('handleGenerateSceneAudio logContext', () => {
  it('uses sceneIdx (not undefined sceneIndex) in dialogue TTS logContext', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'src/app/dashboard/workflow/vision/[projectId]/page.tsx'
      ),
      'utf8'
    )
    expect(source).toContain('logContext: `scene ${sceneIdx + 1} dialogue`')
    expect(source).not.toContain('logContext: `scene ${sceneIndex + 1} dialogue`')
  })
})
