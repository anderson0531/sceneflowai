const { renderSceneClips } = require('./pass1Scenes')
const { concatSceneClips } = require('./pass2Concat')
const { renderAudioTracks } = require('./pass3Audio')
const { mixAudioTracks } = require('./pass4Mix')
const { muxVideoAndAudio } = require('./pass5Mux')
const { evaluateDurations } = require('./qa/durationCheck')

const stageWeights = {
  preparing: 0.02,
  'video-render': 0.28,
  'video-concat': 0.1,
  'audio-assembly': 0.25,
  'audio-mix': 0.15,
  mux: 0.15,
  finalizing: 0.05
}

const stageOrder = ['preparing', 'video-render', 'video-concat', 'audio-assembly', 'audio-mix', 'mux', 'finalizing']

const computeOverallProgress = (phase, phaseProgress) => {
  const index = stageOrder.indexOf(phase)
  if (index === -1) return null
  const completed = stageOrder.slice(0, index).reduce((sum, key) => sum + (stageWeights[key] || 0), 0)
  const weight = stageWeights[phase] || 0
  const normalized = Math.min(1, Math.max(0, phaseProgress ?? 0))
  return Math.min(1, Math.max(0, completed + weight * normalized))
}

const runExportPipeline = async ({
  request,
  workspace,
  emitProgress
}) => {
  const performance = {
    startedAt: Date.now(),
    stages: []
  }

  const pipelineStart = Date.now()

  const sendStageProgress = (phase, phaseProgress, detail) => {
    const overall = computeOverallProgress(phase, phaseProgress)
    const elapsedSeconds = (Date.now() - pipelineStart) / 1000
    const etaSeconds = overall && overall > 0.01
      ? Math.max(0, elapsedSeconds * (1 - overall) / overall)
      : null

    emitProgress({
      phase,
      progress: phaseProgress ?? 0,
      detail,
      overallProgress: overall ?? undefined,
      etaSeconds: etaSeconds != null ? Number(etaSeconds.toFixed(1)) : undefined
    })
  }

  const stage = async (label, phase, fn) => {
    const startedAt = Date.now()
    const cpuStart = process.cpuUsage()
    try {
      const result = await fn()
      const durationMs = Date.now() - startedAt
      const cpuUsage = process.cpuUsage(cpuStart)
      performance.stages.push({
        label,
        durationMs,
        cpuUserMicros: cpuUsage.user,
        cpuSystemMicros: cpuUsage.system
      })
      sendStageProgress(phase, 1, `${label} complete`)
      return result
    } catch (error) {
      const durationMs = Date.now() - startedAt
      const cpuUsage = process.cpuUsage(cpuStart)
      performance.stages.push({
        label,
        durationMs,
        cpuUserMicros: cpuUsage.user,
        cpuSystemMicros: cpuUsage.system,
        failed: true,
        message: error?.message
      })
      error.stage = label
      error.performance = performance
      throw error
    }
  }

  try {
    const totalScenes = request.scenes.length
    sendStageProgress('preparing', 0.05, 'Preparing FFmpeg pipeline...')

    const sceneClips = await stage('pass1-scenes', 'video-render', async () =>
      renderSceneClips({
        scenes: request.scenes,
        videoOptions: request.video,
        workspace,
        useHardwareAcceleration: Boolean(request.engine?.useHardwareAcceleration),
        onSceneProgress: ({ index, total }) => {
          const progress = total > 0 ? (index + 1) / total : 0
          sendStageProgress('video-render', progress, `Rendered scene ${index + 1} of ${totalScenes}`)
        }
      })
    )

    const concatResult = await stage('pass2-concat', 'video-concat', async () =>
      concatSceneClips({
        clips: sceneClips,
        workspace,
        videoOptions: request.video,
        onProgress: ({ progress, detail }) => {
          sendStageProgress('video-concat', progress ?? null, detail || 'Concatenating scenes')
        }
      })
    )

    const audioTracks = await stage('pass3-audio', 'audio-assembly', async () =>
      renderAudioTracks({
        scenes: request.scenes,
        audioMix: request.audio || {},
        workspace,
        totalDurationSeconds: concatResult.duration,
        onTrackProgress: ({ track, index, total, clips, detail }) => {
          const progress = total > 0 ? Math.min(1, Math.max(0, (index + 1) / total)) : null
          const status = detail || (clips ? `${clips} clip(s)` : 'Processing')
          sendStageProgress('audio-assembly', progress, `Building ${track} track – ${status}`)
        }
      })
    )

    const finalMix = await stage('pass4-mix', 'audio-mix', async () =>
      mixAudioTracks({
        tracks: audioTracks,
        workspace,
        options: {
          duckMusic: request.audio?.duckMusic ?? true,
          normalize: request.audio?.normalize ?? true
        }
      })
    )

    const durationQa = evaluateDurations({
      scenes: request.scenes,
      sceneClips,
      concatResult,
      audioTracks,
      toleranceSeconds: 0.25
    })

    if (!durationQa.withinTolerance) {
      console.warn('[Export QA] Duration mismatches detected', durationQa)
    }

    const muxResult = await stage('pass5-mux', 'mux', async () =>
      muxVideoAndAudio({
        videoPath: concatResult.filePath,
        audioPath: finalMix.filePath,
        workspace,
        durationSeconds: concatResult.duration,
        options: {
          filename: `${request.projectTitle.replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || 'export'}.mp4`
        }
      })
    )

    sendStageProgress('finalizing', 1, 'Finalizing export artifacts')

    performance.completedAt = Date.now()
    performance.totalDurationMs = performance.completedAt - performance.startedAt

    return {
      ...muxResult,
      audioMixPath: finalMix.filePath,
      silentVideoPath: concatResult.filePath,
      qa: {
        duration: durationQa
      },
      performance
    }
  } catch (error) {
    workspace.markFailed()
    throw error
  }
}

module.exports = {
  runExportPipeline
}
