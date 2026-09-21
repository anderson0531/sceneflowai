/**
 * Label heuristic for Vertex multimodal identity plates.
 *
 * Isolated from `vertexImageClient` and `composeIdentityWardrobeDiptych` so
 * stills can crop without pulling `sharp` into video functions, and Vertex
 * can stamp ULTRA_HIGH without importing the cropper.
 */

export type ProIdentityCropStatus = 'cropped' | 'already-tight' | 'skipped'

export function isIdentityReferencePartName(name?: string): boolean {
  if (!name) return false
  const lower = name.toLowerCase()
  if (/\bwardrobe\b/.test(lower) && !/\bidentity\b/.test(lower)) return false
  if (/\bprop\b/.test(lower) || /\blocation\b/.test(lower)) return false
  return /\bidentity\b/.test(lower)
}

/**
 * Pro's 560/ref cap is expected for wardrobe/location. Warn when an identity
 * plate is still in that slot without a face CU crop.
 */
export function identityPlatesNeed560Warn(
  refs?: Array<{ name?: string; proIdentityCrop?: ProIdentityCropStatus }>
): boolean {
  const identities = (refs ?? []).filter((ref) => isIdentityReferencePartName(ref.name))
  if (identities.length === 0) return false
  return identities.some((ref) => ref.proIdentityCrop !== 'cropped')
}
