import re

with open('new_character_card.tsx', 'r') as f:
    text = f.read()

# Instead of full parser, let's just use `tsc` locally on the file alone to see.
