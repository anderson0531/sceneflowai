import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string
    const sceneNumber = parseInt(formData.get('sceneNumber') as string)

    if (!file || !projectId || isNaN(sceneNumber)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upload to Vercel Blob
    const filename = `scenes/${projectId}-scene-${sceneNumber}-${Date.now()}-${file.name}`
    const blob = await put(filename, file, {
      access: 'public',
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
