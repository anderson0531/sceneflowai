const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const os = require('os')
const { randomUUID } = require('crypto')

const ACTIVE_WORKSPACES = new Set()
let hooksRegistered = false

const ensureProcessHooks = () => {
  if (hooksRegistered) {
    return
  }

  const shutdown = async () => {
    for (const workspace of Array.from(ACTIVE_WORKSPACES)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await workspace.cleanup({ force: true })
      } catch (error) {
        console.error('[TempWorkspace] Cleanup during shutdown failed', error)
      }
    }
  }

  process.on('exit', () => {
    shutdown().catch((error) => {
      console.error('[TempWorkspace] Exit cleanup failed', error)
    })
  })

  process.on('SIGINT', async () => {
    await shutdown()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await shutdown()
    process.exit(0)
  })

  hooksRegistered = true
}

class TempWorkspace {
  constructor(label, options = {}) {
    this.label = label
    this.baseDir = options.baseDir || path.join(os.tmpdir(), 'sceneflow-export')
    this.keepOnFailure = options.keepOnFailure ?? false
    this.workspaceId = `${label}-${Date.now()}-${randomUUID()}`
    this.root = path.join(this.baseDir, this.workspaceId)
    this.registry = new Set()
    this.initialized = false
    this.failed = false
  }

  async init() {
    if (this.initialized) {
      return this.root
    }

    await fsp.mkdir(this.root, { recursive: true })
    this.initialized = true
    ACTIVE_WORKSPACES.add(this)
    return this.root
  }

  get id() {
    return this.workspaceId
  }

  get path() {
    this.assertInitialized()
    return this.root
  }

  assertInitialized() {
    if (!this.initialized) {
      throw new Error('TempWorkspace must be initialized before use')
    }
  }

  resolve(...segments) {
    this.assertInitialized()
    return path.join(this.root, ...segments)
  }

  async ensureDir(relativePath) {
    this.assertInitialized()
    const target = path.join(this.root, relativePath)
    await fsp.mkdir(target, { recursive: true })
    return target
  }

  track(filePath) {
    this.registry.add(filePath)
    return filePath
  }

  trackRelative(relativePath) {
    const fullPath = this.resolve(relativePath)
    this.registry.add(fullPath)
    return fullPath
  }

  markFailed() {
    this.failed = true
  }

  async cleanup(options = {}) {
    if (!this.initialized) {
      return
    }

    ACTIVE_WORKSPACES.delete(this)

    if (this.failed && this.keepOnFailure && !options.force) {
      console.warn('[TempWorkspace] Preserving failed workspace at', this.root)
      return
    }

    try {
      await fsp.rm(this.root, { recursive: true, force: true })
      this.initialized = false
    } catch (error) {
      console.error('[TempWorkspace] Failed to cleanup workspace', this.root, error)
    }
  }
}

const createTempWorkspace = async (label, options = {}) => {
  ensureProcessHooks()
  const workspace = new TempWorkspace(label, options)
  await workspace.init()
  return workspace
}

const cleanupAll = async () => {
  for (const workspace of Array.from(ACTIVE_WORKSPACES)) {
    // eslint-disable-next-line no-await-in-loop
    await workspace.cleanup()
  }
}

const workspaceExists = async (targetPath) => {
  try {
    await fsp.access(targetPath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

module.exports = {
  createTempWorkspace,
  cleanupAll,
  workspaceExists,
  TempWorkspace
}
