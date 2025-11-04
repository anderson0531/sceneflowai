// Pricing configuration (per 10-second clip)
export const VIDEO_PRICING = {
  google_veo_fast: { base: 1.50, name: 'Google Veo 3 (Fast)' },
  google_veo_standard: { base: 4.00, name: 'Google Veo 3 (Standard)' },
  runway_gen4: { base: 0.50, name: 'Runway Gen-4 Turbo' },
  openai_sora_standard: { base: 1.00, name: 'OpenAI Sora 2 (720p)' },
  openai_sora_pro: { base: 5.00, name: 'OpenAI Sora 2 Pro (HD)' }
}

export interface CostCalculation {
  clipCount: number
  baseProvider: string
  baseCostPerClip: number
  markupPercent: number // e.g., 0.25 for 25%
  fixedFeePerClip: number // e.g., 0.75
  userCostPerClip: number
  totalUserCost: number
  totalProviderCost: number
  totalMarkup: number
  totalFixedFees: number
  byokSavings: number
}

export function calculateVideoCost(
  clipCount: number,
  provider: keyof typeof VIDEO_PRICING = 'runway_gen4',
  markupPercent: number = 0.25,
  fixedFeePerClip: number = 0.75
): CostCalculation {
  const pricing = VIDEO_PRICING[provider]
  const baseCostPerClip = pricing.base
  
  // User pays: (base * (1 + markup%)) + fixed fee
  const userCostPerClip = (baseCostPerClip * (1 + markupPercent)) + fixedFeePerClip
  
  const totalUserCost = clipCount * userCostPerClip
  const totalProviderCost = clipCount * baseCostPerClip
  const totalMarkup = totalProviderCost * markupPercent
  const totalFixedFees = clipCount * fixedFeePerClip
  const byokSavings = totalMarkup + totalFixedFees
  
  return {
    clipCount,
    baseProvider: pricing.name,
    baseCostPerClip,
    markupPercent,
    fixedFeePerClip,
    userCostPerClip,
    totalUserCost,
    totalProviderCost,
    totalMarkup,
    totalFixedFees,
    byokSavings
  }
}
