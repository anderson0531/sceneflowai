const fs = require('fs');
let code = fs.readFileSync('src/app/api/vision/generate-scene-audio/route.ts', 'utf8');

// Add skipDbUpdate to the top extraction
code = code.replace(
  "const { projectId, sceneIndex, audioType, text, voiceConfig, characterName, dialogueIndex, language = 'en', skipTranslation = false } = body",
  "const { projectId, sceneIndex, audioType, text, voiceConfig, characterName, dialogueIndex, language = 'en', skipTranslation = false, skipDbUpdate = false } = body"
);

// Wrap updateSceneAudio
code = code.replace(
  "// Step 7: Update scene in project metadata with language-specific storage",
  "// Step 7: Update scene in project metadata with language-specific storage\\n    if (!skipDbUpdate) {"
);

code = code.replace(
  "console.log('[Scene Audio] Response payload'",
  "} \\n\\n    console.log('[Scene Audio] Response payload'"
);

fs.writeFileSync('src/app/api/vision/generate-scene-audio/route.ts', code);
console.log('done');
