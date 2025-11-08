const { contextBridge, ipcRenderer } = require('electron')
const {
  CHANNELS,
  ExportStartPayloadSchema,
  ExportProgressPayloadSchema,
  ExportCompletePayloadSchema,
  ExportErrorPayloadSchema,
  PublishRequestSchema
} = require('./ipc/exportChannels')

const subscribe = (channel, schema, callback) => {
  const handler = (_event, data) => {
    try {
      const parsed = schema.parse(data)
      callback(parsed)
    } catch (error) {
      console.error(`[Preload] Invalid payload on ${channel}`, error)
    }
  }

  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const startExport = async (payload) => {
  try {
    const validated = ExportStartPayloadSchema.parse(payload)
    return await ipcRenderer.invoke(CHANNELS.START, validated)
  } catch (error) {
    return Promise.reject(error)
  }
}

const startPublish = async (payload) => {
  try {
    const validated = PublishRequestSchema.parse(payload)
    return await ipcRenderer.invoke(CHANNELS.PUBLISH, validated)
  } catch (error) {
    return Promise.reject(error)
  }
}

contextBridge.exposeInMainWorld('exportAPI', {
  startExport,
  startPublish,
  onProgress: (callback) => subscribe(CHANNELS.PROGRESS, ExportProgressPayloadSchema, callback),
  onComplete: (callback) => subscribe(CHANNELS.COMPLETE, ExportCompletePayloadSchema, callback),
  onError: (callback) => subscribe(CHANNELS.ERROR, ExportErrorPayloadSchema, callback),
  ping: () => ipcRenderer.invoke('system:ping')
})
