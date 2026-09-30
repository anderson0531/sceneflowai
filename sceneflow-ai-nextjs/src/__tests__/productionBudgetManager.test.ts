import { describe, it, expect } from 'vitest'
import {
  BLUEPRINT_CREDITS,
  IMAGE_CREDITS,
  TEXT_CREDITS,
  VIDEO_CREDITS,
  getKlingCreditsForGeneration,
} from '@/lib/credits/creditCosts'
import {
  actualPlanningTargets,
  applyMethodDefaults,
  buildProductionBudgetParams,
  buildSceneSchedule,
  DEFAULT_FRAME_ITERATIONS,
  DEFAULT_SCHEDULE_WEEKDAYS,
  DEFAULT_VIDEO_ITERATIONS,
  estimateProductionBudget,
  formatPlanDate,
  getFrameUnitCost,
  getVideoUnitCost,
  latestScheduleDate,
  intelligencePackageCredits,
  productionScheduleStatus,
  PRODUCTION_METHODS,
  readProjectBudgetScope,
  rollupProductionBudget,
} from '@/lib/credits/productionBudgetManager'

describe('Production Budget Manager engine', () => {
  it('uses Draft/Final frame rates from IMAGE_CREDITS', () => {
    expect(getFrameUnitCost('draft')).toBe(IMAGE_CREDITS.FRAME_GENERATION)
    expect(getFrameUnitCost('final')).toBe(IMAGE_CREDITS.FAL_KLING_IMAGE)
  })

  it('prices video Draft/Final with Kling std/pro proxy by duration', () => {
    expect(getVideoUnitCost('none', 10)).toBe(0)
    expect(getVideoUnitCost('draft', 10)).toBe(
      getKlingCreditsForGeneration({ quality: 'std', durationSeconds: 10 })
    )
    expect(getVideoUnitCost('final', 10)).toBe(
      getKlingCreditsForGeneration({ quality: 'pro', durationSeconds: 10 })
    )
  })

  it('applies Animatic First defaults with zero video', () => {
    const defaults = applyMethodDefaults('animatic_first')
    expect(defaults.videoQuality).toBe('none')
    expect(defaults.frameIterations).toBe(DEFAULT_FRAME_ITERATIONS)
    expect(defaults.videoIterations).toBe(0)

    const estimate = estimateProductionBudget({
      scenes: 4,
      beats: 20,
      segmentDurationSec: 10,
      method: 'animatic_first',
      ...defaults,
    })

    expect(estimate.videos.credits).toBe(0)
    expect(estimate.frames.credits).toBe(
      Math.round(20 * DEFAULT_FRAME_ITERATIONS * IMAGE_CREDITS.FRAME_GENERATION)
    )
    expect(estimate.intelligence.credits).toBe(intelligencePackageCredits(4))
    expect(estimate.plannedTotal).toBe(
      estimate.frames.credits + estimate.intelligence.credits
    )
  })

  it('matches first-take iteration defaults', () => {
    expect(DEFAULT_FRAME_ITERATIONS).toBeCloseTo(1.25, 5)
    expect(DEFAULT_VIDEO_ITERATIONS).toBeCloseTo(1 / 0.9, 5)
    expect(PRODUCTION_METHODS.express_sprint.frameIterations).toBe(1.35)
    expect(PRODUCTION_METHODS.express_sprint.videoIterations).toBe(1.2)
  })

  it('BYOK zeros frames/video/topaz but keeps intelligence', () => {
    const full = estimateProductionBudget({
      scenes: 5,
      beats: 10,
      segmentDurationSec: 8,
      method: 'final_delivery',
      ...applyMethodDefaults('final_delivery'),
    })
    const byok = estimateProductionBudget({
      scenes: 5,
      beats: 10,
      segmentDurationSec: 8,
      method: 'final_delivery',
      ...applyMethodDefaults('final_delivery'),
      byokExcludeMedia: true,
    })

    expect(byok.frames.credits).toBe(0)
    expect(byok.videos.credits).toBe(0)
    expect(byok.topaz.credits).toBe(0)
    expect(byok.intelligence.credits).toBe(full.intelligence.credits)
    expect(byok.plannedTotal).toBe(full.intelligence.credits)
  })

  it('intelligence package matches AR + script + optimize + refine', () => {
    expect(intelligencePackageCredits(10)).toBe(
      BLUEPRINT_CREDITS.AUDIENCE_RESONANCE_ANALYSIS +
        10 * TEXT_CREDITS.SCRIPT_PER_SCENE +
        BLUEPRINT_CREDITS.BLUEPRINT_OPTIMIZE +
        BLUEPRINT_CREDITS.BLUEPRINT_REFINE
    )
  })

  it('forecasts cost to complete from actuals and blends video takes', () => {
    const estimate = estimateProductionBudget({
      scenes: 2,
      beats: 10,
      segmentDurationSec: 10,
      method: 'draft_production',
      ...applyMethodDefaults('draft_production'),
      videoIterations: 2,
      creditsUsed: 500,
      framesDone: 4,
      videosDone: 3,
      observedVideoTakesAvg: 2,
      creditsBudget: 8000,
    })

    expect(estimate.remainingFrames).toBe(6)
    expect(estimate.remainingVideos).toBe(7)
    expect(estimate.effectiveVideoIterations).toBe(2)
    expect(estimate.costToComplete).toBeGreaterThan(0)
    expect(estimate.forecastTotal).toBe(500 + estimate.costToComplete)
    expect(estimate.suggestions).toContain('lower_video_iterations')
  })

  it('suggests Animatic First when video not started on a video plan', () => {
    const estimate = estimateProductionBudget({
      scenes: 2,
      beats: 8,
      segmentDurationSec: 10,
      method: 'draft_production',
      ...applyMethodDefaults('draft_production'),
      videosDone: 0,
    })
    expect(estimate.suggestions).toContain('use_animatic_first')
  })

  it('builds v2 budget params with SceneFlow engine mapping', () => {
    const params = buildProductionBudgetParams({
      method: 'final_delivery',
      frameQuality: 'final',
      videoQuality: 'final',
      frameIterations: 1.25,
      videoIterations: 1.11,
      topazEnabled: true,
      intelligenceEnabled: true,
      byokExcludeMedia: false,
      segmentDurationSec: 10,
    })
    expect(params.version).toBe(3)
    expect(params.engine).toBe('sceneflow')
    expect(params.qualityTier).toBe('cinematic')
    expect(params.frameQuality).toBe('final')
    expect(VIDEO_CREDITS.TOPAZ_UPSCALE_PER_MIN).toBe(50)
  })

  it('reads fixed scene/beat counts from script beats and plans at 10s by default', () => {
    const scope = readProjectBudgetScope({
      script: {
        scenes: [
          {
            id: 's1',
            beats: [
              { beatId: 'b1', sequenceIndex: 0, kind: 'action', storyboardImageUrl: 'x' },
              { beatId: 'b2', sequenceIndex: 1, kind: 'action', excluded: true },
              { beatId: 'b3', sequenceIndex: 2, kind: 'dialogue' },
            ],
          },
          {
            id: 's2',
            beats: [{ beatId: 'b4', sequenceIndex: 0, kind: 'action' }],
          },
        ],
      },
      metadata: {
        creditsUsed: 120,
        visionPhase: {
          production: {
            scenes: {
              s1: {
                targetSegmentDuration: 7,
                segments: [
                  {
                    takes: [{ assetUrl: 'v1' }, { assetUrl: 'v2' }],
                    activeAssetUrl: 'v2',
                    assetType: 'video',
                  },
                ],
              },
            },
          },
        },
      },
    })

    expect(scope.scenes).toBe(2)
    expect(scope.beats).toBe(3)
    expect(scope.framesDone).toBe(1)
    expect(scope.videosDone).toBe(1)
    expect(scope.observedVideoTakesAvg).toBe(2)
    expect(scope.creditsUsed).toBe(120)
    // Planning ignores production targetSegmentDuration (7) → default 10s
    expect(scope.segmentDurationSec).toBe(10)
  })

  it('counts legacy production actuals (imageUrl, startFrameUrl, videoUrl, project credits)', () => {
    const scope = readProjectBudgetScope({
      script: {
        scenes: [
          {
            id: 'archive-1',
            imageUrl: 'https://cdn.example/scene-establishing.jpg',
            beats: [
              { beatId: 'beat-a', sequenceIndex: 0, kind: 'action' },
              { beatId: 'beat-b', sequenceIndex: 1, kind: 'dialogue', lineId: 'd1' },
              { beatId: 'beat-c', sequenceIndex: 2, kind: 'action' },
            ],
            dialogue: [{ lineId: 'd1', storyboardImageUrl: 'https://cdn.example/dialogue-frame.jpg' }],
          },
        ],
      },
      metadata: {
        creditsUsed: 2450,
        visionPhase: {
          production: {
            scenes: {
              'archive-1': {
                targetSegmentDuration: 5,
                segments: [
                  {
                    beatId: 'beat-a',
                    startFrameUrl: 'https://cdn.example/start-a.jpg',
                    takes: [{ videoUrl: 'https://cdn.example/take-a.mp4' }],
                    activeAssetUrl: 'https://cdn.example/take-a.mp4',
                    assetType: 'video',
                  },
                  {
                    beatId: 'beat-b',
                    references: { endFrameUrl: 'https://cdn.example/end-b.jpg' },
                  },
                  {
                    beatId: 'beat-c',
                    // orphan: no frame yet
                    takes: [{ videoUrl: 'https://cdn.example/take-c.mp4' }],
                  },
                ],
              },
            },
          },
        },
      },
      productionScenes: {
        'archive-1': {
          segments: [
            {
              beatId: 'beat-a',
              startFrameUrl: 'https://cdn.example/start-a.jpg',
              takes: [{ videoUrl: 'https://cdn.example/take-a.mp4' }],
              activeAssetUrl: 'https://cdn.example/take-a.mp4',
              assetType: 'video',
            },
            {
              beatId: 'beat-b',
              references: { endFrameUrl: 'https://cdn.example/end-b.jpg' },
            },
            {
              beatId: 'beat-c',
              takes: [{ videoUrl: 'https://cdn.example/take-c.mp4' }],
            },
          ],
        },
      },
    })

    expect(scope.scenes).toBe(1)
    expect(scope.beats).toBe(3)
    // beat-a: startFrameUrl; beat-b: dialogue storyboard + endFrameUrl; beat-c: none
    // imageUrl would only credit first beat if empty — first already has frame
    expect(scope.framesDone).toBe(2)
    expect(scope.videosDone).toBe(2)
    expect(scope.creditsUsed).toBe(2450)
    expect(scope.segmentDurationSec).toBe(10)
  })

  it('rolls shot targets up to scene, chapter, and master', () => {
    const scope = readProjectBudgetScope({
      script: {
        scenes: [
          {
            id: 's1',
            heading: 'Open',
            blueprintBeatIndex: 0,
            blueprintBeatTitle: 'Chapter One',
            beats: [
              { beatId: 'a', sequenceIndex: 0, kind: 'action' },
              { beatId: 'b', sequenceIndex: 1, kind: 'action' },
            ],
          },
          {
            id: 's2',
            heading: 'Close',
            blueprintBeatIndex: 0,
            blueprintBeatTitle: 'Chapter One',
            beats: [{ beatId: 'c', sequenceIndex: 0, kind: 'action' }],
          },
        ],
      },
    })
    const frameUnit = IMAGE_CREDITS.FRAME_GENERATION
    const rollup = rollupProductionBudget({
      scenes: scope.sceneActuals,
      frameIterations: 1.2,
      videoIterations: 1.4,
      frameUnit,
      videoUnit: 0,
      topazCredits: 50,
      intelligenceCredits: 10,
      videoOn: false,
    })

    expect(rollup.chapters).toHaveLength(1)
    expect(rollup.chapters[0].title).toBe('Chapter One')
    expect(rollup.chapters[0].scenes.map((scene) => scene.shotCount)).toEqual([2, 1])
    const shotCredits = Math.round(1.2 * frameUnit)
    expect(rollup.chapters[0].scenes[0].credits).toBe(Math.round(2 * 1.2 * frameUnit))
    expect(rollup.chapters[0].scenes[0].shots[0].credits).toBe(shotCredits)
    expect(rollup.masterCredits).toBe(rollup.mediaCredits + 50 + 10)
  })

  it('resets planning targets from three finished scenes to 1.5 stills and 2.2 clips', () => {
    const stills = (count: number, prefix: string) =>
      Array.from({ length: count }, (_, index) => ({
        url: `https://cdn.example/${prefix}-${index}.jpg`,
      }))
    const clips = (count: number) =>
      Array.from({ length: count }, (_, index) => ({ assetUrl: `https://cdn.example/c-${index}.mp4` }))

    const scope = readProjectBudgetScope({
      script: {
        scenes: [
          {
            id: 's1',
            beats: [
              { beatId: 'a1', sequenceIndex: 0, kind: 'action', storyboardImageVersions: stills(1, 'a1') },
              { beatId: 'a2', sequenceIndex: 1, kind: 'action', storyboardImageVersions: stills(1, 'a2') },
              { beatId: 'a3', sequenceIndex: 2, kind: 'action', storyboardImageVersions: stills(2, 'a3') },
              { beatId: 'a4', sequenceIndex: 3, kind: 'action', storyboardImageVersions: stills(2, 'a4') },
            ],
          },
          {
            id: 's2',
            beats: [
              { beatId: 'b1', sequenceIndex: 0, kind: 'action', storyboardImageVersions: stills(1, 'b1') },
              { beatId: 'b2', sequenceIndex: 1, kind: 'action', storyboardImageVersions: stills(2, 'b2') },
              { beatId: 'b3', sequenceIndex: 2, kind: 'action', storyboardImageVersions: stills(1, 'b3') },
            ],
          },
          {
            id: 's3',
            beats: [
              { beatId: 'c1', sequenceIndex: 0, kind: 'action', storyboardImageVersions: stills(2, 'c1') },
              { beatId: 'c2', sequenceIndex: 1, kind: 'action', storyboardImageVersions: stills(2, 'c2') },
              { beatId: 'c3', sequenceIndex: 2, kind: 'action', storyboardImageVersions: stills(1, 'c3') },
            ],
          },
        ],
      },
      metadata: {
        visionPhase: {
          production: {
            scenes: {
              s1: {
                segments: [
                  { beatId: 'a1', takes: clips(2), activeAssetUrl: 'v' },
                  { beatId: 'a2', takes: clips(2), activeAssetUrl: 'v' },
                  { beatId: 'a3', takes: clips(2), activeAssetUrl: 'v' },
                  { beatId: 'a4', takes: clips(3), activeAssetUrl: 'v' },
                ],
              },
              s2: {
                segments: [
                  { beatId: 'b1', takes: clips(2), activeAssetUrl: 'v' },
                  { beatId: 'b2', takes: clips(2), activeAssetUrl: 'v' },
                  { beatId: 'b3', takes: clips(2), activeAssetUrl: 'v' },
                ],
              },
              s3: {
                segments: [
                  { beatId: 'c1', takes: clips(2), activeAssetUrl: 'v' },
                  { beatId: 'c2', takes: clips(3), activeAssetUrl: 'v' },
                  { beatId: 'c3', takes: clips(2), activeAssetUrl: 'v' },
                ],
              },
            },
          },
        },
      },
    })

    const targets = actualPlanningTargets(scope.sceneActuals, true)
    expect(targets).toEqual({ frameIterations: 1.5, videoIterations: 2.2 })
  })

  it('keeps a pinned scene day when the schedule is rebuilt', () => {
    const first = buildSceneSchedule({
      sceneIds: ['a', 'b', 'c', 'd'],
      workDays: 2,
      scenesPerDay: 2,
    })
    expect(first.entries.map((entry) => entry.day)).toEqual([1, 1, 2, 2])
    expect(first.extended).toBe(false)

    const rebuilt = buildSceneSchedule({
      sceneIds: ['a', 'b', 'c', 'd'],
      workDays: 2,
      scenesPerDay: 2,
      pinned: [{ sceneId: 'c', day: 1 }],
    })
    const byId = Object.fromEntries(rebuilt.entries.map((entry) => [entry.sceneId, entry]))
    expect(byId.c).toEqual({ sceneId: 'c', day: 1, pinned: true })
    expect(byId.a.day).toBe(1)
    expect(byId.a.pinned).toBe(false)
    expect(byId.b.day).toBe(2)
    expect(byId.d.day).toBe(2)
  })

  it('places scenes on weekdays from a Monday start and keeps a pinned date', () => {
    const weekdays = DEFAULT_SCHEDULE_WEEKDAYS
    const built = buildSceneSchedule({
      sceneIds: ['a', 'b', 'c', 'd'],
      scenesPerDay: 2,
      startDate: '2026-10-05',
      weekdays,
      sceneCredits: { a: 10, b: 10, c: 20, d: 5 },
      chapters: [{ key: 'chapter-0', title: 'Chapter One', sceneIds: ['a', 'b', 'c', 'd'] }],
    })

    expect(built.entries.map((entry) => entry.date)).toEqual([
      '2026-10-05',
      '2026-10-05',
      '2026-10-06',
      '2026-10-06',
    ])
    expect(built.byDate.map((row) => row.cumulativeCredits)).toEqual([20, 45])
    expect(built.masterEndDate).toBe('2026-10-06')
    expect(built.chapterEnds).toEqual([
      { key: 'chapter-0', title: 'Chapter One', date: '2026-10-06' },
    ])

    const rebuilt = buildSceneSchedule({
      sceneIds: ['a', 'b', 'c', 'd'],
      scenesPerDay: 2,
      startDate: '2026-10-05',
      weekdays,
      pinned: [{ sceneId: 'c', date: '2026-10-05' }],
      sceneCredits: { a: 10, b: 10, c: 20, d: 5 },
    })
    const byId = Object.fromEntries(rebuilt.entries.map((entry) => [entry.sceneId, entry]))
    expect(byId.c).toMatchObject({ date: '2026-10-05', pinned: true })
    expect(byId.a.date).toBe('2026-10-05')
    expect(byId.a.pinned).toBe(false)
    expect(rebuilt.byDate[rebuilt.byDate.length - 1].cumulativeCredits).toBe(45)
  })

  it('reports behind schedule when fewer scenes are finished than the plan through today', () => {
    const built = buildSceneSchedule({
      sceneIds: ['a', 'b', 'c', 'd'],
      scenesPerDay: 1,
      startDate: '2026-10-05',
      weekdays: DEFAULT_SCHEDULE_WEEKDAYS,
      sceneCredits: { a: 10, b: 10, c: 10, d: 10 },
    })
    const status = productionScheduleStatus({
      entries: built.entries,
      byDate: built.byDate,
      finishedSceneIds: ['a'],
      creditsUsed: 25,
      today: '2026-10-07',
    })

    expect(built.entries.map((entry) => entry.date)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
    ])
    expect(formatPlanDate('2027-10-22')).toBe('Oct. 22, 2027')
    expect(
      latestScheduleDate({
        entries: [
          { date: '2027-01-04' },
          { date: '2027-10-22' },
          {},
        ],
      })
    ).toBe('2027-10-22')
    expect(latestScheduleDate(undefined)).toBeNull()

    expect(status).toMatchObject({
      scenesPlanned: 3,
      scenesFinished: 1,
      schedulePace: 'behind',
      plannedCredits: 30,
      creditsUsed: 25,
      spendPace: 'under',
    })
  })
})
