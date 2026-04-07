import subprocess
with open('new_character_card.tsx', 'r') as f:
    lines = f.read().split('\n')

def check(text):
    with open('test_card.tsx', 'w') as f: f.write(text)
    res = subprocess.run(['npx', 'tsc', 'test_card.tsx', '--noEmit', '--jsx', 'preserve'], capture_output=True, text=True)
    return res.returncode == 0

start_idx = 0
for i, l in enumerate(lines):
    if l.startswith('  return ('):
        start_idx = i
        break

# The structure is:
# return (
#   <div ref={setNodeRef} ...>
#      ...
#   </div>
# )
# 
# We'll try replacing large chunks of lines inside the main div with nothing to see what breaks.
# 
