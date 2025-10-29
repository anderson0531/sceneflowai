import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, characterId, appearanceDescription } = await req.json()
    
    if (!projectId || !characterId || typeof appearanceDescription !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Ensure database connection
    await sequelize.authenticate()
    
    // Get actual user UUID (session.user.id might be email in demo mode)
    let userId = session.user.id
    
    // Check if userId is email format (not UUID)
    const isEmail = userId.includes('@')
    if (isEmail) {
      // Look up user by email to get UUID
      const User = (await import('@/models/User')).default
      const user = await User.findOne({ where: { email: userId } })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      userId = user.id
    }
    
    const project = await Project.findOne({ 
      where: { 
        id: projectId, 
        user_id: userId 
      } 
    })
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update character in metadata
    const characters = project.metadata?.visionPhase?.characters || []
    const updatedCharacters = characters.map((char: any) => {
      const charId = char.id || characters.indexOf(char).toString()
      return charId === characterId
        ? { ...char, appearanceDescription: appearanceDescription.trim() }
        : char
    })

    project.metadata.visionPhase.characters = updatedCharacters
    project.metadata.lastModified = new Date()
    await project.save()

    return NextResponse.json({ 
      success: true,
      message: 'Appearance description updated'
    })
  } catch (error: any) {
    console.error('[Update Appearance] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
