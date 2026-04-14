const FTV_STABILITY_TOKENS = [
  'Maintain pixel-perfect consistency with the start frame.',
  'Ensure lighting and shadows remain static.',
  'Smooth facial muscle transitions; prioritize natural lip movement.',
]

export function appendFtvTransitionStabilityTokens(
  prompt: string,
  method: string,
  segmentIndex?: number
): string {
  if (method !== 'FTV') return prompt
  if (typeof segmentIndex !== 'number' || segmentIndex <= 0) return prompt
  return `${prompt}\n\n${FTV_STABILITY_TOKENS.join('\n')}`
}
