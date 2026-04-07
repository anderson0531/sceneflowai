import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # We need to find the `charMap.set(normalizedName, { ... })` block inside `extractCharacters`
    # and update it to have a dynamic description.

    # This is a bit tricky with regex, so we'll do it carefully.
    if 'function extractCharactersFromScenes' in content or 'function extractCharacters' in content:
        print(f"Updating {filepath}")
        
        # Replacement pattern for detection.ts and generate-script.ts
        content = re.sub(
            r'charMap\.set\(normalizedName,\s*\{\s*name:\s*cleanName,\s*role:\s*(.*?),\s*description:\s*`Character from script`,?\s*\}\)',
            r'''const isNarrator = cleanName.toUpperCase().includes('NARRATOR')
        const dialogueSample = d.line ? d.line.substring(0, 100) + (d.line.length > 100 ? '...' : '') : ''
        
        charMap.set(normalizedName, {
          name: cleanName,
          role: isNarrator ? 'narrator' : \1,
          description: isNarrator ? `Narrator for the scene. Tone reference: "${dialogueSample}"` : `Character from script`,
        })''',
            content
        )
        
        # Replacement pattern for generate-script-v2.ts
        content = re.sub(
            r'charMap\.set\(normalizedName,\s*\{\s*name:\s*cleanName,.*?role:\s*\'character\',\s*description:\s*`Character from script`\s*\}\)',
            r'''const isNarrator = cleanName.toUpperCase().includes('NARRATOR')
        const dialogueSample = d.line ? d.line.substring(0, 100) + (d.line.length > 100 ? '...' : '') : ''
        
        charMap.set(normalizedName, {
          name: cleanName,  // Use cleaned version (e.g., "Brian Anderson" not "BRIAN ANDERSON (V.O.)")
          role: isNarrator ? 'narrator' : 'character',
          description: isNarrator ? `Narrator for the scene. Tone reference: "${dialogueSample}"` : `Character from script`
        })''',
            content,
            flags=re.DOTALL
        )

        with open(filepath, 'w') as f:
            f.write(content)

update_file('src/lib/character/detection.ts')
update_file('src/app/api/vision/generate-script/route.ts')
update_file('src/app/api/vision/generate-script-v2/route.ts')
