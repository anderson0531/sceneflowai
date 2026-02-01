/**
 * A/B Test Configuration API
 * 
 * GET/POST /api/analytics/ab-test/[screeningId]
 * 
 * Manages A/B test configuration for a screening.
 * 
 * GET: Returns current A/B test configuration
 * POST: Creates or updates A/B test configuration
 * 
 * POST Request Body:
 * {
 *   isActive: boolean
 *   variantA: { label: string, description?: string, streamId: string }
 *   variantB: { label: string, description?: string, streamId: string }
 *   splitPercentage: number (0-100)
 * }
 * 
 * Response:
 * ABTestConfig
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getABTestConfig,
  saveABTestConfig,
} from '@/services/BehavioralAnalyticsService'
import type { ABTestConfig, ABTestVariant } from '@/lib/types/behavioralAnalytics'

export const runtime = 'nodejs'

// GET: Retrieve A/B test configuration
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ screeningId: string }> }
) {
  try {
    const { screeningId } = await params
    
    if (!screeningId) {
      return NextResponse.json(
        { error: 'Missing required parameter: screeningId' },
        { status: 400 }
      )
    }
    
    const config = await getABTestConfig(screeningId)
    
    if (!config) {
      return NextResponse.json(
        { error: 'A/B test configuration not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(config)
    
  } catch (error: any) {
    console.error('[Analytics] A/B test config retrieval error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve A/B test configuration' },
      { status: 500 }
    )
  }
}

// POST: Create or update A/B test configuration
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ screeningId: string }> }
) {
  try {
    const { screeningId } = await params
    const body = await req.json()
    
    if (!screeningId) {
      return NextResponse.json(
        { error: 'Missing required parameter: screeningId' },
        { status: 400 }
      )
    }
    
    // Validate required fields
    if (!body.variantA?.label || !body.variantA?.streamId) {
      return NextResponse.json(
        { error: 'Missing required field: variantA (must have label and streamId)' },
        { status: 400 }
      )
    }
    
    if (!body.variantB?.label || !body.variantB?.streamId) {
      return NextResponse.json(
        { error: 'Missing required field: variantB (must have label and streamId)' },
        { status: 400 }
      )
    }
    
    // Build config
    const now = new Date().toISOString()
    const existingConfig = await getABTestConfig(screeningId)
    
    const config: ABTestConfig = {
      id: existingConfig?.id || `ab_${Date.now().toString(36)}`,
      screeningId,
      isActive: body.isActive ?? true,
      variantA: {
        id: existingConfig?.variantA.id || `var_a_${Date.now().toString(36)}`,
        label: body.variantA.label,
        description: body.variantA.description,
        streamId: body.variantA.streamId,
        externalVideoUrl: body.variantA.externalVideoUrl,
        externalVideoDuration: body.variantA.externalVideoDuration,
      },
      variantB: {
        id: existingConfig?.variantB.id || `var_b_${Date.now().toString(36)}`,
        label: body.variantB.label,
        description: body.variantB.description,
        streamId: body.variantB.streamId,
        externalVideoUrl: body.variantB.externalVideoUrl,
        externalVideoDuration: body.variantB.externalVideoDuration,
      },
      splitPercentage: body.splitPercentage ?? 50,
      createdAt: existingConfig?.createdAt || now,
      updatedAt: now,
    }
    
    // Save config
    await saveABTestConfig(config)
    
    console.log(
      `[Analytics] A/B test config saved: screening=${screeningId}, ` +
      `active=${config.isActive}, split=${config.splitPercentage}%`
    )
    
    return NextResponse.json(config)
    
  } catch (error: any) {
    console.error('[Analytics] A/B test config save error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save A/B test configuration' },
      { status: 500 }
    )
  }
}
