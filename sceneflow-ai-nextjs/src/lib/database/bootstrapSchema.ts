import { QueryTypes } from 'sequelize'
import { sequelize } from '@/config/database'

import User from '@/models/User'
import Project from '@/models/Project'
import Series from '@/models/Series'
import UserProviderConfig from '@/models/UserProviderConfig'
import AIPricing from '@/models/AIPricing'
import CreditLedger from '@/models/CreditLedger'
import AIUsage from '@/models/AIUsage'
import APIUsageLog from '@/models/APIUsageLog'
import PlatformModel from '@/models/PlatformModel'
import PromptTemplate from '@/models/PromptTemplate'
import FeatureUpdate from '@/models/FeatureUpdate'
import CollabSession from '@/models/CollabSession'
import CollabParticipant from '@/models/CollabParticipant'
import CollabScore from '@/models/CollabScore'
import CollabComment from '@/models/CollabComment'
import CollabRecommendation from '@/models/CollabRecommendation'
import CollabChatMessage from '@/models/CollabChatMessage'
import RateCard from '@/models/RateCard'
import SubscriptionTier from '@/models/SubscriptionTier'
import RenderJob from '@/models/RenderJob'
import CreditPricing from '@/models/CreditPricing'
import VoiceConsent from '@/models/VoiceConsent'
import UserVoiceClone from '@/models/UserVoiceClone'
import ModerationEvent from '@/models/ModerationEvent'

import { migrateUsersSubscriptionColumns } from '@/lib/database/migrateUsersSubscription'
import { migrateCreditLedger } from '@/lib/database/migrateCreditLedger'
import { migrateRateCard } from '@/lib/database/migrateRateCard'
import { ensureWhopUserColumns } from '@/lib/database/migrateWhopPayment'

/**
 * Creates Sequelize tables on an empty Postgres (e.g. new Neon DB).
 * Safe to run multiple times (`alter`/no-force modes).
 */
export async function bootstrapDatabaseSchema(): Promise<{
  success: boolean
  logs: string[]
  error?: string
}> {
  const logs: string[] = []

  try {
    logs.push('Database Setup Starting...')

    logs.push('1. Testing database connection...')
    await sequelize.authenticate()
    logs.push('Connection successful')

    const [connInfo] = await sequelize
      .query<{ db: string; host: string; user: string }>(
        `SELECT current_database() AS db, inet_server_addr()::text AS host, current_user AS "user"`,
        { type: QueryTypes.SELECT }
      )
      .catch(() => [{ db: '?', host: '?', user: '?' }])
    logs.push(
      `Connected to: host=${connInfo?.host}, db=${connInfo?.db}, user=${connInfo?.user}`
    )

    logs.push('2. Creating SubscriptionTier table...')
    await SubscriptionTier.sync({ force: false })
    logs.push('✅ SubscriptionTier table created')

    logs.push('3. Creating RateCard table...')
    await RateCard.sync({ force: false })
    logs.push('✅ RateCard table created')

    logs.push('3a. Running RateCard migration (ENUM types)...')
    try {
      await migrateRateCard()
      logs.push('✅ RateCard migration completed')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      logs.push(`⚠️ RateCard migration note: ${msg}`)
    }

    logs.push('4. Creating User table (with alter to add missing columns)...')
    await User.sync({ alter: true })
    logs.push('✅ User table created/updated')

    logs.push('4a. Running users subscription columns migration...')
    try {
      await migrateUsersSubscriptionColumns()
      logs.push('✅ Users subscription columns migration completed')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      logs.push(`⚠️ Migration note: ${msg}`)
    }

    logs.push('4b. Running Whop user columns migration...')
    try {
      await ensureWhopUserColumns()
      logs.push('✅ Whop user columns migration completed')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      logs.push(`⚠️ Whop columns migration note: ${msg}`)
    }

    logs.push('5. Creating Series table (required before projects.series_id FK)...')
    await Series.sync({ force: false })
    logs.push('✅ Series table created')

    logs.push('6. Creating Project table...')
    await Project.sync({ force: false })
    logs.push('✅ Project table created')

    logs.push('7. Creating UserProviderConfig table...')
    await UserProviderConfig.sync({ force: false })
    logs.push('✅ UserProviderConfig table created')

    logs.push('8. Creating AIPricing table...')
    await AIPricing.sync({ force: false })
    logs.push('✅ AIPricing table created')

    logs.push('9. Creating CreditLedger table...')
    await CreditLedger.sync({ force: false })
    logs.push('✅ CreditLedger table created')

    logs.push('9a. Running credit_ledger migration...')
    try {
      await migrateCreditLedger()
      logs.push('✅ Credit ledger migration completed')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      logs.push(`⚠️ Credit ledger migration note: ${msg}`)
    }

    logs.push('10. Creating AIUsage table...')
    await AIUsage.sync({ force: false })
    logs.push('✅ AIUsage table created')

    logs.push('11. Creating CreditPricing table...')
    await CreditPricing.sync({ force: false })
    logs.push('✅ CreditPricing table created')

    logs.push('12. Creating APIUsageLog table...')
    await APIUsageLog.sync({ force: false })
    logs.push('✅ APIUsageLog table created')

    logs.push('13. Creating PlatformModel table...')
    await PlatformModel.sync({ force: false })
    logs.push('✅ PlatformModel table created')

    logs.push('14. Creating PromptTemplate table...')
    await PromptTemplate.sync({ force: false })
    logs.push('✅ PromptTemplate table created')

    logs.push('15. Creating FeatureUpdate table...')
    await FeatureUpdate.sync({ force: false })
    logs.push('✅ FeatureUpdate table created')

    logs.push('16. Creating CollabSession table...')
    await CollabSession.sync({ force: false })
    logs.push('✅ CollabSession table created')

    logs.push('17. Creating CollabParticipant table...')
    await CollabParticipant.sync({ force: false })
    logs.push('✅ CollabParticipant table created')

    logs.push('18. Creating CollabScore table...')
    await CollabScore.sync({ force: false })
    logs.push('✅ CollabScore table created')

    logs.push('19. Creating CollabComment table...')
    await CollabComment.sync({ force: false })
    logs.push('✅ CollabComment table created')

    logs.push('20. Creating CollabRecommendation table...')
    await CollabRecommendation.sync({ force: false })
    logs.push('✅ CollabRecommendation table created')

    logs.push('21. Creating CollabChatMessage table...')
    await CollabChatMessage.sync({ force: false })
    logs.push('✅ CollabChatMessage table created')

    logs.push('21b. Creating CollabBlueprintFeedback table...')
    const { default: CollabBlueprintFeedback } = await import('../../models/CollabBlueprintFeedback')
    await CollabBlueprintFeedback.sync({ force: false })
    logs.push('✅ CollabBlueprintFeedback table created')

    logs.push('22. Creating VoiceConsent table...')
    await VoiceConsent.sync({ force: false })
    logs.push('✅ VoiceConsent table created')

    logs.push('23. Creating UserVoiceClone table...')
    await UserVoiceClone.sync({ force: false })
    logs.push('✅ UserVoiceClone table created')

    logs.push('24. Creating ModerationEvent table...')
    await ModerationEvent.sync({ force: false })
    logs.push('✅ ModerationEvent table created')

    logs.push('25. Creating RenderJob table...')
    await RenderJob.sync({ force: false })
    logs.push('✅ RenderJob table created')

    logs.push('🎉 Database setup complete! All tables created.')

    return { success: true, logs }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logs.push(`❌ Error: ${message}`)
    console.error('Database setup error:', error)
    return { success: false, logs, error: message }
  }
}
