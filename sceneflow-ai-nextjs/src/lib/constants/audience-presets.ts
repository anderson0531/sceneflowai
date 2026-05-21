/**
 * One-click target audience presets for Blueprint + Script Audience Resonance.
 */

import type { AudienceTargetProfile } from '@/lib/types/audienceResonance'

export interface AudiencePreset {
  id: string
  label: string
  description: string
  profile: AudienceTargetProfile
  /** Optional hint appended to analysis prompt */
  directionHint?: string
}

export const AUDIENCE_PRESETS: AudiencePreset[] = [
  {
    id: 'gen-z-digital',
    label: 'Gen Z (18–24)',
    description: 'Short-form native, ironic, socially aware',
    profile: {
      region: 'global',
      ageRange: 'young-adult-18-24',
      gender: 'all-genders',
      educationLevel: 'some-college',
      community: 'urban-metropolitan',
    },
    directionHint: 'Evaluate hook speed, authenticity, and shareability for Gen Z.',
  },
  {
    id: 'millennials-streaming',
    label: 'Millennials (25–34)',
    description: 'Streaming-first, character-driven, premium feel',
    profile: {
      region: 'north-america',
      ageRange: 'millennials-25-34',
      gender: 'all-genders',
      educationLevel: 'college-educated',
      community: 'general',
    },
    directionHint: 'Focus on emotional payoff and bingeable structure for millennial streamers.',
  },
  {
    id: 'family-all-ages',
    label: 'Family (all ages)',
    description: 'Warm, accessible, low edge',
    profile: {
      region: 'global',
      ageRange: 'family-all-ages',
      gender: 'all-genders',
      educationLevel: 'general',
      community: 'family-parenting',
    },
    directionHint: 'Ensure clarity, warmth, and age-appropriate stakes for family viewing.',
  },
  {
    id: 'mature-prestige',
    label: 'Mature prestige',
    description: 'Sophisticated themes, slower burn',
    profile: {
      region: 'global',
      ageRange: 'gen-x-35-54',
      gender: 'all-genders',
      educationLevel: 'college-educated',
      community: 'general',
    },
    directionHint: 'Prioritize thematic depth, nuance, and prestige-drama audience expectations.',
  },
  {
    id: 'women-leaning-romance',
    label: 'Women-leaning romance',
    description: 'Emotional arc, relationship dynamics',
    profile: {
      region: 'global',
      ageRange: 'millennials-25-34',
      gender: 'women-leaning',
      educationLevel: 'general',
      community: 'general',
    },
    directionHint: 'Stress relationship stakes, emotional authenticity, and satisfying character arcs.',
  },
  {
    id: 'action-men-primary',
    label: 'Action (men-primary)',
    description: 'High stakes, kinetic energy',
    profile: {
      region: 'global',
      ageRange: 'millennials-25-34',
      gender: 'men-primary',
      educationLevel: 'general',
      community: 'general',
    },
    directionHint: 'Evaluate clarity of stakes, pacing, and spectacle for action-forward audiences.',
  },
]

export function getAudiencePreset(id: string): AudiencePreset | undefined {
  return AUDIENCE_PRESETS.find((p) => p.id === id)
}
