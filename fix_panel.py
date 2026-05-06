import re

with open('/Users/briananderson/Cursor Project/sceneflow-ai-nextjs/sceneflow-ai-nextjs/src/app/dashboard/workflow/vision/[projectId]/page.tsx', 'r') as f:
    content = f.read()

toggle_func = """  // Toggle right sidebar visibility
  const toggleRightSidebar = useCallback(() => {
    const isCurrentlyVisible = rightSidebarVisible
    setRightSidebarVisible(!isCurrentlyVisible)
    
    if (rightSidebarRef.current) {
      if (isCurrentlyVisible) {
        rightSidebarRef.current.collapse()
      } else {
        rightSidebarRef.current.expand()
      }
    }
  }, [rightSidebarVisible])
"""

insertion_point = "  const handleScriptChange = useCallback(async (updatedScript: any) => {"
if insertion_point in content:
    content = content.replace(insertion_point, toggle_func + "\n" + insertion_point)
    with open('/Users/briananderson/Cursor Project/sceneflow-ai-nextjs/sceneflow-ai-nextjs/src/app/dashboard/workflow/vision/[projectId]/page.tsx', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Insertion point not found")
