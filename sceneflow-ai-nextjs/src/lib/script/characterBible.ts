export interface CharacterProfile {
  name: string
  bio?: string
  voice?: string
  keyTraits?: string[]
}

export function buildCharacterBible(characters: any[] = [], script: any): string {
  const profiles: CharacterProfile[] = (characters || []).map((c: any) => ({
    name: c.name,
    bio: c.bio || c.description || '',
    voice: c.voice || '',
    keyTraits: filterDistinct([
      c.keyFeature,
      c.ethnicity,
      c.hairStyle && (c.hairColor ? `${c.hairColor} ${c.hairStyle} hair` : `${c.hairStyle} hair`),
    ])
  }))

  // Heuristic: infer additional characters from script
  const scriptNames = new Set<string>()
  for (const scene of script?.scenes || []) {
    for (const line of scene?.dialogue || []) {
      if (line?.character) scriptNames.add(String(line.character))
    }
  }
  for (const name of scriptNames) {
    if (!profiles.find(p => p.name === name)) profiles.push({ name })
  }

  const lines: string[] = ['CHARACTER BIBLE:']
  for (const p of profiles) {
    const traits = (p.keyTraits || []).filter(Boolean).join(', ')
    lines.push(`- ${p.name}: ${compact([p.bio, p.voice, traits].filter(Boolean).join(' | '))}`)
  }
  return lines.join('\n')
}

function compact(text: string, max = 220): string {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1) + '…'
}

function filterDistinct(list: Array<string | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of list) {
    const s = String(v || '').trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}


