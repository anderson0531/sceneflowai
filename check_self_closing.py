with open('new_character_card.tsx', 'r') as f:
    text = f.read()

idx = text.find('const CharacterCard =')
text = text[idx:]

import re

for tag in ['img', 'input', 'Loader', 'Sparkles', 'ChevronDown', 'ChevronUp', 'Wand2', 'Shirt', 'Check', 'Trash2', 'Edit', 'Maximize2', 'AlertCircle', 'Mic', 'Volume2', 'ImageIcon']:
    tags = re.findall(rf'<{tag}.*?>', text)
    for t in tags:
        if not t.endswith('/>'):
            print(f"Unclosed self-closing tag: {t}")

