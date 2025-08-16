#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Building SceneFlow AI for Vercel deployment...');

// Create build directory if it doesn't exist
const buildDir = path.join(__dirname, 'dist');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Copy essential files to build directory
const filesToCopy = [
  'index.html',
  'workflow.js',
  'app.js',
  'styles.css',
  'api.js',
  'auth.js',
  'cue.js',
  'manifest.json',
  'sw.js',
  'vercel.json'
];

// Copy directories
const dirsToCopy = [
  'icons',
  'new-pwa'
];

console.log('📁 Copying files...');

// Copy individual files
filesToCopy.forEach(file => {
  const sourcePath = path.join(__dirname, file);
  const destPath = path.join(buildDir, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Copied ${file}`);
  } else {
    console.log(`⚠️  Warning: ${file} not found`);
  }
});

// Copy directories
dirsToCopy.forEach(dir => {
  const sourcePath = path.join(__dirname, dir);
  const destPath = path.join(buildDir, dir);
  
  if (fs.existsSync(sourcePath)) {
    copyDirectory(sourcePath, destPath);
    console.log(`✅ Copied directory ${dir}`);
  } else {
    console.log(`⚠️  Warning: directory ${dir} not found`);
  }
});

// Helper function to copy directories recursively
function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  
  const items = fs.readdirSync(source);
  
  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

// Create API directory and index.js for Vercel functions (if needed)
const apiDir = path.join(buildDir, 'api');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

const functionIndex = `
// Vercel function entry point
module.exports = (req, res) => {
  res.status(200).json({ message: 'SceneFlow AI API' });
};
`;

fs.writeFileSync(path.join(apiDir, 'index.js'), functionIndex);
console.log('✅ Created API function for Vercel');

console.log('🎉 Build complete! SceneFlow AI is ready for Vercel deployment.');
console.log('📁 Build output directory: dist/');
console.log('🚀 Deploy with: vercel --prod');
