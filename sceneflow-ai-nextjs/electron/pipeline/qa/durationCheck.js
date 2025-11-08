const summarizeTracks = (audioTracks = {}) => {
  const summary = {}
  for (const [key, value] of Object.entries(audioTracks)) {
    if (value && typeof value.duration === 'number') {
      summary[key] = Number(value.duration)
    }
  }
  return summary
}

const evaluateDurations = ({
  scenes,
  sceneClips,
  concatResult,
  audioTracks,
  toleranceSeconds = 0.25
}) => {
  const expectedDuration = scenes.reduce((sum, scene) => sum + (Number(scene.duration) || 0), 0)
  const clipDuration = sceneClips.reduce((sum, clip) => sum + (Number(clip.duration) || 0), 0)
  const videoDuration = Number(concatResult?.duration || clipDuration)
  const tracks = summarizeTracks(audioTracks)

  const deltas = {
    clip: Math.abs(clipDuration - expectedDuration),
    video: Math.abs(videoDuration - expectedDuration)
  }

  Object.entries(tracks).forEach(([key, duration]) => {
    deltas[`track:${key}`] = Math.abs(duration - expectedDuration)
  })

  const maxDelta = Math.max(0, ...Object.values(deltas))
  const withinTolerance = maxDelta <= toleranceSeconds

  const warnings = []
  if (!withinTolerance) {
    warnings.push(
      `Duration mismatch exceeds ${toleranceSeconds}s tolerance (max delta ${maxDelta.toFixed(3)}s)`
    )
  }
  if (Math.abs(clipDuration - videoDuration) > toleranceSeconds) {
    warnings.push('Concatenated video duration differs from scene clip sum')
  }

  return {
    expected: expectedDuration,
    clipSum: clipDuration,
    video: videoDuration,
    tracks,
    deltas,
    maxDelta,
    withinTolerance,
    warnings
  }
}

module.exports = {
  evaluateDurations
}
