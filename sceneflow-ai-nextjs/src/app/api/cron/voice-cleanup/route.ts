/**
 * Voice Cleanup Cron Job
 * 
 * Scheduled task to clean up orphaned voice clones and expired consents.
 * Runs daily via Vercel Cron.
 * 
 * Tasks:
 * 1. Archive voice clones for suspended/deleted users
 * 2. Delete ElevenLabs voices that have been archived for 30+ days
 * 3. Expire pending consents older than 24 hours
 * 4. Clean up Azure voice profiles for expired consents
 */

import { NextRequest, NextResponse } from 'next/server'
import { Op } from 'sequelize'
import { VoiceConsent } from '@/models/VoiceConsent'
import { UserVoiceClone } from '@/models/UserVoiceClone'
import { User } from '@/models/User'
import { VoiceVerificationService } from '@/services/VoiceVerificationService'

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

interface CleanupStats {
  expiredConsents: number
  archivedClones: number
  deletedVoices: number
  azureProfilesDeleted: number
  errors: string[]
}

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const stats: CleanupStats = {
    expiredConsents: 0,
    archivedClones: 0,
    deletedVoices: 0,
    azureProfilesDeleted: 0,
    errors: []
  }

  try {
    // Task 1: Expire pending consents older than 24 hours
    const expiredConsents = await expirePendingConsents(stats)
    
    // Task 2: Archive clones for suspended users
    await archiveSuspendedUserClones(stats)
    
    // Task 3: Delete ElevenLabs voices archived 30+ days ago
    await deleteArchivedVoices(stats)
    
    // Task 4: Clean up Azure profiles for expired/failed consents
    await cleanupAzureProfiles(stats, expiredConsents)

    console.log('[Voice Cleanup] Completed:', stats)

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Voice Cleanup] Critical error:', error)
    stats.errors.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown'}`)
    
    return NextResponse.json({
      success: false,
      stats,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * Expire pending consents older than 24 hours
 */
async function expirePendingConsents(stats: CleanupStats): Promise<VoiceConsent[]> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  const expiredConsents = await VoiceConsent.findAll({
    where: {
      consent_status: 'pending',
      created_at: {
        [Op.lt]: twentyFourHoursAgo
      }
    }
  })

  for (const consent of expiredConsents) {
    try {
      consent.consent_status = 'expired'
      await consent.save()
      stats.expiredConsents++
    } catch (error) {
      stats.errors.push(`Failed to expire consent ${consent.id}: ${error}`)
    }
  }

  return expiredConsents
}

/**
 * Archive voice clones for suspended or trust-scored users
 */
async function archiveSuspendedUserClones(stats: CleanupStats) {
  // Find active clones belonging to users with negative trust score
  const suspendedUsers = await User.findAll({
    where: {
      trust_score: {
        [Op.lt]: 0
      }
    },
    attributes: ['id']
  })

  const suspendedUserIds = suspendedUsers.map(u => u.id)

  if (suspendedUserIds.length === 0) return

  const clonestoArchive = await UserVoiceClone.findAll({
    where: {
      user_id: {
        [Op.in]: suspendedUserIds
      },
      is_active: true,
      archived_at: null
    }
  })

  for (const clone of clonestoArchive) {
    try {
      clone.is_active = false
      clone.is_locked = true
      clone.archived_at = new Date()
      clone.archived_reason = 'user_suspended'
      await clone.save()
      stats.archivedClones++
    } catch (error) {
      stats.errors.push(`Failed to archive clone ${clone.id}: ${error}`)
    }
  }
}

/**
 * Delete ElevenLabs voices that have been archived for 30+ days
 */
async function deleteArchivedVoices(stats: CleanupStats) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const oldArchivedClones = await UserVoiceClone.findAll({
    where: {
      archived_at: {
        [Op.lt]: thirtyDaysAgo
      },
      elevenlabs_voice_id: {
        [Op.ne]: null
      }
    }
  })

  for (const clone of oldArchivedClones) {
    if (!clone.elevenlabs_voice_id) continue

    try {
      // Delete from ElevenLabs
      const response = await fetch(
        `https://api.elevenlabs.io/v1/voices/${clone.elevenlabs_voice_id}`,
        {
          method: 'DELETE',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
          }
        }
      )

      if (response.ok || response.status === 404) {
        // Clear the ElevenLabs ID to mark as deleted
        clone.elevenlabs_voice_id = null
        await clone.save()
        stats.deletedVoices++
      } else {
        stats.errors.push(`Failed to delete ElevenLabs voice ${clone.elevenlabs_voice_id}: ${response.status}`)
      }
    } catch (error) {
      stats.errors.push(`Error deleting voice ${clone.elevenlabs_voice_id}: ${error}`)
    }
  }
}

/**
 * Clean up Azure voice profiles for expired/failed consents
 */
async function cleanupAzureProfiles(stats: CleanupStats, expiredConsents: VoiceConsent[]) {
  // Also find failed consents from last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  
  const failedConsents = await VoiceConsent.findAll({
    where: {
      consent_status: 'failed',
      azure_profile_id: {
        [Op.ne]: null
      },
      created_at: {
        [Op.gt]: sevenDaysAgo
      }
    }
  })

  const consentsToCleanup = [...expiredConsents, ...failedConsents]

  for (const consent of consentsToCleanup) {
    if (!consent.azure_profile_id) continue

    try {
      await VoiceVerificationService.deleteVoiceProfile(consent.azure_profile_id)
      consent.azure_profile_id = null
      await consent.save()
      stats.azureProfilesDeleted++
    } catch (error) {
      // Profile may already be deleted, which is fine
      if (error instanceof Error && !error.message.includes('not found')) {
        stats.errors.push(`Failed to delete Azure profile ${consent.azure_profile_id}: ${error}`)
      }
    }
  }
}

// Vercel cron configuration
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 second timeout for cleanup tasks
