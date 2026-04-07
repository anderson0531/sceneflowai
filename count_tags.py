with open('new_character_card.tsx', 'r') as f:
    text = f.read()

idx = text.find('const CharacterCard =')
text = text[idx:]

import re

for tag in ['span', 'button', 'p', 'h4', 'label', 'Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogFooter', 'Button']:
    opens = len(re.findall(rf'<{tag}[\s>]', text))
    closes = len(re.findall(rf'</{tag}\s*>', text))
    if opens != closes:
        print(f"{tag}: {opens} vs {closes}")

