const { contextBridge, ipcRenderer } = require('electron')
const {
  CHANNELS,
  ExportStartPayloadSchema,
  ExportProgressPayloadSchema,
  ExportCompletePayloadSchema,
  ExportErrorPayloadSchema,
  PublishRequestSchema
} = require('./ipc/exportChannels')
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

const listProjects = async () => {
  const response = await ipcRenderer.invoke(PROJECT_CHANNELS.LIST)
  return ProjectListResponseSchema.parse(response)
}

const getProject = async (projectId) => {
  const response = await ipcRenderer.invoke(PROJECT_CHANNELS.GET, ProjectGetInputSchema.parse({ id: projectId }))
  return ProjectGetResponseSchema.parse(response)
}

const saveProject = async (project) => {
  const response = await ipcRenderer.invoke(PROJECT_CHANNELS.UPSERT, ProjectUpsertInputSchema.parse(project))
  return ProjectGetResponseSchema.parse(response)
}

const deleteProject = async (projectId) => {
  const result = await ipcRenderer.invoke(PROJECT_CHANNELS.DELETE, ProjectDeleteInputSchema.parse({ id: projectId }))
  return Boolean(result?.ok)
}

const openMediaDialog = async (options = {}) => {
  const request = DialogOpenRequestSchema.parse(options)
  const response = await ipcRenderer.invoke(PROJECT_CHANNELS.DIALOG_OPEN, request)
  return DialogOpenResponseSchema.parse(response)
}

const enqueueProjectJob = async (request) => {
  const payload = BackgroundJobRequestSchema.parse(request)
  const response = await ipcRenderer.invoke(PROJECT_CHANNELS.JOB_ENQUEUE, payload)
  return BackgroundJobResponseSchema.parse(response)
}

const cancelProjectJob = async (jobId) => {
  const payload = BackgroundJobCancelSchema.parse({ jobId })
  const response = await ipcRenderer.invoke(PROJECT_CHANNELS.JOB_CANCEL, payload)
  return Boolean(response?.ok)
}

const revealProjectPath = async (filePath) => {
  const payload = ProjectRevealPathSchema.parse({ path: filePath })
  const response = await ipcRenderer.invoke(PROJECT_CHANNELS.REVEAL_PATH, payload)
  if (!response?.ok) {
    throw new Error(response?.message || 'Unable to reveal path')
  }
  return true
}

contextBridge.exposeInMainWorld('exportAPI', {
  startExport,
  startPublish,
  onProgress: (callback) => subscribe(CHANNELS.PROGRESS, ExportProgressPayloadSchema, callback),
  onComplete: (callback) => subscribe(CHANNELS.COMPLETE, ExportCompletePayloadSchema, callback),
  onError: (callback) => subscribe(CHANNELS.ERROR, ExportErrorPayloadSchema, callback),
  ping: () => ipcRenderer.invoke('system:ping')
})

contextBridge.exposeInMainWorld('projectAPI', {
  list: listProjects,
  get: getProject,
  save: saveProject,
  delete: deleteProject,
  openMediaDialog,
  enqueueJob: enqueueProjectJob,
  cancelJob: cancelProjectJob,
  onJobEvent: (callback) => subscribe(PROJECT_CHANNELS.JOB_EVENTS, BackgroundJobProgressSchema, callback),
  revealPath: revealProjectPath
})
