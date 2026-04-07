import subprocess

with open('test_card.tsx', 'r') as f:
    text = f.read()

# find `const CharacterCard = ({` and `return (`
start_idx = text.find('const CharacterCard = ({')
return_idx = text.find('  return (\n')

pre = text[:start_idx]
middle = text[start_idx:return_idx]
post = '  return ( <div></div> )\n}'

# We can remove halves of `middle` to see where the syntax error is!
lines = middle.split('\n')
for i in range(len(lines)):
    test_content = pre + '\n'.join(lines[:i]) + '\n' + post
    with open('test_temp.tsx', 'w') as f: f.write(test_content)
    res = subprocess.run(['npx', 'tsc', 'test_temp.tsx', '--noEmit', '--jsx', 'preserve'], capture_output=True, text=True)
    if 'expected' in res.stdout:
        print(f"Error introduced at line {i}: {lines[i]}")
        break
