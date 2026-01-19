import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string
    const sceneNumber = parseInt(formData.get('sceneNumber') as string)

    if (!file || !projectId || isNaN(sceneNumber)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Get image metadata
    const imageMetadata = await sharp(buffer).metadata()
    const originalWidth = imageMetadata.width || 0
    const originalHeight = imageMetadata.height || 0
    
    console.log(`[Scene Upload] Original dimensions: ${originalWidth}x${originalHeight}`)
    
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
    
    console.log(`[Scene Upload] Crop to 16:9: ${cropWidth}x${cropHeight} at (${cropLeft}, ${cropTop})`)
    
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
    
    console.log(`[Scene Upload] Final image: 1920x1080 (16:9), ${Math.round(croppedBuffer.length / 1024)}KB`)

    // Upload to Vercel Blob (bypassing GCS for demo mode)
    const filename = `projects/${projectId}/scenes/scene-${sceneNumber}-${Date.now()}.jpg`
    const blob = await put(filename, croppedBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
    })

    console.log(`[Scene Upload] Uploaded to Vercel Blob: ${blob.url}`)

    // Update Database
    console.log(`[Scene Upload] Updating database for project ${projectId}, scene ${sceneNumber}`)
    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
    if (!project) {
      console.error(`[Scene Upload] Project not found: ${projectId}`)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    
    // Check both possible locations for scenes
    const scriptScenes = visionPhase.script?.script?.scenes || visionPhase.script?.scenes || []
    const topLevelScenes = visionPhase.scenes || []
    
    console.log(`[Scene Upload] Found ${scriptScenes.length} scenes in script, ${topLevelScenes.length} scenes at top level`)
    
    // Determine which scenes array to update
    const scenesToUpdate = scriptScenes.length > 0 ? scriptScenes : topLevelScenes
    
    console.log(`[Scene Upload] Updating scene ${sceneNumber} in array of ${scenesToUpdate.length} scenes`)
    console.log(`[Scene Upload] Scene numbers in array:`, scenesToUpdate.map((s: any) => s.sceneNumber))

    // Update the specific scene - match by index if sceneNumber is undefined
    const updatedScenes = scenesToUpdate.map((s: any, index: number) => {
      // Match by sceneNumber if it exists, otherwise match by index (1-based)
      const isTargetScene = s.sceneNumber === sceneNumber || (s.sceneNumber === undefined && index + 1 === sceneNumber)
      
      return isTargetScene
        ? {
            ...s,
            sceneNumber: sceneNumber, // Ensure sceneNumber is set
            imageUrl: blob.url,
            imageGeneratedAt: new Date().toISOString(),
            imageSource: 'upload'
          }
        : s
    })
    
    // Verify the update happened
    const updatedScene = updatedScenes.find((s: any, index: number) => 
      s.sceneNumber === sceneNumber || (s.sceneNumber === undefined && index + 1 === sceneNumber)
    )
    console.log(`[Scene Upload] Updated scene ${sceneNumber} imageUrl:`, updatedScene?.imageUrl?.substring(0, 50))

    // Build updated metadata - update BOTH locations if they exist
    const updatedMetadata = {
      ...metadata,
      visionPhase: {
        ...visionPhase,
        // Update top-level scenes if they exist
        ...(topLevelScenes.length > 0 ? { scenes: updatedScenes } : {}),
        // Update script scenes if they exist
        ...(visionPhase.script ? {
          script: {
            ...visionPhase.script,
            ...(visionPhase.script.script ? {
              script: {
                ...visionPhase.script.script,
                scenes: updatedScenes
              }
            } : {}),
            scenes: updatedScenes
          }
        } : {})
      }
    }

    const updateResult = await project.update({ metadata: updatedMetadata })
    console.log(`[Scene Upload] Database update successful, returning imageUrl: ${blob.url.substring(0, 50)}`)

    return NextResponse.json({ success: true, imageUrl: blob.url })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
