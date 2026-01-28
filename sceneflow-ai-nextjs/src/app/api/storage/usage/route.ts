/**
 * Storage Usage API
 * 
 * GET /api/storage/usage
 * 
 * Returns storage breakdown for the authenticated user including:
 * - Total/used/available bytes
 * - Breakdown by file type (video, audio, image, etc.)
 * - Breakdown by storage class (standard, nearline, coldline)
 * - Storage warnings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStorageBreakdown, formatBytes, estimateStorageCost } from '@/services/StorageManagementService'
import { User } from '@/models/User'
import { SubscriptionTier } from '@/models/SubscriptionTier'
import type { SubscriptionTier as SubscriptionTierType } from '@/lib/credits/guardrails'

export const runtime = 'nodejs'
export const maxDuration = 30

interface StorageUsageResponse {
  success: boolean
  usage: {
    total: {
      bytes: number
      formatted: string
    }
    used: {
      bytes: number
      formatted: string
    }
    available: {
      bytes: number
      formatted: string
    }
    percent: number
    byType: {
      video: { bytes: number; formatted: string }
      audio: { bytes: number; formatted: string }
      image: { bytes: number; formatted: string }
      other: { bytes: number; formatted: string }
    }
    byStorageClass: {
      standard: { bytes: number; formatted: string }
      nearline: { bytes: number; formatted: string }
      coldline: { bytes: number; formatted: string }
      archive: { bytes: number; formatted: string }
    }
    cost: {
      monthlyCredits: number
      monthlyUsd: number
    }
    warnings: string[]
    addons: {
      id: string
      sizeBytes: number
      price: number
    }[]
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log(`[Storage Usage] Fetching breakdown for user ${userId}`)

    // Get user's subscription tier
    let tier: SubscriptionTierType = 'starter' // Default tier
    
    try {
      const user = await User.findByPk(userId)
      if (user?.subscription_tier_id) {
        const subscriptionTier = await SubscriptionTier.findByPk(user.subscription_tier_id)
        if (subscriptionTier) {
          tier = subscriptionTier.tier_key as SubscriptionTierType
        }
      }
    } catch (tierError) {
      console.warn('[Storage Usage] Could not fetch tier, using default:', tierError)
    }
    
    // Get storage breakdown
    const breakdown = await getStorageBreakdown(userId, tier, 0)

    // Format response
    const response: StorageUsageResponse = {
      success: true,
      usage: {
        total: {
          bytes: breakdown.totalBytes,
          formatted: formatBytes(breakdown.totalBytes),
        },
        used: {
          bytes: breakdown.usedBytes,
          formatted: formatBytes(breakdown.usedBytes),
        },
        available: {
          bytes: breakdown.availableBytes,
          formatted: formatBytes(breakdown.availableBytes),
        },
        percent: breakdown.usagePercent * 100,
        byType: {
          video: { bytes: breakdown.byType.video, formatted: formatBytes(breakdown.byType.video) },
          audio: { bytes: breakdown.byType.audio, formatted: formatBytes(breakdown.byType.audio) },
          image: { bytes: breakdown.byType.image, formatted: formatBytes(breakdown.byType.image) },
          other: { bytes: breakdown.byType.other, formatted: formatBytes(breakdown.byType.other) },
        },
        byStorageClass: {
          standard: { bytes: breakdown.byStorageClass.standard, formatted: formatBytes(breakdown.byStorageClass.standard) },
          nearline: { bytes: breakdown.byStorageClass.nearline, formatted: formatBytes(breakdown.byStorageClass.nearline) },
          coldline: { bytes: breakdown.byStorageClass.coldline, formatted: formatBytes(breakdown.byStorageClass.coldline) },
          archive: { bytes: breakdown.byStorageClass.archive, formatted: formatBytes(breakdown.byStorageClass.archive) },
        },
        cost: estimateStorageCost(breakdown.usedBytes),
        warnings: breakdown.warnings,
        addons: breakdown.addons,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Storage Usage] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get storage usage',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
