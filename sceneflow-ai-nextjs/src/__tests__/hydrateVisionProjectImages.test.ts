import { describe, expect, it } from 'vitest'
import { hydrateVisionStateFromFullProject } from '@/lib/vision/hydrateVisionProjectImages'

describe('hydrateVisionStateFromFullProject', () => {
  it('restores storyboard images from full payload when lite state has deferred placeholders', () => {
    const fullProject = {
      metadata: {
        visionPhase: {
          characters: [
            { id: 'c1', name: 'Alice', referenceImage: 'https://blob.example/alice.png' },
          ],
          references: {
            sceneReferences: [{ id: 'ref1', name: 'Backdrop', imageUrl: 'https://blob.example/backdrop.png' }],
            objectReferences: [],
            locationReferences: [],
          },
          script: {
            script: {
              scenes: [
                {
                  id: 's1',
                  sceneNumber: 1,
                  imageUrl: 'https://blob.example/scene1.png',
                  beats: [{ beatId: 'b1', storyboardImageUrl: 'https://blob.example/beat1.png' }],
                },
              ],
            },
          },
        },
      },
    }

    const current = {
      characters: [{ id: 'c1', name: 'Alice', referenceImage: 'deferred' }],
      script: {
        script: {
          scenes: [
            {
              id: 's1',
              sceneNumber: 1,
              imageUrl: 'deferred',
              beats: [{ beatId: 'b1', storyboardImageUrl: 'deferred' }],
              dialogue: [],
            },
          ],
        },
      },
      sceneReferences: [{ id: 'ref1', name: 'Backdrop', imageUrl: 'deferred' }],
      objectReferences: [],
      locationReferences: [],
    }

    const hydrated = hydrateVisionStateFromFullProject(fullProject, current)

    expect(hydrated.characters[0].referenceImage).toBe('https://blob.example/alice.png')
    expect(hydrated.scenes[0].imageUrl).toBe('https://blob.example/scene1.png')
    expect(hydrated.scenes[0].beats[0].storyboardImageUrl).toBe('https://blob.example/beat1.png')
    expect(hydrated.sceneReferences[0].imageUrl).toBe('https://blob.example/backdrop.png')
  })
})
