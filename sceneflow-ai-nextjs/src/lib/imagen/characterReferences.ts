export interface CharacterReference {
  id: number
  name: string
  imageBase64: string
  description?: string
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
        
        // Convert to Base64
        const arrayBuffer = await response.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        
        // Build description from character attributes
        const descParts = []
        if (char.ethnicity) descParts.push(char.ethnicity)
        if (char.keyFeature) descParts.push(char.keyFeature)
        if (char.hairStyle) descParts.push(`${char.hairColor || ''} ${char.hairStyle}`.trim())
        
        references.push({
          id: refId++,
          name: char.name,
          imageBase64: base64,
          description: descParts.join(', ') || char.description || char.name
        })
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

