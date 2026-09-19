import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('object library delete persistence', () => {
  it('Objects tab has Delete all and vision page sends drop ids', () => {
    const sidebar = readSource('src/components/vision/VisionReferencesSidebar.tsx')
    expect(sidebar).toContain('Delete all')
    expect(sidebar).toContain('onDeleteAllObjectReferences')
    expect(sidebar).toContain('Beat prop links will be cleared')

    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toContain('persistObjectLibrary')
    expect(page).toContain('visionReferencesPutPayload')
    expect(page).toContain('handleDeleteAllObjectReferences')
    expect(page).toContain('handleDeleteDuplicateObjects([referenceId])')
    expect(page).toContain('replaceObjectReferences: true')
    expect(page).toContain('objectTombstoneIdsRef')
    expect(page).toContain("debugLabel: 'handleObjectGenerated'")
    expect(page).not.toContain('delete persistedReferences.droppedObjectReferenceIds')

    const persistStart = page.indexOf('const persistObjectLibrary = useCallback')
    const persistEnd = page.indexOf('const persistVisionCharacters = useCallback')
    expect(page.slice(persistStart, persistEnd)).toContain('visionPhasePut({')

    const route = readSource('src/app/api/projects/[id]/route.ts')
    expect(route).toContain('mergeVisionPhaseReferences')
    expect(route).toContain('mergedObjectTombstones')

    const merge = readSource('src/lib/projects/mergeVisionPhaseReferences.ts')
    expect(merge).toContain('replaceObjectReferences')
    expect(merge).toContain('tombstones')
  })
})
