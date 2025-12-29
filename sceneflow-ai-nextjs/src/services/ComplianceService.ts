/**
 * ComplianceService - Central orchestrator for compliance guardrails
 * 
 * This service coordinates all compliance checks for voice cloning:
 * - Trust gate verification (account age, verification status)
 * - Subscription tier access control
 * - Voice consent verification flow
 * - Audit logging for compliance reporting
 */

import { VoiceConsent, type ConsentStatus } from '../models/VoiceConsent';
import { UserVoiceClone } from '../models/UserVoiceClone';
import { ModerationEvent } from '../models/ModerationEvent';
import type { ContentType, ModerationAction, VoiceType } from '../models/ModerationEvent';
import { User } from '../models/User';
import { SubscriptionTier } from '../models/SubscriptionTier';
import { VoiceVerificationService } from './VoiceVerificationService';
import { ModerationService, type ModerationResult, type ModerationOptions } from './ModerationService';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface TrustGateResult {
  allowed: boolean;
  reason?: string;
  blockers: TrustBlocker[];
  suggestions: string[];
}

export interface TrustBlocker {
  type: 'account_age' | 'verification' | 'subscription' | 'trust_score' | 'quota';
  message: string;
  canResolve: boolean;
  resolution?: string;
}

export interface VoiceConsentInitiation {
  success: boolean;
  consentId?: string;
  phrase?: string;
  verificationCode?: string;
  expiresAt?: Date;
  error?: string;
}

export interface VoiceConsentCompletion {
  success: boolean;
  consentId?: string;
  cloneId?: string;
  error?: string;
}

export interface VoiceQuota {
  used: number;
  max: number;
  available: number;
  canCreate: boolean;
  lockedSlots: number;
}

export interface AuditLogEntry {
  userId: string;
  action: 'consent_initiated' | 'consent_completed' | 'consent_failed' | 'clone_created' | 'clone_deleted' | 'moderation_blocked' | 'trust_gate_blocked';
  resourceType: 'voice_consent' | 'voice_clone' | 'moderation';
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const COMPLIANCE_CONFIG = {
  // Account age requirement (in days)
  MIN_ACCOUNT_AGE_DAYS: parseInt(process.env.MIN_ACCOUNT_AGE_DAYS || '7', 10),
  
  // Trust score thresholds
  MIN_TRUST_SCORE: parseInt(process.env.MIN_TRUST_SCORE || '0', 10),
  
  // Consent expiration for pending consents (in hours)
  PENDING_CONSENT_EXPIRY_HOURS: parseInt(process.env.PENDING_CONSENT_EXPIRY_HOURS || '1', 10),
  
  // Self-cloning bypass
  ALLOW_SELF_CLONE_SHORTCUT: process.env.ALLOW_SELF_CLONE_SHORTCUT !== 'false',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate account age in days
 */
function getAccountAgeDays(createdAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if user has an active subscription with voice cloning
 */
async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier | null> {
  const user = await User.findByPk(userId, {
    include: [{ model: SubscriptionTier, as: 'subscriptionTier' }],
  });
  
  if (!user) return null;
  
  // @ts-expect-error - Association type not inferred
  return user.subscriptionTier || null;
}

/**
 * Hash content for audit purposes
 */
function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

// ============================================================================
// ComplianceService
// ============================================================================

export class ComplianceService {
  // --------------------------------------------------------------------------
  // Trust Gate Methods
  // --------------------------------------------------------------------------
  
  /**
   * Check if a user can access voice cloning features
   * This is the main trust gate that checks all requirements
   */
  static async canAccessVoiceCloning(userId: string): Promise<TrustGateResult> {
    const blockers: TrustBlocker[] = [];
    const suggestions: string[] = [];
    
    // Fetch user with subscription
    const user = await User.findByPk(userId);
    if (!user) {
      return {
        allowed: false,
        reason: 'User not found',
        blockers: [{ type: 'verification', message: 'User account not found', canResolve: false }],
        suggestions: [],
      };
    }
    
    const tier = await getUserSubscriptionTier(userId);
    
    // Check 1: Subscription tier has voice cloning
    if (!tier || !tier.hasVoiceCloning()) {
      blockers.push({
        type: 'subscription',
        message: 'Voice cloning requires Pro or Studio subscription',
        canResolve: true,
        resolution: 'Upgrade to Pro or Studio plan',
      });
      suggestions.push('Upgrade your subscription to unlock voice cloning');
    }
    
    // Check 2: Account age requirement
    const accountAge = getAccountAgeDays(user.createdAt);
    if (accountAge < COMPLIANCE_CONFIG.MIN_ACCOUNT_AGE_DAYS) {
      const daysRemaining = COMPLIANCE_CONFIG.MIN_ACCOUNT_AGE_DAYS - accountAge;
      blockers.push({
        type: 'account_age',
        message: `Account must be at least ${COMPLIANCE_CONFIG.MIN_ACCOUNT_AGE_DAYS} days old`,
        canResolve: false,
        resolution: `Please wait ${daysRemaining} more day(s)`,
      });
      suggestions.push(`Your account needs to be ${COMPLIANCE_CONFIG.MIN_ACCOUNT_AGE_DAYS} days old before you can clone voices`);
    }
    
    // Check 3: Account verification (email verified)
    if (!user.account_verified_at) {
      blockers.push({
        type: 'verification',
        message: 'Email verification required',
        canResolve: true,
        resolution: 'Verify your email address',
      });
      suggestions.push('Please verify your email address to unlock voice cloning');
    }
    
    // Check 4: Voice cloning not disabled (e.g., due to abuse)
    if (user.voice_cloning_enabled === false) {
      blockers.push({
        type: 'trust_score',
        message: 'Voice cloning has been disabled for this account',
        canResolve: false,
      });
    }
    
    // Check 5: Trust score minimum
    if ((user.trust_score ?? 0) < COMPLIANCE_CONFIG.MIN_TRUST_SCORE) {
      blockers.push({
        type: 'trust_score',
        message: 'Account trust score is too low',
        canResolve: false,
      });
    }
    
    // Check 6: Voice quota
    const quota = await this.getVoiceQuota(userId);
    if (!quota.canCreate && quota.available <= 0) {
      blockers.push({
        type: 'quota',
        message: `Voice clone limit reached (${quota.used}/${quota.max})`,
        canResolve: true,
        resolution: 'Delete an existing voice clone or upgrade your plan',
      });
      suggestions.push('You can delete an existing voice clone to free up a slot');
    }
    
    const allowed = blockers.length === 0;
    
    return {
      allowed,
      reason: allowed ? undefined : blockers[0]?.message,
      blockers,
      suggestions,
    };
  }
  
  /**
   * Get the voice clone quota for a user
   */
  static async getVoiceQuota(userId: string): Promise<VoiceQuota> {
    const tier = await getUserSubscriptionTier(userId);
    const maxSlots = tier?.getVoiceCloneSlots() ?? 0;
    
    // Count active (non-archived) voice clones
    const activeClones = await UserVoiceClone.count({
      where: {
        user_id: userId,
        archived_at: null,
      },
    });
    
    // Count locked slots (archived but not yet cleaned up)
    const lockedClones = await UserVoiceClone.count({
      where: {
        user_id: userId,
        is_locked: true,
      },
    });
    
    const used = activeClones;
    const available = Math.max(0, maxSlots - used);
    
    return {
      used,
      max: maxSlots,
      available,
      canCreate: available > 0,
      lockedSlots: lockedClones,
    };
  }
  
  // --------------------------------------------------------------------------
  // Voice Consent Flow
  // --------------------------------------------------------------------------
  
  /**
   * Initiate voice consent process
   * Returns a phrase for the user to speak and a consent record ID
   */
  static async initiateVoiceConsent(
    userId: string,
    actorName: string,
    userName: string,
    isSelfClone: boolean
  ): Promise<VoiceConsentInitiation> {
    // First check trust gate
    const trustResult = await this.canAccessVoiceCloning(userId);
    if (!trustResult.allowed) {
      await this.logAuditEvent({
        userId,
        action: 'trust_gate_blocked',
        resourceType: 'voice_consent',
        metadata: { blockers: trustResult.blockers },
      });
      
      return {
        success: false,
        error: trustResult.reason || 'Access denied',
      };
    }
    
    const consentId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + COMPLIANCE_CONFIG.PENDING_CONSENT_EXPIRY_HOURS);
    
    // For self-cloning with shortcut enabled, use simplified flow
    if (isSelfClone && COMPLIANCE_CONFIG.ALLOW_SELF_CLONE_SHORTCUT) {
      const selfPhrase = VoiceVerificationService.generateSelfAttestationPhrase(userName);
      
      // Create consent record with self-attestation type
      await VoiceConsent.create({
        id: consentId,
        user_id: userId,
        actor_name: actorName,
        consent_type: 'self_attestation',
        consent_phrase: selfPhrase.phrase,
        verification_code: selfPhrase.verificationCode,
        sample_audio_urls: [],
        consent_status: 'pending',
        expires_at: expiresAt,
      });
      
      await this.logAuditEvent({
        userId,
        action: 'consent_initiated',
        resourceType: 'voice_consent',
        resourceId: consentId,
        metadata: { actorName, isSelfClone: true, type: 'self_attestation' },
      });
      
      return {
        success: true,
        consentId,
        phrase: selfPhrase.phrase,
        verificationCode: selfPhrase.verificationCode,
        expiresAt,
      };
    }
    
    // For third-party voice cloning, use Azure verification
    try {
      const phraseResult = VoiceVerificationService.generateConsentPhrase(actorName, userName);
      
      // Create consent record
      await VoiceConsent.create({
        id: consentId,
        user_id: userId,
        actor_name: actorName,
        consent_type: 'voice_verified',
        consent_phrase: phraseResult.phrase,
        verification_code: phraseResult.verificationCode,
        sample_audio_urls: [],
        consent_status: 'pending',
        expires_at: expiresAt,
      });
      
      await this.logAuditEvent({
        userId,
        action: 'consent_initiated',
        resourceType: 'voice_consent',
        resourceId: consentId,
        metadata: { actorName, isSelfClone: false, type: 'voice_verified' },
      });
      
      return {
        success: true,
        consentId,
        phrase: phraseResult.phrase,
        verificationCode: phraseResult.verificationCode,
        expiresAt,
      };
    } catch (error) {
      console.error('[ComplianceService] Failed to initiate consent:', error);
      return {
        success: false,
        error: 'Failed to initiate voice consent. Please try again.',
      };
    }
  }
  
  /**
   * Complete voice consent with audio verification
   * For self-attestation, just confirms the checkbox
   * For voice-verified, validates the audio against Azure
   */
  static async completeVoiceConsent(
    consentId: string,
    audioBuffers?: Buffer[],
    selfAttestationConfirmed?: boolean
  ): Promise<VoiceConsentCompletion> {
    const consent = await VoiceConsent.findByPk(consentId);
    
    if (!consent) {
      return { success: false, error: 'Consent record not found' };
    }
    
    if (consent.consent_status !== 'pending') {
      return { success: false, error: `Consent is already ${consent.consent_status}` };
    }
    
    // Check expiration
    if (consent.expires_at && new Date() > consent.expires_at) {
      await consent.update({ consent_status: 'expired' as ConsentStatus });
      return { success: false, error: 'Consent request has expired. Please start again.' };
    }
    
    const userId = consent.user_id;
    
    // Handle self-attestation flow
    if (consent.consent_type === 'self_attestation') {
      if (!selfAttestationConfirmed) {
        return { success: false, error: 'Self-attestation confirmation required' };
      }
      
      // Mark consent as verified
      await consent.update({
        consent_status: 'verified' as ConsentStatus,
        verified_at: new Date(),
      });
      
      // Create the voice clone record
      const cloneId = await this.createVoiceCloneRecord(userId, consentId, consent.actor_name);
      
      await this.logAuditEvent({
        userId,
        action: 'consent_completed',
        resourceType: 'voice_consent',
        resourceId: consentId,
        metadata: { type: 'self_attestation', cloneId },
      });
      
      return { success: true, consentId, cloneId };
    }
    
    // Handle voice-verified flow
    if (!audioBuffers || audioBuffers.length === 0) {
      return { success: false, error: 'Audio data required for voice verification' };
    }
    
    try {
      // Create a voice profile in Azure
      const profileResult = await VoiceVerificationService.createVoiceProfile(audioBuffers);
      
      if (profileResult.enrollmentStatus === 'failed') {
        await this.logAuditEvent({
          userId,
          action: 'consent_failed',
          resourceType: 'voice_consent',
          resourceId: consentId,
          metadata: { reason: 'profile_creation_failed' },
        });
        
        return { success: false, error: 'Failed to create voice profile. Please try again with clearer audio.' };
      }
      
      // Update consent with Azure profile ID
      await consent.update({ azure_profile_id: profileResult.profileId });
      
      // Verify the consent audio against the profile
      // For enrollment, we use the same audio - verification happens with subsequent recordings
      // Here we're just checking the profile was created successfully
      if (profileResult.enrollmentStatus === 'enrolled') {
        // Mark consent as verified
        await consent.update({
          consent_status: 'verified' as ConsentStatus,
          verified_at: new Date(),
        });
        
        // Create the voice clone record
        const cloneId = await this.createVoiceCloneRecord(userId, consentId, consent.actor_name);
        
        await this.logAuditEvent({
          userId,
          action: 'consent_completed',
          resourceType: 'voice_consent',
          resourceId: consentId,
          metadata: { 
            type: 'voice_verified', 
            profileId: profileResult.profileId,
            cloneId,
          },
        });
        
        return { success: true, consentId, cloneId };
      }
      
      // Profile still enrolling - need more audio
      return { 
        success: false, 
        error: 'More audio samples needed for voice verification. Please record additional audio.',
      };
      
    } catch (error) {
      console.error('[ComplianceService] Voice verification error:', error);
      
      await consent.update({ consent_status: 'failed' as ConsentStatus });
      
      await this.logAuditEvent({
        userId,
        action: 'consent_failed',
        resourceType: 'voice_consent',
        resourceId: consentId,
        metadata: { reason: 'verification_exception', error: String(error) },
      });
      
      return { success: false, error: 'Voice verification failed. Please try again.' };
    }
  }
  
  // --------------------------------------------------------------------------
  // Voice Clone Management
  // --------------------------------------------------------------------------
  
  /**
   * Create a voice clone record after consent verification
   */
  private static async createVoiceCloneRecord(
    userId: string,
    consentId: string,
    voiceName: string
  ): Promise<string> {
    const cloneId = uuidv4();
    
    await UserVoiceClone.create({
      id: cloneId,
      user_id: userId,
      consent_id: consentId,
      voice_name: voiceName,
      is_active: true,
      is_locked: false,
      use_count: 0,
    });
    
    // Update consent to link to clone
    await VoiceConsent.update(
      { voice_clone_id: cloneId },
      { where: { id: consentId } }
    );
    
    await this.logAuditEvent({
      userId,
      action: 'clone_created',
      resourceType: 'voice_clone',
      resourceId: cloneId,
      metadata: { voiceName, consentId },
    });
    
    return cloneId;
  }
  
  /**
   * Delete a voice clone and archive the slot
   */
  static async deleteVoiceClone(userId: string, cloneId: string): Promise<boolean> {
    const clone = await UserVoiceClone.findOne({
      where: { id: cloneId, user_id: userId },
    });
    
    if (!clone) {
      return false;
    }
    
    // Archive the clone (don't hard delete for compliance)
    await clone.update({
      is_active: false,
      archived_at: new Date(),
      archived_reason: 'user_deleted',
    });
    
    // Also handle the associated consent
    if (clone.consent_id) {
      const consent = await VoiceConsent.findByPk(clone.consent_id);
      if (consent?.azure_profile_id) {
        // Delete Azure profile
        await VoiceVerificationService.deleteVoiceProfile(consent.azure_profile_id);
      }
      // Archive the consent by updating status
      // Note: We don't change consent_status to 'revoked' as that's not in the enum
      // Instead we just leave it as-is for audit purposes
    }
    
    await this.logAuditEvent({
      userId,
      action: 'clone_deleted',
      resourceType: 'voice_clone',
      resourceId: cloneId,
      metadata: { voiceName: clone.voice_name },
    });
    
    return true;
  }
  
  // --------------------------------------------------------------------------
  // Content Moderation Integration
  // --------------------------------------------------------------------------
  
  /**
   * Moderate content before voice synthesis
   * Uses stricter thresholds for cloned voices
   */
  static async moderateContent(
    userId: string,
    content: string,
    contentType: ContentType,
    voiceCloneId?: string
  ): Promise<ModerationResult> {
    const voiceType: VoiceType = voiceCloneId ? 'cloned' : 'stock';
    
    const options: ModerationOptions = {
      userId,
      voiceType,
      voiceId: voiceCloneId,
      contentType,
      logEvent: true,
    };
    
    const result = await ModerationService.scanText(content, options);
    
    if (!result.allowed) {
      await this.logAuditEvent({
        userId,
        action: 'moderation_blocked',
        resourceType: 'moderation',
        metadata: {
          voiceCloneId,
          voiceType,
          flaggedCategories: result.flaggedCategories,
          highestScore: result.highestScore,
        },
      });
    }
    
    return result;
  }
  
  // --------------------------------------------------------------------------
  // Audit Logging
  // --------------------------------------------------------------------------
  
  /**
   * Log an audit event for compliance tracking
   */
  static async logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
      // Log to console for observability
      console.log('[Audit]', JSON.stringify({
        timestamp: new Date().toISOString(),
        ...entry,
      }));
      
      // Map to valid content type for ModerationEvent
      const contentTypeMap: Record<string, ContentType> = {
        'voice_consent': 'clone_request',
        'voice_clone': 'clone_request',
        'moderation': 'tts_script',
      };
      
      // Map action to valid moderation action
      const actionMap: Record<string, ModerationAction> = {
        'consent_initiated': 'allowed',
        'consent_completed': 'allowed',
        'consent_failed': 'blocked',
        'clone_created': 'allowed',
        'clone_deleted': 'allowed',
        'moderation_blocked': 'blocked',
        'trust_gate_blocked': 'blocked',
      };
      
      // Create a moderation event for tracking
      await ModerationEvent.create({
        id: uuidv4(),
        user_id: entry.userId,
        content_type: contentTypeMap[entry.resourceType] || 'tts_script',
        content_hash: hashContent(JSON.stringify(entry)),
        action: actionMap[entry.action] || 'allowed',
        flagged_categories: [],
        threshold_applied: 0.5,
      });
    } catch (error) {
      console.error('[ComplianceService] Failed to log audit event:', error);
    }
  }
  
  // --------------------------------------------------------------------------
  // Cleanup Methods (for scheduled jobs)
  // --------------------------------------------------------------------------
  
  /**
   * Cleanup expired pending consents
   * Should be called by a scheduled job
   */
  static async cleanupExpiredConsents(): Promise<number> {
    const { Op } = await import('sequelize');
    
    const [affectedCount] = await VoiceConsent.update(
      { consent_status: 'expired' as ConsentStatus },
      {
        where: {
          consent_status: 'pending',
          expires_at: { [Op.lt]: new Date() },
        },
      }
    );
    
    if (affectedCount > 0) {
      console.log(`[ComplianceService] Expired ${affectedCount} pending consents`);
    }
    
    return affectedCount;
  }
  
  /**
   * Cleanup archived voice clones (after retention period)
   * Should be called by a scheduled job
   */
  static async cleanupArchivedClones(retentionDays: number = 180): Promise<number> {
    const { Op } = await import('sequelize');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // Find clones to delete
    const clonesToDelete = await UserVoiceClone.findAll({
      where: {
        archived_at: { [Op.lt]: cutoffDate },
        is_locked: true,
      },
    });
    
    // Delete associated Azure profiles
    for (const clone of clonesToDelete) {
      if (clone.consent_id) {
        const consent = await VoiceConsent.findByPk(clone.consent_id);
        if (consent?.azure_profile_id) {
          await VoiceVerificationService.deleteVoiceProfile(consent.azure_profile_id);
        }
        // Hard delete consent after retention
        await consent?.destroy();
      }
      
      // Hard delete clone after retention
      await clone.destroy();
    }
    
    if (clonesToDelete.length > 0) {
      console.log(`[ComplianceService] Cleaned up ${clonesToDelete.length} archived clones`);
    }
    
    return clonesToDelete.length;
  }
}

export default ComplianceService;
