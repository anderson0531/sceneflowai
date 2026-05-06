const fs = require('fs');
let code = fs.readFileSync('src/app/api/vision/generate-all-audio/route.ts', 'utf8');

// 1. Remove the "STEP 3: Save cleaned scenes to database BEFORE any generation" block entirely
// We'll save it after all generation.
code = code.replace(
  /\/\/ STEP 3: Save cleaned scenes to database BEFORE any generation[\s\S]*?\/\/ Iterate through each scene to generate audio/,
  "// STEP 3: Initialize generation loop\n      // Iterate through each scene to generate audio"
);

// 2. Replace Narration generation block
code = code.replace(
  /const narrationResult = await fetch\(`\$\{baseUrl\}\/api\/vision\/generate-scene-audio`, \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON.stringify\(\{([\s\S]*?)\}\),\s*\}\)/g,
  `const narrationResult = await fetch(\`\${baseUrl}/api/vision/generate-scene-audio\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({$1, skipDbUpdate: true}),
              })`
);

// 3. Update cleanedScenes[i] with narration data
code = code.replace(
  /if \(narrationData\.success\) narrationCount\+\+[\s\S]*?results\.push\(narrationData\)/,
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

// 4. Replace Dialogue loop
const regexDialogue = /for \(let dialogueIndex = 0; dialogueIndex < scene\.dialogue\.length; dialogueIndex\+\+\) \{[\s\S]*?if \(dialogueData\.success\) dialogueCount\+\+[\s\S]*?results\.push\(dialogueData\)[\s\S]*?\}/;
const matchDialogue = code.match(regexDialogue);
if (matchDialogue) {
  const replacement = `const dialogueTasks = scene.dialogue.map(async (dialogueLine: any, dialogueIndex: number) => {
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
                
                console.log(\`[Batch Audio] Generating dialogue with voice:\`, character.voiceConfig);
                
                const sceneTranslation = (storedTranslations as any)[i] as { narration?: string; dialogue?: string[] } | undefined;
                const storedDialogueLine = sceneTranslation?.dialogue?.[dialogueIndex];
                const dialogueText = storedDialogueLine || dialogueLine.line;
                const dialogueIsPreTranslated = !!storedDialogueLine;
                if (storedDialogueLine) {
                  console.log(\`[Batch Audio] Using stored \${language} translation for dialogue \${dialogueIndex + 1} in scene \${i + 1}\`);
                }
                
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
                  
                  // Expand dialogueAudio array to fit if needed
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
  code = code.replace(matchDialogue[0], replacement);
}

// 5. Replace Music update logic
const regexMusic = /\/\/ ATOMIC UPDATE: Reload fresh data and update only musicAudio field[\s\S]*?catch \(error: any\) \{[\s\S]*?console\.error\('\[Batch Audio\] Failed to update database for music:', error\)[\s\S]*?\}/;
if (code.match(regexMusic)) {
  code = code.replace(regexMusic, `cleanedScenes[i].musicAudio = musicUrl;`);
}

// 6. Replace SFX update logic
const regexSfx = /\/\/ ATOMIC UPDATE: Reload fresh data and update only SFX field[\s\S]*?catch \(error: any\) \{[\s\S]*?console\.error\('\[Batch Audio\] Failed to update database for SFX:', error\)[\s\S]*?\}/;
if (code.match(regexSfx)) {
  code = code.replace(regexSfx, `cleanedScenes[i].sfxAudio = cleanedScenes[i].sfxAudio || {};
                  cleanedScenes[i].sfxAudio[\`\${i}-\${j}\`] = sfxUrl;`);
}

// 7. Final DB Update
code = code.replace(
  /sendProgress\(\{[\s\S]*?type: 'complete',[\s\S]*?narrationCount,[\s\S]*?dialogueCount,[\s\S]*?musicCount,[\s\S]*?sfxCount,[\s\S]*?skipped: skippedDialogue[\s\S]*?\}\)/,
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

          $&`
);

fs.writeFileSync('src/app/api/vision/generate-all-audio/route.ts', code);
console.log('done');
