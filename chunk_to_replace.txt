          let dialogueCount = 0
          let musicCount = 0
          let sfxCount = 0
          const skippedDialogue: { scene: number, character: string, reason: string }[] = []
          
          for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i]
            
            // Send progress update
            sendProgress({
              type: 'progress',
              scene: i + 1,
              total: scenes.length,
              status: 'generating_narration'
            })
            
            // Generate narration
            if (scene.narration) {
              console.log(`[Batch Audio] Generating narration for scene ${i + 1}`)                                                                              
              
              // Check stored translations first (user imports > machine translation)
              const sceneTranslation = (storedTranslations as any)[i] as { narration?: string; dialogue?: string[] } | undefined
              const storedNarration = sceneTranslation?.narration
              const narrationText = storedNarration || scene.narration
              const narrationIsPreTranslated = !!storedNarration
              if (storedNarration) {
                console.log(`[Batch Audio] Using stored ${language} translation for narration in scene ${i + 1}`)
              }
              
              // Optimize narration text
              const optimizedNarration = optimizeTextForTTS(narrationText)
              
              const narrationResult = await fetch(`${baseUrl}/api/vision/generate-scene-audio`, {                                                               
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId,
                  sceneIndex: i,
                  audioType: 'narration',
                  text: optimizedNarration.text,
                  voiceConfig: narrationVoice,
                  language, // Pass language for translation support
                  skipTranslation: narrationIsPreTranslated, skipDbUpdate: true }),
              })
              const narrationData = await narrationResult.json()
              if (narrationData.success) {
                narrationCount++;
                scenes[i].narrationAudio = scenes[i].narrationAudio || {};
                scenes[i].narrationAudio[language] = {
                  url: narrationData.audioUrl,
                  duration: narrationData.duration || 0,
                  generatedAt: new Date().toISOString(),
                  voiceId: narrationVoice.voiceId
                };
              }
              results.push(narrationData);
            }
            
            // Generate dialogue
            if (scene.dialogue && scene.dialogue.length > 0) {
              sendProgress({
                type: 'progress',
                scene: i + 1,
                total: scenes.length,
                status: 'generating_dialogue',
                dialogueCount: scene.dialogue.length
              })
              
              const dialogueTasks = scene.dialogue.map(async (dialogueLine: any, dialogueIndex: number) => {
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
                
                const dialogueResult = await fetch(`${baseUrl}/api/vision/generate-scene-audio`, {
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
              }
            }
            
            // Generate music if enabled
            if (includeMusic && scene.music && !scene.musicAudio) {
              sendProgress({
                type: 'progress',
                scene: i + 1,
                total: scenes.length,
                status: 'generating_music'
              })
              
              const musicUrl = await generateAndSaveMusicForScene(scene, projectId, i, baseUrl)
              if (musicUrl) {
                // ATOMIC UPDATE: Reload fresh data and update only musicAudio field
                try {
                  const freshProject = await Project.findByPk(projectId)
                  if (freshProject) {
                    const freshMetadata = freshProject.metadata || {}
                    const freshVisionPhase = freshMetadata.visionPhase || {}
                    // FIX: Check both possible scene locations (script.script.scenes OR script.scenes)
                    // This handles both nested and flat script structures that updateSceneAudio may create
                    const hasNestedStructure = !!freshVisionPhase.script?.script?.scenes?.length
                    const freshScenes = [...(freshVisionPhase.script?.script?.scenes || freshVisionPhase.script?.scenes || [])]
                    
                    // Always regenerate music (no skip check)
                    if (freshScenes[i]) {
                      freshScenes[i] = { ...freshScenes[i], musicAudio: musicUrl }
                      musicCount++
                      
                      // Save back to the SAME structure we read from to maintain consistency
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
                                    scenes: freshScenes
                                  }
                                }
                              : {
                                  ...freshVisionPhase.script,
                                  scenes: freshScenes
                                }
                          }
                        }
                      })
                    }
                  }
                } catch (saveError) {
                  console.error(`[Batch Audio] Failed to save music for scene ${i + 1}:`, saveError)
                }
              }
            }
            
            // Generate SFX if enabled
            if (includeSFX && scene.sfx && scene.sfx.length > 0 && !scene.sfxAudio) {
              sendProgress({
                type: 'progress',
                scene: i + 1,
                total: scenes.length,
                status: 'generating_sfx',
                sfxCount: scene.sfx.length
              })
              
              const sfxUrls: string[] = []
              for (let sfxIdx = 0; sfxIdx < scene.sfx.length; sfxIdx++) {
                const sfxUrl = await generateAndSaveSFXForScene(scene, projectId, i, sfxIdx, baseUrl)
                if (sfxUrl) {
                  sfxUrls[sfxIdx] = sfxUrl
                  sfxCount++
                }
              }
              
              if (sfxUrls.length > 0) {
                // ATOMIC UPDATE: Reload fresh data and update only sfxAudio field
                try {
                  const freshProject = await Project.findByPk(projectId)
                  if (freshProject) {
                    const freshMetadata = freshProject.metadata || {}
                    const freshVisionPhase = freshMetadata.visionPhase || {}
                    // FIX: Check both possible scene locations (script.script.scenes OR script.scenes)
                    // This handles both nested and flat script structures that updateSceneAudio may create
                    const hasNestedStructure = !!freshVisionPhase.script?.script?.scenes?.length
                    const freshScenes = [...(freshVisionPhase.script?.script?.scenes || freshVisionPhase.script?.scenes || [])]
                    
                    // Update only the SFX field on this scene
                    if (freshScenes[i]) {
                      freshScenes[i] = { ...freshScenes[i], sfxAudio: sfxUrls }
                      
                      // Save back to the SAME structure we read from to maintain consistency
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
                                    scenes: freshScenes
                                  }
                                }
                              : {
                                  ...freshVisionPhase.script,
                                  scenes: freshScenes
                                }
                          }
                        }
                      })
                    }
                  }
                } catch (saveError) {
                  console.error(`[Batch Audio] Failed to save SFX for scene ${i + 1}:`, saveError)
                }
              }
            }
          }
          
          // Send completion
          sendProgress({
            type: 'complete',
            narrationCount,
            dialogueCount,
            musicCount,
            sfxCount,
            totalScenes: scenes.length,
            skipped: skippedDialogue
          })
          
          controller.close()
        } catch (error: any) {
          console.error('[Batch Audio] Error:', error)
          sendProgress({
            type: 'error',
            message: error.message
          })
          controller.close()
        }
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('[Batch Audio] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
