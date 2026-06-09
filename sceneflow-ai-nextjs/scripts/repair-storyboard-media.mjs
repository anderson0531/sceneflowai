/**
 * Repair fragmented storyboard image URLs by merging script.script.scenes,
 * script.scenes, and visionPhase.scenes, then persisting the richest copy.
 *
 * Usage:
 *   DRY_RUN=true node scripts/repair-storyboard-media.mjs [shareSlugOrProjectId]
 *   node scripts/repair-storyboard-media.mjs TheWhiteHouseWaltzAControlledThaw
 *
 * For broken dialogue audio URLs (404), use scripts/repair-dialogue-audio.mjs
 *
 * Requires DATABASE_URL or POSTGRES_* env vars (.env.production.local)
 */

import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const DRY_RUN = process.env.DRY_RUN === 'true'
const target = process.argv[2] || 'TheWhiteHouseWaltzAControlledThaw'

dotenv.config({ path: path.join(__dirname, '..', '.env.production.local') })
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:5432/${process.env.POSTGRES_DATABASE || 'postgres'}`

function isValidUrl(value) {
  return typeof value === 'string' && value.trim() && value.trim() !== 'deferred'
}

function auditScenes(scenes, label) {
  if (!Array.isArray(scenes)) return { label, scenes: 0, rows: [] }
  const rows = scenes.map((scene, index) => {
    const beatFrames = (scene?.beats || []).filter((b) =>
      isValidUrl(b?.storyboardImageUrl)
    ).length
    const dialogueFrames = (scene?.dialogue || []).filter((d) =>
      isValidUrl(d?.storyboardImageUrl)
    ).length
    let segmentFrames = 0
    for (const seg of scene?.segments || []) {
      for (const line of seg?.dialogue || []) {
        if (isValidUrl(line?.storyboardImageUrl)) segmentFrames++
      }
    }
    return {
      index,
      hasImageUrl: isValidUrl(scene?.imageUrl),
      beatFrames,
      dialogueFrames,
      segmentFrames,
    }
  })
  return { label, scenes: scenes.length, rows }
}

async function main() {
  // Load compiled TS helpers via tsx register at runtime
  const { resolveStoryboardScenes, auditStoryboardSceneMedia } = await import(
    '../src/lib/storyboard/resolveStoryboardScenes.ts'
  )

  const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  })

  console.log(`\nRepair storyboard media — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Target: ${target}\n`)

  await sequelize.authenticate()

  const [projects] = await sequelize.query(
    `SELECT id, title, metadata FROM projects WHERE metadata::text ILIKE :needle LIMIT 20`,
    { replacements: { needle: `%${target}%` } }
  )

  if (!projects.length) {
    console.error('No project found for target:', target)
    process.exit(1)
  }

  const project = projects.find((p) => {
    const md = p.metadata || {}
    const link = md.storyboardShareLink
    return (
      p.id === target ||
      link?.slug === target ||
      link?.shareToken === target ||
      (p.title && String(p.title).includes('White House Waltz'))
    )
  }) || projects[0]

  const md = project.metadata || {}
  const visionPhase = md.visionPhase || {}
  const script = visionPhase.script || {}
  const nested = script?.script?.scenes
  const wrapper = script?.scenes
  const legacy = visionPhase.scenes

  for (const audit of [
    auditScenes(nested, 'script.script.scenes'),
    auditScenes(wrapper, 'script.scenes'),
    auditScenes(legacy, 'visionPhase.scenes'),
  ]) {
    console.log(`--- ${audit.label} (${audit.scenes} scenes) ---`)
    for (const row of audit.rows) {
      console.log(
        `  Scene ${row.index + 1}: establishing=${row.hasImageUrl} beatFrames=${row.beatFrames} dialogueFrames=${row.dialogueFrames} segmentFrames=${row.segmentFrames}`
      )
    }
  }

  const resolved = resolveStoryboardScenes({ script, visionPhaseScenes: legacy })
  console.log('\n--- After resolveStoryboardScenes ---')
  for (const row of auditStoryboardSceneMedia(resolved)) {
    console.log(
      `  Scene ${row.index + 1}: establishing=${row.hasImageUrl} beatFrames=${row.beatFrames} dialogueFrames=${row.dialogueFrames} segmentFrames=${row.segmentDialogueFrames}`
    )
  }

  const canonical = Array.isArray(nested) && nested.length > 0 ? nested : wrapper || legacy || []
  const canonicalAudit = auditStoryboardSceneMedia(canonical)
  const resolvedAudit = auditStoryboardSceneMedia(resolved)

  const needsRepair = resolvedAudit.some((r, i) => {
    const c = canonicalAudit[i]
    if (!c) return true
    return (
      r.hasImageUrl !== c.hasImageUrl ||
      r.beatFrames !== c.beatFrames ||
      r.dialogueFrames !== c.dialogueFrames ||
      r.segmentDialogueFrames !== c.segmentDialogueFrames
    )
  })

  if (!needsRepair) {
    console.log('\nNo repair needed — canonical scenes already match resolved media.')
    await sequelize.close()
    return
  }

  console.log('\nRepair needed: persisting merged scenes to metadata.')

  const nextScript = script?.script
    ? {
        ...script,
        script: { ...script.script, scenes: resolved },
        scenes: resolved,
      }
    : { ...script, scenes: resolved }

  const nextMetadata = {
    ...md,
    visionPhase: {
      ...visionPhase,
      scenes: resolved,
      script: nextScript,
    },
  }

  if (DRY_RUN) {
    console.log('DRY_RUN: would update project', project.id, project.title)
    await sequelize.close()
    return
  }

  await sequelize.query(`UPDATE projects SET metadata = :metadata::jsonb, updated_at = NOW() WHERE id = :id`, {
    replacements: {
      id: project.id,
      metadata: JSON.stringify(nextMetadata),
    },
  })

  console.log(`Updated project ${project.id} (${project.title})`)
  await sequelize.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
