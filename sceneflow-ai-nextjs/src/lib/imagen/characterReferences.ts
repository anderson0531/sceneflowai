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
        
        // Resize image to reduce token count (max 256x256)
        const resizedBase64 = await resizeImageToBase64(arrayBuffer, 256, 256)
        
        // Build description from character attributes
        const descParts = []
        if (char.ethnicity) descParts.push(char.ethnicity)
        if (char.keyFeature) descParts.push(char.keyFeature)
        if (char.hairStyle) descParts.push(`${char.hairColor || ''} ${char.hairStyle}`.trim())
        
        references.push({
          id: refId++,
          name: char.name,
          bytesBase64Encoded: resizedBase64,
          referenceType: 'REFERENCE_TYPE_SUBJECT',
          subjectDescription: char.name
        })
        
        console.log(`[Char Ref] Prepared reference for ${char.name} (resized to 256x256)`)
      } catch (error) {
        console.error(`Error preparing reference for ${char.name}:`, error)
      }
    }
  }
  
  return references
}

// Helper to resize image and convert to Base64
async function resizeImageToBase64(
  imageBuffer: ArrayBuffer,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  // Use sharp for server-side image resizing
  const sharp = require('sharp')
  
  const resized = await sharp(Buffer.from(imageBuffer))
    .resize(maxWidth, maxHeight, {
      fit: 'inside',  // Maintain aspect ratio
      withoutEnlargement: true  // Don't upscale small images
    })
    .jpeg({ quality: 75 })  // Convert to JPEG with more compression
    .toBuffer()
  
  const base64 = resized.toString('base64')
  const sizeKB = Math.round(resized.length / 1024)
  const estimatedTokens = Math.round(base64.length * 0.75)  // Rough estimate
  
  console.log(`[Char Ref] Resized image: ${sizeKB}KB, ~${estimatedTokens} tokens`)
  
  return base64
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

