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

    const route = readSource('src/app/api/projects/[id]/route.ts')
    expect(route).toContain('mergeVisionPhaseReferences')
  })
})
