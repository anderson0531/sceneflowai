/**
 * Prompts for object/prop library reference images.
 *
 * These plates are copied into stills and video. Anything extra in the
 * generation (hands, tables, staged scenes) shows up in frames that never
 * directed it. Purpose first, then isolation — product-hero copy invited a
 * scene instead of a plate.
 */

/** Lead: this still exists to lock identity of the object, not to illustrate a beat. */
export const OBJECT_REFERENCE_PURPOSE =
  'Create the image to be used as a reference image for consistency across image and video generations.'

export const OBJECT_REFERENCE_ISOLATION =
  'Isolated subject only. Do not add people, hands, tables, furniture, or other undirected objects. This is not a scene.'

/**
 * Scale consistency is now driven by explicit text dimensions paired with the
 * reference image at shot generation time rather than a rendered backdrop ruler.
 */
export const OBJECT_REFERENCE_SCALE_RULER =
  'Do not draw or place any ruler, measuring tape, height/width scale bar, tick marks, or dimension labels on the backdrop or on the object itself.'

export const OBJECT_REFERENCE_REAL_WORLD_SCALE =
  'Show true real-world scale: handheld items stay handheld (include explicit dimensions in inches or feet when known); set-pieces stay set-piece size. Do not crop so the object fills the frame as if it were larger.'

export const OBJECT_REFERENCE_STUDIO =
  'Clean studio lighting, plain neutral backdrop, centered composition, high resolution, sharp focus.'

export const OBJECT_REFERENCE_GENERATION_INSTRUCTION = [
  OBJECT_REFERENCE_PURPOSE,
  OBJECT_REFERENCE_ISOLATION,
  OBJECT_REFERENCE_REAL_WORLD_SCALE,
  OBJECT_REFERENCE_STUDIO,
].join(' ')

/** Vertex negative prompt: extras the plate must not invent. Dress form is allowed. */
export const OBJECT_REFERENCE_NEGATIVE_PROMPT =
  'people, persons, humans, hands holding the object, extra furniture, tables used as a set, scene staging, ruler, measuring tape, scale bar, height chart, dimension lines, measurements on the object, tick marks on the object, engraved scale on the object'

const PURPOSE_RE = /to be used as a reference image for consistency/i
const ISOLATION_RE = /isolated subject only|do not add people, hands, tables/i
const SCALE_RE = /true real-world scale/i
const STUDIO_RE = /plain neutral backdrop/i
const LEGACY_RULER_SENTENCE_RE =
  /\s*(?:Place a simple ruler or height\/width scale beside the object, on the backdrop, so real-world size stays measurable\.|A simple ruler or height\/width marks on the object are allowed so real-world size stays measurable\.)(?:\s*Never engrave, print, paint, or draw measurements, tick marks, or inch\/cm labels on the object itself\.)?(?:\s*Nothing else\.)?/gi

/** Append purpose, isolation, and real-world scale when a user/AI description omitted them, stripping legacy backdrop-ruler instructions. */
export function withObjectReferenceInstruction(prompt: string): string {
  const next = (prompt || '')
    .replace(LEGACY_RULER_SENTENCE_RE, ' ')
    .trim()
    .replace(/\s{2,}/g, ' ')
  if (!next) return OBJECT_REFERENCE_GENERATION_INSTRUCTION

  const parts: string[] = []
  if (!PURPOSE_RE.test(next)) parts.push(OBJECT_REFERENCE_PURPOSE)
  if (!ISOLATION_RE.test(next)) parts.push(OBJECT_REFERENCE_ISOLATION)
  if (!SCALE_RE.test(next)) parts.push(OBJECT_REFERENCE_REAL_WORLD_SCALE)
  if (!STUDIO_RE.test(next)) parts.push(OBJECT_REFERENCE_STUDIO)
  if (parts.length === 0) return next
  return `${next} ${parts.join(' ')}`
}
