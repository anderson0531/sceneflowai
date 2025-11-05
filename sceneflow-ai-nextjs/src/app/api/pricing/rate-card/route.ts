import { NextRequest, NextResponse } from 'next/server'
import { RateCardService } from '../../../../services/RateCardService'

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
  } catch (error: any) {
    console.error('[Rate Card API] Error:', error)
    
    // Check if error is due to missing table
    if (error?.parent?.code === '42P01' || error?.message?.includes('does not exist')) {
      // Try to trigger migration
      try {
        const { migrateRateCard } = await import('../../../../lib/database/migrateRateCard')
        await migrateRateCard()
        // Retry the query after migration
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
      } catch (migrationError) {
        console.error('[Rate Card API] Migration failed:', migrationError)
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch rate cards',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
