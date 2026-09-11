import { describe, expect, it } from 'vitest'
import {
  getContainerAudioDurationSeconds,
  getMp3DurationSeconds,
  getWavDurationSeconds,
} from '@/lib/audio/audioContainerDuration'

function pcmWav(options: {
  sampleRate: number
  channels: number
  bitsPerSample: number
  durationSeconds: number
}): Buffer {
  const { sampleRate, channels, bitsPerSample, durationSeconds } = options
  const bytesPerSample = bitsPerSample / 8
  const dataSize = sampleRate * channels * bytesPerSample * durationSeconds
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28)
  buffer.writeUInt16LE(channels * bytesPerSample, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  return buffer
}

/** MPEG-1 Layer III, 128 kbps, 44.1 kHz, stereo — first frame plus optional Xing. */
function mpeg1Layer3Frame(options: { xingFrames?: number; extraBytes?: number }): Buffer {
  const header = Buffer.from([0xff, 0xfb, 0x90, 0x00])
  const sideInfo = Buffer.alloc(32)
  let xing = Buffer.alloc(0)
  if (options.xingFrames != null) {
    xing = Buffer.alloc(16)
    xing.write('Xing', 0)
    xing.writeUInt32BE(0x00000001, 4)
    xing.writeUInt32BE(options.xingFrames, 8)
  }
  const extra = Buffer.alloc(options.extraBytes ?? 0)
  return Buffer.concat([header, sideInfo, xing, extra])
}

describe('getWavDurationSeconds', () => {
  it('reads a 30s Lyria-shaped clip from the WAV header', () => {
    const wav = pcmWav({
      sampleRate: 48000,
      channels: 2,
      bitsPerSample: 16,
      durationSeconds: 2,
    })

    expect(getWavDurationSeconds(wav)).toBeCloseTo(2, 5)
    expect(getContainerAudioDurationSeconds(wav)).toBeCloseTo(2, 5)
  })
})

describe('getMp3DurationSeconds', () => {
  it('prefers the Xing frame count over byte length', () => {
    const frames = Math.round((2.5 * 44100) / 1152)
    const mp3 = mpeg1Layer3Frame({ xingFrames: frames, extraBytes: 4000 })

    expect(getMp3DurationSeconds(mp3)).toBeCloseTo((frames * 1152) / 44100, 5)
  })

  it('falls back to CBR bitrate when there is no Xing tag', () => {
    const oneSecondAt128kbps = 16000
    const mp3 = mpeg1Layer3Frame({ extraBytes: oneSecondAt128kbps - 4 - 32 })

    expect(getMp3DurationSeconds(mp3)).toBeCloseTo(1, 2)
  })

  it('skips an ID3v2 tag before the first frame', () => {
    const frames = 40
    const id3 = Buffer.alloc(20)
    id3.write('ID3', 0)
    id3[6] = 0
    id3[7] = 0
    id3[8] = 0
    id3[9] = 10
    const mp3 = Buffer.concat([id3, mpeg1Layer3Frame({ xingFrames: frames })])

    expect(getMp3DurationSeconds(mp3)).toBeCloseTo((frames * 1152) / 44100, 5)
  })

  it('returns null for a buffer that is not MPEG audio', () => {
    expect(getMp3DurationSeconds(Buffer.from('not audio'))).toBeNull()
    expect(getContainerAudioDurationSeconds(Buffer.from('not audio'))).toBeNull()
  })
})
