import re

with open('/Users/briananderson/Cursor Project/sceneflow-ai-nextjs/sceneflow-ai-nextjs/src/app/dashboard/workflow/vision/[projectId]/page.tsx', 'r') as f:
    content = f.read()

# Add button to header
header_before = """        <div className="flex items-center gap-2">
          <Link href={`/dashboard/workflow/final-cut?projectId=${projectId}`}>
            <Button
              size="sm"
              className="bg-sf-primary hover:bg-sf-accent text-white"
            >
              <span className="hidden sm:inline">Continue to Final Cut</span>
              <span className="sm:hidden">Final Cut</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </header>"""

header_after = """        <div className="flex items-center gap-2">
          <Link href={`/dashboard/workflow/final-cut?projectId=${projectId}`}>
            <Button
              size="sm"
              className="bg-sf-primary hover:bg-sf-accent text-white"
            >
              <span className="hidden sm:inline">Continue to Final Cut</span>
              <span className="sm:hidden">Final Cut</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
          
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 ml-2 mr-1" />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleRightSidebar}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            title={rightSidebarVisible ? "Hide Reference Library" : "Show Reference Library"}
          >
            {rightSidebarVisible ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
          </Button>
        </div>
      </header>"""

content = content.replace(header_before, header_after)

# Ensure PanelRight and PanelRightClose are imported from lucide-react
import_search = "import { "
import_lines = [line for line in content.split('\n') if import_search in line and "lucide-react" in line]
if import_lines:
    lucide_import = import_lines[0]
    new_import = lucide_import
    if "PanelRightClose" not in new_import:
        new_import = new_import.replace(" } from 'lucide-react'", ", PanelRightClose, PanelRight } from 'lucide-react'")
    content = content.replace(lucide_import, new_import)

with open('/Users/briananderson/Cursor Project/sceneflow-ai-nextjs/sceneflow-ai-nextjs/src/app/dashboard/workflow/vision/[projectId]/page.tsx', 'w') as f:
    f.write(content)

print("Success")
