import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  compactProjectPutAck,
  projectPutWouldExceedBodyLimit,
  slimProjectPutPayload,
  slimProjectResponseMetadata,
  stringifyProjectPut,
  visionPhasePut,
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
    const slim = page.indexOf('const slimmed = slimProjectPutPayload(bodyToSend)')
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

  it('syncs Express references as a visionPhase patch, not the full metadata blob', () => {
    const start = page.indexOf('const syncVisionReferencesForExpress')
    const end = page.indexOf("throw new Error('Failed to sync references for Library Agent')", start)
    const fn = page.slice(start, end)
    expect(fn).toContain("serializedProjectSave(")
    expect(fn).toContain('visionPhasePut({')
    expect(fn).toContain("'syncVisionReferencesForExpress'")
    expect(fn).not.toContain('...existingMetadata')
    expect(fn).not.toContain('JSON.stringify(payload)')
  })

  it('persists the object and location library as a visionPhase patch', () => {
    const start = page.indexOf('const persistObjectLibrary = useCallback')
    const end = page.indexOf('const persistVisionCharacters = useCallback')
    const fn = page.slice(start, end)
    const saveCall = fn.slice(fn.indexOf('return serializedProjectSave'))
    expect(saveCall).toContain('visionPhasePut({')
    expect(saveCall).toContain('references,')
    expect(saveCall).not.toContain('...nextMetadata')
    expect(page).toContain("debugLabel: 'persistLocationReferences'")
    expect(page).toContain('fetch(`/api/projects/${projectId}/production`')
  })
})

describe('visionPhasePut', () => {
  it('sends only the fields this write is changing', () => {
    const body = visionPhasePut({
      characters: [{ name: 'Piper Hayes' }],
      references: { objectReferences: [] },
    })
    const slimmed = slimProjectPutPayload(body)
    expect(slimmed.metadata?.visionPhase).toEqual({
      characters: [{ name: 'Piper Hayes' }],
      references: { objectReferences: [] },
    })
    expect(JSON.parse(stringifyProjectPut(body)).metadata.visionPhase.production).toBeUndefined()
  })
})

describe('project API slims GET/PUT echoes', () => {
  const route = readFileSync(join(process.cwd(), 'src/app/api/projects/[id]/route.ts'), 'utf8')
  const productionRoute = readFileSync(
    join(process.cwd(), 'src/app/api/projects/[id]/production/route.ts'),
    'utf8'
  )
  const generateImage = readFileSync(
    join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'),
    'utf8'
  )
  const generateFrames = readFileSync(
    join(process.cwd(), 'src/app/api/production/generate-segment-frames/route.ts'),
    'utf8'
  )

  it('GET/PUT omit production and return a compact PUT ack', () => {
    expect(route).toContain('slimProjectResponseMetadata')
    expect(route).toContain("searchParams.get('include') === 'production'")
    expect(route).toContain('compactProjectPutAck')
    expect(route).not.toMatch(/return NextResponse\.json\(\{\s*success: true,\s*project,/)
  })

  it('serves production on its own GET', () => {
    expect(productionRoute).toContain('export async function GET')
    expect(productionRoute).toContain('production')
  })

  it('overlays location scale at the same still send sites as identity crop', () => {
    expect(generateImage).toContain('overlayLocationScaleOnReferenceImages')
    expect(generateFrames).toContain('overlayLocationScaleOnReferenceImages')
  })
})

describe('slimProjectResponseMetadata', () => {
  it('strips base64, drops production, and drops the legacy scene mirror', () => {
    const slimmed = slimProjectResponseMetadata({
      ...fullMetadata(),
      visionPhase: {
        ...fullMetadata().visionPhase,
        characters: [
          {
            name: 'Piper Hayes',
            referenceImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=',
          },
        ],
      },
    })
    expect(slimmed.visionPhase.production).toBeUndefined()
    expect(slimmed.visionPhase.scenes).toBeUndefined()
    expect(slimmed.visionPhase.script.script.scenes).toEqual(scenes)
    expect(slimmed.visionPhase.characters[0].referenceImage).toBe('deferred')
  })

  it('keeps production when includeProduction is set', () => {
    const metadata = fullMetadata()
    const slimmed = slimProjectResponseMetadata(metadata, { includeProduction: true })
    expect(slimmed.visionPhase.production).toEqual(metadata.visionPhase.production)
  })
})

describe('compactProjectPutAck', () => {
  it('returns a small success body without the project blob', () => {
    expect(compactProjectPutAck({ scriptUpdatedAt: '2026-09-19T00:00:00.000Z' })).toEqual({
      success: true,
      scriptUpdatedAt: '2026-09-19T00:00:00.000Z',
    })
  })

  it('includes the server script only when a stale write was blocked', () => {
    const script = { script: { scenes: [{ id: 'kept' }] } }
    const ack = compactProjectPutAck({
      staleScriptWriteBlocked: true,
      scriptUpdatedAt: '2026-09-19T00:00:00.000Z',
      script,
    })
    expect(ack.staleScriptWriteBlocked).toBe(true)
    expect(ack.project).toEqual({
      metadata: {
        visionPhase: {
          scriptUpdatedAt: '2026-09-19T00:00:00.000Z',
          script,
        },
      },
    })
  })
})
