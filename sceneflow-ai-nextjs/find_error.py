import re
with open('../new_character_card.tsx', 'r') as f:
    text = f.read()
# Replace everything inside `return (` to the end with `return ( <div> </div> ) }`
idx = text.find('  return (\n')
test_text = text[:idx] + '  return ( <div> </div> )\n}\n'
with open('test_card.tsx', 'w') as f:
    f.write(test_text)
