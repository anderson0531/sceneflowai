/** Client-safe scene type helpers (no server/AI dependencies). */

export function isTitleOrCinematicScene(scene: Record<string, unknown>): boolean {
  if (scene.cinematicType === 'title' || scene.cinematicType === 'outro') return true
  const heading = String(scene.heading ?? '').toLowerCase()
  return (
    heading.includes('title sequence') ||
    heading.includes('title card') ||
    heading.includes('opening title') ||
    heading.includes('main title')
  )
}
