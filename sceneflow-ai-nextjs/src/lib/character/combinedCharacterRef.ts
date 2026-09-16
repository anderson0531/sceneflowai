/**
 * Persist a sharp-composed PiP character card on the wardrobe.
 *
 * Beat frames attach this one Blob URL. Composing on every still is the
 * Frame Agent hang: two Blob fetches + sharp + a data URL, repeated per beat.
 */

import { uploadImageToBlob } from '@/lib/storage/blob'
import {
  composeIdentityWardrobeDiptych,
  composeIdentityWardrobePipFromDiptychUrl,
  type IdentityWardrobeDiptych,
} from '@/lib/character/composeIdentityWardrobeDiptych'
import { persistReferenceImage } from '@/lib/vision/referenceExpress/persistReferenceImage'
import { wardrobeFingerprint } from '@/lib/vision/referenceExpress/planItems'

export function combinedCharacterRefUploadPath(args: {
  projectId: string
  characterId: string
  wardrobeId: string
}): string {
  return `characters/${args.projectId}/${args.characterId}/wardrobes/${args.wardrobeId}/combined-${Date.now()}.jpg`
}

export async function uploadCombinedCharacterRef(args: {
  composite: Pick<IdentityWardrobeDiptych, 'dataUrl'>
  projectId: string
  characterId: string
  wardrobeId: string
}): Promise<string | null> {
  try {
    return await uploadImageToBlob(
      args.composite.dataUrl,
      combinedCharacterRefUploadPath(args),
      args.projectId
    )
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(
      `[Combined Character Ref] Upload failed for wardrobe ${args.wardrobeId}: ${reason}`
    )
    return null
  }
}

export async function persistCombinedCharacterRefUrl(args: {
  projectId: string
  characterId: string
  wardrobeId: string
  combinedCharacterRefUrl: string
  expectedFingerprint: string
}): Promise<boolean> {
  const { saved } = await persistReferenceImage({
    projectId: args.projectId,
    kind: 'cast',
    targetId: args.characterId,
    wardrobeId: args.wardrobeId,
    expectedFingerprint: args.expectedFingerprint,
    patch: { combinedCharacterRefUrl: args.combinedCharacterRefUrl },
  })
  return saved
}

export async function composeUploadAndPersistCombinedCharacterRef(args: {
  projectId: string
  characterId: string
  wardrobeId: string
  identityUrl: string
  wardrobeUrl: string
  expectedFingerprint: string
  label?: string
}): Promise<string | null> {
  const composite = await composeIdentityWardrobeDiptych({
    identityUrl: args.identityUrl,
    wardrobeUrl: args.wardrobeUrl,
    label: args.label,
  })
  if (!composite) return null
  return persistComposite(args, composite)
}

export async function composeUploadAndPersistCombinedCharacterRefFromDiptych(args: {
  projectId: string
  characterId: string
  wardrobeId: string
  diptychUrl: string
  expectedFingerprint: string
  label?: string
}): Promise<string | null> {
  const composite = await composeIdentityWardrobePipFromDiptychUrl({
    diptychUrl: args.diptychUrl,
    label: args.label,
  })
  if (!composite) return null
  return persistComposite(args, composite)
}

async function persistComposite(
  args: {
    projectId: string
    characterId: string
    wardrobeId: string
    expectedFingerprint: string
  },
  composite: IdentityWardrobeDiptych
): Promise<string | null> {
  const url = await uploadCombinedCharacterRef({
    composite,
    projectId: args.projectId,
    characterId: args.characterId,
    wardrobeId: args.wardrobeId,
  })
  if (!url) return null
  const saved = await persistCombinedCharacterRefUrl({
    ...args,
    combinedCharacterRefUrl: url,
  })
  if (!saved) {
    console.warn(
      `[Combined Character Ref] Composed ${url} but wardrobe ${args.wardrobeId} was not saved`
    )
  }
  return url
}

export function wardrobeExpectedFingerprint(wardrobe: {
  name?: string
  description?: string
  accessories?: string
  appearanceNotes?: string
}): string {
  return wardrobeFingerprint(wardrobe)
}

/** After identity or wardrobe regen, rewrite every look that already has a full-body still. */
export async function recomposeCombinedCharacterRefsForCast(args: {
  projectId: string
  characterId: string
  identityUrl: string
  characterName?: string
  wardrobes?: Array<{
    id?: string
    name?: string
    description?: string
    accessories?: string
    appearanceNotes?: string
    fullBodyUrl?: string
  }>
}): Promise<void> {
  const identityUrl = args.identityUrl.trim()
  if (!identityUrl) return

  for (const wardrobe of args.wardrobes || []) {
    const wardrobeId = wardrobe.id?.trim()
    const wardrobeUrl = wardrobe.fullBodyUrl?.trim()
    if (!wardrobeId || !wardrobeUrl) continue
    await composeUploadAndPersistCombinedCharacterRef({
      projectId: args.projectId,
      characterId: args.characterId,
      wardrobeId,
      identityUrl,
      wardrobeUrl,
      expectedFingerprint: wardrobeExpectedFingerprint(wardrobe),
      label: args.characterName,
    })
  }
}
