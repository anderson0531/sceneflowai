const fs = require('fs/promises')
const path = require('path')

const isHttpUrl = (value) => /^https?:\/\//i.test(value)
const isFileUrl = (value) => value.startsWith('file://')
const isAbsolutePath = (value) => path.isAbsolute(value)

const ensureDir = async (filePath) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

const copyLocalFile = async (sourcePath, destinationPath) => {
  if (!sourcePath) {
    throw new Error('Source path is required for copyLocalFile')
  }

  await ensureDir(destinationPath)
  await fs.copyFile(sourcePath, destinationPath)
  return destinationPath
}

const downloadHttpResource = async (url, destinationPath) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  await ensureDir(destinationPath)
  await fs.writeFile(destinationPath, Buffer.from(arrayBuffer))
  return destinationPath
}

const resolveFileUrl = (value) => {
  try {
    const url = new URL(value)
    return url.pathname
  } catch (error) {
    throw new Error(`Invalid file URL: ${value}`)
  }
}

const getSuggestedExtension = (value, fallback = '.png') => {
  try {
    const parsed = new URL(value)
    const ext = path.extname(parsed.pathname)
    return ext || fallback
  } catch {
    const ext = path.extname(value)
    return ext || fallback
  }
}

const downloadAssetTo = async (source, destinationPath) => {
  if (!source || typeof source !== 'string') {
    throw new Error('Invalid asset source')
  }

  if (isHttpUrl(source)) {
    return downloadHttpResource(source, destinationPath)
  }

  if (isFileUrl(source)) {
    const localPath = resolveFileUrl(source)
    return copyLocalFile(localPath, destinationPath)
  }

  if (isAbsolutePath(source)) {
    return copyLocalFile(source, destinationPath)
  }

  throw new Error(`Unsupported asset source: ${source}`)
}

module.exports = {
  downloadAssetTo,
  getSuggestedExtension
}
