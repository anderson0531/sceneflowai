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

    // Upload cropped image to Vercel Blob
    const filename = `scenes/${projectId}-scene-${sceneNumber}-${Date.now()}.jpg`
    const blob = await put(filename, croppedBuffer, {
      access: 'public',
      contentType: 'image/jpeg'
    })

    // Update Database
    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    const script = visionPhase.script || {}
    const scenes = script.script?.scenes || script.scenes || []

    // Update the specific scene
    const updatedScenes = scenes.map((s: any) =>
      s.sceneNumber === sceneNumber
        ? {
            ...s,
            imageUrl: blob.url,
            imageGeneratedAt: new Date().toISOString(),
            imageSource: 'upload'
          }
        : s
    )

    // Update metadata
    const updatedMetadata = {
      ...metadata,
      visionPhase: {
        ...visionPhase,
        script: {
          ...script,
          script: {
            ...script.script,
            scenes: updatedScenes
          },
          scenes: updatedScenes
        }
      }
    }

    await project.update({ metadata: updatedMetadata })

    return NextResponse.json({ success: true, imageUrl: blob.url })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
