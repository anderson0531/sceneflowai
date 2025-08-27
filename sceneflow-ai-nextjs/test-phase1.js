#!/usr/bin/env node

// Phase 1 Test Script
// This script tests the Phase 1 implementation using Node.js

console.log('🧪 SceneFlow AI - Phase 1 Testing');
console.log('==================================');
console.log('');

// Test 1: Check if files exist
const fs = require('fs');
const path = require('path');

console.log('📁 Testing File Structure...');

const requiredFiles = [
  'src/types/ai-adaptability.ts',
  'src/types/enhanced-project.ts',
  'src/services/AICapabilityManager.ts',
  'src/services/DynamicPromptEngine.ts',
  'src/services/EnhancedProjectManager.ts',
  'src/store/enhancedStore.ts',
  'src/examples/Phase1Demo.ts'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('');

if (!allFilesExist) {
  console.log('❌ Some required files are missing. Please check the file structure.');
  process.exit(1);
}

console.log('✅ All required files exist!');
console.log('');

// Test 2: Check TypeScript compilation
console.log('🔧 Testing TypeScript Compilation...');

const { execSync } = require('child_process');

try {
  // Try to compile the main types
  execSync('npx tsc --noEmit --skipLibCheck src/types/ai-adaptability.ts', { stdio: 'pipe' });
  console.log('  ✅ ai-adaptability.ts compiles successfully');
} catch (error) {
  console.log('  ❌ ai-adaptability.ts has compilation errors');
}

try {
  execSync('npx tsc --noEmit --skipLibCheck src/types/enhanced-project.ts', { stdio: 'pipe' });
  console.log('  ✅ enhanced-project.ts compiles successfully');
} catch (error) {
  console.log('  ❌ enhanced-project.ts has compilation errors');
}

console.log('');

// Test 3: Check if services can be imported (basic syntax check)
console.log('📦 Testing Service Files...');

const serviceFiles = [
  'src/services/AICapabilityManager.ts',
  'src/services/DynamicPromptEngine.ts',
  'src/services/EnhancedProjectManager.ts'
];

serviceFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // Basic syntax checks
    const hasClass = content.includes('class');
    const hasExport = content.includes('export');
    const hasMethods = content.includes('public') || content.includes('private');
    
    if (hasClass && hasExport && hasMethods) {
      console.log(`  ✅ ${path.basename(file)} - Basic structure looks good`);
    } else {
      console.log(`  ⚠️  ${path.basename(file)} - Structure may be incomplete`);
    }
  } catch (error) {
    console.log(`  ❌ ${path.basename(file)} - Cannot read file`);
  }
});

console.log('');

// Test 4: Check store file
console.log('🏪 Testing Store File...');

try {
  const storeContent = fs.readFileSync('src/store/enhancedStore.ts', 'utf8');
  
  const hasStore = storeContent.includes('create<');
  const hasActions = storeContent.includes('createEnhancedProject');
  const hasState = storeContent.includes('interface EnhancedAppState');
  
  if (hasStore && hasActions && hasState) {
    console.log('  ✅ enhancedStore.ts - Store structure looks good');
  } else {
    console.log('  ⚠️  enhancedStore.ts - Store structure may be incomplete');
  }
} catch (error) {
  console.log('  ❌ enhancedStore.ts - Cannot read file');
}

console.log('');

// Test 5: Check demo file
console.log('🎬 Testing Demo File...');

try {
  const demoContent = fs.readFileSync('src/examples/Phase1Demo.ts', 'utf8');
  
  const hasDemoFunctions = demoContent.includes('demoAICapabilityManagement') &&
                          demoContent.includes('demoDynamicPromptGeneration') &&
                          demoContent.includes('demoEnhancedProjectStructure');
  
  const hasMainDemo = demoContent.includes('runPhase1Demo');
  
  if (hasDemoFunctions && hasMainDemo) {
    console.log('  ✅ Phase1Demo.ts - Demo structure looks good');
  } else {
    console.log('  ⚠️  Phase1Demo.ts - Demo structure may be incomplete');
  }
} catch (error) {
  console.log('  ❌ Phase1Demo.ts - Cannot read file');
}

console.log('');

// Summary
console.log('📊 Phase 1 Testing Summary');
console.log('===========================');
console.log('');
console.log('🎯 What was tested:');
console.log('  1. ✅ File structure and existence');
console.log('  2. 🔧 TypeScript compilation (basic)');
console.log('  3. 📦 Service file structure');
console.log('  4. 🏪 Store file structure');
console.log('  5. 🎬 Demo file structure');
console.log('');
console.log('🚀 Next Steps:');
console.log('  - Fix any compilation errors shown above');
console.log('  - Run the full demo in the browser console');
console.log('  - Proceed to Phase 2 if everything works');
console.log('');
console.log('💡 To run the full demo:');
console.log('  1. Start the dev server: npm run dev');
console.log('  2. Open browser console');
console.log('  3. Run: import("/src/examples/Phase1Demo.ts").then(m => m.runPhase1Demo())');
console.log('');
