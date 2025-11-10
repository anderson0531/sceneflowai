const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { initializeFfmpeg } = require('./ffmpeg')
const {
  CHANNELS: PROJECT_CHANNELS,
  ProjectUpsertInputSchema,
  ProjectDeleteInputSchema,
  ProjectGetInputSchema,
  ProjectListResponseSchema,
  ProjectGetResponseSchema,
  DialogOpenRequestSchema,
  DialogOpenResponseSchema,
  BackgroundJobRequestSchema,
  BackgroundJobResponseSchema,
  BackgroundJobCancelSchema,
  BackgroundJobProgressSchema,
  ProjectRevealPathSchema
} = require('./ipc/projectChannels')
const { ProjectStore } = require('./offline/projectStore')
const { BackgroundQueue } = require('./offline/backgroundQueue')
const { registerStandardOperations } = require('./offline/operations')
const {
  CHANNELS,
  ExportStartPayloadSchema,
  ExportProgressPayloadSchema,
  ExportCompletePayloadSchema,
  ExportErrorPayloadSchema,
  PublishRequestSchema,
  PublishResponseSchema
} = require('./ipc/exportChannels')
const { createTempWorkspace } = require('./fs/tempWorkspace')
const { runExportPipeline } = require('./pipeline')

const workspaceRegistry = new Map()
let projectStore = null
let backgroundQueue = null
const isPublishEnabled = process.env.EXPORT_ENABLE_PUBLISH === 'true'
const ffmpegEnabled = true

const windows = new Set()

const sanitizeLabel = (value) => value.toString().replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()

const resolvePackagedRenderer = () => {
  const rendererPath = path.join(__dirname, 'renderer', 'index.html')

  if (fs.existsSync(rendererPath)) {
    return rendererPath
  }

  console.warn('[Electron] Packaged renderer missing at', rendererPath)
  return null
}

function resolveStartUrl() {
  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL
  }

  if (app.isPackaged) {
    const packagedRenderer = resolvePackagedRenderer()
    if (packagedRenderer) {
      return packagedRenderer
    }

    if (process.env.DESKTOP_FALLBACK_URL) {
      return process.env.DESKTOP_FALLBACK_URL
    }
  }

  return 'http://localhost:3000'
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const startUrl = resolveStartUrl()

  if (/^https?:\/\//i.test(startUrl)) {
    win.loadURL(startUrl)
  } else {
    win.loadFile(startUrl)
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  win.on('closed', () => {
    windows.delete(win)
  })

  windows.add(win)

  return win
}

const safeSend = (webContents, channel, schema, payload) => {
  try {
    const data = schema.parse(payload)
    webContents.send(channel, data)
  } catch (error) {
    console.error(`[Electron] Failed to send ${channel}`, error)
  }
}

const broadcastProjectJobEvent = (job) => {
  if (!BrowserWindow.getAllWindows().length) {
    return
  }

  try {
    const payload = BackgroundJobProgressSchema.parse({
      jobId: job.id,
      status: job.status,
      progress: typeof job.progress === 'number' ? job.progress : undefined,
      detail: job.detail || undefined,
      result: job.result,
      error: job.error
    })

    BrowserWindow.getAllWindows().forEach((window) => {
      safeSend(window.webContents, PROJECT_CHANNELS.JOB_EVENTS, BackgroundJobProgressSchema, payload)
    })
  } catch (error) {
    console.error('[Electron] Failed to broadcast job event', error)
  }
}

if (process.platform === 'win32') {
  app.setAppUserModelId('ai.sceneflow.desktop')
}

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    const [window] = BrowserWindow.getAllWindows()
    if (window) {
      if (window.isMinimized()) {
        window.restore()
      }
      window.focus()
    }
  })
}

app.whenReady().then(async () => {
  try {
    const { ffmpegPath, ffprobePath } = await initializeFfmpeg(app)
    console.log('[Electron] FFmpeg configured', { ffmpegPath, ffprobePath })
  } catch (error) {
    console.error('[Electron] FFmpeg initialization failed', error)
    dialog.showErrorBox(
      'FFmpeg Initialization Failed',
      `${error?.message || 'Unable to initialize local FFmpeg binaries.'}\n\nSee logs for details.`
    )
    app.quit()
    return
  }

  projectStore = new ProjectStore(app)
  await projectStore.init()

  backgroundQueue = new BackgroundQueue({
    concurrency: Number(process.env.PROJECT_JOB_CONCURRENCY) || 2
  })

  registerStandardOperations({ queue: backgroundQueue, projectStore })

  ;['queued', 'started', 'progress', 'completed', 'cancelled', 'failed'].forEach((event) => {
    backgroundQueue.on(event, broadcastProjectJobEvent)
  })

  ipcMain.handle('system:ping', () => 'pong')

  ipcMain.handle(PROJECT_CHANNELS.LIST, async () => {
    const projects = await projectStore.listProjects()
    return ProjectListResponseSchema.parse({ projects })
  })

  ipcMain.handle(PROJECT_CHANNELS.GET, async (_event, payload) => {
    const { id } = ProjectGetInputSchema.parse(payload)
    const project = await projectStore.getProject(id)
    if (project) {
      await projectStore.touchProject(id)
    }
    return ProjectGetResponseSchema.parse({ project })
  })

  ipcMain.handle(PROJECT_CHANNELS.UPSERT, async (_event, payload) => {
    const input = ProjectUpsertInputSchema.parse(payload)
    const project = await projectStore.upsertProject(input)
    return ProjectGetResponseSchema.parse({ project })
  })

  ipcMain.handle(PROJECT_CHANNELS.DELETE, async (_event, payload) => {
    const { id } = ProjectDeleteInputSchema.parse(payload)
    const removed = await projectStore.deleteProject(id)
    return { ok: removed }
  })

  ipcMain.handle(PROJECT_CHANNELS.DIALOG_OPEN, async (_event, payload) => {
    const request = DialogOpenRequestSchema.parse(payload || {})
    const result = await dialog.showOpenDialog({
      title: request.title,
      defaultPath: request.defaultPath,
      properties: [
        'openFile',
        request.multiSelect ? 'multiSelections' : undefined
      ].filter(Boolean),
      filters: request.filters
    })

    return DialogOpenResponseSchema.parse({
      canceled: result.canceled,
      filePaths: result.filePaths || []
    })
  })

  ipcMain.handle(PROJECT_CHANNELS.REVEAL_PATH, async (_event, payload) => {
    try {
      const { path: targetPath } = ProjectRevealPathSchema.parse(payload)
      if (!targetPath) {
        throw new Error('Missing path')
      }
      const success = shell.showItemInFolder(targetPath)
      return { ok: success }
    } catch (error) {
      console.error('[Electron] Failed to reveal path', error)
      return { ok: false, message: error?.message }
    }
  })

  ipcMain.handle(PROJECT_CHANNELS.JOB_ENQUEUE, async (_event, payload) => {
    const request = BackgroundJobRequestSchema.parse(payload)
    const job = backgroundQueue.enqueue({
      type: request.type,
      payload: request.payload,
      projectId: request.projectId
    })

    return BackgroundJobResponseSchema.parse({
      jobId: job.id,
      status: job.status,
      queuedAt: job.queuedAt,
      detail: job.detail || undefined
    })
  })

  ipcMain.handle(PROJECT_CHANNELS.JOB_CANCEL, async (_event, payload) => {
    const { jobId } = BackgroundJobCancelSchema.parse(payload)
    const cancelled = backgroundQueue.cancel(jobId)
    return { ok: cancelled }
  })

  ipcMain.handle(CHANNELS.PUBLISH, async (_event, payload) => {
    try {
      const request = PublishRequestSchema.parse(payload)
      if (!isPublishEnabled) {
        return PublishResponseSchema.parse({
          ok: false,
          message: 'Publishing is disabled. Set EXPORT_ENABLE_PUBLISH=true to enable stub uploads.'
        })
      }

      console.log('[Export Publish] Stub publish invoked', request)
      return PublishResponseSchema.parse({
        ok: true,
        message: `Stubbed ${request.platform} upload queued (no network call made).`
      })
    } catch (error) {
      console.error('[Export Publish] Invalid request', error)
      return PublishResponseSchema.parse({ ok: false, message: error?.message || 'Invalid publish request' })
    }
  })

  ipcMain.handle(CHANNELS.START, async (event, payload) => {
    try {
      const request = ExportStartPayloadSchema.parse(payload)
      console.log('[Electron] Export request received', {
        projectTitle: request.projectTitle,
        scenes: request.scenes.length,
        video: request.video
      })

      const workspace = await createTempWorkspace(`export-${sanitizeLabel(request.projectId)}`, {
        keepOnFailure: true
      })
      workspaceRegistry.set(workspace.id, workspace)

      safeSend(event.sender, CHANNELS.PROGRESS, ExportProgressPayloadSchema, {
        progress: 0,
        phase: 'preparing',
        detail: `Workspace ready at ${workspace.path}`,
        overallProgress: 0,
        etaSeconds: null
      })

      setImmediate(() => {
        runExportPipeline({
          request,
          workspace,
          emitProgress: (payload) => {
            safeSend(event.sender, CHANNELS.PROGRESS, ExportProgressPayloadSchema, payload)
          }
        })
          .then((result) => {
            try {
              safeSend(event.sender, CHANNELS.COMPLETE, ExportCompletePayloadSchema, {
                filePath: result.filePath,
                durationSeconds: result.durationSeconds,
                fileSizeBytes: result.fileSizeBytes,
                qa: result.qa
              })
            } catch (error) {
              console.error('[Electron] Failed to send completion event', error)
            }
          })
          .catch((error) => {
            console.error('[Electron] Export pipeline failed', error)
            workspace.markFailed()
            safeSend(event.sender, CHANNELS.ERROR, ExportErrorPayloadSchema, {
              message: error?.message || 'Export pipeline failed',
              stage: error?.stage,
              recoverable: false,
              code: error?.code
            })
          })
      })

      return { ok: true, workspaceId: workspace.id, workspacePath: workspace.path }
    } catch (error) {
      console.error('[Electron] Export request rejected', error)
      safeSend(event.sender, CHANNELS.ERROR, ExportErrorPayloadSchema, {
        message: error?.message || 'Invalid export payload',
        recoverable: false
      })
      throw error
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
