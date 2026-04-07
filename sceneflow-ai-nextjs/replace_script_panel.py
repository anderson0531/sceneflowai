import re

with open('src/components/vision/ScriptPanel.tsx', 'r') as f:
    content = f.read()

# 1. Remove props from interface
content = re.sub(r'\s*onAnalyzeScene\?: \(sceneIndex: number\) => Promise<void>\n', '\n', content)
content = re.sub(r'\s*analyzingSceneIndex\?: number \| null\n', '\n', content)

# 2. Remove props from SortableSceneCard definition
content = re.sub(r', onAnalyzeScene, analyzingSceneIndex', '', content)

# 3. Remove props from ScriptPanel definition
content = re.sub(r', onAnalyzeScene, analyzingSceneIndex = null', '', content)

# 4. Remove props passed to SortableSceneCard instances
content = re.sub(r'\s*onAnalyzeScene=\{onAnalyzeScene\}', '', content)
content = re.sub(r'\s*analyzingSceneIndex=\{analyzingSceneIndex\}', '', content)

# 5. Remove the "No analysis yet - show Analyze and Edit buttons" block entirely
# It's from `{onAnalyzeScene && (` to the closing TooltipProvider
start_str_1 = """                    {onAnalyzeScene && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>"""
end_str_1 = """                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}"""
start_idx_1 = content.find(start_str_1)
end_idx_1 = content.find(end_str_1) + len(end_str_1)
if start_idx_1 != -1:
    content = content[:start_idx_1] + content[end_idx_1:]

# 6. Remove the Sync CTA re-analyze button
start_str_2 = """                    {onAnalyzeScene && (
                      <Button
                        size="sm"
                        onClick={(e) => {"""
end_str_2 = """                        )}
                      </Button>
                    )}"""
start_idx_2 = content.find(start_str_2)
end_idx_2 = content.find(end_str_2) + len(end_str_2)
if start_idx_2 != -1:
    content = content[:start_idx_2] + content[end_idx_2:]

# 7. Remove the bottom Re-analyze button
start_str_3 = """                  {onAnalyzeScene && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {"""
end_str_3 = """                        </>
                      )}
                    </Button>
                  )}"""
start_idx_3 = content.find(start_str_3)
end_idx_3 = content.find(end_str_3) + len(end_str_3)
if start_idx_3 != -1:
    content = content[:start_idx_3] + content[end_idx_3:]

with open('src/components/vision/ScriptPanel.tsx', 'w') as f:
    f.write(content)

print("Removed localized analyze logic from ScriptPanel.tsx")
