/**
 * Migration: Strip Phantom Narration from Existing Projects
 * 
 * Background: The `coerceNarration` function in optimize-script would
 * manufacture narration text from action text whenever narration was empty.
 * This created "phantom narration" — narration that appeared in scene data
 * but was never written by the user or intended by the AI. The analysis APIs
 * would then recommend removing this narration, creating a confusing cycle
 * where users couldn't remove narration that didn't visibly exist in the UI.
 * 
 * This migration finds scenes where narration is suspiciously similar to the
 * first sentence of action text (indicating it was manufactured) and clears it.
 * 
 * Usage:
 *   DRY_RUN=true node scripts/migrations/strip-phantom-narration.mjs   # Preview changes
 *   node scripts/migrations/strip-phantom-narration.mjs                 # Apply changes
 * 
 * Requires: DATABASE_URL or POSTGRES_* env vars
 */

import { Sequelize, DataTypes, QueryTypes } from 'sequelize'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.env.DRY_RUN === 'true'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.production.local') })
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') })

const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:5432/${process.env.POSTGRES_DATABASE || 'postgres'}`

console.log(`\n🔧 Strip Phantom Narration Migration`)
console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '⚡ LIVE (will modify data)'}`)
console.log(`   Host: ${process.env.POSTGRES_HOST || 'from DATABASE_URL'}\n`)

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
})

/**
 * Check if narration looks like it was manufactured from action text.
 * The old coerceNarration would take the first sentence of action text
 * and use it as narration.
 */
function isPhantomNarration(narration, action) {
  if (!narration || !action) return false
  
  const cleanNarration = narration.trim().toLowerCase()
  const cleanAction = action.trim().toLowerCase()
  
  // If narration is empty-ish, it's not phantom (already clean)
  if (!cleanNarration || cleanNarration === 'none' || cleanNarration === 'null') return false
  
  // Check 1: Narration is identical to action (or first part of action)
  if (cleanAction.startsWith(cleanNarration)) return true
  
  // Check 2: Narration matches the first sentence of action
  const firstSentenceMatch = cleanAction.match(/[^.!?]*[.!?]/)
  if (firstSentenceMatch) {
    const firstSentence = firstSentenceMatch[0].replace(/\s+/g, ' ').trim()
    if (cleanNarration === firstSentence) return true
    // Also check with trailing punctuation stripped
    if (cleanNarration.replace(/[.!?]+$/, '') === firstSentence.replace(/[.!?]+$/, '')) return true
  }
  
  // Check 3: High similarity (>85%) between narration and first sentence of action
  if (firstSentenceMatch) {
    const firstSentence = firstSentenceMatch[0].replace(/\s+/g, ' ').trim()
    const narrationWords = new Set(cleanNarration.split(/\s+/))
    const sentenceWords = new Set(firstSentence.split(/\s+/))
    const intersection = [...narrationWords].filter(w => sentenceWords.has(w))
    const unionSize = new Set([...narrationWords, ...sentenceWords]).size
    const similarity = unionSize > 0 ? intersection.length / unionSize : 0
    if (similarity > 0.85) return true
  }
  
  return false
}

async function run() {
  try {
    await sequelize.authenticate()
    console.log('✅ Database connected\n')
    
    // Query all projects with metadata
    const projects = await sequelize.query(
      `SELECT id, title, metadata FROM projects WHERE metadata IS NOT NULL`,
      { type: QueryTypes.SELECT }
    )
    
    console.log(`📦 Found ${projects.length} projects to scan\n`)
    
    let totalScenesScanned = 0
    let totalPhantomFound = 0
    let totalProjectsAffected = 0
    let projectsToUpdate = []
    
    for (const project of projects) {
      const metadata = typeof project.metadata === 'string' 
        ? JSON.parse(project.metadata) 
        : project.metadata
      
      const scenes = metadata?.visionPhase?.script?.script?.scenes 
        || metadata?.visionPhase?.scenes 
        || []
      
      if (!scenes.length) continue
      
      let phantomCount = 0
      let updatedScenes = scenes.map((scene, idx) => {
        totalScenesScanned++
        
        if (!scene.narration) return scene
        
        if (isPhantomNarration(scene.narration, scene.action)) {
          phantomCount++
          totalPhantomFound++
          console.log(`  🔍 Project "${project.title || project.id}" Scene ${idx + 1}:`)
          console.log(`     Narration: "${scene.narration.substring(0, 80)}${scene.narration.length > 80 ? '...' : ''}"`)
          console.log(`     Action:    "${(scene.action || '').substring(0, 80)}${(scene.action || '').length > 80 ? '...' : ''}"`)
          console.log(`     → Will clear narration\n`)
          
          return { ...scene, narration: '' }
        }
        
        return scene
      })
      
      if (phantomCount > 0) {
        totalProjectsAffected++
        projectsToUpdate.push({
          id: project.id,
          title: project.title,
          metadata,
          updatedScenes,
          phantomCount
        })
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   Scenes scanned:     ${totalScenesScanned}`)
    console.log(`   Phantom narrations: ${totalPhantomFound}`)
    console.log(`   Projects affected:  ${totalProjectsAffected}\n`)
    
    if (totalPhantomFound === 0) {
      console.log('✨ No phantom narration found — all clean!')
      return
    }
    
    if (DRY_RUN) {
      console.log('🔍 DRY RUN — no changes applied. Run without DRY_RUN=true to apply.')
      return
    }
    
    // Apply updates
    console.log('⚡ Applying changes...\n')
    
    for (const { id, title, metadata, updatedScenes, phantomCount } of projectsToUpdate) {
      // Update both scene locations in metadata
      const updatedMetadata = { ...metadata }
      if (updatedMetadata.visionPhase?.script?.script?.scenes) {
        updatedMetadata.visionPhase.script.script.scenes = updatedScenes
      }
      if (updatedMetadata.visionPhase?.scenes) {
        updatedMetadata.visionPhase.scenes = updatedScenes
      }
      
      await sequelize.query(
        `UPDATE projects SET metadata = :metadata, updated_at = NOW() WHERE id = :id`,
        {
          replacements: { metadata: JSON.stringify(updatedMetadata), id },
          type: QueryTypes.UPDATE
        }
      )
      
      console.log(`   ✅ Updated "${title || id}" — cleared ${phantomCount} phantom narration(s)`)
    }
    
    console.log(`\n🎉 Migration complete! Cleared ${totalPhantomFound} phantom narrations across ${totalProjectsAffected} projects.`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

run()
