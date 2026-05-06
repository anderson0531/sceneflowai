const fs = require('fs');
let code = fs.readFileSync('src/app/api/vision/generate-all-audio/route.ts', 'utf8');

// Replace Music atomic update
const musicStart = code.indexOf('// ATOMIC UPDATE: Reload fresh data and update only musicAudio field');
const musicEnd = code.indexOf('} else {', musicStart); // Or just find the catch block
const musicCatch = code.indexOf('console.error(\'[Batch Audio] Failed to update database for music:\', error)', musicStart);
const musicCatchEnd = code.indexOf('}', musicCatch) + 1;
if (musicStart > -1 && musicCatchEnd > -1) {
  code = code.substring(0, musicStart) + 'cleanedScenes[i].musicAudio = musicUrl;\n              ' + code.substring(musicCatchEnd);
}

// Replace SFX atomic update
const sfxStart = code.indexOf('// ATOMIC UPDATE: Reload fresh data and update only sfxAudio field');
const sfxCatch = code.indexOf('console.error(\'[Batch Audio] Failed to update database for SFX:\', error)', sfxStart);
const sfxCatchEnd = code.indexOf('}', sfxCatch) + 1;
if (sfxStart > -1 && sfxCatchEnd > -1) {
  code = code.substring(0, sfxStart) + 'cleanedScenes[i].sfxAudio = cleanedScenes[i].sfxAudio || {};\n                  cleanedScenes[i].sfxAudio[`${i}-${j}`] = sfxUrl;\n              ' + code.substring(sfxCatchEnd);
}

// Replace FINAL sendProgress
const progressStart = code.indexOf("sendProgress({", sfxCatchEnd);
const progressEnd = code.indexOf("})", progressStart) + 2;

const replacement = `// FINAL DB UPDATE: Save populated cleanedScenes back to the project metadata!
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

          ` + code.substring(progressStart, progressEnd);

if (progressStart > -1) {
  code = code.substring(0, progressStart) + replacement + code.substring(progressEnd);
}

fs.writeFileSync('src/app/api/vision/generate-all-audio/route.ts', code);
console.log('done');
