import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('location version overlay + persistence source guards', () => {
  it('version overlay includes Prompt Builder + Edit like the base', () => {
    const src = readSource('src/components/vision/LocationLibrary.tsx')
    expect(src).toContain('version overlay: Prompt Builder + Edit')
    expect(src).toContain('Open Prompt Builder')
    expect(src).toContain('Edit Image')
    expect(src).toContain('onEditLocationImage?.(loc.id, version.imageUrl!, version.id)')
    expect(src).toContain('max-h-[75vh]')
  })

  it('prompt builder seeds versions structurally and sends versionId', () => {
    const src = readSource('src/components/vision/LocationPromptBuilder.tsx')
    expect(src).toContain('buildLocationVersionPrompt')
    expect(src).toContain('versionId: version?.id')
    expect(src).toContain('beat props belong on the frame')
  })

  it('page generate-with-prompt patches the version instead of the base still', () => {
    const src = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(src).toContain('versionId?: string')
    expect(src).toContain('patchLocationVersion(ref, version.id')
    expect(src).toMatch(/versionId: version\.id/)
  })

  it('sidebar save with versionId does not overwrite the base still', () => {
    const src = readSource('src/components/vision/VisionReferencesSidebar.tsx')
    expect(src).toContain('patchLocationVersion(loc, editingImageData.versionId')
    expect(src).toContain('versionId?: string')
  })

  it('suggest/sync stateNotes forbid beat keyProps', () => {
    const suggest = readSource('src/app/api/vision/suggest-location-versions/route.ts')
    const sync = readSource('src/app/api/vision/sync-location-versions-from-script/route.ts')
    expect(suggest).toContain('beat keyProps')
    expect(sync).toContain('beat keyProps')
  })

  it('image edit API forwards every extra reference image', () => {
    const route = readSource('src/app/api/image/edit/route.ts')
    expect(route).toContain('referenceImages: extraRefs.map')
    expect(route).not.toContain('referenceImage: identityRef')
    const studio = readSource('src/lib/gemini/geminiStudioImageClient.ts')
    expect(studio).toContain('referenceImages: options.referenceImages')
  })

  it('Edit Frame modal attaches selected names and common-edit chips', () => {
    const src = readSource('src/components/vision/ImageEditModal.tsx')
    expect(src).toContain('appendUseTheseReferencesClause')
    expect(src).toContain('Make more photorealistic / live-action')
    expect(src).toContain('Ground subjects')
    expect(src).toContain('locationStills')
    expect(src).toContain('Correct selected')
    expect(src).toContain('Correct {ref.characterName}')
    expect(src).toContain('Revert to original')
    expect(src).toContain('listFrameEditCorrectionTargets')
    expect(src).not.toContain('Match selected identity / wardrobe refs')
    const viewer = readSource('src/components/vision/SceneStoryboardFrameViewer.tsx')
    expect(viewer).toContain('locationStills={editLocationStills}')
    expect(viewer).toContain('defaultSelectedPropIds={defaultEditPropIds}')
  })
})
