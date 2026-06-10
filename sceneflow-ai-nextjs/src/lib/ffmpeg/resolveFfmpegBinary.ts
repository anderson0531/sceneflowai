import { accessSync, constants, existsSync } from 'fs'
import { createRequire } from 'module'
import { join } from 'path'

const FFMPEG_NOT_FOUND_MESSAGE =
  'ffmpeg binary not found — ensure ffmpeg-static is installed and outputFileTracingIncludes is configured'

function isExecutableFfmpegPath(candidate: string | null | undefined): candidate is string {
  if (!candidate || typeof candidate !== 'string') {
    return false
  }
  if (!existsSync(candidate)) {
    return false
  }
  try {
    accessSync(candidate, constants.X_OK)
    return true
  } catch {
    return false
  }
}

function resolveFromFfmpegStaticPackage(): string | null {
  try {
    const require = createRequire(import.meta.url)
    const fromPackage = require('ffmpeg-static') as string | null
    return isExecutableFfmpegPath(fromPackage) ? fromPackage : null
  } catch {
    return null
  }
}

function resolveFromNodeModulesCwd(): string | null {
  const fromCwd = join(process.cwd(), 'node_modules/ffmpeg-static/ffmpeg')
  return isExecutableFfmpegPath(fromCwd) ? fromCwd : null
}

/**
 * Resolve a usable ffmpeg binary for serverless (Vercel) and local dev.
 * Resolution order: FFMPEG_BIN env → ffmpeg-static package → cwd node_modules path.
 */
export function resolveFfmpegBinary(): string {
  const fromEnv = process.env.FFMPEG_BIN?.trim()
  if (isExecutableFfmpegPath(fromEnv)) {
    return fromEnv
  }

  const fromPackage = resolveFromFfmpegStaticPackage()
  if (fromPackage) {
    return fromPackage
  }

  const fromCwd = resolveFromNodeModulesCwd()
  if (fromCwd) {
    return fromCwd
  }

  throw new Error(FFMPEG_NOT_FOUND_MESSAGE)
}

export { FFMPEG_NOT_FOUND_MESSAGE }
