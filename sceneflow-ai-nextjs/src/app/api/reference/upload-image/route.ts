import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import sharp from 'sharp'

/**
 * Upload an image for a Production Bible reference (scene backdrop or object)
 * POST /api/reference/upload-image
 * 
 * Form data:
 * - file: The image file
 * - projectId: The project ID
 * - referenceId: The reference ID to update
 * - referenceType: 'scene' | 'object'
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string
    const referenceId = formData.get('referenceId') as string
    const referenceType = formData.get('referenceType') as 'scene' | 'object'

    if (!file || !projectId || !referenceId || !referenceType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (referenceType !== 'scene' && referenceType !== 'object') {
      return NextResponse.json({ error: 'Invalid reference type' }, { status: 400 })
    }

    console.log(`[Reference Upload] Uploading ${referenceType} reference image for project ${projectId}, reference ${referenceId}`)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Get image metadata
    const imageMetadata = await sharp(buffer).metadata()
    const originalWidth = imageMetadata.width || 0
    const originalHeight = imageMetadata.height || 0
    
    console.log(`[Reference Upload] Original dimensions: ${originalWidth}x${originalHeight}`)
    
    // Calculate 16:9 crop dimensions
    const targetAspectRatio = 16 / 9
    const currentAspectRatio = originalWidth / originalHeight
    
    let cropWidth = originalWidth
    let cropHeight = originalHeight
    let cropLeft = 0
    let cropTop = 0
    
    if (currentAspectRatio > targetAspectRatio) {
      // Image is wider than 16:9, crop width
      cropWidth = Math.round(originalHeight * targetAspectRatio)
      cropLeft = Math.round((originalWidth - cropWidth) / 2)
    } else if (currentAspectRatio < targetAspectRatio) {
      // Image is taller than 16:9, crop height
      cropHeight = Math.round(originalWidth / targetAspectRatio)
      cropTop = Math.round((originalHeight - cropHeight) / 2)
    }
    
    console.log(`[Reference Upload] Crop to 16:9: ${cropWidth}x${cropHeight} at (${cropLeft}, ${cropTop})`)
    
    // Crop to 16:9 and resize to standard HD resolution
    const croppedBuffer = await sharp(buffer)
      .extract({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight
      })
      .resize(1920, 1080, {
        fit: 'fill',
        kernel: 'lanczos3'
      })
      .jpeg({ quality: 90 })
      .toBuffer()
    
    console.log(`[Reference Upload] Final image: 1920x1080 (16:9), ${Math.round(croppedBuffer.length / 1024)}KB`)

    // Upload to Vercel Blob
    const filename = `projects/${projectId}/references/${referenceType}s/${referenceId}-${Date.now()}.jpg`
    const blob = await put(filename, croppedBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
    })

    console.log(`[Reference Upload] Uploaded to Vercel Blob: ${blob.url}`)

    // Update Database
    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
    if (!project) {
      console.error(`[Reference Upload] Project not found: ${projectId}`)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    const references = visionPhase.references || {}
    
    const sceneReferences = references.sceneReferences || []
    const objectReferences = references.objectReferences || []
    
    // Update the specific reference
    let updated = false
    
    if (referenceType === 'scene') {
      for (let i = 0; i < sceneReferences.length; i++) {
        if (sceneReferences[i].id === referenceId) {
          sceneReferences[i].imageUrl = blob.url
          sceneReferences[i].updatedAt = new Date().toISOString()
          sceneReferences[i].aiGenerated = false // Mark as manually uploaded
          updated = true
          console.log(`[Reference Upload] Updated scene reference ${referenceId}`)
          break
        }
      }
    } else {
      for (let i = 0; i < objectReferences.length; i++) {
        if (objectReferences[i].id === referenceId) {
          objectReferences[i].imageUrl = blob.url
          objectReferences[i].updatedAt = new Date().toISOString()
          objectReferences[i].aiGenerated = false // Mark as manually uploaded
          updated = true
          console.log(`[Reference Upload] Updated object reference ${referenceId}`)
          break
        }
      }
    }

    if (!updated) {
      console.warn(`[Reference Upload] Reference ${referenceId} not found in ${referenceType} references`)
    }

    // Save back to database
    const updatedMetadata = {
      ...metadata,
      visionPhase: {
        ...visionPhase,
        references: {
          sceneReferences,
          objectReferences
        }
      }
    }

    await project.update({ metadata: updatedMetadata })
    console.log(`[Reference Upload] Database updated successfully`)

    return NextResponse.json({
      success: true,
      imageUrl: blob.url,
      referenceId,
      referenceType
    })

  } catch (error) {
    console.error('[Reference Upload] Error:', error)
    return NextResponse.json(
      { error: 'Failed to upload reference image' },
      { status: 500 }
    )
  }
}
