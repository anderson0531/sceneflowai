/**
 * Migration Script: Migrate Base64 Images to Vercel Blob Storage
 * 
 * This script finds all projects with base64 images in their metadata
 * and migrates them to Vercel Blob storage for improved performance.
 * 
 * Usage:
 *   npx ts-node src/scripts/migrate-base64-to-blob.ts [--dry-run] [--project-id <id>]
 * 
 * Options:
 *   --dry-run     Show what would be migrated without making changes
 *   --project-id  Migrate a specific project only
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { sequelize } from '../config/database'
import Project from '../models/Project'
import { 
  migrateProjectMedia, 
  calculateBase64Size,
  MigrationStats 
} from '../lib/storage/mediaStorage'

interface MigrationReport {
  projectId: string
  title: string
  beforeSize: number
  afterSize: number
  stats: MigrationStats
  error?: string
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const projectIdArg = args.indexOf('--project-id')
  const specificProjectId = projectIdArg !== -1 ? args[projectIdArg + 1] : null
  
  console.log('='.repeat(60))
  console.log('Base64 to Blob Migration Script')
  console.log('='.repeat(60))
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`)
  if (specificProjectId) {
    console.log(`Target: Project ${specificProjectId}`)
  }
  console.log()
  
  try {
    // Connect to database
    await sequelize.authenticate()
    console.log('✓ Database connected')
    
    // Find projects to migrate
    const whereClause = specificProjectId ? { id: specificProjectId } : {}
    const projects = await Project.findAll({ where: whereClause })
    
    console.log(`Found ${projects.length} project(s) to analyze`)
    console.log()
    
    const reports: MigrationReport[] = []
    let totalBytesFreed = 0
    let projectsWithBase64 = 0
    
    for (const project of projects) {
      const metadata = project.metadata || {}
      const base64Size = calculateBase64Size(metadata)
      
      if (base64Size === 0) {
        console.log(`[${project.id}] ${project.title} - No base64 images`)
        continue
      }
      
      projectsWithBase64++
      console.log()
      console.log(`[${project.id}] ${project.title}`)
      console.log(`  Base64 size: ${(base64Size / 1024 / 1024).toFixed(2)} MB`)
      
      if (dryRun) {
        console.log(`  Would migrate (dry run)`)
        reports.push({
          projectId: project.id,
          title: project.title,
          beforeSize: base64Size,
          afterSize: 0,
          stats: {
            totalFound: 0,
            migrated: 0,
            alreadyUrls: 0,
            failed: 0,
            bytesFreed: base64Size
          }
        })
        totalBytesFreed += base64Size
        continue
      }
      
      // Perform migration
      try {
        const { metadata: newMetadata, stats } = await migrateProjectMedia(
          project.id,
          metadata
        )
        
        // Update project with migrated metadata
        await project.update({
          metadata: newMetadata,
          updated_at: new Date()
        })
        
        const afterSize = calculateBase64Size(newMetadata)
        
        console.log(`  ✓ Migrated ${stats.migrated} images`)
        console.log(`  ✓ ${stats.alreadyUrls} already URLs`)
        console.log(`  ✓ ${stats.failed} failed`)
        console.log(`  ✓ Freed: ${(stats.bytesFreed / 1024 / 1024).toFixed(2)} MB`)
        
        reports.push({
          projectId: project.id,
          title: project.title,
          beforeSize: base64Size,
          afterSize,
          stats
        })
        
        totalBytesFreed += stats.bytesFreed
      } catch (error: any) {
        console.error(`  ✗ Migration failed: ${error.message}`)
        reports.push({
          projectId: project.id,
          title: project.title,
          beforeSize: base64Size,
          afterSize: base64Size,
          stats: {
            totalFound: 0,
            migrated: 0,
            alreadyUrls: 0,
            failed: 1,
            bytesFreed: 0
          },
          error: error.message
        })
      }
    }
    
    // Print summary
    console.log()
    console.log('='.repeat(60))
    console.log('Migration Summary')
    console.log('='.repeat(60))
    console.log(`Total projects analyzed: ${projects.length}`)
    console.log(`Projects with base64 data: ${projectsWithBase64}`)
    console.log(`Total space freed: ${(totalBytesFreed / 1024 / 1024).toFixed(2)} MB`)
    
    if (dryRun) {
      console.log()
      console.log('This was a dry run. No changes were made.')
      console.log('Run without --dry-run to perform migration.')
    }
    
    // Print detailed report
    if (reports.length > 0) {
      console.log()
      console.log('Detailed Report:')
      console.log('-'.repeat(60))
      for (const report of reports) {
        console.log(`${report.title} (${report.projectId.slice(0, 8)})`)
        console.log(`  Before: ${(report.beforeSize / 1024).toFixed(0)} KB`)
        console.log(`  After: ${(report.afterSize / 1024).toFixed(0)} KB`)
        console.log(`  Migrated: ${report.stats.migrated}`)
        if (report.error) {
          console.log(`  ERROR: ${report.error}`)
        }
      }
    }
    
  } catch (error: any) {
    console.error('Migration script failed:', error.message)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

main()
