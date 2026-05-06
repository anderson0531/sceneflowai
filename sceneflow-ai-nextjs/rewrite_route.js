const fs = require('fs');
let code = fs.readFileSync('src/app/api/vision/generate-all-audio/route.ts', 'utf8');

// 1. Fix URLs to delete logic (to not delete music/SFX if not regenerating)
// We look for the urlsToDelete loop and the cleanedScene map
code = code.replace(
  /\/\/ Only clear music if we are replacing it[\s\S]*?delete cleanedScene\.sfxAudio/,
  `// Only clear music if we are replacing it and we don't have music for this language (or we are in English)
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

code = code.replace(
  /\/\/ Collect music audio URL[\s\S]*?if \(scene\.sfx && Array\.isArray\(scene\.sfx\)\) \{[\s\S]*?\}\s*\}/,
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

// Fix generation condition
code = code.replace(/if \(includeMusic && scene\.music\) \{/g, 'if (includeMusic && scene.music && !scene.musicAudio) {');
code = code.replace(/if \(includeSFX && scene\.sfx && scene\.sfx\.length > 0\) \{/g, 'if (includeSFX && scene.sfx && scene.sfx.length > 0 && !scene.sfxAudio) {');

// 2. Parallelize Dialogue Generation
const dialogueLoop = `for (let dialogueIndex = 0; dialogueIndex < scene.dialogue.length; dialogueIndex++) {                                                             
                const dialogueLine = scene.dialogue[dialogueIndex]`;
                
const dialogueLoopEnd = `results.push(dialogueData)\n              }`;

let dlMatch = code.substring(code.indexOf(dialogueLoop), code.indexOf(dialogueLoopEnd) + dialogueLoopEnd.length);

const parallelDialogue = `const dialogueTasks = scene.dialogue.map(async (dialogueLine: any, dialogueIndex: number) => {
                console.log(\`[Batch Audio] Processing dialogue \${dialogueIndex + 1}/\${scene.dialogue.length} for character: "\${dialogueLine.character}"\`);
                
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
                  console.warn(\`[Batch Audio] Skipping dialogue for \${dialogueLine.character} - no voice assigned\`);
                  skippedDialogue.push({
                    scene: i + 1,
                    character: dialogueLine.character,
                    reason: character ? 'No voice assigned' : 'Character not found'
                  });
                  return null;
                }
                
                const sceneTranslation = (storedTranslations as any)[i] as { narration?: string; dialogue?: string[] } | undefined;
                const storedDialogueLine = sceneTranslation?.dialogue?.[dialogueIndex];
                const dialogueText = storedDialogueLine || dialogueLine.line;
                const dialogueIsPreTranslated = !!storedDialogueLine;
                
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
                    skipTranslation: dialogueIsPreTranslated,
                    skipDbUpdate: true
                  }),
                });
                
                const dialogueData = await dialogueResult.json();
                return { dialogueData, character, dialogueIndex, dialogueLine };
              });
              
              const dialogueResultsArray = await Promise.all(dialogueTasks);
              
              cleanedScenes[i].dialogueAudio = cleanedScenes[i].dialogueAudio || {};
              cleanedScenes[i].dialogueAudio[language] = cleanedScenes[i].dialogueAudio[language] || [];
              
              for (const res of dialogueResultsArray) {
                if (res && res.dialogueData.success) {
                  dialogueCount++;
                  results.push(res.dialogueData);
                  
                  // Expand array if needed
                  while (cleanedScenes[i].dialogueAudio[language].length <= res.dialogueIndex) {
                     cleanedScenes[i].dialogueAudio[language].push(null);
                  }
                  
                  cleanedScenes[i].dialogueAudio[language][res.dialogueIndex] = {
                    audioUrl: res.dialogueData.audioUrl,
                    duration: res.dialogueData.duration || 0,
                    character: res.dialogueLine.character,
                    generatedAt: new Date().toISOString(),
                    voiceId: res.character.voiceConfig.voiceId
                  };
                }
              }`;

code = code.replace(dlMatch, parallelDialogue);

// 3. Skip DB updates and populate cleanedScenes
code = code.replace(
  /const narrationResult = await fetch\(`\$\{baseUrl\}\/api\/vision\/generate-scene-audio`, \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON.stringify\(\{([\s\S]*?)\}\),\s*\}\)/g,
  `const narrationResult = await fetch(\`\${baseUrl}/api/vision/generate-scene-audio\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({$1, skipDbUpdate: true}),
              })`
);

code = code.replace(
  /if \(narrationData\.success\) narrationCount\+\+\s*results\.push\(narrationData\)/,
  `if (narrationData.success) {
                narrationCount++;
                cleanedScenes[i].narrationAudio = cleanedScenes[i].narrationAudio || {};
                cleanedScenes[i].narrationAudio[language] = {
                  url: narrationData.audioUrl,
                  duration: narrationData.duration || 0,
                  generatedAt: new Date().toISOString(),
                  voiceId: narrationVoice.voiceId
                };
              }
              results.push(narrationData);`
);

// 4. Remove ATOMIC UPDATE blocks for Music and SFX and just update cleanedScenes
code = code.replace(
  /\/\/ ATOMIC UPDATE: Reload fresh data and update only musicAudio field[\s\S]*?catch \(error: any\) \{[\s\S]*?console\.error\('\[Batch Audio\] Failed to update database for music:', error\)[\s\S]*?\}/,
  `cleanedScenes[i].musicAudio = musicUrl;`
);

code = code.replace(
  /\/\/ ATOMIC UPDATE: Reload fresh data and update only SFX field[\s\S]*?catch \(error: any\) \{[\s\S]*?console\.error\('\[Batch Audio\] Failed to update database for SFX:', error\)[\s\S]*?\}/,
  `cleanedScenes[i].sfxAudio = cleanedScenes[i].sfxAudio || {};
                  cleanedScenes[i].sfxAudio[\`\${i}-\${j}\`] = sfxUrl;`
);

// 5. Add FINAL DB UPDATE at the very end
code = code.replace(
  /sendProgress\(\{\s*type: 'complete',\s*narrationCount,\s*dialogueCount,\s*musicCount,\s*sfxCount,\s*skipped: skippedDialogue\s*\}\)/,
  `// FINAL DB UPDATE: Save populated cleanedScenes back to the project metadata!
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
                          scenes: cleanedScenes
                        }
                      }
                    : {
                        ...freshVisionPhase.script,
                        scenes: cleanedScenes
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
