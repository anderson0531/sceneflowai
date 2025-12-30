/**
 * SceneFlow AI - Storage Management Service
 * 
 * Handles storage operations including:
 * - Storage usage tracking and breakdown
 * - File archival to GCS Nearline/Coldline
 * - File restoration from cold storage
 * - Storage addon purchases via Paddle
 * - Auto-cleanup of expired files
 * 
 * @version 2.32
 * @see SCENEFLOW_AI_DESIGN_DOCUMENT.md Section 2.1.1
 */

import { Storage, File as GCSFile } from '@google-cloud/storage'
import { STORAGE_LIMITS, type SubscriptionTier } from '@/lib/credits/guardrails'
import { STORAGE_ADDONS, CREDIT_EXCHANGE_RATE } from '@/lib/credits/creditCosts'

// =============================================================================
// TYPES
// =============================================================================

export interface StorageFile {
  id: string
  name: string
  path: string
  sizeBytes: number
  type: 'video' | 'audio' | 'image' | 'thumbnail' | 'metadata' | 'other'
  createdAt: Date
  lastAccessedAt: Date
  storageClass: 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE'
  projectId?: string
  sceneId?: string
}

export interface StorageBreakdown {
  totalBytes: number
  usedBytes: number
  availableBytes: number
  usagePercent: number
  byType: {
    video: number
    audio: number
    image: number
    other: number
  }
  byStorageClass: {
    standard: number
    nearline: number
    coldline: number
    archive: number
  }
  addons: {
    id: string
    sizeBytes: number
    price: number
  }[]
  warnings: string[]
}

export interface ArchiveResult {
  success: boolean
  filesArchived: number
  bytesFreed: number
  newStorageClass: string
  error?: string
}

export interface RestoreResult {
  success: boolean
  filesRestored: number
  creditsCost: number
  estimatedTimeMinutes: number
  error?: string
}

export interface StorageAddonPurchase {
  addonId: keyof typeof STORAGE_ADDONS
  priceId: string
  checkoutUrl?: string
  success: boolean
  error?: string
}

// =============================================================================
// GCS CLIENT
// =============================================================================

let storageClient: Storage | null = null

function getStorageClient(): Storage {
  if (!storageClient) {
    storageClient = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    })
  }
  return storageClient
}

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'sceneflow-production'
const ARCHIVE_BUCKET_NAME = process.env.GCS_ARCHIVE_BUCKET_NAME || 'sceneflow-archive'

// =============================================================================
// STORAGE BREAKDOWN
// =============================================================================

/**
 * Get storage usage breakdown for a user
 */
export async function getStorageBreakdown(
  userId: string,
  tier: SubscriptionTier,
  addonStorageBytes: number = 0
): Promise<StorageBreakdown> {
  const storage = getStorageClient()
  const bucket = storage.bucket(BUCKET_NAME)
  
  // Initialize counters
  const byType = { video: 0, audio: 0, image: 0, other: 0 }
  const byStorageClass = { standard: 0, nearline: 0, coldline: 0, archive: 0 }
  let totalUsed = 0
  
  // List all files for this user
  const [files] = await bucket.getFiles({
    prefix: `users/${userId}/`,
  })
  
  for (const file of files) {
    const [metadata] = await file.getMetadata()
    const size = parseInt(metadata.size as string, 10) || 0
    totalUsed += size
    
    // Categorize by type
    const fileType = getFileType(file.name)
    if (fileType in byType) {
      byType[fileType as keyof typeof byType] += size
    } else {
      byType.other += size
    }
    
    // Categorize by storage class
    const storageClass = (metadata.storageClass as string || 'STANDARD').toLowerCase()
    if (storageClass in byStorageClass) {
      byStorageClass[storageClass as keyof typeof byStorageClass] += size
    }
  }
  
  // Calculate limits
  const baseStorage = STORAGE_LIMITS.TIER_STORAGE[tier]
  const totalStorage = baseStorage === Infinity ? Infinity : baseStorage + addonStorageBytes
  const availableBytes = totalStorage === Infinity ? Infinity : Math.max(0, totalStorage - totalUsed)
  const usagePercent = totalStorage === Infinity ? 0 : totalUsed / totalStorage
  
  // Generate warnings
  const warnings: string[] = []
  if (usagePercent >= STORAGE_LIMITS.WARNING_THRESHOLDS.HARD_WARNING) {
    warnings.push('Critical: Storage almost full. Delete files or purchase additional storage.')
  } else if (usagePercent >= STORAGE_LIMITS.WARNING_THRESHOLDS.SOFT_WARNING) {
    warnings.push('Warning: Storage is 80% full. Consider archiving old projects.')
  }
  
  // TODO: Get actual addons from database
  const addons: StorageBreakdown['addons'] = []
  
  return {
    totalBytes: totalStorage === Infinity ? Number.MAX_SAFE_INTEGER : totalStorage,
    usedBytes: totalUsed,
    availableBytes: availableBytes === Infinity ? Number.MAX_SAFE_INTEGER : availableBytes,
    usagePercent,
    byType,
    byStorageClass,
    addons,
    warnings,
  }
}

/**
 * Determine file type from filename
 */
function getFileType(filename: string): 'video' | 'audio' | 'image' | 'thumbnail' | 'metadata' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(ext)) return 'audio'
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image'
  if (filename.includes('thumbnail') || filename.includes('preview')) return 'thumbnail'
  if (['json', 'xml', 'yaml'].includes(ext)) return 'metadata'
  
  return 'other'
}

// =============================================================================
// FILE ARCHIVAL
// =============================================================================

/**
 * Archive files to cold storage (GCS Nearline)
 */
export async function archiveFiles(
  userId: string,
  fileIds: string[],
  targetClass: 'NEARLINE' | 'COLDLINE' = 'NEARLINE'
): Promise<ArchiveResult> {
  try {
    const storage = getStorageClient()
    const bucket = storage.bucket(BUCKET_NAME)
    
    let filesArchived = 0
    let bytesFreed = 0
    
    for (const fileId of fileIds) {
      const file = bucket.file(`users/${userId}/${fileId}`)
      
      // Check if file exists
      const [exists] = await file.exists()
      if (!exists) continue
      
      // Get file size
      const [metadata] = await file.getMetadata()
      const size = parseInt(metadata.size as string, 10) || 0
      
      // Update storage class
      await file.setStorageClass(targetClass)
      
      filesArchived++
      bytesFreed += size // Not actually freed, but moved to cheaper storage
    }
    
    return {
      success: true,
      filesArchived,
      bytesFreed,
      newStorageClass: targetClass,
    }
  } catch (error) {
    console.error('Archive files error:', error)
    return {
      success: false,
      filesArchived: 0,
      bytesFreed: 0,
      newStorageClass: targetClass,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete files permanently
 */
export async function deleteFiles(
  userId: string,
  fileIds: string[]
): Promise<{ success: boolean; filesDeleted: number; bytesFreed: number; error?: string }> {
  try {
    const storage = getStorageClient()
    const bucket = storage.bucket(BUCKET_NAME)
    
    let filesDeleted = 0
    let bytesFreed = 0
    
    for (const fileId of fileIds) {
      const file = bucket.file(`users/${userId}/${fileId}`)
      
      // Check if file exists
      const [exists] = await file.exists()
      if (!exists) continue
      
      // Get file size before deleting
      const [metadata] = await file.getMetadata()
      const size = parseInt(metadata.size as string, 10) || 0
      
      // Delete file
      await file.delete()
      
      filesDeleted++
      bytesFreed += size
    }
    
    return {
      success: true,
      filesDeleted,
      bytesFreed,
    }
  } catch (error) {
    console.error('Delete files error:', error)
    return {
      success: false,
      filesDeleted: 0,
      bytesFreed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================================================
// FILE RESTORATION
// =============================================================================

/**
 * Restore files from cold storage
 * This operation has a cost and may take time depending on storage class
 */
export async function restoreFromArchive(
  userId: string,
  fileIds: string[],
  availableCredits: number
): Promise<RestoreResult> {
  const creditsCost = STORAGE_LIMITS.RESTORE_CREDITS * fileIds.length
  
  // Check if user has enough credits
  if (availableCredits < creditsCost) {
    return {
      success: false,
      filesRestored: 0,
      creditsCost,
      estimatedTimeMinutes: 0,
      error: `Insufficient credits. Need ${creditsCost}, have ${availableCredits}.`,
    }
  }
  
  try {
    const storage = getStorageClient()
    const bucket = storage.bucket(BUCKET_NAME)
    
    let filesRestored = 0
    let maxRestoreTime = 0
    
    for (const fileId of fileIds) {
      const file = bucket.file(`users/${userId}/${fileId}`)
      
      // Check if file exists
      const [exists] = await file.exists()
      if (!exists) continue
      
      // Get current storage class
      const [metadata] = await file.getMetadata()
      const currentClass = metadata.storageClass as string
      
      // Estimate restore time based on storage class
      let restoreTimeMinutes = 0
      if (currentClass === 'COLDLINE') {
        restoreTimeMinutes = 30 // ~30 minutes for Coldline
      } else if (currentClass === 'ARCHIVE') {
        restoreTimeMinutes = 720 // ~12 hours for Archive
      } else if (currentClass === 'NEARLINE') {
        restoreTimeMinutes = 5 // ~5 minutes for Nearline
      }
      
      // Move back to STANDARD
      await file.setStorageClass('STANDARD')
      
      filesRestored++
      maxRestoreTime = Math.max(maxRestoreTime, restoreTimeMinutes)
    }
    
    return {
      success: true,
      filesRestored,
      creditsCost,
      estimatedTimeMinutes: maxRestoreTime,
    }
  } catch (error) {
    console.error('Restore from archive error:', error)
    return {
      success: false,
      filesRestored: 0,
      creditsCost,
      estimatedTimeMinutes: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get estimated restore progress for files being restored
 */
export async function getRestoreProgress(
  userId: string,
  fileIds: string[]
): Promise<{ fileId: string; progress: number; storageClass: string }[]> {
  const storage = getStorageClient()
  const bucket = storage.bucket(BUCKET_NAME)
  
  const results: { fileId: string; progress: number; storageClass: string }[] = []
  
  for (const fileId of fileIds) {
    const file = bucket.file(`users/${userId}/${fileId}`)
    
    try {
      const [metadata] = await file.getMetadata()
      const storageClass = metadata.storageClass as string
      
      // If it's already STANDARD, it's complete
      const progress = storageClass === 'STANDARD' ? 100 : 50 // Simplified progress
      
      results.push({
        fileId,
        progress,
        storageClass,
      })
    } catch {
      results.push({
        fileId,
        progress: 0,
        storageClass: 'UNKNOWN',
      })
    }
  }
  
  return results
}

// =============================================================================
// STORAGE ADDON PURCHASES
// =============================================================================

/**
 * Initiate a storage addon purchase via Paddle
 */
export async function purchaseStorageAddon(
  userId: string,
  addonId: keyof typeof STORAGE_ADDONS
): Promise<StorageAddonPurchase> {
  const addon = STORAGE_ADDONS[addonId]
  if (!addon) {
    return {
      addonId,
      priceId: '',
      success: false,
      error: `Unknown addon: ${addonId}`,
    }
  }
  
  // Get Paddle price ID from environment
  const priceIdKey = `PADDLE_STORAGE_${addonId.toUpperCase()}_PRICE_ID`
  const priceId = process.env[priceIdKey]
  
  if (!priceId) {
    return {
      addonId,
      priceId: '',
      success: false,
      error: `Paddle price ID not configured for ${addonId}`,
    }
  }
  
  try {
    // Create Paddle checkout session
    // This would integrate with Paddle API
    const checkoutUrl = `/api/subscription/purchase-storage?addon=${addonId}&user=${userId}`
    
    return {
      addonId,
      priceId,
      checkoutUrl,
      success: true,
    }
  } catch (error) {
    console.error('Storage addon purchase error:', error)
    return {
      addonId,
      priceId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================================================
// AUTO-CLEANUP JOBS
// =============================================================================

/**
 * Archive old files that haven't been accessed in 30+ days
 * Should be run as a scheduled job
 */
export async function runArchiveJob(): Promise<{
  usersProcessed: number
  filesArchived: number
  bytesArchived: number
}> {
  const storage = getStorageClient()
  const bucket = storage.bucket(BUCKET_NAME)
  
  let usersProcessed = 0
  let totalFilesArchived = 0
  let totalBytesArchived = 0
  
  const archiveThreshold = new Date()
  archiveThreshold.setDate(archiveThreshold.getDate() - STORAGE_LIMITS.DAYS_UNTIL_ARCHIVE)
  
  try {
    // Get all user prefixes
    const [files] = await bucket.getFiles({
      prefix: 'users/',
      delimiter: '/',
    })
    
    // Process each file
    for (const file of files) {
      const [metadata] = await file.getMetadata()
      
      // Skip already archived files
      if (metadata.storageClass !== 'STANDARD') continue
      
      // Skip excluded file types
      const fileType = getFileType(file.name)
      if (STORAGE_LIMITS.ARCHIVE_EXCLUDED.includes(fileType as any)) continue
      
      // Check last access time
      const lastAccessed = new Date(metadata.updated as string)
      if (lastAccessed < archiveThreshold) {
        const size = parseInt(metadata.size as string, 10) || 0
        
        await file.setStorageClass('NEARLINE')
        
        totalFilesArchived++
        totalBytesArchived += size
      }
    }
  } catch (error) {
    console.error('Archive job error:', error)
  }
  
  return {
    usersProcessed,
    filesArchived: totalFilesArchived,
    bytesArchived: totalBytesArchived,
  }
}

/**
 * Delete files that have been in archive for 90+ days
 * Should be run as a scheduled job
 */
export async function runCleanupJob(): Promise<{
  usersProcessed: number
  filesDeleted: number
  bytesFreed: number
}> {
  const storage = getStorageClient()
  const bucket = storage.bucket(BUCKET_NAME)
  
  let usersProcessed = 0
  let totalFilesDeleted = 0
  let totalBytesFreed = 0
  
  const deleteThreshold = new Date()
  deleteThreshold.setDate(deleteThreshold.getDate() - (STORAGE_LIMITS.DAYS_UNTIL_ARCHIVE + STORAGE_LIMITS.DAYS_UNTIL_DELETE))
  
  try {
    // Get all files in archive storage classes
    const [files] = await bucket.getFiles({
      prefix: 'users/',
    })
    
    for (const file of files) {
      const [metadata] = await file.getMetadata()
      
      // Only process archived files
      if (!['NEARLINE', 'COLDLINE'].includes(metadata.storageClass as string)) continue
      
      // Check last access time
      const lastAccessed = new Date(metadata.updated as string)
      if (lastAccessed < deleteThreshold) {
        const size = parseInt(metadata.size as string, 10) || 0
        
        await file.delete()
        
        totalFilesDeleted++
        totalBytesFreed += size
      }
    }
  } catch (error) {
    console.error('Cleanup job error:', error)
  }
  
  return {
    usersProcessed,
    filesDeleted: totalFilesDeleted,
    bytesFreed: totalBytesFreed,
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`
}

/**
 * Calculate storage cost estimate for given usage
 */
export function estimateStorageCost(bytesUsed: number): {
  monthlyCredits: number
  monthlyUsd: number
} {
  // Standard storage: ~$0.02/GB/month
  const gbUsed = bytesUsed / (1024 * 1024 * 1024)
  const monthlyCost = gbUsed * 0.02
  const monthlyCredits = Math.ceil(monthlyCost * CREDIT_EXCHANGE_RATE)
  
  return {
    monthlyCredits,
    monthlyUsd: monthlyCost,
  }
}
