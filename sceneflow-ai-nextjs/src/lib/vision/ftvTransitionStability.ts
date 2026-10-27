const FTV_STABILITY_TOKENS = [
  'Maintain pixel-perfect consistency with the start frame.',
  'Ensure lighting and shadows remain static.',
  'Smooth facial muscle transitions; prioritize natural lip movement.',
]

const FTV_START_END_INTERPOLATION_TOKENS = [
  'Transition smoothly from the start frame composition and pose to the end frame state while maintaining character identity, wardrobe, and environment consistency.',
  'Smooth facial muscle transitions; prioritize natural lip movement.',
]

export interface FtvTransitionStabilityOptions {
  /** True when both startFrameUrl and a distinct endFrameUrl are provided for keyframe interpolation. */
  hasEndFrame?: boolean
}

export function appendFtvTransitionStabilityTokens(
  prompt: string,
  method: string,
  segmentIndex?: number,
  options?: FtvTransitionStabilityOptions
): string {
  if (method !== 'FTV') return prompt
  if (options?.hasEndFrame) {
    return `${prompt}\n\n${FTV_START_END_INTERPOLATION_TOKENS.join('\n')}`
  }
  if (typeof segmentIndex !== 'number' || segmentIndex <= 0) return prompt
  return `${prompt}\n\n${FTV_STABILITY_TOKENS.join('\n')}`
}
