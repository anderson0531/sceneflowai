import re

with open('sceneflow-ai-nextjs/src/components/vision/scene-production/SceneProductionMixer.tsx', 'r') as f:
    content = f.read()

block_to_move = """  // Get available languages from audio assets
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>(['en'])
    if (audioAssets.narrationAudio) {
      Object.keys(audioAssets.narrationAudio).forEach(l => langs.add(l))
    }
    if (audioAssets.dialogueAudio) {
      Object.keys(audioAssets.dialogueAudio).forEach(l => langs.add(l))
    }
    return Array.from(langs)
  }, [audioAssets])
  
  // Get audio URLs for selected language
  const currentAudioUrls = useMemo(() => {
    const narrationUrl = audioAssets.narrationAudio?.[selectedLanguage]?.url 
      || audioAssets.narrationAudio?.en?.url 
      || audioAssets.narrationAudioUrl
    
    const dialogueEntries = (audioAssets.dialogueAudio?.[selectedLanguage] 
      || audioAssets.dialogueAudio?.en 
      || []).filter(Boolean)
      .map((d, index) => ({
        id: `dialogue-${index}-${d.character}`,
        audioUrl: d.audioUrl,
        character: d.character,
        text: d.text,
        startTime: d.startTime,
        duration: d.duration,
      }))
    
    const musicUrl = audioAssets.musicAudio
    
    const sfxEntries = audioAssets.sfx?.filter(s => s?.audioUrl) || []
    
    return {
      narration: narrationUrl,
      narrationDuration: audioAssets.narrationAudio?.[selectedLanguage]?.duration,
      dialogue: dialogueEntries,
      music: musicUrl,
      sfx: sfxEntries,
    }
  }, [audioAssets, selectedLanguage])"""

if block_to_move not in content:
    print("Block not found!")
    exit(1)

content = content.replace(block_to_move + "\n  \n", "")
content = content.replace(block_to_move + "\n", "")
content = content.replace(block_to_move, "")

insertion_point = "  // Initialize editable dialogue clips from audio assets"
if insertion_point not in content:
    print("Insertion point not found!")
    exit(1)

content = content.replace(insertion_point, block_to_move + "\n\n" + insertion_point)

with open('sceneflow-ai-nextjs/src/components/vision/scene-production/SceneProductionMixer.tsx', 'w') as f:
    f.write(content)

print("Success")
