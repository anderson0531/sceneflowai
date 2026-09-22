import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  applyMusicCueDirection,
  buildMusicCueDirectorSystemPrompt,
  parseMusicCueDirectionPatch,
} from '@/lib/intelligence/music-cue-director-fallback'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

const cue: SceneMusicCue = {
  cueId: 'cue-1',
  beatStart: 0,
  beatEnd: 2,
  description: 'Cinematic pads, slow, cold',
  intent: 'dread',
  url: 'https://example.com/score.mp3',
  generatedBy: 'llm',
}

const beats: SceneBeat[] = [
  { beatId: 'b0', sequenceIndex: 0, kind: 'action', actionDescription: 'She waits.' },
]

describe('music cue director', () => {
  it('rewrites the brief and the intent, and does not ask for audio', () => {
    const system = buildMusicCueDirectorSystemPrompt()
    expect(system).toContain('description')
    expect(system).toContain('intent')
    expect(system).toContain('No lyrics')
    expect(system).toContain('You do not write the audio')
  })

  it('returns description and intent only', () => {
    const patch = parseMusicCueDirectionPatch({
      description: 'Low strings, slow, no pulse, instrumental',
      intent: 'held breath',
      url: 'https://evil.example/track.mp3',
      beatStart: 4,
    })
    expect(patch).toEqual({
      description: 'Low strings, slow, no pulse, instrumental',
      intent: 'held breath',
    })
  })

  it('saves the brief onto the cue and leaves the generated file where it is', () => {
    const scene = {
      beats,
      sceneMusicCues: [cue],
      musicCueCoverage: '0-2',
    }
    const { scene: next, cue: saved } = applyMusicCueDirection(scene, 'cue-1', {
      description: 'Low strings, slow, no pulse, instrumental',
      intent: 'held breath',
    })
    expect(saved?.description).toBe('Low strings, slow, no pulse, instrumental')
    expect(saved?.intent).toBe('held breath')
    expect(saved?.url).toBe(cue.url)
    expect(saved?.beatStart).toBe(0)
    expect(saved?.generatedBy).toBe('user')
    const stored = (next.sceneMusicCues as SceneMusicCue[])[0]
    expect(stored.description).toBe('Low strings, slow, no pulse, instrumental')
    expect(stored.url).toBe(cue.url)
  })

  it('is a text rewrite, not a Lyria call', () => {
    const route = readSource('src/app/api/scene/direct-music-cue/route.ts')
    const panel = readSource('src/components/vision/SceneMusicCuePanel.tsx')
    expect(route).toContain('directMusicCue')
    expect(route).not.toContain('callLyria3')
    expect(route).not.toContain('generateMusicTrack')
    expect(panel).toContain('MusicCueDirectorDialog')
  })
})
