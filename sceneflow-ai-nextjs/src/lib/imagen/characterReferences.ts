export interface CharacterReference {
  id: number
  name: string
  bytesBase64Encoded: string
  referenceType?: 'REFERENCE_TYPE_UNSPECIFIED' | 'REFERENCE_TYPE_SUBJECT'
  subjectDescription?: string
}

export async function prepareCharacterReferences(
  characters: any[]
): Promise<CharacterReference[]> {
  const references: CharacterReference[] = []
  let refId = 1
  
  for (const char of characters) {
    if (char.referenceImage) {
      try {
        // Fetch the image
        const response = await fetch(char.referenceImage)
        if (!response.ok) {
          console.warn(`Failed to fetch image for ${char.name}`)
          continue
        }
        
        // Get image data
        const arrayBuffer = await response.arrayBuffer()
        
        // Validate image size (warn if too large)
        const sizeMB = arrayBuffer.byteLength / (1024 * 1024)
        if (sizeMB > 5) {
          console.warn(`[Char Ref] ⚠️  Large image (${sizeMB.toFixed(1)}MB) for ${char.name}. Consider using images under 5MB for optimal performance.`)
        }
        
        // Use original image for maximum facial detail
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        
        // Build description from character attributes
        const descParts = []
        if (char.ethnicity) descParts.push(char.ethnicity)
        if (char.keyFeature) descParts.push(char.keyFeature)
        if (char.hairStyle) descParts.push(`${char.hairColor || ''} ${char.hairStyle}`.trim())
        
        references.push({
          id: refId++,
          name: char.name,
          bytesBase64Encoded: base64,
          referenceType: 'REFERENCE_TYPE_SUBJECT',
          subjectDescription: char.name
        })
        
        const sizeKB = Math.round(arrayBuffer.byteLength / 1024)
        console.log(`[Char Ref] Prepared reference for ${char.name} (${sizeKB}KB, original resolution)`)
      } catch (error) {
        console.error(`Error preparing reference for ${char.name}:`, error)
      }
    }
  }
  
  return references
}

export function buildPromptWithReferences(
  basePrompt: string,
  characterReferences: CharacterReference[],
  sceneCharacters: string[]
): string {
  let prompt = basePrompt
  
  // Add character references to prompt using [referenceId] format
  if (characterReferences.length > 0) {
    const charMentions = characterReferences
      .filter(ref => sceneCharacters.includes(ref.name))
      .map(ref => `${ref.name} [${ref.id}]`)
      .join(', ')
    
    if (charMentions) {
      prompt += `\n\nFeaturing: ${charMentions}`
    }
  }
  
  return prompt
}

