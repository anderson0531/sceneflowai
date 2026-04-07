with open('new_character_card.tsx', 'r') as f:
    text = f.read()

idx = text.find('const CharacterCard =')
text = text[idx:]

# Let's count open/close JSX tags.
# We can use a simple regex to find all <div and </div> tags.
import re

open_divs = len(re.findall(r'<div[\s>]', text))
close_divs = len(re.findall(r'</div\s*>', text))
print(f"Open divs: {open_divs}")
print(f"Close divs: {close_divs}")

