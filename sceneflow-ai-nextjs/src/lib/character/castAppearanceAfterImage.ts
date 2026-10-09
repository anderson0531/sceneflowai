/**
 * Vision analysis describes the generated still. It fills Body Description
 * only when that field is empty. A description the director already saved
 * stays the identity text shown in Continuity Library.
 */
export function castAppearanceAfterImage(input: {
  existingAppearance?: string | null
  visionDescription?: string | null
}): {
  patch: {
    visionDescription?: string
    appearanceDescription?: string
  }
  /** Body text the Casting Brief should follow after this still. */
  briefAppearance?: string
  /** True when an empty body field is filled from the portrait analysis. */
  appearanceChanged: boolean
} {
  const existing = input.existingAppearance?.trim() || ''
  const vision = input.visionDescription?.trim() || ''
  if (!vision) {
    return { patch: {}, appearanceChanged: false }
  }
  if (existing) {
    return {
      patch: { visionDescription: vision },
      briefAppearance: existing,
      appearanceChanged: false,
    }
  }
  return {
    patch: {
      visionDescription: vision,
      appearanceDescription: vision,
    },
    briefAppearance: vision,
    appearanceChanged: true,
  }
}
