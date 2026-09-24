#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const outputDir = path.join(__dirname, '../public/icons')

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

async function generateIcons() {
  const { writeInfinityLogoPng } = await import('./lib/infinityLogoPng.mjs')

  console.log('Generating app icons from the film-strip infinity (transparent)...')

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`)
    try {
      await writeInfinityLogoPng(outputPath, size, size)
      console.log(`Generated: icon-${size}x${size}.png`)
    } catch (error) {
      console.error(`Failed to generate ${size}x${size}:`, error.message)
    }
  }

  try {
    const appleIconPath = path.join(__dirname, '../public/apple-touch-icon.png')
    await writeInfinityLogoPng(appleIconPath, 180, 180)
    console.log('Generated: apple-touch-icon.png (180x180)')
  } catch (error) {
    console.error('Failed to generate apple-touch-icon:', error.message)
  }

  console.log('\nIcon generation complete.')
}

generateIcons().catch(console.error)
