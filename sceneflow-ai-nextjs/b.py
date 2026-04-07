import subprocess
with open('../new_character_card.tsx', 'r') as f:
    text = f.read()

lines = text.split('\n')
for i, l in enumerate(lines):
    if l.startswith('  return ('): start = i; break

for j in range(start + 1, len(lines)):
    if lines[j] == '  )': end = j; break

for step in range(start + 5, end - 5, 50):
    test_lines = lines[:start+5] + lines[step:end-5] + lines[end-5:]
    with open('test_card.tsx', 'w') as f: f.write('\n'.join(test_lines))
    res = subprocess.run(['npx', 'tsc', 'test_card.tsx', '--noEmit', '--jsx', 'preserve'], capture_output=True, text=True)
    if 'TS1005' not in res.stdout and 'TS1109' not in res.stdout and 'TS1128' not in res.stdout:
        print(f"Error is IN lines {start+5} to {step}")
        break
