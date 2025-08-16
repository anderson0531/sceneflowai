#!/usr/bin/env ts-node

/**
 * Database Setup Script for SceneFlow AI
 * 
 * This script initializes the database, creates tables, and sets up
 * the necessary schema for the VideoGenerationGateway service.
 * 
 * Usage:
 *   npm run setup:database
 *   or
 *   npx ts-node src/scripts/setup-database.ts
 */

import { sequelize } from '../config/database'
import { UserProviderConfig } from '../models/UserProviderConfig'
import { EncryptionService } from '../services/EncryptionService'

async function setupDatabase() {
  console.log('🚀 Setting up SceneFlow AI Database...\n')

  try {
    // Step 1: Test database connection
    console.log('📡 Testing database connection...')
    await sequelize.authenticate()
    console.log('✅ Database connection successful!\n')

    // Step 2: Check encryption service
    console.log('🔐 Checking encryption service...')
    if (!EncryptionService.isEncryptionConfigured()) {
      console.log('❌ Encryption service not configured!')
      console.log('📝 Please set ENCRYPTION_KEY in your .env.local file')
      console.log('💡 Run: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
      process.exit(1)
    }
    console.log('✅ Encryption service configured!\n')

    // Step 3: Sync database models
    console.log('🗄️ Creating database tables...')
    await sequelize.sync({ force: false, alter: true })
    console.log('✅ Database tables created/updated!\n')

    // Step 4: Verify models
    console.log('🔍 Verifying database models...')
    
    // Test UserProviderConfig model
    try {
      await UserProviderConfig.findAll({ limit: 1 })
      console.log('✅ UserProviderConfig model verified!')
    } catch (error) {
      console.log('❌ UserProviderConfig model verification failed:', error)
      throw error
    }

    // Step 5: Create sample data (optional)
    if (process.argv.includes('--with-sample-data')) {
      console.log('\n📝 Creating sample data...')
      await createSampleData()
      console.log('✅ Sample data created!')
    }

    console.log('\n🎉 Database setup completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('   1. Configure AI provider credentials in the database')
    console.log('   2. Test provider connections')
    console.log('   3. Run integration tests')
    console.log('   4. Deploy to production')

  } catch (error) {
    console.error('\n💥 Database setup failed:', error)
    console.error('\n🔍 Troubleshooting tips:')
    console.error('   - Check if PostgreSQL is running')
    console.error('   - Verify database credentials in .env.local')
    console.error('   - Ensure database and user exist')
    console.error('   - Check database user privileges')
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

async function createSampleData() {
  try {
    // Create sample user provider configurations
    const sampleConfigs = [
      {
        user_id: 'demo_user_001',
        provider_name: 'GOOGLE_VEO',
        encrypted_credentials: EncryptionService.encrypt(JSON.stringify({
          type: 'service_account',
          project_id: 'demo-project',
          private_key_id: 'demo_key_id',
          private_key: '-----BEGIN PRIVATE KEY-----\nDemo Private Key\n-----END PRIVATE KEY-----',
          client_email: 'demo@demo-project.iam.gserviceaccount.com',
          client_id: 'demo_client_id',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/demo%40demo-project.iam.gserviceaccount.com'
        })),
        is_valid: false // Mark as invalid since these are demo credentials
      },
      {
        user_id: 'demo_user_001',
        provider_name: 'RUNWAY',
        encrypted_credentials: EncryptionService.encrypt(JSON.stringify({
          apiKey: 'demo_runway_api_key'
        })),
        is_valid: false
      },
      {
        user_id: 'demo_user_001',
        provider_name: 'STABILITY_AI',
        encrypted_credentials: EncryptionService.encrypt(JSON.stringify({
          apiKey: 'demo_stability_api_key'
        })),
        is_valid: false
      }
    ]

    for (const config of sampleConfigs) {
      await UserProviderConfig.findOrCreate({
        where: { 
          user_id: config.user_id, 
          provider_name: config.provider_name 
        },
        defaults: config
      })
    }

    console.log('   - Created sample user provider configurations')
    console.log('   - Note: Sample credentials are marked as invalid')

  } catch (error) {
    console.log('⚠️ Failed to create sample data:', error)
  }
}

async function testDatabaseOperations() {
  console.log('\n🧪 Testing database operations...')

  try {
    // Test 1: Create a test record
    console.log('   📝 Testing record creation...')
    const testConfig = await UserProviderConfig.create({
      user_id: 'test_user_001',
      provider_name: 'GOOGLE_VEO',
      encrypted_credentials: EncryptionService.encrypt(JSON.stringify({
        apiKey: 'test_key'
      })),
      is_valid: false
    })
    console.log('   ✅ Record creation successful')

    // Test 2: Read the test record
    console.log('   📖 Testing record retrieval...')
    const retrievedConfig = await UserProviderConfig.findOne({
      where: { 
        user_id: 'test_user_001', 
        provider_name: 'GOOGLE_VEO' 
      }
    })
    console.log('   ✅ Record retrieval successful')

    // Test 3: Decrypt credentials
    console.log('   🔓 Testing credential decryption...')
    const decryptedCredentials = JSON.parse(
      EncryptionService.decrypt(retrievedConfig!.encrypted_credentials)
    )
    console.log('   ✅ Credential decryption successful')

    // Test 4: Delete test record
    console.log('   🗑️ Testing record deletion...')
    await testConfig.destroy()
    console.log('   ✅ Record deletion successful')

    console.log('   🎉 All database operations successful!')

  } catch (error) {
    console.log('   ❌ Database operation test failed:', error)
    throw error
  }
}

// Main execution
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n🏁 Setup script completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Setup script failed:', error)
      process.exit(1)
    })
}

export { setupDatabase, createSampleData, testDatabaseOperations }
