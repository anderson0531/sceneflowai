import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import type { ProductionStream } from '@/components/vision/scene-production/types'
import { planSceneRenderAppend } from '@/lib/projects/planSceneRenderAppend'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function readHandler(relativePath: string, declaration: string): string {
  const source = readSource(relativePath)
  const start = source.indexOf(declaration)
  expect(start, `${declaration} not found in ${relativePath}`).toBeGreaterThan(-1)
  const after = source.slice(start)
  const end = after.slice(1).search(/\n {2}const \w/)
  return end === -1 ? after : after.slice(0, end + 1)
}

function stream(overrides: Partial<ProductionStream> = {}): ProductionStream {
  return {
    id: 'scene-render-job-1',
    streamType: 'video',
    language: 'en',
    languageLabel: 'English',
    status: 'complete',
    source: 'render',
    mp4Url: 'https://cdn.example/render.mp4',
    completedAt: '2026-10-11T07:00:00.000Z',
    ...overrides,
  }
}

describe('planSceneRenderAppend', () => {
  it('appends a render and leaves the caller responsible for shot clips', () => {
    const planned = planSceneRenderAppend({
      streams: [
        {
          id: 'existing',
          streamType: 'video',
          language: 'en',
          languageLabel: 'English',
          status: 'complete',
          streamVersion: 1,
          mp4Url: 'https://cdn.example/old.mp4',
        },
      ],
      renderedSceneUrl: 'https://cdn.example/old.mp4',
      stream: stream(),
      now: '2026-10-11T07:00:00.000Z',
    })

    expect(planned.streams.map((item) => item.id)).toEqual(['existing', 'scene-render-job-1'])
    expect(planned.streams[1]).toMatchObject({
      streamVersion: 2,
      mp4Url: 'https://cdn.example/render.mp4',
      source: 'render',
    })
    expect(planned.renderedSceneUrl).toBe('https://cdn.example/render.mp4')
    expect(JSON.stringify(planned)).not.toContain('segmentId')
  })

  it('replaces the same stream id and keeps a newer rendered URL', () => {
    const planned = planSceneRenderAppend({
      streams: [stream({ streamVersion: 4, mp4Url: 'https://cdn.example/signed.mp4' })],
      renderedSceneUrl: 'https://cdn.example/permanent.mp4',
      previousUrl: 'https://cdn.example/signed.mp4',
      stream: stream({ mp4Url: 'https://cdn.example/promoted.mp4' }),
      now: '2026-10-11T08:00:00.000Z',
    })

    expect(planned.streams).toHaveLength(1)
    expect(planned.streams[0].streamVersion).toBe(4)
    expect(planned.streams[0].mp4Url).toBe('https://cdn.example/promoted.mp4')
    expect(planned.renderedSceneUrl).toBe('https://cdn.example/permanent.mp4')
  })
})

describe('scene render save does not merge the project', () => {
  it('writes only the stream list and rendered URL', () => {
    const source = readSource('src/lib/projects/appendSceneRender.ts')
    expect(source).toContain('jsonb_set')
    expect(source).toContain('productionStreams')
    expect(source).toContain('renderedSceneUrl')
    expect(source).toContain('FOR UPDATE')
    expect(source).not.toContain('segments')
    expect(source).not.toContain('findByPk')
    expect(source).not.toContain('mergeSceneProductionData')
  })

  it('sends appendStream from the client and from the job writer', () => {
    const client = readSource('src/lib/projects/appendSceneRenderClient.ts')
    const job = readSource('src/lib/jobs/sceneRenderJob.ts')
    const route = readSource('src/app/api/projects/[id]/production/route.ts')

    expect(client).toContain('appendStream: stream')
    expect(client).not.toContain('productionData')
    expect(job).toContain('appendSceneRender')
    expect(job).not.toContain('mergeSceneProductionData')
    expect(job).not.toContain('Project.findByPk')
    expect(route).toContain('appendSceneRender')
    expect(route).toContain('Append render')
  })

  it('does not flush a scene save when a render starts', () => {
    const cloud = readHandler(
      'src/components/vision/scene-production/SceneProductionMixer.tsx',
      'const handleRender = useCallback(async () => {'
    )
    const headless = readHandler(
      'src/components/vision/scene-production/SceneProductionMixer.tsx',
      'const handleHeadlessRender = useCallback(async () => {'
    )
    for (const handler of [cloud, headless]) {
      expect(handler).not.toContain('schedulePersistMixerSettings.flush')
    }
  })

  it('does not re-save mixer settings when the parent passes a new callback', () => {
    const mixer = readSource('src/components/vision/scene-production/SceneProductionMixer.tsx')
    const start = mixer.indexOf('if (!hasHydratedMixerSettingsRef.current || !onMixerSettingsChange) return')
    expect(start).toBeGreaterThan(-1)
    const effect = mixer.slice(start, mixer.indexOf('// Sync with external overlays', start))
    const deps = effect.slice(effect.lastIndexOf('}, ['))
    expect(deps).not.toContain('onMixerSettingsChange')
  })

  it('appends a render from the director console instead of merging shot clips', () => {
    const complete = readHandler(
      'src/components/vision/scene-production/DirectorConsoleImpl.tsx',
      'const handleRenderComplete = useCallback(('
    )
    const mixerCallback = readSource('src/components/vision/scene-production/DirectorConsoleImpl.tsx')
    const callbackStart = mixerCallback.indexOf('onRenderComplete={(downloadUrl, language, streamType')
    expect(callbackStart).toBeGreaterThan(-1)
    const callback = mixerCallback.slice(callbackStart, mixerCallback.indexOf("import('sonner')", callbackStart))

    expect(complete).toContain('publishAppendedRender')
    expect(complete).not.toContain('onProductionDataChange')
    expect(complete).not.toContain('segments: []')
    expect(callback).toContain('publishAppendedRender')
    expect(callback).not.toContain('onProductionDataChange')
    expect(callback).not.toContain('segments: []')
  })

  it('does not create an empty shot list when a rendered URL is saved', () => {
    const handler = readHandler(
      'src/app/dashboard/workflow/vision/[projectId]/page.tsx',
      'const handleRenderedSceneUrlChange = useCallback('
    )
    expect(handler).toContain('appendSceneRenderClient')
    expect(handler).toContain('rememberAppendedSceneRender')
    expect(handler).not.toContain('segments: []')
    expect(handler).not.toContain('applySceneProductionUpdate')
  })
})
