export function buildInitialSynopsis(script: any): string {
  const parts: string[] = []
  parts.push(`TITLE: ${script?.title || 'Untitled Project'}`)
  parts.push('GLOBAL SYNOPSIS (compact):')
  for (const scene of script?.scenes || []) {
    const head = (scene.heading || 'Untitled').replace(/\s+/g, ' ').trim()
    const gist = summarizeScene(scene)
    parts.push(`- ${head}: ${gist}`)
    if (parts.join('\n').length > 1800) break
  }
  return parts.join('\n')
}

export function updateSynopsis(currentSynopsis: string, revisedScene: any, sceneIndex: number): string {
  const lines = currentSynopsis.split('\n')
  const head = (revisedScene.heading || `Scene ${sceneIndex + 1}`).replace(/\s+/g, ' ').trim()
  const gist = summarizeScene(revisedScene)
  const needle = `- ${head}:`
  const updated = `- ${head}: ${gist}`
  const idx = lines.findIndex(l => l.startsWith(needle))
  if (idx >= 0) lines[idx] = updated
  else lines.push(updated)
  const text = lines.join('\n')
  return text.length > 2000 ? text.slice(0, 2000) : text
}

function summarizeScene(scene: any): string {
  const parts: string[] = []
  const n = String(scene?.narration || '').replace(/\s+/g, ' ').trim()
  const a = String(scene?.action || '').replace(/\s+/g, ' ').trim()
  if (n) parts.push(n)
  else if (a) parts.push(a)
  const dCount = Array.isArray(scene?.dialogue) ? scene.dialogue.length : 0
  if (dCount) parts.push(`[dialogue: ${dCount}]`)
  const s = parts.join(' ')
  return s.length > 220 ? s.slice(0, 217) + '…' : s
}


