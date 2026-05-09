const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('sceneflow-ai-nextjs/src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Check if the word "Video" is used as a component <Video or identifier
    if (content.match(/\bVideo\b/)) {
      // Check if it's imported
      const hasImport = content.match(/import\s+{([^}]*)}/) && 
                       content.match(/import\s+.*\{[^}]*\bVideo\b[^}]*\}.*from/);
      
      // We also need to check multiline imports
      const hasMultilineImport = content.match(/import\s+\{[\s\S]*?\bVideo\b[\s\S]*?\}\s+from/);
      const hasDefaultImport = content.match(/import\s+Video\s+from/);
      const isExported = content.match(/export\s+(const|class|function|interface|type)\s+Video\b/);
      
      if (!hasImport && !hasMultilineImport && !hasDefaultImport && !isExported) {
        // Double check if it actually has a <Video> tag
        if (content.includes('<Video ') || content.includes('<Video>')) {
          console.log('MISSING IMPORT FOR <Video> IN:', filePath);
        }
      }
    }
  }
});
