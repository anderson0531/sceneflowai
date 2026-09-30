#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const outputDir = path.join(__dirname, '../public/icons')

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

async function generateIcons() {
  const { writeAppIconPng } = await import('./lib/infinityLogoPng.mjs')

  console.log('Generating app icons from the film-strip infinity on navy...')

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`)
    try {
      await writeAppIconPng(outputPath, size)
      console.log(`Generated: icon-${size}x${size}.png`)
    } catch (error) {
      console.error(`Failed to generate ${size}x${size}:`, error.message)
    }
  }

  const extras = [
    [path.join(__dirname, '../public/apple-touch-icon.png'), 180, 'apple-touch-icon.png'],
    [path.join(__dirname, '../public/favicon-32.png'), 32, 'favicon-32.png'],
  ]
  for (const [outputPath, size, label] of extras) {
    try {
      await writeAppIconPng(outputPath, size)
      console.log(`Generated: ${label} (${size}x${size})`)
    } catch (error) {
      console.error(`Failed to generate ${label}:`, error.message)
    }
  }

  console.log('\nIcon generation complete.')
}

generateIcons().catch(console.error)
