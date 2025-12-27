/**
 * SceneFlow AI Credit System
 * 
 * A comprehensive credit-based billing system with:
 * - Operation-based credit costs (Imagen, Veo, ElevenLabs, Render)
 * - Plan-based guardrails (Veo Max restricted to Pro/Studio)
 * - Automatic credit charging via route wrappers
 * - Low credit notifications and upgrade nudges
 * - Project cost estimation
 * 
 * @module credits
 */

// Core credit costs and plan definitions
export {
  // Credit costs
  CREDIT_VALUE_USD,
  IMAGE_CREDITS,
  VIDEO_CREDITS,
  AUDIO_CREDITS,
  TEXT_CREDITS,
  RENDER_CREDITS,
  STORAGE_CREDITS,
  
  // Plan definitions
  SUBSCRIPTION_PLANS,
  TOP_UP_PACKS,
  
  // Quality and plan types
  type VideoQuality,
  type PlanTier,
  
  // Helper functions
  getVideoCredits,
  canUseVeoMax,
  getDefaultVideoQuality,
  estimateProjectCredits,
  calculateMargin,
  
  // Provider costs (for margin analysis)
  PROVIDER_COSTS_USD,
} from './creditCosts'

// Credit charge wrapper for API routes
export {
  withCreditCharge,
  withImageCredit,
  withVideoCredit,
  withTTSCredit,
  withRenderCredit,
  refundCredits,
  previewCost,
  type CreditOperation,
  type CreditChargeConfig,
  type CreditChargeResult,
  type CostPreview,
} from './withCreditCharge'

// Nudge recommendation system
export {
  getRecommendedTopUp,
  getRecommendedUpgrade,
  generateNudge,
  generateLowCreditEmail,
  generateLowCreditToast,
  type TopUpRecommendation,
  type UpgradeRecommendation,
  type NudgeRecommendation,
  type LowCreditEmailData,
  type ToastContent,
} from './nudgeRecommendation'
