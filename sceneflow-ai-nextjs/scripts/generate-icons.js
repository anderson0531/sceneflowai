#!/usr/bin/env node

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating app icons from SVG...');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(inputSvg, { density: 300 })
        .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to generate ${size}x${size}:`, error.message);
    }
  }
  
  // Also generate apple-touch-icon at 180x180
  try {
    const appleIconPath = path.join(__dirname, '../public/apple-touch-icon.png');
    await sharp(inputSvg, { density: 300 })
      .resize(180, 180, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toFile(appleIconPath);
    
    console.log('✅ Generated: apple-touch-icon.png (180x180)');
  } catch (error) {
    console.error('❌ Failed to generate apple-touch-icon:', error.message);
  }
  
  console.log('\n🎉 Icon generation complete!');
}

generateIcons().catch(console.error);
