/**
 * Script Export Utility
 * 
 * Exports scripts from the Vision/Production phase to various formats
 * including Fountain (industry standard), plain text, and JSON.
 */

export interface ExportScriptOptions {
  format: 'fountain' | 'text' | 'json' | 'pdf'
  includeTitle: boolean
  includeSceneNumbers: boolean
  includeCharacterList: boolean
  includeNotes: boolean
  includeDurations: boolean
}

export interface SceneData {
  sceneNumber: number
  heading?: string
  action?: string
  narration?: string
  dialogue?: Array<{
    character: string
    line: string
    parenthetical?: string | null
    extension?: string | null
  }>
  characters?: string[]
  duration?: number
  visualNotes?: string
  audioNotes?: string
}

export interface ScriptData {
  title: string
  scenes: SceneData[]
  characters?: Array<{
    name: string
    description?: string
    role?: string
  }>
  metadata?: {
    author?: string
    draft?: string
    totalDuration?: number
    createdAt?: string
    importedScript?: boolean
  }
}

/**
 * Export script to Fountain format (industry standard screenplay format)
 */
export function exportToFountain(script: ScriptData, options: Partial<ExportScriptOptions> = {}): string {
  const opts: ExportScriptOptions = {
    format: 'fountain',
    includeTitle: true,
    includeSceneNumbers: true,
    includeCharacterList: false,
    includeNotes: false,
    includeDurations: false,
    ...options
  }
  
  const lines: string[] = []
  
  // Title page
  if (opts.includeTitle) {
    lines.push(`Title: ${script.title}`)
    if (script.metadata?.author) {
      lines.push(`Author: ${script.metadata.author}`)
    }
    if (script.metadata?.draft) {
      lines.push(`Draft: ${script.metadata.draft}`)
    }
    lines.push(`Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)
    lines.push('')
    lines.push('') // Double line break after title page
  }
  
  // Character list (optional)
  if (opts.includeCharacterList && script.characters?.length) {
    lines.push('/* CHARACTERS */')
    lines.push('')
    for (const char of script.characters) {
      const desc = char.description ? ` - ${char.description}` : ''
      const role = char.role ? ` (${char.role})` : ''
      lines.push(`/* ${char.name}${role}${desc} */`)
    }
    lines.push('')
    lines.push('')
  }
  
  // Scenes
  for (const scene of script.scenes) {
    // Scene heading
    const sceneNum = opts.includeSceneNumbers ? `${scene.sceneNumber}. ` : ''
    const heading = scene.heading || `INT. SCENE ${scene.sceneNumber} - DAY`
    lines.push(`${sceneNum}${heading}`)
    lines.push('')
    
    // Duration note (optional)
    if (opts.includeDurations && scene.duration) {
      lines.push(`/* Duration: ${formatDuration(scene.duration)} */`)
      lines.push('')
    }
    
    // Action/description
    if (scene.action) {
      // Wrap action at ~60 chars for readability
      const wrappedAction = wrapText(scene.action, 60)
      lines.push(wrappedAction)
      lines.push('')
    }
    
    // Narration (if present, format as voice over)
    if (scene.narration) {
      lines.push('NARRATOR (V.O.)')
      const wrappedNarration = wrapText(scene.narration, 35).split('\n').map(l => `    ${l}`).join('\n')
      lines.push(wrappedNarration)
      lines.push('')
    }
    
    // Dialogue
    if (scene.dialogue?.length) {
      for (const d of scene.dialogue) {
        // Character cue with extension
        const ext = d.extension ? ` (${d.extension})` : ''
        lines.push(`${d.character.toUpperCase()}${ext}`)
        
        // Parenthetical
        if (d.parenthetical) {
          const paren = d.parenthetical.startsWith('(') ? d.parenthetical : `(${d.parenthetical})`
          lines.push(paren)
        }
        
        // Dialogue text (indented, wrapped at 35 chars)
        const wrappedDialogue = wrapText(d.line, 35).split('\n').map(l => `    ${l}`).join('\n')
        lines.push(wrappedDialogue)
        lines.push('')
      }
    }
    
    // Notes (optional)
    if (opts.includeNotes) {
      if (scene.visualNotes) {
        lines.push(`/* Visual: ${scene.visualNotes} */`)
      }
      if (scene.audioNotes) {
        lines.push(`/* Audio: ${scene.audioNotes} */`)
      }
      if (scene.visualNotes || scene.audioNotes) {
        lines.push('')
      }
    }
    
    // Scene separator
    lines.push('')
  }
  
  // End
  lines.push('THE END')
  
  return lines.join('\n')
}

/**
 * Export script to plain text format
 */
export function exportToText(script: ScriptData, options: Partial<ExportScriptOptions> = {}): string {
  const opts: ExportScriptOptions = {
    format: 'text',
    includeTitle: true,
    includeSceneNumbers: true,
    includeCharacterList: true,
    includeNotes: true,
    includeDurations: true,
    ...options
  }
  
  const lines: string[] = []
  
  // Title
  if (opts.includeTitle) {
    lines.push('=' .repeat(60))
    lines.push(script.title.toUpperCase())
    lines.push('=' .repeat(60))
    lines.push('')
    
    if (script.metadata?.author) {
      lines.push(`Author: ${script.metadata.author}`)
    }
    if (script.metadata?.totalDuration) {
      lines.push(`Total Duration: ${formatDuration(script.metadata.totalDuration)}`)
    }
    lines.push(`Scenes: ${script.scenes.length}`)
    lines.push('')
  }
  
  // Character list
  if (opts.includeCharacterList && script.characters?.length) {
    lines.push('-'.repeat(40))
    lines.push('CHARACTERS')
    lines.push('-'.repeat(40))
    for (const char of script.characters) {
      const desc = char.description ? `: ${char.description}` : ''
      lines.push(`• ${char.name}${desc}`)
    }
    lines.push('')
  }
  
  // Scenes
  for (const scene of script.scenes) {
    lines.push('-'.repeat(60))
    const heading = scene.heading || `Scene ${scene.sceneNumber}`
    lines.push(opts.includeSceneNumbers ? `SCENE ${scene.sceneNumber}: ${heading}` : heading)
    
    if (opts.includeDurations && scene.duration) {
      lines.push(`Duration: ${formatDuration(scene.duration)}`)
    }
    lines.push('-'.repeat(60))
    lines.push('')
    
    if (scene.action) {
      lines.push(scene.action)
      lines.push('')
    }
    
    if (scene.narration) {
      lines.push(`[NARRATION] ${scene.narration}`)
      lines.push('')
    }
    
    if (scene.dialogue?.length) {
      for (const d of scene.dialogue) {
        const paren = d.parenthetical ? ` ${d.parenthetical}` : ''
        lines.push(`${d.character}${paren}: "${d.line}"`)
      }
      lines.push('')
    }
    
    if (opts.includeNotes) {
      if (scene.visualNotes) {
        lines.push(`[Visual Notes] ${scene.visualNotes}`)
      }
      if (scene.audioNotes) {
        lines.push(`[Audio Notes] ${scene.audioNotes}`)
      }
    }
    
    lines.push('')
  }
  
  lines.push('=' .repeat(60))
  lines.push('END')
  lines.push('=' .repeat(60))
  
  return lines.join('\n')
}

/**
 * Export script to JSON format (for backup/transfer)
 */
export function exportToJSON(script: ScriptData): string {
  return JSON.stringify({
    ...script,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  }, null, 2)
}

/**
 * Export scene direction notes
 */
export function exportSceneDirection(script: ScriptData): string {
  const lines: string[] = []
  
  lines.push('=' .repeat(60))
  lines.push('SCENE DIRECTION NOTES')
  lines.push(`Project: ${script.title}`)
  lines.push('=' .repeat(60))
  lines.push('')
  
  for (const scene of script.scenes) {
    lines.push(`SCENE ${scene.sceneNumber}: ${scene.heading || 'Untitled'}`)
    lines.push('-'.repeat(40))
    
    if (scene.characters?.length) {
      lines.push(`Characters: ${scene.characters.join(', ')}`)
    }
    
    if (scene.duration) {
      lines.push(`Duration: ${formatDuration(scene.duration)}`)
    }
    
    lines.push('')
    
    if (scene.visualNotes) {
      lines.push('VISUAL DIRECTION:')
      lines.push(scene.visualNotes)
      lines.push('')
    }
    
    if (scene.audioNotes) {
      lines.push('AUDIO DIRECTION:')
      lines.push(scene.audioNotes)
      lines.push('')
    }
    
    if (scene.action) {
      lines.push('ACTION/DESCRIPTION:')
      lines.push(scene.action)
      lines.push('')
    }
    
    lines.push('')
  }
  
  return lines.join('\n')
}

/**
 * Convert vision phase data to ScriptData format
 */
export function visionPhaseToScriptData(visionPhase: any, projectTitle?: string): ScriptData {
  const script = visionPhase?.script || {}
  const scenes = script?.scenes || visionPhase?.scenes || []
  const characters = visionPhase?.characters || []
  
  return {
    title: script?.title || projectTitle || 'Untitled Script',
    scenes: scenes.map((s: any, idx: number) => ({
      sceneNumber: s.sceneNumber || idx + 1,
      heading: s.heading || s.title,
      action: s.action || s.description,
      narration: s.narration,
      dialogue: s.dialogue?.map((d: any) => ({
        character: d.character,
        line: d.line || d.text,
        parenthetical: d.parenthetical,
        extension: d.extension
      })) || [],
      characters: s.characters || [],
      duration: s.duration,
      visualNotes: s.visualNotes,
      audioNotes: s.audioNotes
    })),
    characters: characters.map((c: any) => ({
      name: c.name,
      description: c.description,
      role: c.role
    })),
    metadata: {
      author: visionPhase?.metadata?.author,
      draft: visionPhase?.metadata?.draft,
      totalDuration: scenes.reduce((sum: number, s: any) => sum + (s.duration || 0), 0),
      createdAt: visionPhase?.metadata?.importedAt || new Date().toISOString(),
      importedScript: visionPhase?.importSource === 'script-import'
    }
  }
}

/**
 * Trigger browser download of exported content
 */
export function downloadExport(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Helper functions

function formatDuration(seconds: number): string {
  if (!seconds) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

function wrapText(text: string, maxWidth: number): string {
  if (!text) return ''
  
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''
  
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxWidth) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  
  if (currentLine) lines.push(currentLine)
  
  return lines.join('\n')
}
