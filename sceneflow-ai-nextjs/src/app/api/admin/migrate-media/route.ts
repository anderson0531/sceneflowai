import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { 
  migrateProjectMedia, 
  calculateBase64Size 
} from '@/lib/storage/mediaStorage'

/**
 * POST /api/admin/migrate-media
 * 
 * Admin endpoint to migrate base64 images to blob storage for all projects.
 * Requires admin authentication.
 * 
 * Query params:
 *   - project_id: Migrate a specific project only (optional)
 *   - dry_run: true to preview without making changes (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Basic admin check - you may want to add proper auth
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_API_KEY
    
    // Allow if admin key matches OR if running locally
    const isLocal = request.headers.get('host')?.includes('localhost')
    if (!isLocal && adminKey && authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const dryRun = searchParams.get('dry_run') === 'true'
    
    await sequelize.authenticate()
    
    // Find projects to migrate
    const whereClause = projectId ? { id: projectId } : {}
    const projects = await Project.findAll({ where: whereClause })
    
    console.log(`[Admin Migration] Found ${projects.length} project(s), dryRun: ${dryRun}`)
    
    const results: any[] = []
    let totalBytesFreed = 0
    
    for (const project of projects) {
      const metadata = project.metadata || {}
      const base64Size = calculateBase64Size(metadata)
      
      if (base64Size === 0) {
        results.push({
          projectId: project.id,
          title: project.title,
          status: 'skipped',
          reason: 'No base64 images'
        })
        continue
      }
      
      console.log(`[Admin Migration] Project ${project.id} has ${(base64Size / 1024 / 1024).toFixed(2)} MB base64 data`)
      
      if (dryRun) {
        results.push({
          projectId: project.id,
          title: project.title,
          status: 'would_migrate',
          base64Size,
          base64SizeMB: (base64Size / 1024 / 1024).toFixed(2)
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
        
        results.push({
          projectId: project.id,
          title: project.title,
          status: 'migrated',
          stats,
          beforeSize: base64Size,
          afterSize,
          bytesFreed: stats.bytesFreed
        })
        
        totalBytesFreed += stats.bytesFreed
        
        console.log(`[Admin Migration] Migrated project ${project.id}: ${stats.migrated} images, freed ${(stats.bytesFreed / 1024 / 1024).toFixed(2)} MB`)
      } catch (error: any) {
        console.error(`[Admin Migration] Failed for project ${project.id}:`, error)
        results.push({
          projectId: project.id,
          title: project.title,
          status: 'error',
          error: error.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      dryRun,
      totalProjects: projects.length,
      totalBytesFreed,
      totalMBFreed: (totalBytesFreed / 1024 / 1024).toFixed(2),
      results
    })
  } catch (error: any) {
    console.error('[Admin Migration] Error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/migrate-media
 * 
 * Check migration status - lists projects with base64 data
 */
export async function GET(request: NextRequest) {
  try {
    await sequelize.authenticate()
    
    const projects = await Project.findAll()
    
    const projectsWithBase64: any[] = []
    let totalBase64Size = 0
    
    for (const project of projects) {
      const metadata = project.metadata || {}
      const base64Size = calculateBase64Size(metadata)
      
      if (base64Size > 0) {
        projectsWithBase64.push({
          projectId: project.id,
          title: project.title,
          base64Size,
          base64SizeMB: (base64Size / 1024 / 1024).toFixed(2)
        })
        totalBase64Size += base64Size
      }
    }
    
    return NextResponse.json({
      success: true,
      totalProjects: projects.length,
      projectsWithBase64: projectsWithBase64.length,
      totalBase64Size,
      totalBase64SizeMB: (totalBase64Size / 1024 / 1024).toFixed(2),
      projects: projectsWithBase64
    })
  } catch (error: any) {
    console.error('[Admin Migration] Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check status', details: error.message },
      { status: 500 }
    )
  }
}
