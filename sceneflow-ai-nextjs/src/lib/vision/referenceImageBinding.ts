/**
 * One sentence names each attached image. The instruction repeats that same
 * token, so the model is told which picture is which subject.
 *
 * Captions are the text part immediately before the image bytes ("the next
 * image"). The instruction comes after every image ("the images above").
 */

export type ReferenceImageRole =
  | 'identity'
  | 'wardrobe'
  | 'character'
  | 'prop'
  | 'location'
  | 'opening-frame'

export interface ReferenceImageBinding {
  role: ReferenceImageRole
  /** `person [1]`, `prop [1]`, or `location [1]`. Omitted for the opening frame. */
  token?: string
  /** Library display name, used in the instruction so a stored legend still parses. */
  name?: string
  /** Short physical note after the caption sentence. Shot rules stay in the task. */
  descriptor?: string
}

export const OPENING_FRAME_CAPTION = 'The next image is the opening frame.'

export const IMAGES_ABOVE_LEAD = 'Use the images above.'

const NEXT_IMAGE_CAPTION =
  /^The next image is (?:the identity of |the wardrobe of |the identity and wardrobe of )?(person \[\d+\]|prop \[\d+\]|location \[\d+\]|the opening frame)\./i

export function isNextImageCaption(text?: string | null): boolean {
  return NEXT_IMAGE_CAPTION.test((text || '').trim())
}

function subjectLabel(token: string, name?: string): string {
  const display = name?.trim()
  return display ? `${token} (${display})` : token
}

export function formatNextImageCaption(binding: ReferenceImageBinding): string {
  const token = binding.token?.replace(/\s+/g, ' ').trim()
  let sentence: string
  switch (binding.role) {
    case 'identity':
      sentence = `The next image is the identity of ${token}.`
      break
    case 'wardrobe':
      sentence = `The next image is the wardrobe of ${token}.`
      break
    case 'character':
      sentence = `The next image is the identity and wardrobe of ${token}.`
      break
    case 'prop':
      sentence = `The next image is ${token}.`
      break
    case 'location':
      sentence = `The next image is ${token}.`
      break
    case 'opening-frame':
      sentence = OPENING_FRAME_CAPTION
      break
    default:
      sentence = token ? `The next image is ${token}.` : OPENING_FRAME_CAPTION
  }
  const descriptor = binding.descriptor?.replace(/\s+/g, ' ').trim()
  return descriptor ? `${sentence} ${descriptor}` : sentence
}

interface PersonSlot {
  token: string
  name?: string
  identity: boolean
  wardrobe: boolean
  character: boolean
}

function personInstruction(slot: PersonSlot): string {
  const named = subjectLabel(slot.token, slot.name)
  if (slot.character && !slot.identity && !slot.wardrobe) {
    return `${named} is the person in the identity and wardrobe image of ${slot.token}.`
  }
  const parts: string[] = []
  if (slot.identity || slot.character) {
    parts.push(`${named} is the person in the identity image of ${slot.token}.`)
  }
  if (slot.wardrobe) {
    parts.push(`Clothes of ${slot.token} are the wardrobe image of ${slot.token}.`)
  }
  return parts.join(' ')
}

/**
 * Instruction lead. Points backward at the images already attached.
 * People, then props, then locations. The opening frame is named only on its caption.
 */
export function formatImagesAboveBinding(bindings: ReferenceImageBinding[]): string {
  const people = new Map<string, PersonSlot>()
  const props: ReferenceImageBinding[] = []
  const locations: ReferenceImageBinding[] = []

  for (const binding of bindings) {
    const token = binding.token?.replace(/\s+/g, ' ').trim()
    if (!token || binding.role === 'opening-frame') continue
    if (binding.role === 'identity' || binding.role === 'wardrobe' || binding.role === 'character') {
      const slot = people.get(token) ?? {
        token,
        name: binding.name,
        identity: false,
        wardrobe: false,
        character: false,
      }
      if (!slot.name && binding.name) slot.name = binding.name
      if (binding.role === 'identity') slot.identity = true
      if (binding.role === 'wardrobe') slot.wardrobe = true
      if (binding.role === 'character') slot.character = true
      people.set(token, slot)
      continue
    }
    if (binding.role === 'prop') props.push(binding)
    if (binding.role === 'location') locations.push(binding)
  }

  const lines: string[] = []
  for (const slot of people.values()) {
    const line = personInstruction(slot)
    if (line) lines.push(line)
  }
  for (const binding of props) {
    const token = binding.token!.replace(/\s+/g, ' ').trim()
    lines.push(
      `${subjectLabel(token, binding.name)} is the object in the prop image of ${token}.`
    )
  }
  for (const binding of locations) {
    const token = binding.token!.replace(/\s+/g, ' ').trim()
    lines.push(
      `${subjectLabel(token, binding.name)} is the place in the location image of ${token}.`
    )
  }
  if (lines.length === 0) return ''
  return [IMAGES_ABOVE_LEAD, ...lines].join('\n')
}

export function bindingFromCaption(caption?: string | null): ReferenceImageBinding | null {
  const text = (caption || '').trim()
  if (!text) return null
  if (/^The next image is the opening frame\./i.test(text)) {
    return { role: 'opening-frame' }
  }
  const identity = text.match(/^The next image is the identity of (person \[\d+\])\./i)
  if (identity && !/identity and wardrobe/i.test(text)) {
    return { role: 'identity', token: normalizeToken(identity[1]) }
  }
  const wardrobe = text.match(/^The next image is the wardrobe of (person \[\d+\])\./i)
  if (wardrobe) return { role: 'wardrobe', token: normalizeToken(wardrobe[1]) }
  const character = text.match(
    /^The next image is the identity and wardrobe of (person \[\d+\])\./i
  )
  if (character) return { role: 'character', token: normalizeToken(character[1]) }
  const prop = text.match(/^The next image is (prop \[\d+\])\./i)
  if (prop) return { role: 'prop', token: normalizeToken(prop[1]) }
  const location = text.match(/^The next image is (location \[\d+\])\./i)
  if (location) return { role: 'location', token: normalizeToken(location[1]) }
  return null
}

function normalizeToken(token: string): string {
  return token.replace(/\s+/g, ' ').replace(/^(person|prop|location)\s*\[/i, (_, kind) => {
    const name = String(kind).toLowerCase()
    return `${name} [`
  })
}

const LEGACY_LABEL =
  /^(identity|wardrobe|location|prop) reference(?:\s+\d+)?:\s*(.+)$/i

/**
 * Bind a list of reference records. Captions that already name a token win.
 * Older "Identity reference N: Name" labels become the same sentences, with
 * the token counted among people / props / locations — not the pre-cap index.
 */
export function bindingsFromReferenceRecords(
  refs: Array<{
    name?: string
    role?: string
    refRole?: string
    characterName?: string
    propName?: string
    locationName?: string
    promptToken?: string
    subjectOrdinal?: number
  }>
): ReferenceImageBinding[] {
  const personByName = new Map<string, string>()
  let nextPerson = 1
  let nextProp = 1
  let nextLocation = 1

  const bindings: ReferenceImageBinding[] = []
  for (const ref of refs) {
    const fromCaption = bindingFromCaption(ref.name)
    if (fromCaption?.token || fromCaption?.role === 'opening-frame') {
      bindings.push({
        ...fromCaption,
        name: ref.characterName || ref.propName || ref.locationName || fromCaption.name,
      })
      continue
    }

    const legacy = ref.name?.trim().match(LEGACY_LABEL)
    const legacyRole = legacy?.[1]?.toLowerCase()
    const legacyName = legacy?.[2]?.replace(/\s*\([^)]*\)\s*$/, '').trim()
    const characterName = ref.characterName || (legacyRole === 'identity' || legacyRole === 'wardrobe' ? legacyName : undefined)
    const propName = ref.propName || (legacyRole === 'prop' ? legacyName : undefined)
    const locationName = ref.locationName || (legacyRole === 'location' ? legacyName : undefined)

    const refRole = ref.refRole || ''
    const role = (ref.role || '').toLowerCase()
    const isWardrobe = refRole === 'wardrobe' || legacyRole === 'wardrobe' || role === 'wardrobe'
    const isDiptych = refRole === 'wardrobe-diptych'
    const isProp = Boolean(propName) || role.startsWith('prop') || legacyRole === 'prop'
    const isLocation = Boolean(locationName) || role === 'location' || legacyRole === 'location'
    const isPerson = Boolean(characterName) || role === 'identity' || legacyRole === 'identity' || isWardrobe || isDiptych

    if (isPerson && !isProp && !isLocation) {
      let key = (characterName || legacyName || '').toLowerCase()
      if (!key && ref.name) {
        const known = [...personByName.keys()].find((name) =>
          ref.name!.toLowerCase().includes(name)
        )
        if (known) key = known
      }
      let token =
        ref.subjectOrdinal != null
          ? `person [${ref.subjectOrdinal}]`
          : key
            ? personByName.get(key)
            : undefined
      if (!token) {
        token = `person [${nextPerson}]`
        nextPerson += 1
        if (key) personByName.set(key, token)
      } else if (key && !personByName.has(key)) {
        personByName.set(key, token)
        const ordinal = Number(token.match(/\[(\d+)\]/)?.[1])
        if (Number.isFinite(ordinal) && ordinal >= nextPerson) nextPerson = ordinal + 1
      }
      bindings.push({
        role: isDiptych ? 'character' : isWardrobe ? 'wardrobe' : 'identity',
        token,
        name: characterName || legacyName,
      })
      continue
    }

    if (isProp) {
      const token = libraryToken(ref.promptToken, 'prop') || `prop [${nextProp++}]`
      bindings.push({ role: 'prop', token, name: propName })
      continue
    }

    if (isLocation) {
      const token = libraryToken(ref.promptToken, 'location') || `location [${nextLocation++}]`
      bindings.push({ role: 'location', token, name: locationName })
    }
  }
  return bindings
}

function libraryToken(promptToken: string | undefined, kind: 'prop' | 'location'): string | undefined {
  const token = promptToken?.replace(/\s+/g, ' ').trim()
  if (!token) return undefined
  return new RegExp(`^${kind} \\[\\d+\\]$`, 'i').test(token) ? normalizeToken(token) : undefined
}

/**
 * Replace visual names with the token on their image. Quoted speech is left
 * alone so a spoken line can keep the speaker's name.
 */
export function rewriteVisualNamesToTokens(
  text: string,
  replacements: Array<{ name?: string; token?: string }>
): string {
  if (!text?.trim()) return text
  const sorted = replacements
    .map((entry) => ({
      name: entry.name?.trim() || '',
      token: entry.token?.replace(/\s+/g, ' ').trim() || '',
    }))
    .filter((entry) => entry.name && entry.token && entry.name !== entry.token)
    .sort((a, b) => b.name.length - a.name.length)
  if (sorted.length === 0) return text

  const parts = text.split(/("[^"]*"|'[^']*')/g)
  return parts
    .map((part, index) => {
      if (index % 2 === 1) return part
      let next = part
      for (const entry of sorted) {
        const pattern = new RegExp(`\\b${escapeRegExp(entry.name)}\\b`, 'gi')
        next = next.replace(pattern, entry.token)
      }
      return next
    })
    .join('')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
