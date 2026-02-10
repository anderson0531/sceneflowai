import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { analyzeCharacterImage } from '@/lib/imagen/visionAnalyzer'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import { generateWithVision } from '@/lib/vertexai/gemini'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * Enhance Character Reference API - Professional Headshot Generator
 * 
 * Transforms any character image into a high-quality, film-industry-standard
 * professional headshot optimized for consistent use across image and video production.
 * 
 * Key Features:
 * - Pre-analyzes source image to identify optimization opportunities
 * - Generates professional casting/reference headshot style
 * - Neutral gray background (#808080) for film industry standard
 * - Front-facing, head-and-shoulders framing
 * - Even studio lighting, neutral expression
 * - Strong face preservation via subject description linking
 * 
 * Credit cost: 5 credits per enhancement
 */

const CREDIT_COST = IMAGE_CREDITS.GEMINI_EDIT // 5 credits for enhancement

// Quality assessment thresholds
interface ImageAnalysis {
  hasFace: boolean
  faceCount: number
  isAlreadyOptimized: boolean
  optimizationScore: number // 0-100, higher = better for reference use
  issues: string[]
  suggestions: string[]
  demographicAnchor: string // e.g., "African American man in his late 40s"
  physicalTraits: string[] // Key physical features to preserve
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // 2. Pre-check credit balance
    const hasEnoughCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasEnoughCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      return NextResponse.json({
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: CREDIT_COST,
        balance: breakdown.total_credits,
      }, { status: 402 })
    }

    const body = await req.json()
    const { 
      characterId,
      projectId,
      sourceImageUrl,
      characterName,
      appearanceDescription,
      iterationCount = 0 
    } = body

    if (!sourceImageUrl) {
      return NextResponse.json({ error: 'Source image URL is required' }, { status: 400 })
    }

    if (!characterName) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    // Check iteration limit (max 3 iterations)
    if (iterationCount >= 3) {
      return NextResponse.json({ 
        error: 'Maximum enhancement iterations reached. Please upload a new source image.',
        code: 'MAX_ITERATIONS_REACHED'
      }, { status: 400 })
    }

    console.log(`[Enhance Reference] Enhancing character: ${characterName}`)
    console.log(`[Enhance Reference] Source image: ${sourceImageUrl.substring(0, 60)}...`)
    console.log(`[Enhance Reference] Iteration: ${iterationCount + 1}/3`)

    // STAGE 1: Pre-analyze source image for optimization opportunities
    console.log(`[Enhance Reference] Stage 1: Analyzing source image...`)
    const imageAnalysis = await analyzeSourceImage(sourceImageUrl, characterName, appearanceDescription)
    
    // If image is already highly optimized (score > 85) and this is iteration 2+, suggest new upload
    if (imageAnalysis.isAlreadyOptimized && iterationCount >= 1) {
      console.log(`[Enhance Reference] Image already optimized (score: ${imageAnalysis.optimizationScore}), suggesting new upload`)
      return NextResponse.json({
        error: 'This image is already well-optimized for reference use. For better results, try uploading a different source image with more natural lighting or pose variation.',
        code: 'ALREADY_OPTIMIZED',
        analysis: {
          score: imageAnalysis.optimizationScore,
          suggestions: ['Upload a new source image for fresh enhancement']
        }
      }, { status: 400 })
    }

    // STAGE 2: Build optimized enhancement prompt
    console.log(`[Enhance Reference] Stage 2: Building enhancement prompt...`)
    const enhancementPrompt = buildProfessionalHeadshotPrompt(
      characterName,
      imageAnalysis,
      appearanceDescription
    )
    
    console.log(`[Enhance Reference] Enhancement prompt: ${enhancementPrompt.substring(0, 300)}...`)

    // STAGE 3: Build strong subject description for face preservation
    const subjectDescription = buildSubjectDescription(
      characterName,
      imageAnalysis.demographicAnchor,
      imageAnalysis.physicalTraits
    )
    console.log(`[Enhance Reference] Subject description: ${subjectDescription}`)

    // STAGE 4: Generate enhanced image using source as reference with face mesh control
    console.log(`[Enhance Reference] Stage 3: Generating enhanced headshot...`)
    const base64Image = await generateImageWithGemini(enhancementPrompt, {
      aspectRatio: '1:1', // Square for consistent reference format
      numberOfImages: 1,
      personGeneration: 'allow_adult',
      referenceImages: [{
        referenceId: 1,
        imageUrl: sourceImageUrl,
        subjectDescription: subjectDescription
      }]
    })
    
    // Upload enhanced image to Vercel Blob
    const enhancedImageUrl = await uploadImageToBlob(
      base64Image,
      `characters/enhanced-${characterId || 'char'}-${Date.now()}.png`
    )
    
    // STAGE 5: Auto-analyze the enhanced image for appearance description
    console.log(`[Enhance Reference] Stage 4: Analyzing enhanced result...`)
    let visionDescription = null
    try {
      visionDescription = await analyzeCharacterImage(enhancedImageUrl, characterName)
      console.log(`[Enhance Reference] Auto-analyzed enhanced image`)
    } catch (error) {
      console.error('[Enhance Reference] Vision analysis failed:', error)
    }

    // Charge credits after successful generation
    let newBalance: number | undefined
    try {
      await CreditService.charge(
        userId,
        CREDIT_COST,
        'ai_usage',
        projectId || null,
        { operation: 'enhance_character_reference', characterId, model: 'imagen-3-capability' }
      )
      console.log(`[Enhance Reference] Charged ${CREDIT_COST} credits to user ${userId}`)
      const breakdown = await CreditService.getCreditBreakdown(userId)
      newBalance = breakdown.total_credits
    } catch (chargeError: any) {
      console.error('[Enhance Reference] Failed to charge credits:', chargeError)
    }
    
    return NextResponse.json({ 
      success: true, 
      enhancedImageUrl,
      visionDescription,
      iterationCount: iterationCount + 1,
      remainingIterations: 3 - (iterationCount + 1),
      creditsCharged: CREDIT_COST,
      creditsBalance: newBalance,
      // Quality feedback for UI
      qualityFeedback: {
        originalScore: imageAnalysis.optimizationScore,
        issuesFixed: imageAnalysis.issues,
        improvements: getImprovementsSummary(imageAnalysis)
      }
    })

  } catch (error) {
    console.error('[Enhance Reference] Enhancement error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Enhancement failed' 
    }, { status: 500 })
  }
}

/**
 * Pre-analyze source image using Gemini Vision to identify optimization opportunities
 */
async function analyzeSourceImage(
  imageUrl: string,
  characterName: string,
  existingDescription?: string
): Promise<ImageAnalysis> {
  try {
    // Fetch and encode image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') 
      ? 'image/jpeg' 
      : 'image/png'

    const analysisPrompt = `Analyze this image for use as a professional character reference in film/video production.

Evaluate and respond in JSON format with these exact fields:
{
  "hasFace": boolean (is there a visible human face?),
  "faceCount": number (how many faces are visible?),
  "optimizationScore": number 0-100 (how suitable is this as a professional headshot reference?),
  "issues": ["issue1", "issue2"] (problems that reduce reference quality),
  "suggestions": ["suggestion1", "suggestion2"] (how to improve the image),
  "demographicAnchor": "string" (e.g., "African American man in his late 40s with salt-and-pepper beard"),
  "physicalTraits": ["trait1", "trait2"] (key permanent physical features to preserve)
}

Scoring criteria (100 = perfect professional headshot):
- Deduct 20 points: Poor/uneven lighting
- Deduct 15 points: Non-neutral background (not solid gray/white)
- Deduct 15 points: Not front-facing or angled pose
- Deduct 10 points: Extreme expression (not neutral/calm)
- Deduct 10 points: Not head-and-shoulders framing
- Deduct 10 points: Low resolution or blur
- Deduct 5 points: Distracting elements (busy clothing, accessories)

For demographicAnchor, be specific about:
- Ethnicity/race (e.g., African American, Caucasian, Asian)
- Gender
- Approximate age range (e.g., "early 30s", "late 50s")
- Key distinguishing features (beard, glasses, bald, etc.)

For physicalTraits, list 3-5 PERMANENT features:
- Skin tone
- Face shape
- Hair (style, color, or bald)
- Facial hair if present
- Distinctive features (scars, moles, etc.)

Respond ONLY with valid JSON, no other text.`

    const result = await generateWithVision([
      { text: analysisPrompt },
      {
        inlineData: {
          data: base64,
          mimeType: mimeType
        }
      }
    ], {
      model: 'gemini-2.5-flash',
      temperature: 0.1
    })

    // Parse JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Enhance Reference] Failed to parse analysis JSON:', result.text)
      return getDefaultAnalysis(existingDescription)
    }

    const analysis = JSON.parse(jsonMatch[0]) as ImageAnalysis
    analysis.isAlreadyOptimized = analysis.optimizationScore >= 85
    
    console.log(`[Enhance Reference] Image analysis: score=${analysis.optimizationScore}, issues=${analysis.issues.length}`)
    
    return analysis
  } catch (error) {
    console.error('[Enhance Reference] Image analysis failed:', error)
    return getDefaultAnalysis(existingDescription)
  }
}

/**
 * Build a professional headshot prompt optimized for film industry reference standards
 */
function buildProfessionalHeadshotPrompt(
  characterName: string,
  analysis: ImageAnalysis,
  existingDescription?: string
): string {
  // Start with demographic anchor for strong identity preservation
  const demographic = analysis.demographicAnchor || `${characterName}`
  
  // Build targeted prompt based on analysis
  const promptParts: string[] = [
    // Core identity and framing
    `Professional film industry casting headshot of ${demographic}`,
    `${characterName} facing directly toward camera`,
    
    // Professional headshot standards
    'Head and shoulders framing, centered composition',
    'Solid neutral gray background (#808080)',
    'Even, soft studio lighting with subtle rim light',
    'Catchlights in eyes',
    
    // Expression and pose
    'Neutral, calm expression',
    'Direct eye contact with camera',
    'Relaxed shoulders, professional posture',
    
    // Technical quality
    'Sharp focus on eyes',
    'Professional photography, 8K resolution',
    'Clean, high-quality portrait',
    'Film production reference standard'
  ]
  
  // Add key physical traits for preservation
  if (analysis.physicalTraits && analysis.physicalTraits.length > 0) {
    const traits = analysis.physicalTraits.slice(0, 4).join(', ')
    promptParts.push(`Preserving: ${traits}`)
  }
  
  // Add existing description for additional context
  if (existingDescription) {
    const cleanedDescription = existingDescription
      .replace(/^(A|An)\s+/i, '')
      .replace(/\.$/, '')
      .split('.')[0]
      .trim()
    
    if (cleanedDescription.length > 10 && cleanedDescription.length < 200) {
      promptParts.push(cleanedDescription)
    }
  }
  
  return promptParts.join('. ') + '.'
}

/**
 * Build a strong subject description for face preservation
 * This links the reference image identity to the prompt more strongly
 */
function buildSubjectDescription(
  characterName: string,
  demographicAnchor: string,
  physicalTraits: string[]
): string {
  const parts: string[] = [
    characterName,
    'the exact person shown in this reference photo'
  ]
  
  if (demographicAnchor) {
    parts.push(demographicAnchor)
  }
  
  if (physicalTraits && physicalTraits.length > 0) {
    parts.push(`with ${physicalTraits.slice(0, 3).join(', ')}`)
  }
  
  return parts.join(', ')
}

/**
 * Generate default analysis when vision analysis fails
 */
function getDefaultAnalysis(existingDescription?: string): ImageAnalysis {
  return {
    hasFace: true,
    faceCount: 1,
    isAlreadyOptimized: false,
    optimizationScore: 50,
    issues: ['Unable to analyze - proceeding with standard enhancement'],
    suggestions: ['Ensure image has clear face visibility'],
    demographicAnchor: existingDescription?.split('.')[0] || 'a person',
    physicalTraits: []
  }
}

/**
 * Summarize improvements made for UI feedback
 */
function getImprovementsSummary(analysis: ImageAnalysis): string[] {
  const improvements: string[] = []
  
  if (analysis.issues.includes('lighting') || analysis.optimizationScore < 80) {
    improvements.push('Optimized lighting for even, professional illumination')
  }
  if (analysis.issues.some(i => i.toLowerCase().includes('background'))) {
    improvements.push('Replaced background with neutral gray studio backdrop')
  }
  if (analysis.issues.some(i => i.toLowerCase().includes('pose') || i.toLowerCase().includes('angle'))) {
    improvements.push('Adjusted to front-facing professional pose')
  }
  if (analysis.issues.some(i => i.toLowerCase().includes('expression'))) {
    improvements.push('Normalized to calm, neutral expression')
  }
  if (analysis.issues.some(i => i.toLowerCase().includes('framing'))) {
    improvements.push('Reframed to head-and-shoulders composition')
  }
  
  // Default improvements if no specific issues
  if (improvements.length === 0) {
    improvements.push('Enhanced to professional headshot standards')
    improvements.push('Optimized for consistent reference use')
  }
  
  return improvements
}
