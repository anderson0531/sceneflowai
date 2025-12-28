/**
 * Credit Charge Wrapper for AI API Routes
 * 
 * Higher-order function that wraps API route handlers to:
 * 1. Pre-check if user has sufficient credits
 * 2. Execute the AI operation
 * 3. Charge credits on success
 * 4. Auto-refund on API errors (within 60 seconds)
 * 
 * Usage:
 * ```ts
 * export const POST = withCreditCharge({
 *   operation: 'imagen_generate',
 *   getCredits: () => IMAGE_CREDITS.IMAGEN_3,
 *   handler: async (req, userId) => {
 *     // Your AI logic here
 *     return NextResponse.json({ success: true })
 *   }
 * })
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import {
  IMAGE_CREDITS,
  VIDEO_CREDITS,
  AUDIO_CREDITS,
  RENDER_CREDITS,
  TEXT_CREDITS,
  type VideoQuality,
  type PlanTier,
  canUseVeoMax,
  getVideoCredits,
} from './creditCosts'

// =============================================================================
// TYPES
// =============================================================================

export type CreditOperation = 
  // Image operations
  | 'imagen_generate'
  | 'imagen_edit'
  | 'gemini_image_edit'
  // Video operations
  | 'veo_fast'
  | 'veo_max'
  | 'veo_revision'
  // Audio operations
  | 'elevenlabs_tts'
  | 'elevenlabs_sfx'
  | 'elevenlabs_music'
  | 'voice_preview'
  // Text operations
  | 'gemini_flash'
  | 'gemini_pro'
  | 'story_generation'
  | 'script_generation'
  // Render operations
  | 'mp4_export'
  | 'animatic_render'

export interface CreditChargeConfig<T = any> {
  /** The operation being performed */
  operation: CreditOperation
  
  /** Get the number of credits to charge (can be dynamic based on request) */
  getCredits: (req: NextRequest, context?: T) => number | Promise<number>
  
  /** The actual handler function */
  handler: (req: NextRequest, userId: string, context?: T) => Promise<NextResponse>
  
  /** Optional: Extract additional context from request before credit check */
  getContext?: (req: NextRequest) => Promise<T>
  
  /** Optional: Check plan restrictions (e.g., Veo Max only for Pro/Studio) */
  checkPlanRestrictions?: (plan: PlanTier, context?: T) => { allowed: boolean; message?: string }
  
  /** Optional: Custom error response when credits insufficient */
  onInsufficientCredits?: (balance: number, required: number) => NextResponse
  
  /** Optional: Custom error response for plan restrictions */
  onPlanRestricted?: (plan: PlanTier, message: string) => NextResponse
  
  /** Optional: Reference ID for the transaction (e.g., scene_id, project_id) */
  getRefId?: (req: NextRequest, context?: T) => string | undefined
  
  /** Optional: Additional metadata to store with the transaction */
  getMeta?: (req: NextRequest, context?: T) => Record<string, any> | undefined
}

export interface CreditChargeResult {
  success: boolean
  creditsCharged: number
  previousBalance: number
  newBalance: number
  refunded?: boolean
  refundReason?: string
}

// =============================================================================
// DEFAULT CREDIT COSTS BY OPERATION
// =============================================================================

const DEFAULT_CREDITS: Record<CreditOperation, number> = {
  // Image
  imagen_generate: IMAGE_CREDITS.IMAGEN_3,
  imagen_edit: IMAGE_CREDITS.IMAGEN_3,
  gemini_image_edit: IMAGE_CREDITS.GEMINI_EDIT,
  // Video
  veo_fast: VIDEO_CREDITS.VEO_FAST,
  veo_max: VIDEO_CREDITS.VEO_QUALITY_4K,
  veo_revision: VIDEO_CREDITS.VEO_REVISION,
  // Audio
  elevenlabs_tts: AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS,
  elevenlabs_sfx: AUDIO_CREDITS.ELEVENLABS_SFX,
  elevenlabs_music: AUDIO_CREDITS.ELEVENLABS_MUSIC,
  voice_preview: AUDIO_CREDITS.VOICE_PREVIEW,
  // Text
  gemini_flash: TEXT_CREDITS.GEMINI_FLASH,
  gemini_pro: TEXT_CREDITS.GEMINI_PRO,
  story_generation: TEXT_CREDITS.STORY_GENERATION,
  script_generation: TEXT_CREDITS.SCRIPT_PER_SCENE,
  // Render
  mp4_export: RENDER_CREDITS.MP4_EXPORT,
  animatic_render: RENDER_CREDITS.ANIMATIC,
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getUserPlan(userId: string): Promise<PlanTier> {
  // TODO: Fetch actual plan from database
  // For now, return a default
  try {
    const breakdown = await CreditService.getCreditBreakdown(userId)
    // Infer plan from credit amount (rough heuristic)
    const total = breakdown.total_credits + breakdown.subscription_credits
    if (total >= 50000) return 'studio'
    if (total >= 10000) return 'pro'
    if (total >= 3000) return 'starter'
    return 'coffee_break'
  } catch {
    return 'coffee_break'
  }
}

async function getSessionUserId(req: NextRequest): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    return session?.user?.id || session?.user?.email || null
  } catch {
    return null
  }
}

// =============================================================================
// MAIN WRAPPER FUNCTION
// =============================================================================

export function withCreditCharge<T = any>(config: CreditChargeConfig<T>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    let creditsCharged = 0
    let userId: string | null = null

    try {
      // 1. Get authenticated user
      userId = await getSessionUserId(req)
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
          { status: 401 }
        )
      }

      // 2. Extract context if provided
      const context = config.getContext ? await config.getContext(req) : undefined

      // 3. Calculate credits needed
      const creditsRequired = typeof config.getCredits === 'function'
        ? await config.getCredits(req, context)
        : DEFAULT_CREDITS[config.operation]

      // 4. Check plan restrictions (e.g., Veo Max)
      if (config.checkPlanRestrictions) {
        const plan = await getUserPlan(userId)
        const restriction = config.checkPlanRestrictions(plan, context)
        if (!restriction.allowed) {
          if (config.onPlanRestricted) {
            return config.onPlanRestricted(plan, restriction.message || 'Feature not available on your plan')
          }
          return NextResponse.json(
            {
              error: 'Plan restriction',
              code: 'PLAN_RESTRICTED',
              message: restriction.message || 'This feature requires a higher plan',
              currentPlan: plan,
              upgradeRequired: true,
            },
            { status: 403 }
          )
        }
      }

      // 5. Pre-check credit balance
      const hasEnough = await CreditService.ensureCredits(userId, creditsRequired)
      if (!hasEnough) {
        const breakdown = await CreditService.getCreditBreakdown(userId)
        if (config.onInsufficientCredits) {
          return config.onInsufficientCredits(breakdown.total_credits, creditsRequired)
        }
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            code: 'INSUFFICIENT_CREDITS',
            required: creditsRequired,
            balance: breakdown.total_credits,
            operation: config.operation,
            suggestedTopUp: getSuggestedTopUp(creditsRequired - breakdown.total_credits),
          },
          { status: 402 }
        )
      }

      // 6. Execute the actual handler
      const response = await config.handler(req, userId, context)

      // 7. If successful (2xx status), charge credits
      if (response.status >= 200 && response.status < 300) {
        const refId = config.getRefId ? config.getRefId(req, context) : undefined
        const meta = config.getMeta ? config.getMeta(req, context) : { operation: config.operation }

        await CreditService.charge(
          userId,
          creditsRequired,
          'ai_usage',
          refId,
          { ...meta, operation: config.operation, timestamp: new Date().toISOString() }
        )
        creditsCharged = creditsRequired

        // Add credit info to response headers
        const newBalance = await CreditService.getCreditBreakdown(userId)
        response.headers.set('X-Credits-Charged', String(creditsRequired))
        response.headers.set('X-Credits-Balance', String(newBalance.total_credits))
      }

      return response

    } catch (error: any) {
      console.error(`[withCreditCharge] Error in ${config.operation}:`, error)

      // If credits were charged but operation failed, auto-refund
      if (creditsCharged > 0 && userId) {
        const elapsed = Date.now() - startTime
        if (elapsed < 60000) { // Within 60 seconds
          try {
            await refundCredits(userId, creditsCharged, `API error: ${error.message}`)
            console.log(`[withCreditCharge] Auto-refunded ${creditsCharged} credits to ${userId}`)
            return NextResponse.json(
              {
                error: 'Operation failed',
                code: 'OPERATION_FAILED',
                message: error.message,
                refunded: true,
                creditsRefunded: creditsCharged,
              },
              { status: 500 }
            )
          } catch (refundError) {
            console.error('[withCreditCharge] Refund failed:', refundError)
          }
        }
      }

      // Handle specific error types
      if (error.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json(
          { error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' },
          { status: 402 }
        )
      }

      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR', message: error.message },
        { status: 500 }
      )
    }
  }
}

// =============================================================================
// REFUND FUNCTION
// =============================================================================

export async function refundCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  // Use negative charge (add credits back)
  await CreditService.charge(
    userId,
    -amount, // Negative to add credits
    'refund',
    null,
    { reason, timestamp: new Date().toISOString() }
  )
}

// =============================================================================
// TOP-UP SUGGESTION
// =============================================================================

interface TopUpSuggestion {
  pack: 'quick_fix' | 'scene_pack' | 'feature_boost'
  name: string
  price: number
  credits: number
}

function getSuggestedTopUp(creditsNeeded: number): TopUpSuggestion {
  if (creditsNeeded <= 2000) {
    return { pack: 'quick_fix', name: 'Quick Fix', price: 25, credits: 2000 }
  }
  if (creditsNeeded <= 6000) {
    return { pack: 'scene_pack', name: 'Scene Pack', price: 60, credits: 6000 }
  }
  return { pack: 'feature_boost', name: 'Feature Boost', price: 180, credits: 20000 }
}

// =============================================================================
// SPECIALIZED WRAPPERS
// =============================================================================

/**
 * Wrapper specifically for image generation routes
 */
export function withImageCredit(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>,
  options?: { getRefId?: (req: NextRequest) => string }
) {
  return withCreditCharge({
    operation: 'imagen_generate',
    getCredits: () => IMAGE_CREDITS.IMAGEN_3,
    handler,
    getRefId: options?.getRefId,
  })
}

/**
 * Wrapper specifically for video generation routes
 * Includes Veo Max plan restriction check
 */
export function withVideoCredit(
  handler: (req: NextRequest, userId: string, context: { quality: VideoQuality }) => Promise<NextResponse>,
  options?: { getRefId?: (req: NextRequest) => string }
) {
  return withCreditCharge<{ quality: VideoQuality }>({
    operation: 'veo_fast', // Will be adjusted based on quality
    getContext: async (req) => {
      const body = await req.clone().json()
      const quality: VideoQuality = body.quality === 'max' ? 'max' : 'fast'
      return { quality }
    },
    getCredits: (req, context) => getVideoCredits(context?.quality || 'fast'),
    checkPlanRestrictions: (plan, context) => {
      if (context?.quality === 'max' && !canUseVeoMax(plan)) {
        return {
          allowed: false,
          message: 'Veo 3.1 Max quality is only available on Pro and Studio plans. Please upgrade or select Fast quality.',
        }
      }
      return { allowed: true }
    },
    handler: async (req, userId, context) => {
      return handler(req, userId, context || { quality: 'fast' })
    },
    getRefId: options?.getRefId,
  })
}

/**
 * Wrapper for ElevenLabs TTS (charges per 1k characters)
 */
export function withTTSCredit(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>,
  options?: {
    getCharacterCount?: (req: NextRequest) => Promise<number>
    getRefId?: (req: NextRequest) => string
  }
) {
  return withCreditCharge({
    operation: 'elevenlabs_tts',
    getCredits: async (req) => {
      if (options?.getCharacterCount) {
        const charCount = await options.getCharacterCount(req)
        return Math.ceil(charCount / 1000) * AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS
      }
      // Default: assume 1k characters
      return AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS
    },
    handler,
    getRefId: options?.getRefId,
  })
}

/**
 * Wrapper for MP4 export/render
 */
export function withRenderCredit(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>,
  options?: {
    getMinutes?: (req: NextRequest) => Promise<number>
    getRefId?: (req: NextRequest) => string
  }
) {
  return withCreditCharge({
    operation: 'mp4_export',
    getCredits: async (req) => {
      if (options?.getMinutes) {
        const minutes = await options.getMinutes(req)
        return minutes * RENDER_CREDITS.PER_MINUTE + RENDER_CREDITS.MP4_EXPORT
      }
      return RENDER_CREDITS.MP4_EXPORT
    },
    handler,
    getRefId: options?.getRefId,
  })
}

// =============================================================================
// PRE-FLIGHT COST CHECK (for UI previews)
// =============================================================================

export interface CostPreview {
  operation: CreditOperation
  estimatedCredits: number
  currentBalance: number
  hasEnough: boolean
  suggestedTopUp?: TopUpSuggestion
}

/**
 * Get a cost preview without actually charging (for UI confirmation dialogs)
 */
export async function previewCost(
  userId: string,
  operation: CreditOperation,
  customCredits?: number
): Promise<CostPreview> {
  const estimatedCredits = customCredits ?? DEFAULT_CREDITS[operation]
  const breakdown = await CreditService.getCreditBreakdown(userId)
  const hasEnough = breakdown.total_credits >= estimatedCredits

  return {
    operation,
    estimatedCredits,
    currentBalance: breakdown.total_credits,
    hasEnough,
    suggestedTopUp: hasEnough ? undefined : getSuggestedTopUp(estimatedCredits - breakdown.total_credits),
  }
}
