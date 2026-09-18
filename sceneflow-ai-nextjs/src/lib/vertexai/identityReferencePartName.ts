/**
 * Label heuristic for Vertex multimodal identity plates.
 *
 * Isolated from `vertexImageClient` and `composeIdentityWardrobeDiptych` so
 * stills can crop without pulling `sharp` into video functions, and Vertex
 * can stamp ULTRA_HIGH without importing the cropper.
 */
export function isIdentityReferencePartName(name?: string): boolean {
  if (!name) return false
  const lower = name.toLowerCase()
  if (/\bwardrobe\b/.test(lower) && !/\bidentity\b/.test(lower)) return false
  if (/\bprop\b/.test(lower) || /\blocation\b/.test(lower)) return false
  return /\bidentity\b/.test(lower)
}
