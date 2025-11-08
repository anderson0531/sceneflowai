const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { configureFfmpegPaths } = require('./ffmpeg')
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
const isPublishEnabled = process.env.EXPORT_ENABLE_PUBLISH === 'true'
const ffmpegEnabled = process.env.EXPORT_STUDIO_ENABLED === 'true'

const sanitizeLabel = (value) => value.toString().replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()

function resolveStartUrl() {
  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL
  }

  if (app.isPackaged) {
    return path.join(__dirname, 'renderer', 'index.html')
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
}

const safeSend = (webContents, channel, schema, payload) => {
  try {
    const data = schema.parse(payload)
    webContents.send(channel, data)
  } catch (error) {
    console.error(`[Electron] Failed to send ${channel}`, error)
  }
}

app.whenReady().then(() => {
  const { ffmpegPath, ffprobePath } = configureFfmpegPaths(app)
  console.log('[Electron] FFmpeg configured', { ffmpegPath, ffprobePath })

  ipcMain.handle('system:ping', () => 'pong')

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
    if (!ffmpegEnabled) {
      const message = 'FFmpeg export disabled. Set EXPORT_STUDIO_ENABLED=true to enable.'
      console.warn('[Electron] START rejected - feature flag off')
      throw new Error(message)
    }

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
