with open('new_character_card.tsx', 'r') as f:
    text = f.read()

idx = text.find('  return (\n')
text = text[idx:]

stack = []
for i, c in enumerate(text):
    if c == '\n': continue
    if c == '(': stack.append(i)
    elif c == ')':
        if not stack:
            print("Extra )")
        else:
            top = stack.pop()

if stack:
    for i in stack:
        s = max(0, i-40)
        e = min(len(text), i+40)
        print(f"Unclosed ( at offset {i}: {text[s:e]}")
else:
    print("All parens match")

