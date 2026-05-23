import { describe, it, expect } from 'vitest'
import { resolveStoryboardScenes } from '@/lib/storyboard/resolveStoryboardScenes'

describe('resolveStoryboardScenes', () => {
  it('merges imageUrl from legacy visionPhase.scenes into script.script.scenes', () => {
    const script = {
      script: {
        scenes: [
          { id: 's1', imageUrl: 'https://example.com/s1.png', dialogue: [] },
          { id: 's2', dialogue: [] },
        ],
      },
    }
    const visionPhaseScenes = [
      { id: 's1', imageUrl: 'https://example.com/s1.png', dialogue: [] },
      { id: 's2', imageUrl: 'https://example.com/s2.png', dialogue: [] },
    ]

    const resolved = resolveStoryboardScenes({ script, visionPhaseScenes })
    expect(resolved).toHaveLength(2)
    expect(resolved[0].imageUrl).toBe('https://example.com/s1.png')
    expect(resolved[1].imageUrl).toBe('https://example.com/s2.png')
  })

  it('merges dialogueAudio from visionPhase.scenes when script copy has stale mp3', () => {
    const script = {
      script: {
        scenes: [
          {
            id: 's1',
            dialogue: [
              { character: 'Sarah', line: 'Hi.' },
              { character: 'Bob', line: 'Hello.' },
            ],
            dialogueAudio: {
              en: [
                {
                  character: 'Bob',
                  dialogueIndex: 1,
                  audioUrl: 'https://example.com/stale-bob.mp3',
                  duration: 10,
                },
              ],
            },
          },
        ],
      },
    }
    const visionPhaseScenes = [
      {
        id: 's1',
        dialogue: [
          { character: 'Sarah', line: 'Hi.' },
          { character: 'Bob', line: 'Hello.' },
        ],
        dialogueAudio: {
          en: [
            {
              character: 'Bob',
              dialogueIndex: 1,
              audioUrl: 'https://example.com/uploads/default/1779502385910-bob.wav',
              duration: 11,
            },
          ],
        },
      },
    ]

    const resolved = resolveStoryboardScenes({ script, visionPhaseScenes })
    expect(resolved[0].dialogueAudio.en[0].audioUrl).toContain('/uploads/default/')
  })

  it('prefers newer script.script.scenes imageUrl over stale visionPhase.scenes on equal score', () => {
    const script = {
      script: {
        scenes: [
          {
            id: 's2',
            imageUrl:
              'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/images/frames/p/new/1779527367355.jpeg',
            dialogue: [{ character: 'A', line: 'Hi', storyboardImageUrl: 'https://example.com/d0.png' }],
          },
        ],
      },
    }
    const visionPhaseScenes = [
      {
        id: 's2',
        imageUrl:
          'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/images/frames/p/old/1779500000000.jpeg',
        dialogue: [{ character: 'A', line: 'Hi', storyboardImageUrl: 'https://example.com/d0.png' }],
      },
    ]

    const resolved = resolveStoryboardScenes({ script, visionPhaseScenes })
    expect(resolved[0].imageUrl).toContain('1779527367355')
  })
})
