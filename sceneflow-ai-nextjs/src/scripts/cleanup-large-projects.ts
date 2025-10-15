import { sequelize } from '../config/database'
import Project from '../models/Project'

async function cleanupLargeProjects() {
  await sequelize.authenticate()
  
  console.log('🧹 Finding projects with large metadata...')
  
  // Find all projects
  const projects = await Project.findAll()
  
  const projectsToDelete: string[] = []
  const projectsToClean: string[] = []
  
  for (const project of projects) {
    const metadataSize = JSON.stringify(project.metadata || {}).length
    const sizeInMB = metadataSize / 1024 / 1024
    
    console.log(`Project ${project.id}: ${sizeInMB.toFixed(2)} MB metadata`)
    
    // Projects over 5 MB are extremely large
    if (sizeInMB > 5) {
      projectsToDelete.push(project.id)
    }
    // Projects 1-5 MB should be cleaned (remove base64 images)
    else if (sizeInMB > 1) {
      projectsToClean.push(project.id)
    }
  }
  
  console.log(`\nFound ${projectsToDelete.length} projects > 5MB (will delete)`)
  console.log(`Found ${projectsToClean.length} projects 1-5MB (will clean)`)
  
  // Option 1: Delete very large projects
  if (projectsToDelete.length > 0) {
    console.log('\n⚠️  Deleting large projects:', projectsToDelete)
    await Project.destroy({ where: { id: projectsToDelete } })
    console.log('✅ Deleted!')
  }
  
  // Option 2: Clean base64 images from metadata
  for (const projectId of projectsToClean) {
    const project = await Project.findByPk(projectId)
    if (!project) continue
    
    const cleaned = cleanMetadata(project.metadata)
    const cleanedSize = JSON.stringify(cleaned).length / 1024 / 1024
    const originalSize = JSON.stringify(project.metadata).length / 1024 / 1024
    
    await project.update({ metadata: cleaned })
    console.log(`✅ Cleaned project ${projectId}: ${originalSize.toFixed(2)} MB → ${cleanedSize.toFixed(2)} MB`)
  }
  
  console.log('\n🎉 Cleanup complete!')
}

function cleanMetadata(metadata: any): any {
  if (!metadata) return {}
  
  const cleaned = { ...metadata }
  
  // Remove base64 thumbnail
  if (cleaned.thumbnail?.startsWith('data:image')) {
    console.log('  - Removing base64 thumbnail')
    delete cleaned.thumbnail
  }
  
  // Clean vision phase images
  if (cleaned.visionPhase?.script?.script?.scenes) {
    let sceneImageCount = 0
    cleaned.visionPhase.script.script.scenes = cleaned.visionPhase.script.script.scenes.map((scene: any) => {
      const cleanedScene = { ...scene }
      if (cleanedScene.imageUrl?.startsWith('data:image')) {
        delete cleanedScene.imageUrl
        cleanedScene.hasImage = false
        sceneImageCount++
      }
      return cleanedScene
    })
    if (sceneImageCount > 0) {
      console.log(`  - Removed ${sceneImageCount} scene base64 images`)
    }
  }
  
  // Clean character images
  if (cleaned.visionPhase?.characters) {
    let charImageCount = 0
    cleaned.visionPhase.characters = cleaned.visionPhase.characters.map((char: any) => {
      const cleanedChar = { ...char }
      if (cleanedChar.referenceImage?.startsWith('data:image')) {
        delete cleanedChar.referenceImage
        charImageCount++
      }
      return cleanedChar
    })
    if (charImageCount > 0) {
      console.log(`  - Removed ${charImageCount} character base64 images`)
    }
  }
  
  return cleaned
}

cleanupLargeProjects()
  .then(() => {
    console.log('✨ Cleanup script completed successfully')
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Cleanup failed:', err)
    process.exit(1)
  })

