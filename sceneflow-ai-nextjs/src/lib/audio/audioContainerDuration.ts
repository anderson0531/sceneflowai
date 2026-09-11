/**
 * Duration from the container itself — WAV headers and MP3 Xing / CBR frames.
 *
 * ffprobe is not shipped on Vercel, and guessing from byte length needs a
 * bitrate we do not always know. The container already recorded how long the
 * clip is; read that before inventing a number.
 */

const MPEG1_L3_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
const MPEG2_L3_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
const MPEG1_SAMPLE_RATES = [44100, 48000, 32000]
const MPEG2_SAMPLE_RATES = [22050, 24000, 16000]
const MPEG25_SAMPLE_RATES = [11025, 12000, 8000]

export function getWavDurationSeconds(buffer: Buffer): number {
  if (buffer.length < 44) return 30
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') {
    return buffer.length / (48000 * 2 * 2)
  }
  const numChannels = buffer.readUInt16LE(22)
  const sampleRate = buffer.readUInt32LE(24)
  const bitsPerSample = buffer.readUInt16LE(34)
  const bytesPerSample = bitsPerSample / 8
  if (sampleRate <= 0 || numChannels <= 0 || bytesPerSample <= 0) return 30

  let dataSize = buffer.length - 44
  if (buffer.toString('ascii', 36, 40) === 'data') {
    dataSize = buffer.readUInt32LE(40)
  }

  const byteRate = sampleRate * numChannels * bytesPerSample
  if (byteRate <= 0) return 30
  return dataSize / byteRate
}

function skipId3v2(buffer: Buffer): number {
  if (buffer.length < 10 || buffer.toString('ascii', 0, 3) !== 'ID3') return 0
  const size =
    ((buffer[6] & 0x7f) << 21) |
    ((buffer[7] & 0x7f) << 14) |
    ((buffer[8] & 0x7f) << 7) |
    (buffer[9] & 0x7f)
  return 10 + size
}

interface MpegFrame {
  sampleRate: number
  bitrateKbps: number
  frameSize: number
  samplesPerFrame: number
  xingOffset: number
}

function parseMpegLayer3Frame(buffer: Buffer, offset: number): MpegFrame | null {
  if (offset + 4 > buffer.length) return null
  const b0 = buffer[offset]
  const b1 = buffer[offset + 1]
  const b2 = buffer[offset + 2]
  const b3 = buffer[offset + 3]
  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) return null

  const versionBits = (b1 >> 3) & 0x03
  const layerBits = (b1 >> 1) & 0x03
  if (layerBits !== 1) return null

  const bitrateIndex = (b2 >> 4) & 0x0f
  const sampleRateIndex = (b2 >> 2) & 0x03
  const padding = (b2 >> 1) & 0x01
  const channelMode = (b3 >> 6) & 0x03

  let version: 1 | 2 | 25
  if (versionBits === 3) version = 1
  else if (versionBits === 2) version = 2
  else if (versionBits === 0) version = 25
  else return null

  const bitrates = version === 1 ? MPEG1_L3_BITRATES : MPEG2_L3_BITRATES
  const bitrateKbps = bitrates[bitrateIndex]
  if (!bitrateKbps) return null

  const rates =
    version === 1 ? MPEG1_SAMPLE_RATES : version === 2 ? MPEG2_SAMPLE_RATES : MPEG25_SAMPLE_RATES
  const sampleRate = rates[sampleRateIndex]
  if (!sampleRate) return null

  const samplesPerFrame = version === 1 ? 1152 : 576
  const frameSize = Math.floor((samplesPerFrame / 8) * (bitrateKbps * 1000) / sampleRate) + padding
  if (frameSize <= 4) return null

  const mono = channelMode === 3
  const sideInfoBytes = version === 1 ? (mono ? 17 : 32) : mono ? 9 : 17

  return {
    sampleRate,
    bitrateKbps,
    frameSize,
    samplesPerFrame,
    xingOffset: offset + 4 + sideInfoBytes,
  }
}

function readXingFrameCount(buffer: Buffer, xingOffset: number): number | null {
  if (xingOffset + 8 > buffer.length) return null
  const tag = buffer.toString('ascii', xingOffset, xingOffset + 4)
  if (tag !== 'Xing' && tag !== 'Info') return null
  const flags = buffer.readUInt32BE(xingOffset + 4)
  if ((flags & 0x00000001) === 0) return null
  if (xingOffset + 12 > buffer.length) return null
  const frames = buffer.readUInt32BE(xingOffset + 8)
  return frames > 0 ? frames : null
}

/**
 * Seconds of audio in an MP3, or null when the buffer is not MPEG audio.
 *
 * Prefers the Xing/Info frame count (VBR-accurate). Without that tag, a CBR
 * first-frame bitrate is close enough for Gemini TTS clips.
 */
export function getMp3DurationSeconds(buffer: Buffer): number | null {
  const offset = skipId3v2(buffer)
  const frame = parseMpegLayer3Frame(buffer, offset)
  if (!frame) return null

  const xingFrames = readXingFrameCount(buffer, frame.xingOffset)
  if (xingFrames != null) {
    return (xingFrames * frame.samplesPerFrame) / frame.sampleRate
  }

  const payloadBytes = buffer.length - offset
  if (payloadBytes <= 0) return null
  return (payloadBytes * 8) / (frame.bitrateKbps * 1000)
}

/** WAV or MP3 duration when the container can answer; otherwise null. */
export function getContainerAudioDurationSeconds(buffer: Buffer): number | null {
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    return getWavDurationSeconds(buffer)
  }
  return getMp3DurationSeconds(buffer)
}
