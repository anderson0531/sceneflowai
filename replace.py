import re

with open('src/components/vision/CharacterLibrary.tsx', 'r') as f:
    content = f.read()

start_marker = "  return (\n    <div\n      ref={setNodeRef}\n      style={draggableStyle}\n      className=\"relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden\"\n    >"

end_marker = "        {/* Voice Selection Dialog */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

# we will replace from start_marker to just before end_marker
old_block = content[start_idx:end_idx]

# Let's extract some pieces from the old block that we want to reuse so we don't have to rewrite them.
# - Image Section (Talent)
# - Info Section (Header: Name, Role)
# - Body Description
# - Wardrobes Section

# Actually, it's easier to just provide the exact new block
# I will output the new block separately.
