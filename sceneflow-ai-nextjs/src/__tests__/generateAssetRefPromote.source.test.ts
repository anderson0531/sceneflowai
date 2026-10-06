import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

describe('generate-asset reference promotion', () => {
  const route = readFileSync(
    path.resolve(__dirname, '../app/api/segments/[segmentId]/generate-asset/route.ts'),
    'utf8'
  )

  it('forwards sceneIndex into beat video reference resolve', () => {
    expect(route).toContain('sceneIndex: sceneIndex >= 0 ? sceneIndex : undefined')
    expect(route).toContain('promoteMethodForResolvedRefs')
    expect(route).toContain('resolveUserId')
  })
})

describe('scene direction shot coverage', () => {
  const source = readFileSync(
    path.resolve(__dirname, '../lib/sceneGeneration/generateDirection.ts'),
    'utf8'
  )

  it('asks for coverage per beat instead of a padded shot list', () => {
    expect(source).toContain('Never condense, shorten, or paraphrase quoted dialogue')
    expect(source).toContain('beatCoverage')
    expect(source).not.toContain('padCameraShotsToBeatCount')
  })
})
