const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git' && file !== '.next') {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk('sceneflow-ai-nextjs/src');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  // Check if <Video is used as a JSX component
  if (content.includes('<Video ') || content.includes('<Video>') || content.includes('<Video\n')) {
    // Check if it's imported
    if (!content.includes('import { Video }') && !content.includes('import Video ') && !content.includes('import {') || (content.includes('import {') && !content.match(/import\s+{[^}]*Video[^}]*}\s+from/))) {
      
      // Specifically check for lucide-react import
      const hasLucideImport = content.includes("from 'lucide-react'") || content.includes('from "lucide-react"');
      const hasLucideVideoImport = content.match(/import\s+{[^}]*Video[^}]*}\s+from\s+['"]lucide-react['"]/);
      
      // Check for remotion import
      const hasRemotionImport = content.includes("from 'remotion'") || content.includes('from "remotion"');
      const hasRemotionVideoImport = content.match(/import\s+{[^}]*Video[^}]*}\s+from\s+['"]remotion['"]/);
      
      if (!hasLucideVideoImport && !hasRemotionVideoImport) {
          console.log(`Potential missing Video import in: ${file}`);
      }
    }
  }
}
