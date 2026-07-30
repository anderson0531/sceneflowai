/** Canonical user-facing names for the three core product studios. */

export const STUDIO_DISPLAY_NAMES = {
  blueprint: 'Blueprint Studio',
  series: 'Series Studio',
  production: 'Production Studio',
} as const

export type StudioDisplayNameKey = keyof typeof STUDIO_DISPLAY_NAMES
