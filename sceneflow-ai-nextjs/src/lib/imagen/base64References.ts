import sharp from 'sharp'

/**
 * Simple, clean Base64 reference image preparation for Imagen 3
 * No GCS, no complexity - just what works
 */

export interface Base64CharacterReference {
  referenceId: number
  name: string
  base64Image: string
  description: string
}

/**
 * Build enhanced subject description with essential context
 * Excludes expressions that might conflict with scene descriptions
 */
function buildEnhancedSubjectDescription(char: any): string {
  // Provide essential descriptive context for the reference image
  // but exclude expressions that might conflict with scene descriptions
  const baseDescription = char.appearanceDescription || 
    `${char.ethnicity || ''} ${char.subject || 'person'}`.trim()
  
  // Remove expression-related phrases that could conflict with scene
  const cleanedDescription = baseDescription
    .replace(/\b(with a )?(friendly|warm|stern|weary|tired|happy|sad) (smile|expression|face)\b/gi, '')
    .replace(/\.\s*$/, '') // Remove trailing period
    .trim()
  
  return cleanedDescription
}

/**
 * Fetch character reference images and convert to Base64
 * Resizes to moderate resolution to avoid token limits
 */
export async function prepareBase64References(
  characters: any[]
): Promise<Base64CharacterReference[]> {
  const references: Base64CharacterReference[] = []
  
  for (let i = 0; i < characters.length; i++) {
    const char = characters[i]
    
    // Check for either referenceImage (Vercel Blob) or referenceImageGCS (GCS)
    const imageUrl = char.referenceImage || char.referenceImageGCS
    if (!imageUrl) {
      console.log(`[Base64 Ref] Character ${char.name} has no reference image, skipping`)
      continue
    }

    try {
      console.log(`[Base64 Ref] Fetching ${char.name} from:`, imageUrl.substring(0, 50))
      
      // Fetch the image from Vercel Blob or GCS
      const response = await fetch(imageUrl)
      if (!response.ok) {
        console.warn(`[Base64 Ref] Failed to fetch image for ${char.name}: ${response.status}`)
        continue
      }

      const arrayBuffer = await response.arrayBuffer()
      const originalSizeKB = Math.round(arrayBuffer.byteLength / 1024)
      
      // Resize to higher resolution (1024x1024) with high quality
      // This preserves more facial detail for accurate character matching
      const resizedBuffer = await sharp(Buffer.from(arrayBuffer))
        .resize(1024, 1024, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 90 })
        .toBuffer()
      
      const base64 = resizedBuffer.toString('base64')
      const finalSizeKB = Math.round(resizedBuffer.byteLength / 1024)
      
      console.log(`[Base64 Ref] ${char.name}: ${originalSizeKB}KB → ${finalSizeKB}KB (resized to 1024x1024)`)

      references.push({
        referenceId: i + 1,
        name: char.name,
        base64Image: base64,
        description: buildEnhancedSubjectDescription(char)
      })
      
    } catch (error) {
      console.error(`[Base64 Ref] Error preparing ${char.name}:`, error)
    }
  }

  console.log(`[Base64 Ref] Prepared ${references.length} Base64 references`)
  return references
}

