with open('new_character_card.tsx', 'r') as f:
    text = f.read()

idx = text.find('const CharacterCard =')
text = text[idx:]

stack = []
line_no = 1
for i, c in enumerate(text):
    if c == '\n': line_no += 1
    if c in '{[(':
        stack.append((c, line_no))
    elif c in '}])':
        if not stack:
            print(f"Extra closing {c} at line {line_no}")
            continue
        top, top_line = stack.pop()
        if (c == '}' and top != '{') or \
           (c == ']' and top != '[') or \
           (c == ')' and top != '('):
            print(f"Mismatched {c} at line {line_no}, expected {top} from line {top_line}")

if stack:
    print(f"Unclosed braces: {stack}")
else:
    print("All braces match!")

