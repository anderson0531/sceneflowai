import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { 
  migrateProjectMedia, 
  calculateBase64Size,
  isBase64DataUri 
} from '@/lib/storage/mediaStorage'

// UUID v4 regex pattern for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface MediaResponse {
  type: 'characters' | 'props' | 'backdrops' | 'scenes' | 'all'
  items: MediaItem[]
  hasBase64: boolean
  base64Size: number
}

export interface MediaItem {
  id: string
  name: string
  imageUrl?: string
  type: string
}

/**
 * GET /api/projects/[id]/media
 * 
 * Fetch media items for a project with optional filtering
 * Query params:
 *   - type: 'characters' | 'props' | 'backdrops' | 'scenes' | 'all'
 *   - ids: comma-separated list of IDs to fetch (optional)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }
    
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'all'
    const idsFilter = searchParams.get('ids')?.split(',').filter(Boolean) || null
    
    await sequelize.authenticate()
    
    const project = await Project.findByPk(id)
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    
    const items: MediaItem[] = []
    let hasBase64 = false
    
    // Collect characters
    if (type === 'all' || type === 'characters') {
      const characters = visionPhase.characters || []
      for (const char of characters) {
        if (idsFilter && !idsFilter.includes(char.id)) continue
        
        if (isBase64DataUri(char.referenceImage)) {
          hasBase64 = true
        }
        
        items.push({
          id: char.id,
          name: char.name,
          imageUrl: char.referenceImage,
          type: 'character'
        })
        
        // Also include wardrobe images
        for (const wardrobe of char.wardrobes || []) {
          const wardrobeImageUrl = wardrobe.fullBodyUrl || wardrobe.previewImageUrl || wardrobe.headshotUrl
          if (isBase64DataUri(wardrobeImageUrl)) {
            hasBase64 = true
          }
          
          items.push({
            id: `${char.id}-${wardrobe.id}`,
            name: `${char.name} - ${wardrobe.name}`,
            imageUrl: wardrobeImageUrl,
            type: 'wardrobe'
          })
        }
      }
    }
    
    // Collect props
    if (type === 'all' || type === 'props') {
      const props = visionPhase.references?.objectReferences || []
      for (const prop of props) {
        if (idsFilter && !idsFilter.includes(prop.id)) continue
        
        if (isBase64DataUri(prop.imageUrl)) {
          hasBase64 = true
        }
        
        items.push({
          id: prop.id,
          name: prop.name,
          imageUrl: prop.imageUrl,
          type: 'prop'
        })
      }
    }
    
    // Collect backdrops
    if (type === 'all' || type === 'backdrops') {
      const backdrops = visionPhase.references?.sceneReferences || []
      for (const backdrop of backdrops) {
        if (idsFilter && !idsFilter.includes(backdrop.id)) continue
        
        if (isBase64DataUri(backdrop.imageUrl)) {
          hasBase64 = true
        }
        
        items.push({
          id: backdrop.id,
          name: backdrop.name,
          imageUrl: backdrop.imageUrl,
          type: 'backdrop'
        })
      }
    }
    
    // Collect scenes
    if (type === 'all' || type === 'scenes') {
      const scenes = visionPhase.script?.script?.scenes || []
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i]
        const sceneId = scene.id || `scene-${i + 1}`
        
        if (idsFilter && !idsFilter.includes(sceneId)) continue
        
        if (isBase64DataUri(scene.imageUrl)) {
          hasBase64 = true
        }
        
        items.push({
          id: sceneId,
          name: scene.heading || `Scene ${i + 1}`,
          imageUrl: scene.imageUrl,
          type: 'scene'
        })
      }
    }
    
    const base64Size = calculateBase64Size(metadata)
    
    const response: MediaResponse = {
      type: type as MediaResponse['type'],
      items,
      hasBase64,
      base64Size
    }
    
    console.log(`[Media API] Returning ${items.length} items for project ${id}, hasBase64: ${hasBase64}, size: ${Math.round(base64Size / 1024)}KB`)
    
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[Media API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[id]/media
 * 
 * Migrate base64 images to Vercel Blob storage
 * This converts all embedded base64 data to URL references
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }
    
    await sequelize.authenticate()
    
    const project = await Project.findByPk(id)
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    const metadata = project.metadata || {}
    
    // Calculate current base64 size
    const beforeSize = calculateBase64Size(metadata)
    
    if (beforeSize === 0) {
      return NextResponse.json({
        success: true,
        message: 'No base64 images to migrate',
        stats: {
          totalFound: 0,
          migrated: 0,
          alreadyUrls: 0,
          failed: 0,
          bytesFreed: 0
        }
      })
    }
    
    console.log(`[Media API] Starting migration for project ${id}, current base64 size: ${Math.round(beforeSize / 1024)}KB`)
    
    // Migrate all base64 images to blob storage
    const { metadata: newMetadata, stats } = await migrateProjectMedia(id, metadata)
    
    // Update project with new metadata
    await project.update({
      metadata: newMetadata,
      updated_at: new Date()
    })
    
    // Reload to verify
    await project.reload()
    const afterSize = calculateBase64Size(project.metadata)
    
    console.log(`[Media API] Migration complete for project ${id}:`, {
      beforeSize: Math.round(beforeSize / 1024) + 'KB',
      afterSize: Math.round(afterSize / 1024) + 'KB',
      stats
    })
    
    return NextResponse.json({
      success: true,
      message: `Migrated ${stats.migrated} images to blob storage`,
      stats,
      beforeSize,
      afterSize
    })
  } catch (error: any) {
    console.error('[Media API] Migration error:', error)
    return NextResponse.json(
      { error: 'Failed to migrate media', details: error.message },
      { status: 500 }
    )
  }
}
