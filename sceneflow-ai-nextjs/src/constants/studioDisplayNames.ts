/** Canonical user-facing names for the three core product studios. */

export const STUDIO_DISPLAY_NAMES = {
  blueprint: 'Blueprint Room',
  series: 'Series Room',
  production: 'Production Stage',
} as const

export type StudioDisplayNameKey = keyof typeof STUDIO_DISPLAY_NAMES
