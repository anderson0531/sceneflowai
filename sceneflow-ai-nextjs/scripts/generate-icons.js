#!/usr/bin/env node

const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const inputJpg = path.join(__dirname, '../public/brand/sf-infinity-source.jpg')
const outputDir = path.join(__dirname, '../public/icons')
const NAVY = { r: 5, g: 10, b: 24, alpha: 1 }

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

async function generateIcons() {
  console.log('Generating app icons from the film-strip infinity...')

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`)

    try {
      await sharp(inputJpg)
        .resize(size, size, { fit: 'contain', background: NAVY })
        .png({ compressionLevel: 9, palette: false })
        .toFile(outputPath)

      console.log(`Generated: icon-${size}x${size}.png`)
    } catch (error) {
      console.error(`Failed to generate ${size}x${size}:`, error.message)
    }
  }

  try {
    const appleIconPath = path.join(__dirname, '../public/apple-touch-icon.png')
    await sharp(inputJpg)
      .resize(180, 180, { fit: 'contain', background: NAVY })
      .png({ compressionLevel: 9, palette: false })
      .toFile(appleIconPath)

    console.log('Generated: apple-touch-icon.png (180x180)')
  } catch (error) {
    console.error('Failed to generate apple-touch-icon:', error.message)
  }

  console.log('\nIcon generation complete.')
}

generateIcons().catch(console.error)
