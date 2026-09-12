import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  projectPutWouldExceedBodyLimit,
  slimProjectPutPayload,
  VERCEL_FUNCTION_BODY_LIMIT_BYTES,
} from '@/lib/projects/slimProjectPutPayload'

const scenes = [
  { id: 'sc_1', beats: [{ beatId: 'bt_1', storyboardImagePrompt: 'Wide shot.' }] },
]

function fullMetadata() {
  return {
    lookbook: { title: 'The Vault' },
    visionPhase: {
      script: { script: { scenes } },
      scenes,
      production: {
        scenes: {
          sc_1: {
            segments: [
              {
                takes: [{ assetUrl: 'https://blob.example/take.mp4' }],
              },
            ],
          },
        },
      },
      characters: [{ name: 'Piper Hayes' }],
    },
  }
}

describe('slimProjectPutPayload', () => {
  it('drops the production blob and the legacy scene mirror', () => {
    const slimmed = slimProjectPutPayload({ metadata: fullMetadata() })

    expect(slimmed.persistProduction).toBeUndefined()
    expect(slimmed.metadata?.visionPhase.production).toBeUndefined()
    expect(slimmed.metadata?.visionPhase.scenes).toBeUndefined()
    expect(slimmed.metadata?.visionPhase.script.script.scenes).toEqual(scenes)
    expect(slimmed.metadata?.visionPhase.characters).toEqual([{ name: 'Piper Hayes' }])
    expect(slimmed.metadata?.lookbook).toEqual({ title: 'The Vault' })
  })

  it('keeps production when the caller actually rewrote it', () => {
    const metadata = fullMetadata()
    const slimmed = slimProjectPutPayload({
      metadata,
      persistProduction: true,
    })

    expect(slimmed.metadata?.visionPhase.production).toEqual(
      metadata.visionPhase.production
    )
    expect(slimmed.persistProduction).toBeUndefined()
  })

  it('strips a base64 image that would 413 on its own', () => {
    const slimmed = slimProjectPutPayload({
      metadata: {
        visionPhase: {
          characters: [
            {
              name: 'Piper Hayes',
              referenceImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=',
            },
          ],
        },
      },
    })

    expect(slimmed.metadata?.visionPhase.characters[0].referenceImage).toBe('deferred')
  })

  it('leaves a body without metadata untouched', () => {
    expect(slimProjectPutPayload({ title: 'The Vault' })).toEqual({ title: 'The Vault' })
  })

  it('knows when a body is large enough for Vercel to 413 it', () => {
    expect(projectPutWouldExceedBodyLimit({ small: true })).toBe(false)
    const oversized = 'x'.repeat(VERCEL_FUNCTION_BODY_LIMIT_BYTES)
    expect(projectPutWouldExceedBodyLimit({ blob: oversized })).toBe(true)
  })
})

describe('vision page slims every project PUT', () => {
  const page = readFileSync(
    join(process.cwd(), 'src/app/dashboard/workflow/vision/[projectId]/page.tsx'),
    'utf8'
  )

  it('runs the payload through slimProjectPutPayload before fetch', () => {
    const slim = page.indexOf('const slimmed = slimProjectPutPayload(body)')
    const stringify = page.indexOf('JSON.stringify(slimmed)')
    const fetchCall = page.indexOf('fetch(`/api/projects/${projectId}`')
    expect(slim).toBeGreaterThan(-1)
    expect(stringify).toBeGreaterThan(slim)
    expect(fetchCall).toBeGreaterThan(stringify)
  })

  it('does not re-send production or the scene mirror on a script persist', () => {
    const persist = page.indexOf('const persistVisionScriptScenes = useCallback')
    const saveCall = page.indexOf('serializedProjectSave(', persist)
    const saveEnd = page.indexOf('debugLabel || \'persistVisionScriptScenes\'', saveCall)
    const putBody = page.slice(saveCall, saveEnd)
    expect(putBody).toContain('script: updatedScript')
    expect(putBody).toContain('scriptUpdatedAt:')
    expect(putBody).not.toContain('scenes: updatedScenes')
    expect(putBody).not.toContain('production:')
  })

  it('keeps production on the load-time migration that rewrites it', () => {
    expect(page).toMatch(/queuePersist\(\s*\{\s*metadata: finalMetadata,\s*persistProduction: true\s*\}/)
  })
})
