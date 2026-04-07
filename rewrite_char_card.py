import re

with open('src/components/vision/CharacterLibrary.tsx', 'r') as f:
    content = f.read()

# We want to replace the `return (` of the `isCollapsed === false` case in `CharacterCard`
# Let's find the second `return (` inside `CharacterCard`.
# The first one is: `if (isCollapsed) { return ( ... ) }`
# The main one is `return ( <div ref={setNodeRef} style={draggableStyle} className="relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden">`

# It's a bit too complex to regex perfectly without breaking things. 
# Let's search for specific large blocks and replace them.
