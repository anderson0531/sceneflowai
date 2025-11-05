import { NextRequest, NextResponse } from 'next/server'
import { RateCardService } from '@/services/RateCardService'

/**
 * GET /api/pricing/rate-card
 * Get all active rate cards for display
 */
export async function GET(req: NextRequest) {
  try {
    const rates = await RateCardService.getAllActiveRates()
    
    return NextResponse.json({
      success: true,
      rates: rates.map(rate => ({
        id: rate.id,
        service_category: rate.service_category,
        service_name: rate.service_name,
        quality_tier: rate.quality_tier,
        credits_per_unit: Number(rate.credits_per_unit),
        byok_credits_per_unit: Number(rate.byok_credits_per_unit),
        unit_description: rate.unit_description,
        provider_cost_usd: Number(rate.provider_cost_usd),
      })),
    })
  } catch (error) {
    console.error('[Rate Card API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rate cards' },
      { status: 500 }
    )
  }
}
