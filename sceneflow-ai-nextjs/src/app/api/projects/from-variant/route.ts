import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let variant: any = null
  let userId: string | null = null
  
  try {
    // Parse request body with error handling
    const body = await request.json()
    userId = body.userId
    variant = body.variant
    const title = body.title
    
    console.log('[from-variant] Request received for user:', userId)
    
    if (!userId || !variant) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId and variant are required' 
      }, { status: 400 })
    }

    // LOG RECEIVED VARIANT DATA
    console.log('[from-variant] Received variant:', {
      hasBeats: !!variant.beats,
      beatsCount: Array.isArray(variant.beats) ? variant.beats.length : 0,
      beatsType: typeof variant.beats,
      beatsSample: Array.isArray(variant.beats) ? variant.beats.slice(0, 2) : null,
      total_duration_seconds: variant.total_duration_seconds,
      estimatedDurationMinutes: variant.estimatedDurationMinutes,
      format_length: variant.format_length
    })

    // Ensure database connection
    await sequelize.authenticate()
    
    // Helper: Extract keywords from long text (for VARCHAR fields)
    const extractKeywords = (text: string | undefined, fallback: string = '', maxLength: number = 100) => {
      if (!text) return fallback
      // Take first clause before comma/semicolon
      const firstClause = text.split(/[,;]/)[0].trim()
      return firstClause.slice(0, maxLength)
    }

    // Extract metadata from Film Treatment variant (rich data structure)
    const projectTitle = (title || variant.title || 'New Project').slice(0, 255)
    const description = variant.synopsis || variant.logline || variant.content || ''
    const genre = extractKeywords(variant.genre, 'general', 100)
    
    // Extract duration - check multiple sources in priority order with defensive validation
    let duration = 300 // Default: 5 minutes (300 seconds) - MINIMUM as user specified

    try {
      // Priority 1: Explicit total_duration_seconds field
      if (variant.total_duration_seconds && typeof variant.total_duration_seconds === 'number') {
        duration = variant.total_duration_seconds
        console.log(`[Project] Using total_duration_seconds: ${duration}s (${Math.floor(duration / 60)} min)`)
      }
      // Priority 2: Calculate from beats if available
      else if (variant.beats && Array.isArray(variant.beats)) {
        duration = variant.beats.reduce((sum: number, beat: any) => {
          const minutes = parseFloat(beat.minutes) || 1 // Safe parsing
          const seconds = Math.max(0, Math.min(minutes * 60, 3600)) // Cap at 1 hour per beat
          return sum + seconds
        }, 0)
        
        // Validate result
        if (isNaN(duration) || duration <= 0) {
          console.error(`[Project] Invalid duration from beats: ${duration}, using default`)
          duration = 300
        } else {
          console.log(`[Project] Calculated from beats: ${duration}s (${Math.floor(duration / 60)} min, ${variant.beats.length} beats)`)
        }
      }
      // Priority 3: Parse from format_length
      else if (variant.format_length) {
        const durationMatch = variant.format_length.match(/(\d+)/)
        if (durationMatch) {
          duration = parseInt(durationMatch[1])
          console.log(`[Project] Parsed from format_length: ${duration}s`)
        }
      }
      // Priority 4: Use estimatedDurationMinutes
      else if (variant.estimatedDurationMinutes) {
        duration = variant.estimatedDurationMinutes * 60
        console.log(`[Project] Using estimatedDurationMinutes: ${duration}s`)
      }

      // Enforce minimum of 5 minutes (300s)
      if (duration < 300) {
        console.warn(`[Project] Duration ${duration}s < 5min, using 300s`)
        duration = 300
      }
      
      // Enforce maximum of 4 hours (14400s) for sanity
      if (duration > 14400) {
        console.warn(`[Project] Duration ${duration}s > 4hr, capping at 14400s`)
        duration = 14400
      }
    } catch (error) {
      console.error('[Project] Duration calculation error:', error)
      duration = 300 // Safe default
    }
    
    // SUMMARY LOG: Final calculated duration
    console.log('[from-variant] CALCULATED DURATION:', {
      duration: duration,
      durationMinutes: Math.floor(duration / 60),
      source: variant.total_duration_seconds ? 'total_duration_seconds' :
              variant.beats && Array.isArray(variant.beats) ? 'beats array' :
              variant.format_length ? 'format_length' :
              variant.estimatedDurationMinutes ? 'estimatedDurationMinutes' :
              'DEFAULT 300s',
      rawValue: variant.total_duration_seconds || variant.estimatedDurationMinutes || variant.format_length,
      beatsCount: Array.isArray(variant.beats) ? variant.beats.length : 0
    })
    
    // Extract tone keywords (tone_description can be very long!)
    const tone = extractKeywords(variant.tone || variant.tone_description, 'neutral', 100)
    
    // Validate all fields before save
    const validatedDuration = Math.max(300, Math.min(duration, 14400)) // 5min to 4hr
    const validatedTitle = projectTitle.slice(0, 255)
    const validatedGenre = genre.slice(0, 100)
    const validatedTone = tone.slice(0, 100)
    const validatedDescription = (description || '').slice(0, 5000) // Reasonable limit

    console.log('[Project] Creating with validated fields:', {
      title: validatedTitle,
      duration: validatedDuration,
      genre: validatedGenre,
      tone: validatedTone
    })
    
    // Create project
    const project = await Project.create({
      user_id: userId,
      title: validatedTitle,
      description: validatedDescription,
      genre: validatedGenre,
      duration: validatedDuration,
      tone: validatedTone,
      current_step: 'storyboard', // Move to Vision
      status: 'in_progress',
      metadata: {
        // Save complete Film Treatment variant for script generation
        filmTreatmentVariant: variant,
        blueprintInput: variant.content || variant.synopsis,
        visionPhase: {
          scriptGenerated: false,
          charactersGenerated: false,
          scenesGenerated: false,
          script: null,
          characters: variant.character_descriptions || [],
          scenes: [],
          beatSheet: variant.act_breakdown || null
        }
      }
    })
    
    // LOG CREATED PROJECT
    console.log('[from-variant] Created project:', {
      id: project.id,
      duration: project.duration,
      hasMetadata: !!project.metadata,
      hasFilmTreatmentVariant: !!project.metadata?.filmTreatmentVariant,
      variantBeatsCount: Array.isArray(project.metadata?.filmTreatmentVariant?.beats) 
        ? project.metadata.filmTreatmentVariant.beats.length 
        : 0,
      variantDuration: project.metadata?.filmTreatmentVariant?.total_duration_seconds
    })
    
    return NextResponse.json({ 
      success: true, 
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        genre: project.genre,
        duration: project.duration,
        tone: project.tone,
        currentStep: project.current_step,
        status: project.status,
        metadata: project.metadata
      },
      redirect: `/dashboard/workflow/vision/${project.id}`
    })
  } catch (error: any) {
    console.error('[from-variant] CRITICAL ERROR:', {
      error: error.message,
      name: error.name,
      stack: error.stack,
      hasVariant: !!variant,
      hasUserId: !!userId
    })
    
    if (variant) {
      console.error('[from-variant] Variant data sample:', {
        hasBeats: !!variant.beats,
        beatsLength: Array.isArray(variant.beats) ? variant.beats.length : 0,
        hasTitle: !!variant.title,
        hasDuration: !!variant.total_duration_seconds
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: `Server error: ${error.message}`,
      stack: error.stack?.split('\n').slice(0, 3).join(' | ')
    }, { status: 500 })
  }
}

function parseVariantText(text: string) {
  // Extract duration (e.g., "60s", "90s", "120s")
  const durationMatch = text.match(/(\d+)s/)
  const duration = durationMatch ? parseInt(durationMatch[1]) : 60
  
  // Extract tone keywords
  const toneKeywords = ['confident', 'hopeful', 'upbeat', 'warm', 'energetic', 'authentic', 'modern', 'professional']
  const tone = toneKeywords.find(t => text.toLowerCase().includes(t)) || 'neutral'
  
  // Infer title from first phrase (before semicolon or dash)
  const titleMatch = text.match(/^([^;—\-]+)/)
  const inferredTitle = titleMatch ? titleMatch[1].trim() : 'New Project'
  
  // Infer genre based on keywords
  const genreKeywords = {
    'documentary': ['documentary', 'profile'],
    'tutorial': ['tutorial', 'how-to', 'recipe'],
    'commercial': ['brand', 'product', 'launch'],
    'explainer': ['explainer', 'educational'],
    'testimonial': ['testimonial', 'review'],
    'announcement': ['announcement', 'reveal'],
    'event': ['event', 'recap']
  }
  
  let genre = 'general'
  for (const [key, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some(k => text.toLowerCase().includes(k))) {
      genre = key
      break
    }
  }
  
  return { 
    duration, 
    tone, 
    inferredTitle, 
    genre,
    originalText: text
  }
}

