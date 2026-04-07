with open('sceneflow-ai-nextjs/src/components/vision/CharacterLibrary.tsx', 'r') as f:
    content = f.read()

start = content.find("const CharacterCard = ({ character")
end = content.find("// Narrator Character Card Component", start)
if end == -1:
    end = content.find("// Scene Description Voice Card Component", start)
if end == -1:
    end = len(content)

with open('new_character_card.tsx', 'r') as f:
    new_card = f.read()

new_content = content[:start] + new_card + "\n" + content[end:]

with open('sceneflow-ai-nextjs/src/components/vision/CharacterLibrary.tsx', 'w') as f:
    f.write(new_content)

