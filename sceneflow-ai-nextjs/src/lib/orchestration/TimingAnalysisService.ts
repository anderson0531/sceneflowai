export interface ShotTiming { shotId: string; startSec: number; durationSec: number }

export class TimingAnalysisService {
  async analyze(masterAudioUrl: string, shots: Array<{ id: string; text: string }>): Promise<ShotTiming[]> {
    // TODO: implement segmentation and duration analysis
    const per = 8
    return shots.map((s, idx) => ({ shotId: s.id, startSec: idx * per, durationSec: per }))
  }
}

export const timingAnalysisService = new TimingAnalysisService()
