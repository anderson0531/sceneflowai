import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { generateSceneDirection } from '@/lib/sceneGeneration/generateDirection'

export const maxDuration = 300
export const runtime = 'nodejs'

interface GenerateDirectionRequest {
  projectId: string
  sceneIndex: number
  scene: {
    heading?: string | { text: string }
    action?: string
    visualDescription?: string
    narration?: string
    dialogue?: Array<{ character: string; text?: string; line?: string }>
    characters?: string[]
    [key: string]: any
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, sceneIndex, scene }: GenerateDirectionRequest = await req.json()

    if (!projectId || sceneIndex === undefined || !scene) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: projectId, sceneIndex, or scene' },
        { status: 400 }
      )
    }

    await sequelize.authenticate()

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    let sceneDirection
    try {
      const result = await generateSceneDirection({ scene, sceneIndex })
      sceneDirection = result.sceneDirection
    } catch (error: any) {
      console.error('[Scene Direction] Generation error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate scene direction',
          details: error?.message || 'Unknown error',
        },
        { status: 500 }
      )
    }

    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    const script = visionPhase.script || {}
    const scriptScenes = script.script?.scenes || script.scenes || []

    if (sceneIndex < 0 || sceneIndex >= scriptScenes.length) {
      return NextResponse.json(
        { success: false, error: `Invalid scene index: ${sceneIndex}` },
        { status: 400 }
      )
    }

    const updatedScenes = scriptScenes.map((s: any, idx: number) =>
      idx === sceneIndex ? { ...s, sceneDirection } : s
    )

    const updatedScript = script.script
      ? { ...script, script: { ...script.script, scenes: updatedScenes } }
      : { ...script, scenes: updatedScenes }

    await project.update({
      metadata: {
        ...metadata,
        visionPhase: {
          ...visionPhase,
          script: updatedScript,
        },
      },
    })

    console.log(
      '[Scene Direction] Successfully generated and saved direction for scene',
      sceneIndex
    )

    return NextResponse.json({
      success: true,
      sceneDirection,
    })
  } catch (error: any) {
    console.error('[Scene Direction] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate scene direction' },
      { status: 500 }
    )
  }
}
