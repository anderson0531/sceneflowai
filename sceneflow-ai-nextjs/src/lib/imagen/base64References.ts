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
 * Fetch character reference images and convert to Base64
 * Resizes to moderate resolution to avoid token limits
 */
export async function prepareBase64References(
  characters: any[]
): Promise<Base64CharacterReference[]> {
  const references: Base64CharacterReference[] = []
  
  for (let i = 0; i < characters.length; i++) {
    const char = characters[i]
    
    if (!char.referenceImage) {
      console.log(`[Base64 Ref] Character ${char.name} has no reference image, skipping`)
      continue
    }

    try {
      console.log(`[Base64 Ref] Fetching ${char.name} from:`, char.referenceImage.substring(0, 50))
      
      // Fetch the image from Vercel Blob
      const response = await fetch(char.referenceImage)
      if (!response.ok) {
        console.warn(`[Base64 Ref] Failed to fetch image for ${char.name}: ${response.status}`)
        continue
      }

      const arrayBuffer = await response.arrayBuffer()
      const originalSizeKB = Math.round(arrayBuffer.byteLength / 1024)
      
      // Resize to moderate resolution (512x512) with good quality
      // This balances detail retention with token limits
      const resizedBuffer = await sharp(Buffer.from(arrayBuffer))
        .resize(512, 512, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toBuffer()
      
      const base64 = resizedBuffer.toString('base64')
      const finalSizeKB = Math.round(resizedBuffer.byteLength / 1024)
      
      console.log(`[Base64 Ref] ${char.name}: ${originalSizeKB}KB → ${finalSizeKB}KB (resized to 512x512)`)

      references.push({
        referenceId: i + 1,
        name: char.name,
        base64Image: base64,
        description: char.appearanceDescription || `${char.ethnicity || ''} ${char.subject || 'person'}`.trim()
      })
      
    } catch (error) {
      console.error(`[Base64 Ref] Error preparing ${char.name}:`, error)
    }
  }

  console.log(`[Base64 Ref] Prepared ${references.length} Base64 references`)
  return references
}

