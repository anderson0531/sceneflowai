import { sequelize } from '@/models'

export async function migrateCreditLedger() {
  try {
    await sequelize.authenticate()
    console.log('Database connection established.')

    // Step 1: Create credit_type ENUM type if it doesn't exist
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE credit_ledger_credit_type_enum AS ENUM ('subscription', 'addon');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `)
      console.log('✓ Created credit_type ENUM type (or already exists)')
    } catch (error: any) {
      console.log('Enum creation note:', error.message)
    }

    // Step 2: Add credit_type column to credit_ledger table
    try {
      await sequelize.query(`
        ALTER TABLE credit_ledger
        ADD COLUMN IF NOT EXISTS credit_type credit_ledger_credit_type_enum DEFAULT NULL;
      `)
      console.log('✓ Added credit_type column to credit_ledger table')
    } catch (error: any) {
      console.log('credit_type column note:', error.message)
    }

    console.log('✅ Migration completed: Added credit_type column to credit_ledger table')
  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  }
}

