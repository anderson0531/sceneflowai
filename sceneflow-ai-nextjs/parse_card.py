with open('src/components/vision/CharacterLibrary.tsx', 'r') as f:
    content = f.read()

start = content.find("const CharacterCard = ({ character")
end = content.find("// Narrator Character Card Component", start)
if end == -1:
    end = content.find("// Scene Description Voice Card Component", start)
if end == -1:
    end = len(content)

with open('character_card.tsx', 'w') as f:
    f.write(content[start:end])

