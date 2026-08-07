import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { runExpressGenerateAll } from '@/lib/sceneGeneration/runExpressGenerateAll'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('runExpressGenerateAll', () => {
  it('starts audio and frame lanes in parallel via Promise.allSettled', async () => {
    const events: string[] = []
    let releaseAudio!: () => void
    let releaseFrames!: () => void

    const audioGate = new Promise<void>((resolve) => {
      releaseAudio = resolve
    })
    const framesGate = new Promise<void>((resolve) => {
      releaseFrames = resolve
    })

    const runAudio = vi.fn(async () => {
      events.push('audio-start')
      await audioGate
      events.push('audio-done')
    })
    const runFrames = vi.fn(async () => {
      events.push('frames-start')
      await framesGate
      events.push('frames-done')
    })

    const pending = runExpressGenerateAll({ runAudio, runFrames })

    // Both lanes must have started before either finishes.
    await vi.waitFor(() => {
      expect(events).toEqual(['audio-start', 'frames-start'])
    })

    releaseFrames()
    releaseAudio()
    const results = await pending

    expect(runAudio).toHaveBeenCalledOnce()
    expect(runFrames).toHaveBeenCalledOnce()
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true)
    expect(events).toEqual(['audio-start', 'frames-start', 'frames-done', 'audio-done'])
  })

  it('settles both lanes when one rejects', async () => {
    const results = await runExpressGenerateAll({
      runAudio: async () => {
        throw new Error('audio failed')
      },
      runFrames: async () => undefined,
    })

    expect(results[0].status).toBe('rejected')
    expect(results[1].status).toBe('fulfilled')
  })
})

describe('Generate All / Play Audio source guards', () => {
  it('removes Play Audio from the SceneCard header in ScriptPanel', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    expect(panel).not.toContain('Play Audio')
    expect(panel).not.toContain('const handlePlay =')
    expect(panel).toContain('Generate All')
    expect(panel).toContain('runExpressGenerateAll')
    expect(panel).toContain('ExpressGenerateAllConfirmDialog')
    expect(panel).toContain('handleExpressGenerateAllConfirm')
  })

  it('wires Generate All confirm through the parallel orchestrator', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    expect(panel).toMatch(
      /await runExpressGenerateAll\(\{\s*runAudio,\s*runFrames\s*\}\)/
    )
    expect(panel).toContain('handleExpressAudioConfirm(options.audio)')
    expect(panel).toContain(
      'onExpressSceneGenerate(sceneIdx, selectedLanguage, options.frames)'
    )
  })
})
