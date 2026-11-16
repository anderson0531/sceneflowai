/**
 * Physical Realism guidance for Shot Director (Still & Clip prompt compilation).
 *
 * Grounds generated stills, start/end keyframes, and motion clips in real-world
 * physics, accurate contact shadows and weight distribution, rigid structural
 * integrity, consistent object permanence, natural anatomical proportions, and
 * physical camera optics. Client-safe and idempotent across re-compiles.
 */

export const PHYSICAL_REALISM_STILL_DIRECTIVE =
  'Physical realism: grounded in real-world physics, accurate contact shadows and weight distribution, rigid structural integrity, consistent object permanence, natural anatomical proportions, captured on a physical camera.'

export const PHYSICAL_REALISM_STILL_EMPTY_CAST_DIRECTIVE =
  'Physical realism: grounded in real-world physics, accurate contact shadows and weight distribution, rigid structural integrity, consistent object permanence, captured on a physical camera.'

export const PHYSICAL_REALISM_CLIP_DIRECTIVE =
  'Physical realism: grounded in real-world physics, accurate contact shadows and weight distribution, natural inertia and momentum, rigid structural integrity without warping or morphing, consistent object permanence, natural anatomical proportions and joint articulation, captured on a physical camera'

export const PHYSICAL_REALISM_CLIP_EMPTY_CAST_DIRECTIVE =
  'Physical realism: grounded in real-world physics, accurate contact shadows and weight distribution, natural inertia and momentum, rigid structural integrity without warping or morphing, consistent object permanence, captured on a physical camera'

export const PHYSICAL_REALISM_STILL_EXCLUSIONS =
  'Strictly Avoid: floating feet, missing contact shadows, weightless posture, warped rigid architecture or props, distorted anatomical proportions.'

export const PHYSICAL_REALISM_VIDEO_NEGATIVES = [
  'floating feet',
  'missing contact shadows',
  'weightless motion',
  'warping rigid objects',
  'morphing props',
  'vanishing or teleporting objects',
  'distorted limb proportions',
  'impossible joint articulation',
  'synthetic CGI sheen',
].join(', ')

export const PHYSICAL_REALISM_REFINE_CHIP_TEXT =
  'Ground the frame in real-world physics with accurate contact shadows and weight distribution, rigid structural integrity on architecture and props, consistent object permanence, natural anatomical proportions, and authentic physical camera optics while keeping composition and subject identity intact.'

export const PHYSICAL_REALISM_VIDEO_CHIP_TEXT =
  'Ground motion in real-world physics: accurate contact shadows and weight distribution, rigid structural integrity, consistent object permanence, natural anatomical proportions, captured on a physical camera.'

export const PHYSICAL_REALISM_PREVIEW_SUMMARY =
  'Grounded in real-world physics, accurate contact shadows and weight distribution, rigid structural integrity, consistent object permanence, natural anatomical proportions, captured on a physical camera'

const PHYSICAL_REALISM_MARKER_RE =
  /\b(?:Physical realism:\s*grounded in real-world physics|grounded in real-world physics,\s*accurate contact shadows and weight distribution)\b/i

export function hasPhysicalRealismClause(text?: string | null): boolean {
  if (!text?.trim()) return false
  return PHYSICAL_REALISM_MARKER_RE.test(text)
}

export function stripPhysicalRealismClause(text?: string | null): string {
  if (!text?.trim()) return ''
  return text
    .replace(
      /\s*Physical realism:\s*grounded in real-world physics[^.]*captured on a physical camera\.?/gi,
      ''
    )
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim()
}

export function resolveStillPhysicalRealismDirective(options?: {
  emptyCast?: boolean
}): string {
  return options?.emptyCast
    ? PHYSICAL_REALISM_STILL_EMPTY_CAST_DIRECTIVE
    : PHYSICAL_REALISM_STILL_DIRECTIVE
}

export function resolveClipPhysicalRealismDirective(options?: {
  emptyCast?: boolean
}): string {
  return options?.emptyCast
    ? PHYSICAL_REALISM_CLIP_EMPTY_CAST_DIRECTIVE
    : PHYSICAL_REALISM_CLIP_DIRECTIVE
}

export function buildPhysicalRealismAuthoringRules(): string {
  return [
    'PHYSICAL REALISM & CAMERA OPTICS (authoritative):',
    'Direct both the Still and the 10s Clip so every frame and motion transition obeys real-world physics and physical camera capture:',
    '- Grounded weight & contact shadows: explicitly stage how feet, hands, bodies, and resting props plant weight onto solid supporting surfaces with matching contact shadows; never stage floating or weightless poses.',
    '- Rigid structural integrity & object permanence: solid architecture, furniture, vehicles, and handheld props maintain rigid geometry, fixed scale, and continuous physical presence from startFrame (0s–2s) through clipAction (2s–8s) to endFrame (8s–10s) without warping, bending, melting, or vanishing.',
    '- Natural anatomical proportions & biomechanics: stage movement with realistic inertia, balanced center of gravity, natural joint articulation, and physically plausible hand/finger grip on props.',
    '- Physical camera capture: frame and move the camera as a real physical cinema camera on a tripod, dolly, Steadicam, or handheld rig with natural optical depth of field and physically motivated lighting.',
  ].join('\n')
}
