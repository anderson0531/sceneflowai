with open('new_character_card.tsx', 'r') as f:
    text = f.read()

import re

# find all `&& (` and `? (`
for i, line in enumerate(text.split('\n')):
    if '&& (' in line or '? (' in line or ': (' in line:
        # Check if the block is closed by `)}` or `) : (` later.
        pass
