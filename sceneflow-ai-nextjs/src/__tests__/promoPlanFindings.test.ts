import { describe, expect, it } from 'vitest'
import { analyzePromoPlan } from '@/lib/publish/analyzePromoPlan'
import {
  collectPromoPlanFindings,
  mergePromoStoryNotes,
  parsePromoStoryNotes,
} from '@/lib/publish/promoPlanFindings'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'
import type { generateText } from '@/lib/vertexai/gemini'

function planRow(
  sceneIndex: number,
  beatId: string,
  extra?: Partial<PromoTrailerBeatPlan>
): PromoTrailerBeatPlan {
  return {
    sceneId: `s${sceneIndex}`,
    beatId,
    sceneIndex,
    startSec: 0,
    endSec: extra?.durationSec ?? 5,
    score: 1,
    durationSec: 5,
    ...extra,
  }
}

describe('collectPromoPlanFindings', () => {
  it('flags a credit standing in for the missing title card', () => {
    const findings = collectPromoPlanFindings({
      scenes: [
        {
          id: 'title-scene',
          cinematicType: 'title',
          heading: 'INT. TITLE SEQUENCE - DAY',
          beats: [
            {
              beatId: 'title',
              sequenceIndex: 0,
              kind: 'action',
              beatRole: 'title_reveal',
              actionDescription: 'The White City Current',
            },
            {
              beatId: 'credit',
              sequenceIndex: 1,
              kind: 'action',
              beatRole: 'credit',
              actionDescription: 'A SceneFlow Studio Production',
            },
          ],
        },
      ],
      beatPlan: [planRow(0, 'credit', { label: 'A SceneFlow Studio Production', beatRole: 'credit' })],
    })
    const title = findings.find((finding) => finding.category === 'title')
    expect(title?.revisesPlan).toBe(true)
    expect(title?.text).toContain('The White City Current')
    expect(title?.text).toContain('A SceneFlow Studio Production')
  })

  it('flags a protagonist introduced more than once', () => {
    const scenes = [0, 1].map((index) => ({
      id: `s${index}`,
      heading: `INT. ROOM ${index}`,
      characters: ['Mara'],
      beats: [
        {
          beatId: `intro-${index}`,
          sequenceIndex: 0,
          kind: 'action',
          beatRole: 'opening',
          character: 'Mara',
          actionDescription: `Mara enters ${index}`,
        },
      ],
    }))
    const findings = collectPromoPlanFindings({
      scenes,
      beatPlan: [
        planRow(0, 'intro-0', { label: 'Mara enters 0', beatRole: 'opening' }),
        planRow(1, 'intro-1', { label: 'Mara enters 1', beatRole: 'opening' }),
      ],
    })
    expect(findings.find((finding) => finding.category === 'redundancy')?.text).toContain(
      'Mara is introduced 2 times'
    )
  })

  it('flags dialogue the 5 second cut will chop', () => {
    const line = 'The current keeps moving under the white city long after the lights go out tonight'
    const findings = collectPromoPlanFindings({
      scenes: [
        {
          id: 's0',
          beats: [
            {
              beatId: 'line',
              sequenceIndex: 0,
              kind: 'dialogue',
              line,
              character: 'Mara',
            },
          ],
        },
      ],
      beatPlan: [planRow(0, 'line', { beatKind: 'dialogue', durationSec: 5, label: line })],
    })
    const dialogue = findings.find((finding) => finding.category === 'dialogue')
    expect(dialogue?.revisesPlan).toBe(true)
    expect(dialogue?.text).toContain('5s')
  })

  it('names a missing location plate on a planned shot', () => {
    const findings = collectPromoPlanFindings({
      scenes: [
        {
          id: 's0',
          sceneNumber: 1,
          heading: 'EXT. WHITE CITY - NIGHT',
          beats: [
            {
              beatId: 'plate',
              sequenceIndex: 0,
              kind: 'action',
              actionDescription: 'The river gate',
              referenceSelection: {
                characterIds: [],
                objectRefIds: [],
                locationRefId: 'loc-white-city',
              },
            },
          ],
        },
      ],
      locationReferences: [
        {
          id: 'loc-white-city',
          location: 'WHITE CITY',
          locationDisplay: 'EXT. WHITE CITY - NIGHT',
          imageUrl: '',
        },
      ],
      beatPlan: [planRow(0, 'plate', { label: 'The river gate' })],
    })
    const references = findings.find((finding) => finding.category === 'references')
    expect(references?.revisesPlan).toBe(false)
    expect(references?.text).toContain('WHITE CITY')
  })

  it('flags a policy block that is still on the base direction', () => {
    const findings = collectPromoPlanFindings({
      scenes: [
        {
          id: 's0',
          beats: [
            {
              beatId: 'blocked',
              sequenceIndex: 0,
              kind: 'action',
              actionDescription: 'The chase',
              beatDirection: { shotType: 'Wide Shot', generatedBy: 'llm' },
            },
          ],
        },
      ],
      sceneProductionState: {
        s0: {
          segments: [
            {
              beatId: 'blocked',
              status: 'ERROR',
              lastContentPolicyFailure: { blocked: true },
              errorMessage: 'content_blocked',
            },
          ],
        },
      },
      beatPlan: [planRow(0, 'blocked', { label: 'The chase' })],
    })
    const direction = findings.find((finding) => finding.category === 'direction')
    expect(direction?.text).toContain('base direction')
    expect(direction?.text).toContain('Safety')
    expect(direction?.revisesPlan).toBe(false)
  })

  it('flags a blueprint beat the cut never touches', () => {
    const findings = collectPromoPlanFindings({
      scenes: [
        { id: 's0', blueprintBeatIndex: 0, beats: [{ beatId: 'a', sequenceIndex: 0, kind: 'action', actionDescription: 'Rise' }] },
        { id: 's1', blueprintBeatIndex: 1, beats: [{ beatId: 'b', sequenceIndex: 0, kind: 'action', actionDescription: 'Answer' }] },
      ],
      blueprintBeats: [{ title: 'The Current Rises' }, { title: 'The City Answers' }],
      beatPlan: [planRow(1, 'b', { label: 'Answer' })],
    })
    const blueprint = findings.filter((finding) => finding.category === 'blueprint')
    expect(blueprint.map((finding) => finding.text).join(' ')).toContain('The Current Rises')
    expect(blueprint.map((finding) => finding.text).join(' ')).not.toContain('The City Answers')
  })

  it('reports a loud music bed and stays quiet once the bed is lowered', () => {
    const scenes = [
      {
        id: 's0',
        beats: [{ beatId: 'line', sequenceIndex: 0, kind: 'dialogue', line: 'Listen.' }],
      },
    ]
    const beatPlan = [planRow(0, 'line', { beatKind: 'dialogue', label: 'Listen.' })]
    const loud = collectPromoPlanFindings({ scenes, beatPlan, musicLevel: 0.45 })
    const quiet = collectPromoPlanFindings({ scenes, beatPlan })
    expect(loud.some((finding) => finding.category === 'mix' && !finding.revisesPlan)).toBe(true)
    expect(quiet.some((finding) => finding.category === 'mix')).toBe(false)
  })
})

describe('analyzePromoPlan', () => {
  it('keeps deterministic findings and appends a story note', async () => {
    const generate = (async () => ({
      text: JSON.stringify({
        recommendations: [
          {
            text: 'Let the current carry the hook, then land on the title.',
            priority: 'medium',
            category: 'blueprint',
          },
        ],
      }),
    })) as unknown as typeof generateText

    const findings = await analyzePromoPlan(
      {
        title: 'The White City Current',
        scenes: [
          {
            id: 'title-scene',
            cinematicType: 'title',
            beats: [
              {
                beatId: 'title',
                sequenceIndex: 0,
                kind: 'action',
                beatRole: 'title_reveal',
                actionDescription: 'The White City Current',
              },
            ],
          },
        ],
        beatPlan: [],
      },
      generate
    )
    expect(findings.some((finding) => finding.text.includes('The White City Current'))).toBe(true)
    expect(findings.some((finding) => finding.text.includes('Let the current carry the hook'))).toBe(true)
  })

  it('does not let a repeated story note replace a finding', () => {
    const merged = mergePromoStoryNotes(
      [{ category: 'title', priority: 'high', text: 'End on the title.', revisesPlan: true }],
      parsePromoStoryNotes({
        recommendations: [{ text: 'End on the title.', priority: 'low', category: 'title' }],
      })
    )
    expect(merged).toHaveLength(1)
    expect(merged[0]?.priority).toBe('high')
  })
})
