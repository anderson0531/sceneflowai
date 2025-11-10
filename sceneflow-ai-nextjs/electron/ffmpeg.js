const { access } = require('fs/promises')
const { constants } = require('fs')
const { promisify } = require('util')
const { execFile } = require('child_process')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegStatic = require('ffmpeg-static')
const ffprobeStatic = require('ffprobe-static')

const execFileAsync = promisify(execFile)

const LOG_PREFIX = '[FFmpeg]'

const normalizePath = (binaryPath, isPackaged) => {
  if (!binaryPath || typeof binaryPath !== 'string') {
    return binaryPath
  }

  if (!isPackaged) {
    return binaryPath
  }

  return binaryPath.replace('app.asar', 'app.asar.unpacked')
}

const pickBinaryPath = (envVar, fallback, isPackaged) => {
  if (envVar && typeof envVar === 'string') {
    return normalizePath(envVar, isPackaged)
  }

  return normalizePath(fallback, isPackaged)
}

const resolveBinaryPaths = (app) => {
  const isPackaged = Boolean(app && app.isPackaged)

  const ffmpegPath = pickBinaryPath(process.env.DESKTOP_FFMPEG_PATH, ffmpegStatic, isPackaged)
  const ffprobePath = pickBinaryPath(process.env.DESKTOP_FFPROBE_PATH, ffprobeStatic.path, isPackaged)

  return { ffmpegPath, ffprobePath }
}

const ensureExecutable = async (binaryPath, label) => {
  const mode = typeof constants.X_OK === 'number' ? constants.X_OK : constants.F_OK

  try {
    await access(binaryPath, mode)
  } catch (error) {
    const message = `Binary for ${label} is not executable at ${binaryPath}`
    const wrapped = new Error(message)
    wrapped.code = 'FFMPEG_NOT_EXECUTABLE'
    wrapped.cause = error
    throw wrapped
  }
}

const warmupBinary = async (binaryPath, label) => {
  try {
    await execFileAsync(binaryPath, ['-version'])
  } catch (error) {
    const wrapped = new Error(`${label} failed health check`)
    wrapped.code = 'FFMPEG_HEALTHCHECK_FAILED'
    wrapped.cause = error
    wrapped.binaryPath = binaryPath
    throw wrapped
  }
}

const configureFfmpegPaths = (app) => {
  const { ffmpegPath, ffprobePath } = resolveBinaryPaths(app)

  ffmpeg.setFfmpegPath(ffmpegPath)
  ffmpeg.setFfprobePath(ffprobePath)

  return { ffmpegPath, ffprobePath }
}

const initializeFfmpeg = async (app) => {
  const paths = configureFfmpegPaths(app)

  await Promise.all([
    ensureExecutable(paths.ffmpegPath, 'ffmpeg'),
    ensureExecutable(paths.ffprobePath, 'ffprobe')
  ])

  await Promise.all([warmupBinary(paths.ffmpegPath, 'ffmpeg'), warmupBinary(paths.ffprobePath, 'ffprobe')])

  console.log(LOG_PREFIX, 'paths configured', paths)

  return paths
}

module.exports = {
  configureFfmpegPaths,
  initializeFfmpeg,
  normalizePath
}
