/**
 * A library prop that is a photograph, not an object sitting in the room.
 *
 * Its description is often a biography of the person in the picture ("Sarah is
 * a beautiful white woman"). Putting that sentence on the plate tells the
 * still model to draw a person. The plate is the picture; the words have to
 * say so.
 */

const PICTURE_PROP_PATTERN =
  /\b(?:photos?|photographs?|pictures?|portraits?|snapshots?)\b/i

export function isPictureProp(name?: string | null, description?: string | null): boolean {
  return PICTURE_PROP_PATTERN.test(`${name ?? ''} ${description ?? ''}`)
}

/**
 * One sentence, under the 18-word interleaved pair cap, with no person biography.
 * A period would be clipped away; the instruction has to survive as one clause.
 */
export const PICTURE_PROP_OBJECT_DESCRIPTOR =
  'Object reference: copy this framed photograph exactly; people shown are only inside it, not in the room'
