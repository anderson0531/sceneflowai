with open('new_character_card.tsx', 'r') as f:
    text = f.read()

idx = text.find('  return (\n    <div\n')
text = text[idx:]

import re
# Find all <Tag ...> and </Tag>
# This regex matches self closing too
tags = re.findall(r'<(/?[a-zA-Z0-9_]+)(?:[^>]*?)(/?)>', text)
stack = []
for tag_name, self_close in tags:
    if self_close == '/':
        continue
    if tag_name.startswith('/'):
        if not stack:
            print(f"Extra closing tag: {tag_name}")
            break
        top = stack.pop()
        if top != tag_name[1:]:
            print(f"Mismatched HTML tag: expected </{top}>, found <{tag_name}>")
            break
    else:
        stack.append(tag_name)

if stack:
    print(f"Unclosed HTML tags: {stack}")
else:
    print("All HTML tags match!")

