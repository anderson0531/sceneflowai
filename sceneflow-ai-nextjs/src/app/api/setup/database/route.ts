import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'

// Import all models to register them
import User from '@/models/User'
import Project from '@/models/Project'
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

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const logs: string[] = []
  
  try {
    logs.push('🔧 Database Setup Starting...')
    
    // Authenticate connection
    logs.push('1. Testing database connection...')
    await sequelize.authenticate()
    logs.push('✅ Connection successful')
    
    // Create tables in dependency order
    // Parent tables first, then child tables
    
    logs.push('2. Creating User table...')
    await User.sync({ force: false })
    logs.push('✅ User table created')
    
    logs.push('3. Creating Project table...')
    await Project.sync({ force: false })
    logs.push('✅ Project table created')
    
    logs.push('4. Creating UserProviderConfig table...')
    await UserProviderConfig.sync({ force: false })
    logs.push('✅ UserProviderConfig table created')
    
    logs.push('5. Creating AIPricing table...')
    await AIPricing.sync({ force: false })
    logs.push('✅ AIPricing table created')
    
    logs.push('6. Creating CreditLedger table...')
    await CreditLedger.sync({ force: false })
    logs.push('✅ CreditLedger table created')
    
    logs.push('7. Creating AIUsage table...')
    await AIUsage.sync({ force: false })
    logs.push('✅ AIUsage table created')
    
    logs.push('8. Creating APIUsageLog table...')
    await APIUsageLog.sync({ force: false })
    logs.push('✅ APIUsageLog table created')
    
    logs.push('9. Creating PlatformModel table...')
    await PlatformModel.sync({ force: false })
    logs.push('✅ PlatformModel table created')
    
    logs.push('10. Creating PromptTemplate table...')
    await PromptTemplate.sync({ force: false })
    logs.push('✅ PromptTemplate table created')
    
    logs.push('11. Creating FeatureUpdate table...')
    await FeatureUpdate.sync({ force: false })
    logs.push('✅ FeatureUpdate table created')
    
    // Collaboration tables - parent first
    logs.push('12. Creating CollabSession table...')
    await CollabSession.sync({ force: false })
    logs.push('✅ CollabSession table created')
    
    logs.push('13. Creating CollabParticipant table...')
    await CollabParticipant.sync({ force: false })
    logs.push('✅ CollabParticipant table created')
    
    logs.push('14. Creating CollabScore table...')
    await CollabScore.sync({ force: false })
    logs.push('✅ CollabScore table created')
    
    logs.push('15. Creating CollabComment table...')
    await CollabComment.sync({ force: false })
    logs.push('✅ CollabComment table created')
    
    logs.push('16. Creating CollabRecommendation table...')
    await CollabRecommendation.sync({ force: false })
    logs.push('✅ CollabRecommendation table created')
    
    logs.push('17. Creating CollabChatMessage table...')
    await CollabChatMessage.sync({ force: false })
    logs.push('✅ CollabChatMessage table created')
    
    logs.push('🎉 Database setup complete! All tables created.')
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      logs
    })
    
  } catch (error: any) {
    logs.push(`❌ Error: ${error.message}`)
    console.error('Database setup error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      logs
    }, { status: 500 })
  }
}

