import { NextRequest, NextResponse } from 'next/server'
import '@/models' // Import all models to register them with Sequelize
import Project from '@/models/Project'
import User from '@/models/User'
import { sequelize } from '@/config/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/projects/from-script
 * 
 * Creates a new project from an imported script.
 * Expects pre-parsed script data from the client-side parser.
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null
  
  try {
    const body = await request.json()
    userId = body.userId
    const parsedScript = body.parsedScript
    const visionPhase = body.visionPhase
    const treatmentVariant = body.treatmentVariant
    
    console.log('[from-script] Request received for user:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId is required' 
      }, { status: 400 })
    }
    
    if (!parsedScript || !visionPhase) {
      return NextResponse.json({ 
        success: false, 
        error: 'parsedScript and visionPhase are required' 
      }, { status: 400 })
    }

    // Log received data
    console.log('[from-script] Received parsed script:', {
      title: parsedScript.title,
      sceneCount: parsedScript.scenes?.length || 0,
      characterCount: parsedScript.characters?.length || 0,
      totalDuration: parsedScript.metadata?.totalDuration,
      format: parsedScript.metadata?.format
    })

    // Ensure database connection
    await sequelize.authenticate()
    
    // Ensure user exists (auto-create if doesn't exist)
    let user = await User.findByPk(userId)
    if (!user) {
      console.log('[from-script] User not found, creating user:', userId)
      user = await User.create({
        id: userId,
        email: `user-${userId}@temp.sceneflow.ai`,
        username: `user_${userId.slice(0, 8)}`,
        password_hash: 'oauth-user',
        is_active: true,
        email_verified: false
      })
      console.log('[from-script] User created successfully')
    }
    
    // Extract project metadata from parsed script
    const projectTitle = (parsedScript.title || 'Imported Script').slice(0, 255)
    const totalDuration = parsedScript.metadata?.totalDuration || 300 // Default 5 minutes
    
    // Infer genre from content (simple heuristic)
    const genre = inferGenreFromScript(parsedScript)
    
    // Extract character names for description
    const characterNames = parsedScript.characters?.map((c: any) => c.name).join(', ') || 'No characters detected'
    
    const description = `Imported script with ${parsedScript.scenes?.length || 0} scenes and ${parsedScript.characters?.length || 0} characters: ${characterNames}`
    
    // Validate duration (5 min to 4 hours)
    const validatedDuration = Math.max(300, Math.min(totalDuration, 14400))
    
    console.log('[from-script] Creating project:', {
      title: projectTitle,
      duration: validatedDuration,
      genre,
      sceneCount: parsedScript.scenes?.length
    })
    
    // Create project with imported script data
    const project = await Project.create({
      user_id: userId,
      title: projectTitle,
      description: description.slice(0, 5000),
      genre: genre.slice(0, 100),
      duration: validatedDuration,
      tone: 'imported', // Mark as imported
      current_step: 'storyboard', // Start at Vision/Production phase
      status: 'in_progress',
      metadata: {
        // Mark as imported script
        importedScript: true,
        importedAt: new Date().toISOString(),
        originalFormat: parsedScript.metadata?.format || 'unknown',
        
        // Store full parsed script data for reference
        parsedScriptData: {
          title: parsedScript.title,
          author: parsedScript.metadata?.author,
          draft: parsedScript.metadata?.draft,
          totalDuration: parsedScript.metadata?.totalDuration,
          sceneCount: parsedScript.scenes?.length || 0,
          characterCount: parsedScript.characters?.length || 0
        },
        
        // Treatment variant for compatibility with existing flow
        filmTreatmentVariant: {
          ...treatmentVariant,
          id: treatmentVariant?.id || `imported-${Date.now()}`,
          label: 'Imported Script',
          source: 'script-import'
        },
        
        // Pre-populate vision phase with parsed data
        visionPhase: {
          scriptGenerated: true, // Mark as already having script
          charactersGenerated: true, // Characters extracted from script
          scenesGenerated: true, // Scenes parsed from script
          
          // Script data in expected format
          script: visionPhase.script,
          
          // Characters with placeholder data (can be enhanced in character library)
          characters: visionPhase.characters?.map((c: any, index: number) => ({
            ...c,
            id: `char-${index + 1}`,
            approved: false, // User should review/approve
            // Placeholders for character library features
            portraitUrl: null,
            voiceId: null,
            voiceSettings: null
          })) || [],
          
          // Scenes in expected format
          scenes: visionPhase.scenes || [],
          
          // Production data (empty, to be filled during production)
          production: {},
          
          // Flag that this came from import
          importSource: 'script-import'
        }
      }
    })
    
    console.log('[from-script] Created project:', {
      id: project.id,
      title: project.title,
      duration: project.duration,
      hasVisionPhase: !!project.metadata?.visionPhase,
      sceneCount: project.metadata?.visionPhase?.scenes?.length || 0
    })
    
    return NextResponse.json({ 
      success: true, 
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        genre: project.genre,
        duration: project.duration,
        currentStep: project.current_step,
        status: project.status,
        metadata: {
          importedScript: true,
          sceneCount: project.metadata?.visionPhase?.scenes?.length || 0,
          characterCount: project.metadata?.visionPhase?.characters?.length || 0
        }
      },
      redirect: `/dashboard/workflow/vision/${project.id}`
    })
  } catch (error: any) {
    console.error('[from-script] CRITICAL ERROR:', {
      error: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      hasUserId: !!userId
    })
    
    return NextResponse.json({ 
      success: false, 
      error: `Server error: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * Infer genre from parsed script content
 */
function inferGenreFromScript(parsedScript: any): string {
  const content = [
    parsedScript.title || '',
    ...(parsedScript.scenes?.map((s: any) => s.action || s.heading || '') || []),
    ...(parsedScript.scenes?.flatMap((s: any) => s.dialogue?.map((d: any) => d.text) || []) || [])
  ].join(' ').toLowerCase()
  
  const genreKeywords: Record<string, string[]> = {
    'comedy': ['funny', 'laugh', 'joke', 'hilarious', 'comedy'],
    'drama': ['emotional', 'tears', 'heartbreak', 'drama', 'conflict'],
    'thriller': ['suspense', 'tension', 'danger', 'thriller', 'chase'],
    'horror': ['scary', 'terrifying', 'monster', 'horror', 'scream'],
    'romance': ['love', 'romantic', 'kiss', 'heart', 'romance'],
    'action': ['fight', 'explosion', 'action', 'battle', 'combat'],
    'sci-fi': ['space', 'future', 'robot', 'alien', 'technology'],
    'documentary': ['interview', 'narrator', 'documentary', 'real'],
    'commercial': ['product', 'brand', 'buy', 'offer', 'sale']
  }
  
  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some(k => content.includes(k))) {
      return genre
    }
  }
  
  return 'general'
}
