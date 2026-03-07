export interface ShotTiming { shotId: string; startSec: number; durationSec: number }

export class TimingAnalysisService {
  async analyze(masterAudioUrl: string, shots: Array<{ id: string; text: string }>): Promise<ShotTiming[]> {
    // TODO: implement segmentation and duration analysis
    const per = 8
    return shots.map((s, idx) => ({ shotId: s.id, startSec: idx * per, durationSec: per }))
  }
}

// Lazy singleton pattern to prevent TDZ during module initialization
let _timingAnalysisServiceInstance: TimingAnalysisService | null = null

export function getTimingAnalysisService(): TimingAnalysisService {
  if (!_timingAnalysisServiceInstance) {
    _timingAnalysisServiceInstance = new TimingAnalysisService()
  }
  return _timingAnalysisServiceInstance
}

// @deprecated Use getTimingAnalysisService() instead - kept for backward compatibility
export const timingAnalysisService = { get: getTimingAnalysisService }
