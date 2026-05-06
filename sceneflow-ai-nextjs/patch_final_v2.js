const fs = require('fs');
let code = fs.readFileSync('src/app/api/vision/generate-all-audio/route.ts', 'utf8');

// 1. urlsToDelete
code = code.replace(
  /\/\/ Collect music audio URL[\s\S]*?urlsToDelete\.push\(s\.url\)\n\s*\}\n\s*\}\)\n\s*\}/,
  `// Collect music audio URL
        if (includeMusic && (!scene.musicAudio)) {
          if (scene.musicAudio && typeof scene.musicAudio === 'string' && scene.musicAudio.includes('blob')) {
            urlsToDelete.push(scene.musicAudio)
          }
          if (scene.music && typeof scene.music === 'object' && scene.music.url && scene.music.url.includes('blob')) {
            urlsToDelete.push(scene.music.url)
          }
        }
        
        // Collect SFX audio URLs
        if (includeSFX && (!scene.sfxAudio)) {
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
        }`
);

// 2. Clear fields in db
code = code.replace(
  /\/\/ Only clear music if we are replacing it[\s\S]*?delete cleanedScene\.sfxAudio/,
  `// Only clear music if we are replacing it
        if (includeMusic && (!scene.musicAudio)) {
          delete cleanedScene.musicAudio
          if (cleanedScene.music && typeof cleanedScene.music === 'object') {
            const cleanedMusic = { ...cleanedScene.music }
            delete cleanedMusic.url
            cleanedScene.music = cleanedMusic
          }
        }
        
        // Only clear SFX if we are replacing it
        if (includeSFX && (!scene.sfxAudio)) {
          delete cleanedScene.sfxAudio`
);

// 3. Prevent generating music/sfx if it exists
code = code.replace(
  /if \(includeMusic && scene\.music\) \{/g,
  `if (includeMusic && scene.music && !scene.musicAudio) {`
);
code = code.replace(
  /if \(includeSFX && scene\.sfx && scene\.sfx\.length > 0\) \{/g,
  `if (includeSFX && scene.sfx && scene.sfx.length > 0 && !scene.sfxAudio) {`
);

// 4. Parallelize dialogue
const dlLoopStart = code.indexOf('for (let dialogueIndex = 0; dialogueIndex < scene.dialogue.length; dialogueIndex++) {');
const dlLoopEnd = code.indexOf('results.push(dialogueData)\n              }', dlLoopStart) + 'results.push(dialogueData)\n              }'.length;
if (dlLoopStart > -1) {
  const replacement = `const dialogueTasks = scene.dialogue.map(async (dialogueLine: any, dialogueIndex: number) => {
                let character = dialogueLine.characterId
                  ? characters.find((c: any) => c.id === dialogueLine.characterId)
                  : null;
                  
                if (!character && dialogueLine.character) {
                  const canonicalSearchName = toCanonicalName(dialogueLine.character);
                  character = characters.find((c: any) => 
                    c.id === dialogueLine.characterId || 
                    toCanonicalName(c.name) === canonicalSearchName ||
                    generateAliases(c.name).includes(canonicalSearchName)
                  );
                }
                
                if (!character || !character.voiceConfig) {
                  skippedDialogue.push({ scene: i + 1, character: dialogueLine.character, reason: character ? 'No voice assigned' : 'Character not found' });
                  return null;
                }
                
                const sceneTranslation = (storedTranslations as any)[i] as { narration?: string; dialogue?: string[] } | undefined;
                const storedDialogueLine = sceneTranslation?.dialogue?.[dialogueIndex];
                const dialogueText = storedDialogueLine || dialogueLine.line;
                
                const optimizedDialogue = optimizeTextForTTS(dialogueText);
                
                const dialogueResult = await fetch(\`\${baseUrl}/api/vision/generate-scene-audio\`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId,
                    sceneIndex: i,
                    audioType: 'dialogue',
                    text: optimizedDialogue.text,
                    voiceConfig: character.voiceConfig,
                    characterName: character.name,
                    dialogueIndex,
                    language,
                    skipTranslation: !!storedDialogueLine,
                    skipDbUpdate: true
                  }),
                });
                
                const dialogueData = await dialogueResult.json();
                return { dialogueData, character, dialogueIndex, dialogueLine };
              });
              
              const dialogueResultsArray = await Promise.all(dialogueTasks);
              scenes[i].dialogueAudio = scenes[i].dialogueAudio || {};
              scenes[i].dialogueAudio[language] = scenes[i].dialogueAudio[language] || [];
              
              for (const res of dialogueResultsArray) {
                if (res && res.dialogueData.success) {
                  dialogueCount++;
                  results.push(res.dialogueData);
                  while (scenes[i].dialogueAudio[language].length <= res.dialogueIndex) {
                     scenes[i].dialogueAudio[language].push(null);
                  }
                  scenes[i].dialogueAudio[language][res.dialogueIndex] = {
                    audioUrl: res.dialogueData.audioUrl,
                    duration: res.dialogueData.duration || 0,
                    character: res.dialogueLine.character,
                    generatedAt: new Date().toISOString(),
                    voiceId: res.character.voiceConfig.voiceId
                  };
                }
              }`;
  code = code.substring(0, dlLoopStart) + replacement + code.substring(dlLoopEnd);
}

// 5. Narration skipDbUpdate
code = code.replace(
  /skipTranslation: narrationIsPreTranslated,\s*\/\/ Don't re-translate stored translations\n\s*\}\),/g,
  `skipTranslation: narrationIsPreTranslated, skipDbUpdate: true }),`
);

code = code.replace(
  /if \(narrationData\.success\) narrationCount\+\+\n\s*results\.push\(narrationData\)/g,
  `if (narrationData.success) {
                narrationCount++;
                scenes[i].narrationAudio = scenes[i].narrationAudio || {};
                scenes[i].narrationAudio[language] = {
                  url: narrationData.audioUrl,
                  duration: narrationData.duration || 0,
                  generatedAt: new Date().toISOString(),
                  voiceId: narrationVoice.voiceId
                };
              }
              results.push(narrationData);`
);

// 6. DB Updates to in-memory scenes
code = code.replace(
  /\/\/ ATOMIC UPDATE: Reload fresh data and update only musicAudio field[\s\S]*?catch \(error: any\) \{[\s\S]*?console\.error\('\[Batch Audio\] Failed to update database for music:', error\)[\s\S]*?\}/,
  `scenes[i].musicAudio = musicUrl;`
);

code = code.replace(
  /\/\/ ATOMIC UPDATE: Reload fresh data and update only SFX field[\s\S]*?catch \(error: any\) \{[\s\S]*?console\.error\('\[Batch Audio\] Failed to update database for SFX:', error\)[\s\S]*?\}/,
  `scenes[i].sfxAudio = scenes[i].sfxAudio || {};
                  scenes[i].sfxAudio[\`\${i}-\${j}\`] = sfxUrl;`
);

// 7. Remove "Save cleaned scenes to database BEFORE any generation"
code = code.replace(
  /\/\/ STEP 3: Save cleaned scenes to database BEFORE any generation[\s\S]*?\/\/ Add DETAILED LOGGING/g,
  `// STEP 3: Save cleaned scenes to database BEFORE any generation has been moved to the end
      
      // Update scenes reference to use cleaned version
      scenes = cleanedScenes
    }

    // Add DETAILED LOGGING`
);


// 8. Add final DB update
code = code.replace(
  /sendProgress\(\{\s*type: 'complete',\s*narrationCount,\s*dialogueCount,\s*musicCount,\s*sfxCount,\s*skipped: skippedDialogue\s*\}\)/,
  `// FINAL DB UPDATE: Save populated scenes back to the project metadata!
          const freshProject = await Project.findByPk(projectId);
          if (freshProject) {
            const freshMetadata = freshProject.metadata || {};
            const freshVisionPhase = freshMetadata.visionPhase || {};
            const hasNestedStructure = !!freshVisionPhase.script?.script?.scenes?.length;
            
            await freshProject.update({
              metadata: {
                ...freshMetadata,
                visionPhase: {
                  ...freshVisionPhase,
                  script: hasNestedStructure
                    ? {
                        ...freshVisionPhase.script,
                        script: {
                          ...freshVisionPhase.script?.script,
                          scenes: scenes
                        }
                      }
                    : {
                        ...freshVisionPhase.script,
                        scenes: scenes
                      }
                }
              }
            });
            console.log('[Batch Audio] Final DB update complete.');
          }

          sendProgress({
            type: 'complete',
            narrationCount,
            dialogueCount,
            musicCount,
            sfxCount,
            skipped: skippedDialogue
          })`
);

fs.writeFileSync('src/app/api/vision/generate-all-audio/route.ts', code);
console.log('done');
