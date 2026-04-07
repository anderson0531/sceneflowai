import subprocess

with open('test_card.tsx', 'r') as f:
    text = f.read()

start_idx = text.find('const CharacterCard = ({')
return_idx = text.find('  return ( <div> </div> )')

pre = text[:start_idx]
middle = text[start_idx:return_idx]
post = '  return ( <div></div> )\n}\n'

lines = middle.split('\n')

for i in range(1, len(lines) + 1):
    test_content = pre + '\n'.join(lines[:i]) + '\n' + post
    with open('test_temp.tsx', 'w') as f: f.write(test_content)
    res = subprocess.run(['npx', 'tsc', 'test_temp.tsx', '--noEmit', '--jsx', 'preserve'], capture_output=True, text=True)
    if 'TS1005' in res.stdout or 'TS1109' in res.stdout or 'TS1128' in res.stdout or 'expected' in res.stdout:
        print(f"Error introduced at line {i}: {lines[i-1]}")
        print(res.stdout)
        break
