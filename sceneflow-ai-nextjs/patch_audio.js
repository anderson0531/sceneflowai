const fs = require('fs');
let code = fs.readFileSync('src/app/api/vision/generate-all-audio/route.ts', 'utf8');

const regex = /\/\/ STEP 1: Collect all existing audio URLs[\s\S]*?\/\/ STEP 3: Save cleaned scenes to database BEFORE any generation/;
const match = code.match(regex);
if (match) {
  const replacement = `// STEP 1: Collect all existing audio URLs for blob deletion
      const urlsToDelete: string[] = []
      
      scenes.forEach((scene: any) => {
        // Collect narration audio URLs for the SPECIFIC language, plus legacy fields
        if (scene.narrationAudio && typeof scene.narrationAudio === 'object' && !Array.isArray(scene.narrationAudio)) {
          const audioData = scene.narrationAudio[language]
          if (audioData && typeof audioData === 'object' && audioData.url?.includes('blob')) {
            urlsToDelete.push(audioData.url)
          } else if (typeof audioData === 'string' && audioData.includes('blob')) {
            urlsToDelete.push(audioData)
          }
        } else if (typeof scene.narrationAudio === 'string' && scene.narrationAudio.includes('blob')) {
          urlsToDelete.push(scene.narrationAudio)
        }
        if (scene.narrationAudioUrl && typeof scene.narrationAudioUrl === 'string' && scene.narrationAudioUrl.includes('blob')) {
          urlsToDelete.push(scene.narrationAudioUrl)
        }
        
        // Collect description audio URLs for the SPECIFIC language, plus legacy fields
        if (scene.descriptionAudio && typeof scene.descriptionAudio === 'object' && !Array.isArray(scene.descriptionAudio)) {
          const audioData = scene.descriptionAudio[language]
          if (audioData && typeof audioData === 'object' && audioData.url?.includes('blob')) {
            urlsToDelete.push(audioData.url)
          } else if (typeof audioData === 'string' && audioData.includes('blob')) {
            urlsToDelete.push(audioData)
          }
        } else if (typeof scene.descriptionAudio === 'string' && scene.descriptionAudio.includes('blob')) {
          urlsToDelete.push(scene.descriptionAudio)
        }
        if (scene.descriptionAudioUrl && typeof scene.descriptionAudioUrl === 'string' && scene.descriptionAudioUrl.includes('blob')) {
          urlsToDelete.push(scene.descriptionAudioUrl)
        }
        
        // Collect dialogue audio URLs for the SPECIFIC language, plus legacy fields
        if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object' && !Array.isArray(scene.dialogueAudio)) {
          const dialogueArray = scene.dialogueAudio[language]
          if (Array.isArray(dialogueArray)) {
            dialogueArray.forEach((dialogue: any) => {
              if (dialogue?.audioUrl && typeof dialogue.audioUrl === 'string' && dialogue.audioUrl.includes('blob')) {
                urlsToDelete.push(dialogue.audioUrl)
              }
            })
          }
        } else if (Array.isArray(scene.dialogueAudio)) {
          scene.dialogueAudio.forEach((dialogue: any) => {
            if (dialogue?.audioUrl && typeof dialogue.audioUrl === 'string' && dialogue.audioUrl.includes('blob')) {
              urlsToDelete.push(dialogue.audioUrl)
            }
          })
        }
        
        if (scene.dialogue && Array.isArray(scene.dialogue)) {
          scene.dialogue.forEach((d: any) => {
            if (d.audioUrl && typeof d.audioUrl === 'string' && d.audioUrl.includes('blob')) {
              urlsToDelete.push(d.audioUrl)
            }
          })
        }
        
        // Only delete music if we are instructed to regenerate it AND we don't have music
        // Actually, if we are regenerating it, we should delete it. If not, don't.
        if (includeMusic && (!scene.musicAudio || language === 'en')) {
          if (scene.musicAudio && typeof scene.musicAudio === 'string' && scene.musicAudio.includes('blob')) {
            urlsToDelete.push(scene.musicAudio)
          }
          if (scene.music && typeof scene.music === 'object' && scene.music.url && scene.music.url.includes('blob')) {
            urlsToDelete.push(scene.music.url)
          }
        }
        
        // Only delete SFX if we are instructed to regenerate it
        if (includeSFX && (!scene.sfxAudio || language === 'en')) {
          if (scene.sfxAudio && typeof scene.sfxAudio === 'object') {
            Object.values(scene.sfxAudio).forEach((url: any) => {
              if (typeof url === 'string' && url.includes('blob')) urlsToDelete.push(url)
            })
          }
          if (scene.sfx && Array.isArray(scene.sfx)) {
            scene.sfx.forEach((s: any) => {
              if (typeof s === 'object' && s.url && s.url.includes('blob')) {
                urlsToDelete.push(s.url)
              }
            })
          }
        }
      })
      
      console.log(\`[Batch Audio] Found \${urlsToDelete.length} \${language} audio files to delete\`)
      
      // Perform blob deletion in background (don't block generation)
      if (urlsToDelete.length > 0) {
        Promise.allSettled(urlsToDelete.map(url => fetch(\`\${baseUrl}/api/vision/delete-blob\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })))
        .then(results => {
          const successCount = results.filter(r => r.status === 'fulfilled').length
          console.log(\`[Batch Audio] Deleted \${successCount}/\${urlsToDelete.length} stale \${language} audio files\`)
        })
        .catch(err => console.error('[Batch Audio] Error triggering blob deletion:', err))
      }
      
      // STEP 2: Clear audio fields in database for the specific language
      const cleanedScenes = scenes.map((scene: any) => {
        const cleanedScene = { ...scene }
        
        // Clear narration for language
        if (cleanedScene.narrationAudio && typeof cleanedScene.narrationAudio === 'object') {
          delete cleanedScene.narrationAudio[language]
          if (Object.keys(cleanedScene.narrationAudio).length === 0) delete cleanedScene.narrationAudio
        } else {
          delete cleanedScene.narrationAudio
        }
        delete cleanedScene.narrationAudioUrl
        delete cleanedScene.narrationAudioGeneratedAt
        delete cleanedScene.narrationDuration
        
        // Clear description for language
        if (cleanedScene.descriptionAudio && typeof cleanedScene.descriptionAudio === 'object') {
          delete cleanedScene.descriptionAudio[language]
          if (Object.keys(cleanedScene.descriptionAudio).length === 0) delete cleanedScene.descriptionAudio
        } else {
          delete cleanedScene.descriptionAudio
        }
        delete cleanedScene.descriptionAudioUrl
        delete cleanedScene.descriptionAudioGeneratedAt
        delete cleanedScene.descriptionDuration
        
        // Clear dialogue for language
        if (cleanedScene.dialogueAudio && typeof cleanedScene.dialogueAudio === 'object') {
          delete cleanedScene.dialogueAudio[language]
          if (Object.keys(cleanedScene.dialogueAudio).length === 0) delete cleanedScene.dialogueAudio
        } else {
          delete cleanedScene.dialogueAudio
        }
        delete cleanedScene.dialogueAudioGeneratedAt
        
        if (cleanedScene.dialogue && Array.isArray(cleanedScene.dialogue)) {
          cleanedScene.dialogue = cleanedScene.dialogue.map((d: any) => {
            const cleanedDialogue = { ...d }
            delete cleanedDialogue.audioUrl
            return cleanedDialogue
          })
        }
        
        // Only clear music if we are replacing it
        if (includeMusic && (!scene.musicAudio || language === 'en')) {
          delete cleanedScene.musicAudio
          if (cleanedScene.music && typeof cleanedScene.music === 'object') {
            const cleanedMusic = { ...cleanedScene.music }
            delete cleanedMusic.url
            cleanedScene.music = cleanedMusic
          }
        }
        
        // Only clear SFX if we are replacing it
        if (includeSFX && (!scene.sfxAudio || language === 'en')) {
          delete cleanedScene.sfxAudio
          if (cleanedScene.sfx && Array.isArray(cleanedScene.sfx)) {
            cleanedScene.sfx = cleanedScene.sfx.map((s: any) => {
              if (typeof s === 'object') {
                const cleanedSfx = { ...s }
                delete cleanedSfx.url
                return cleanedSfx
              }
              return s
            })
          }
        }
        
        // Validate narration completeness
        if (cleanedScene.narrationAudio && typeof cleanedScene.narrationAudio === 'object') {
          Object.keys(cleanedScene.narrationAudio).forEach(lang => {
            const narrationEntry = cleanedScene.narrationAudio[lang]
            if (!narrationEntry?.url || !narrationEntry.url.includes('blob')) {
              delete cleanedScene.narrationAudio[lang]
            }
          })
          if (Object.keys(cleanedScene.narrationAudio).length === 0) {
            delete cleanedScene.narrationAudio
          }
        }
        
        return cleanedScene
      })
      
      // STEP 3: Save cleaned scenes to database BEFORE any generation`;
  code = code.replace(match[0], replacement);
  fs.writeFileSync('src/app/api/vision/generate-all-audio/route.ts', code);
  console.log('Done');
} else {
  console.log('Not found');
}
