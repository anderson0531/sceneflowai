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
 * Build enhanced subject description with explicit matching directive and age clause
 */
function buildEnhancedSubjectDescription(char: any): string {
  // Start with explicit matching directive
  const baseDescription = char.appearanceDescription || 
    `${char.ethnicity || ''} ${char.subject || 'person'}`.trim()
  
  // Extract age if present (e.g., "late 50s", "60s", "40s")
  const ageMatch = baseDescription.match(/\b(late\s*)?(\d{1,2})s?\b/i)
  const ageClause = ageMatch ? ` Exact age: ${ageMatch[0]}, not older, not younger.` : ''
  
  // Add explicit matching instruction with age enforcement
  return `Match this person's facial features exactly: ${baseDescription}.${ageClause} Maintain exact likeness including face shape, bone structure, and all distinctive features.`
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
      // Using PNG instead of JPEG for better compatibility with Vertex AI reference images
      const resizedBuffer = await sharp(Buffer.from(arrayBuffer))
        .resize(1024, 1024, {
          fit: 'cover',
          position: 'center'
        })
        .png({ compressionLevel: 6 })
        .toBuffer()
      
      // Get metadata to verify dimensions and format
      const metadata = await sharp(resizedBuffer).metadata()
      console.log(`[Base64 Ref] ${char.name} metadata:`, {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha
      })
      
      const base64 = resizedBuffer.toString('base64')
      const finalSizeKB = Math.round(resizedBuffer.byteLength / 1024)
      
      console.log(`[Base64 Ref] ${char.name}: ${originalSizeKB}KB → ${finalSizeKB}KB (resized to 1024x1024)`)
      
      // Verify base64 encoding
      console.log(`[Base64 Ref] First 100 chars of base64:`, base64.substring(0, 100))
      console.log(`[Base64 Ref] Last 50 chars of base64:`, base64.substring(base64.length - 50))
      console.log(`[Base64 Ref] Base64 length:`, base64.length)
      console.log(`[Base64 Ref] Contains data URL prefix:`, base64.startsWith('data:'))

      references.push({
        referenceId: i + 1,
        name: char.name,
        base64Image: base64,
        description: buildEnhancedSubjectDescription(char)
      })
      
      // Verify the base64 can be decoded back to valid image data
      try {
        const testBuffer = Buffer.from(base64, 'base64')
        const testMetadata = await sharp(testBuffer).metadata()
        console.log(`[Base64 Ref] ${char.name} - Verification test:`, {
          canDecode: true,
          decodedFormat: testMetadata.format,
          decodedWidth: testMetadata.width,
          decodedHeight: testMetadata.height,
          matchesOriginal: testMetadata.format === metadata.format && 
                          testMetadata.width === metadata.width && 
                          testMetadata.height === metadata.height
        })
      } catch (verifyError) {
        console.error(`[Base64 Ref] ${char.name} - VERIFICATION FAILED:`, verifyError)
        console.error(`[Base64 Ref] This base64 image cannot be decoded - Vertex AI will fail to use it`)
      }
      
    } catch (error) {
      console.error(`[Base64 Ref] Error preparing ${char.name}:`, error)
    }
  }

  console.log(`[Base64 Ref] Prepared ${references.length} Base64 references`)
  return references
}

