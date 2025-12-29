/**
 * Compliance Guardrails Database Migration
 * 
 * Creates tables and columns required for the voice consent/compliance system:
 * - VoiceConsent table (consent tracking)
 * - UserVoiceClone table (voice clone registry)
 * - ModerationEvent table (audit log)
 * - User columns: trust_score, voice_cloning_enabled, account_verified_at
 * - SubscriptionTier columns: voice_clone_slots, has_voice_cloning
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '@/models';

let migrationRun = false;

/**
 * Run the compliance guardrails migration
 * Safe to call multiple times - uses IF NOT EXISTS checks
 */
export async function migrateComplianceGuardrails(): Promise<void> {
  if (migrationRun) {
    console.log('[Compliance Migration] Already run in this process');
    return;
  }

  const qi = sequelize.getQueryInterface();
  
  try {
    console.log('[Compliance Migration] Starting...');

    // ========================================================================
    // Step 1: Add columns to Users table
    // ========================================================================
    
    const usersTableDesc = await qi.describeTable('users').catch(() => null);
    
    if (usersTableDesc) {
      // trust_score column
      if (!usersTableDesc.trust_score) {
        await qi.addColumn('users', 'trust_score', {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 100,
        });
        console.log('[Compliance Migration] Added trust_score to users');
      }
      
      // voice_cloning_enabled column
      if (!usersTableDesc.voice_cloning_enabled) {
        await qi.addColumn('users', 'voice_cloning_enabled', {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        });
        console.log('[Compliance Migration] Added voice_cloning_enabled to users');
      }
      
      // account_verified_at column (may already exist as email verification)
      if (!usersTableDesc.account_verified_at) {
        await qi.addColumn('users', 'account_verified_at', {
          type: DataTypes.DATE,
          allowNull: true,
        });
        console.log('[Compliance Migration] Added account_verified_at to users');
      }
    }

    // ========================================================================
    // Step 2: Add columns to SubscriptionTiers table
    // ========================================================================
    
    const tiersTableDesc = await qi.describeTable('subscription_tiers').catch(() => null);
    
    if (tiersTableDesc) {
      // voice_clone_slots column
      if (!tiersTableDesc.voice_clone_slots) {
        await qi.addColumn('subscription_tiers', 'voice_clone_slots', {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        });
        console.log('[Compliance Migration] Added voice_clone_slots to subscription_tiers');
        
        // Set default values for existing tiers
        await sequelize.query(`
          UPDATE subscription_tiers 
          SET voice_clone_slots = CASE 
            WHEN name ILIKE '%pro%' THEN 3
            WHEN name ILIKE '%studio%' THEN 10
            WHEN name ILIKE '%enterprise%' THEN 100
            ELSE 0
          END
        `);
        console.log('[Compliance Migration] Updated voice_clone_slots for existing tiers');
      }
      
      // has_voice_cloning column
      if (!tiersTableDesc.has_voice_cloning) {
        await qi.addColumn('subscription_tiers', 'has_voice_cloning', {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        });
        console.log('[Compliance Migration] Added has_voice_cloning to subscription_tiers');
        
        // Set default values for existing tiers
        await sequelize.query(`
          UPDATE subscription_tiers 
          SET has_voice_cloning = CASE 
            WHEN name ILIKE '%pro%' THEN true
            WHEN name ILIKE '%studio%' THEN true
            WHEN name ILIKE '%enterprise%' THEN true
            ELSE false
          END
        `);
        console.log('[Compliance Migration] Updated has_voice_cloning for existing tiers');
      }
    }

    // ========================================================================
    // Step 3: Create ENUM types for PostgreSQL
    // ========================================================================
    
    // Create enum types if they don't exist
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE consent_status AS ENUM ('pending', 'verified', 'failed', 'expired');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => console.log('[Compliance Migration] consent_status enum may already exist'));
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE consent_type AS ENUM ('self_attestation', 'voice_verified');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => console.log('[Compliance Migration] consent_type enum may already exist'));
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE content_type AS ENUM ('tts_script', 'clone_request', 'image_prompt', 'video_prompt');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => console.log('[Compliance Migration] content_type enum may already exist'));
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE voice_type AS ENUM ('stock', 'cloned');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => console.log('[Compliance Migration] voice_type enum may already exist'));
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE moderation_action AS ENUM ('allowed', 'blocked', 'warning');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => console.log('[Compliance Migration] moderation_action enum may already exist'));

    // ========================================================================
    // Step 4: Create VoiceConsent table
    // ========================================================================
    
    const voiceConsentExists = await qi.describeTable('voice_consents').catch(() => null);
    
    if (!voiceConsentExists) {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS voice_consents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          consent_status consent_status NOT NULL DEFAULT 'pending',
          consent_type consent_type NOT NULL DEFAULT 'self_attestation',
          actor_name VARCHAR(255) NOT NULL,
          consent_phrase TEXT,
          verification_code VARCHAR(10),
          sample_audio_urls JSONB DEFAULT '[]',
          azure_profile_id VARCHAR(255),
          match_score FLOAT,
          verification_attempts INTEGER NOT NULL DEFAULT 0,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          verified_at TIMESTAMP WITH TIME ZONE,
          expires_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_voice_consents_user_id ON voice_consents(user_id);
        CREATE INDEX IF NOT EXISTS idx_voice_consents_consent_status ON voice_consents(consent_status);
        CREATE INDEX IF NOT EXISTS idx_voice_consents_verification_code ON voice_consents(verification_code);
      `);
      
      console.log('[Compliance Migration] Created voice_consents table');
    }

    // ========================================================================
    // Step 5: Create UserVoiceClone table
    // ========================================================================
    
    const userVoiceCloneExists = await qi.describeTable('user_voice_clones').catch(() => null);
    
    if (!userVoiceCloneExists) {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS user_voice_clones (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          consent_id UUID NOT NULL REFERENCES voice_consents(id) ON DELETE CASCADE,
          voice_name VARCHAR(255) NOT NULL,
          elevenlabs_voice_id VARCHAR(255),
          is_active BOOLEAN NOT NULL DEFAULT true,
          is_locked BOOLEAN NOT NULL DEFAULT false,
          use_count INTEGER NOT NULL DEFAULT 0,
          last_used_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          archived_at TIMESTAMP WITH TIME ZONE,
          archived_reason VARCHAR(100)
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_voice_clones_user_id ON user_voice_clones(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_voice_clones_consent_id ON user_voice_clones(consent_id);
        CREATE INDEX IF NOT EXISTS idx_user_voice_clones_elevenlabs_voice_id ON user_voice_clones(elevenlabs_voice_id);
        CREATE INDEX IF NOT EXISTS idx_user_voice_clones_is_active ON user_voice_clones(is_active);
      `);
      
      console.log('[Compliance Migration] Created user_voice_clones table');
    }

    // ========================================================================
    // Step 6: Create ModerationEvent table
    // ========================================================================
    
    const moderationEventExists = await qi.describeTable('moderation_events').catch(() => null);
    
    if (!moderationEventExists) {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS moderation_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content_type content_type NOT NULL,
          content_hash VARCHAR(64) NOT NULL,
          voice_type voice_type,
          voice_clone_id UUID,
          action moderation_action NOT NULL,
          score FLOAT,
          categories JSONB DEFAULT '{}',
          fraud_keywords_detected JSONB DEFAULT '[]',
          model_version VARCHAR(50),
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_moderation_events_user_id ON moderation_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_moderation_events_content_type ON moderation_events(content_type);
        CREATE INDEX IF NOT EXISTS idx_moderation_events_action ON moderation_events(action);
        CREATE INDEX IF NOT EXISTS idx_moderation_events_created_at ON moderation_events(created_at);
      `);
      
      console.log('[Compliance Migration] Created moderation_events table');
    }

    migrationRun = true;
    console.log('[Compliance Migration] Complete!');
    
  } catch (error) {
    console.error('[Compliance Migration] Error:', error);
    throw error;
  }
}

export default migrateComplianceGuardrails;
