const SCENE_CODE_DEFINITIONS: Record<string, string> = {
  'INT': 'Interior',
  'EXT': 'Exterior',
  'INT/EXT': 'Interior/Exterior',
  'EXT/INT': 'Exterior/Interior'
}

const SCENE_CODE_REGEX = /^(INT\.\/EXT\.|EXT\.\/INT\.|INT\.\/EXT|EXT\.\/INT|INT\. |EXT\. |INT\/EXT|EXT\/INT|INT\.|EXT\.|INT|EXT)\s*(.*)$/i

export function formatSceneHeading(rawHeading?: string | null): string {
  if (!rawHeading) return ''
  const heading = rawHeading.trim()
  if (!heading) return ''

  const match = heading.match(SCENE_CODE_REGEX)
  if (!match) {
    return heading
  }

  const codeRaw = match[1]?.toUpperCase().replace(/\s+/g, '') || ''
  const normalizedCode = codeRaw.replace(/\./g, '')
  const remainder = match[2]?.trim() || ''
  const definition = SCENE_CODE_DEFINITIONS[normalizedCode]
  const prefix = definition ? `${normalizedCode} (${definition})` : normalizedCode
  const base = `${prefix}.`

  return remainder ? `${base} ${remainder}` : base
}
