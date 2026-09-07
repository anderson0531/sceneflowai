/**
 * Neutral aliases for generation prompts that bind character reference images.
 * UI, script, and TTS keep the display name.
 */

export function toCharacterPromptAlias(name: string | null | undefined): string {
  const raw = String(name ?? '').trim()
  const cleaned = raw
    .replace(/^Char[_-]+/i, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const token = cleaned || 'Character'
  return `Char_${token}`
}

const IDENTITY_LABEL_PREFIX =
  /^(Identity(?:\+wardrobe)?(?: diptych)? reference(?: \d+)?:\s*)(.+)$/i
const WARDROBE_LABEL_PREFIX = /^(Wardrobe reference(?: \d+)?:\s*)(.+)$/i
const DIPTYCH_LABEL_PREFIX = /^(Diptych ref:\s*)(.+)$/i

function aliasNameKeepingOutfitSuffix(nameAndSuffix: string): string {
  const trimmed = nameAndSuffix.trim()
  const outfit = trimmed.match(/^(.*?)(\s*\(full-body outfit\))$/i)
  if (outfit) {
    return `${toCharacterPromptAlias(outfit[1])}${outfit[2]}`
  }
  const emDash = trimmed.match(/^(.*?)\s+([—–].+)$/)
  if (emDash && /LEFT\s*=\s*identity/i.test(emDash[2])) {
    return `${toCharacterPromptAlias(emDash[1])} ${emDash[2]}`
  }
  return toCharacterPromptAlias(trimmed)
}

/**
 * Rewrite the character-name portion of a video ingredient label to Char_Alias.
 * Location and prop labels are left unchanged.
 */
export function aliasCharacterVideoLabel(label: string): string {
  const trimmed = label.replace(/\s+/g, ' ').trim()
  if (!trimmed) return trimmed
  if (/^(location|prop|setting)\b/i.test(trimmed) || /location reference/i.test(trimmed)) {
    return trimmed
  }

  const identity = trimmed.match(IDENTITY_LABEL_PREFIX)
  if (identity) return `${identity[1]}${aliasNameKeepingOutfitSuffix(identity[2])}`

  const wardrobe = trimmed.match(WARDROBE_LABEL_PREFIX)
  if (wardrobe) return `${wardrobe[1]}${aliasNameKeepingOutfitSuffix(wardrobe[2])}`

  const diptych = trimmed.match(DIPTYCH_LABEL_PREFIX)
  if (diptych) return `${diptych[1]}${aliasNameKeepingOutfitSuffix(diptych[2])}`

  const emParts = trimmed.split(/\s*[—–]\s*/)
  if (emParts.length >= 2) {
    emParts[0] = toCharacterPromptAlias(emParts[0])
    return emParts.join(' — ')
  }

  return toCharacterPromptAlias(trimmed)
}
