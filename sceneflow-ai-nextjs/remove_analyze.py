import re

with open('src/app/dashboard/workflow/vision/[projectId]/page.tsx', 'r') as f:
    content = f.read()

# Remove state analyzingSceneIndex
content = re.sub(r'  const \[analyzingSceneIndex, setAnalyzingSceneIndex\] = useState<number \| null>\(null\)\n', '', content)

# Remove handleAnalyzeScene definition
start_str = "  // Handler for analyzing a single scene (called from ScriptPanel)\n  const handleAnalyzeScene = useCallback(async (sceneIndex: number) => {"
end_str = "    })\n  }, [projectId, script, handleSceneAnalysisComplete, execute])\n\n"
start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# Remove props passed to ScriptPanel
content = re.sub(r'\s*onAnalyzeScene=\{handleAnalyzeScene\}', '', content)
content = re.sub(r'\s*analyzingSceneIndex=\{analyzingSceneIndex\}', '', content)

with open('src/app/dashboard/workflow/vision/[projectId]/page.tsx', 'w') as f:
    f.write(content)

print("Removed localized analyze logic from page.tsx")
