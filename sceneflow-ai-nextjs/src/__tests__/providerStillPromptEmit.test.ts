import { describe, expect, it } from 'vitest'
import { BEAT_FRAME_ANTI_POSE_NEGATIVE_PROMPT } from '@/lib/character/characterReferenceAssembly'
import {
  DIPTYCH_REPRODUCTION_NEGATIVE_PROMPT,
  WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION,
  buildWardrobeDiptychCharacterConsumptionLine,
} from '@/lib/character/sceneCharacterHeadshot'
import {
  SINGLE_FRAME_LOCK,
  emitProviderStillPrompt,
  freezeStillActionToInstant,
  reconcileLensWithShotType,
} from '@/lib/imagen/providerStillPromptEmit'
import {
  assembleStructuredStillPrompt,
  type StillPromptBoundRef,
} from '@/lib/imagen/structuredStillPrompt'
import {
  buildProviderDiptychLabel,
  buildProviderIdentityLabel,
  buildProviderLocationLabel,
  providerCaptionForAttachedRef,
} from '@/lib/imagen/sceneImageReferenceLabels'
const refs: StillPromptBoundRef[] = [
  {
    kind: 'person',
    token: 'person [1]',
    name: 'Piper Hayes',
    roleLabel: 'identity',
    identityTraits: 'warm light-tan complexion, straight shoulder-length black hair, late 40s',
  },
  {
    kind: 'person',
    token: 'person [2]',
    name: 'Gideon Croft',
    roleLabel: 'identity',
    identityTraits:
      'warm medium-brown skin, tightly curled salt-and-pepper hair, short neatly trimmed beard, late 50s',
  },
  {
    kind: 'location',
    token: 'location [5]',
    name: 'FREIGHT TUNNEL VAULT - PNEUMATIC ACCESS',
    roleLabel: 'library location',
  },
]

const tokenizedStill = assembleStructuredStillPrompt({
  actionOrStructured:
    'Two-Shot, Dynamic, shifting from high-angle dominance to low-angle vulnerability. ' +
    'Iron spanner head planted firmly on the brass flange inches from person [1]\'s hand. ' +
    'A heavy iron spanner slams down into the stone, then person [2] raises the weapon for a fatal blow. ' +
    'Cast in frame: person [1], person [2] — and no other people.',
  refs,
  includeCandid: true,
  exclusions:
    `${DIPTYCH_REPRODUCTION_NEGATIVE_PROMPT}, ${BEAT_FRAME_ANTI_POSE_NEGATIVE_PROMPT}, ` +
    'floating objects, missing limbs',
})

const styleWithMacro =
  'Lighting & Camera: Hard & Dramatic; Night; Hard & Dramatic; Macro (100mm) for extreme detail on the needle and ash; 16:9 framing'

describe('emitProviderStillPrompt', () => {
  it('replaces tokens with names and drops the numbered references legend', () => {
    const provider = emitProviderStillPrompt(tokenizedStill, {
      refs,
      imageBindings: [
        { sendIndex: 1, name: 'Piper Hayes' },
        { sendIndex: 2, name: 'Gideon Croft' },
        { sendIndex: 5, name: 'FREIGHT TUNNEL VAULT - PNEUMATIC ACCESS' },
      ],
      shotType: 'Two-Shot',
    })

    expect(provider).toContain('Piper Hayes')
    expect(provider).toContain('Gideon Croft')
    expect(provider).toContain('FREIGHT TUNNEL VAULT - PNEUMATIC ACCESS')
    expect(provider).not.toMatch(/person \[\d+\]/)
    expect(provider).not.toMatch(/location \[\d+\]/)
    expect(provider).not.toContain('[REFERENCES]')
    expect(provider).not.toContain('Reference image')
    expect(provider).toContain(SINGLE_FRAME_LOCK)
    expect(provider).toContain('warm light-tan complexion')
    expect(provider).toContain('warm medium-brown skin')
  })

  it('strips layout-trigger exclusions and keeps physics plus anti-pose terms', () => {
    const provider = emitProviderStillPrompt(tokenizedStill, { refs, shotType: 'Two-Shot' })

    expect(provider).not.toMatch(/diptych/i)
    expect(provider).not.toMatch(/split-screen/i)
    expect(provider).not.toMatch(/turnaround sheet/i)
    expect(provider).not.toMatch(/reference sheet collage/i)
    expect(provider).not.toMatch(/2x2 grid/i)
    expect(provider).not.toMatch(/collage/i)
    expect(provider).toContain('floating objects')
    expect(provider).toContain('missing limbs')
    expect(provider).toContain('posing for camera')
    expect(provider).toContain('looking at camera')
    expect(provider).not.toMatch(/,{2,}/)
  })

  it('freezes sequential then-clauses and shifting camera language', () => {
    const sequential =
      'Action/Framing: Two-Shot, shifting from high-angle dominance to low-angle vulnerability. ' +
      'A heavy iron spanner slams down into the stone, then raised as a weapon.'
    const frozen = freezeStillActionToInstant(sequential)
    expect(frozen).toContain('low-angle vulnerability')
    expect(frozen).toContain('raised as a weapon')
    expect(frozen).not.toMatch(/shifting from/i)
    expect(frozen).not.toMatch(/\bthen\b/i)
    expect(frozen).not.toMatch(/slams down into the stone/i)

    const provider = emitProviderStillPrompt(tokenizedStill, { refs, shotType: 'Two-Shot' })
    expect(provider).not.toMatch(/shifting from/i)
    expect(provider).not.toMatch(/\bthen\b/i)
  })

  it('drops Macro (100mm) from a Two-Shot lighting line', () => {
    const styled = `${tokenizedStill}\n\n[STYLE]\n${styleWithMacro}`
    const provider = emitProviderStillPrompt(styled, { refs, shotType: 'Two-Shot' })

    expect(provider).not.toMatch(/Macro/i)
    expect(provider).not.toMatch(/100mm/)
    expect(provider).not.toMatch(/extreme detail/)
    expect(provider).toContain('16:9 framing')
    expect(provider).toContain('Hard & Dramatic')
    expect(provider.match(/Hard & Dramatic/g)?.length).toBe(1)
  })

  it('rewrites diptych consumption into name-based role language', () => {
    const wrapped =
      `${WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION}\n` +
      `${buildWardrobeDiptychCharacterConsumptionLine('Piper Hayes', 1)}\n` +
      `IDENTITY LOCK: person [1] is the exact same individual shown in Reference image 1 — same skin tone.\n\n` +
      tokenizedStill

    const provider = emitProviderStillPrompt(wrapped, {
      refs,
      imageBindings: [{ sendIndex: 1, name: 'Piper Hayes' }],
      shotType: 'Two-Shot',
    })

    expect(provider).toContain('Piper Hayes: use the face from the attached Piper Hayes photo')
    expect(provider).toContain('the attached Piper Hayes photo')
    expect(provider).not.toMatch(/LEFT panel/i)
    expect(provider).not.toMatch(/RIGHT panel/i)
    expect(provider).not.toMatch(/diptych/i)
    expect(provider).not.toMatch(/person \[/)
    expect(provider).not.toContain('Reference image')
  })
})

describe('reconcileLensWithShotType', () => {
  it('keeps a narrative lens and drops insert macro on a Two-Shot', () => {
    const result = reconcileLensWithShotType(
      'Hard & Dramatic; Night; Hard & Dramatic; Macro (100mm) for extreme detail on the needle and ash; 16:9 framing',
      'Two-Shot'
    )
    expect(result).not.toMatch(/Macro|100mm|extreme detail/)
    expect(result).toContain('16:9 framing')
    expect(result).toBe('Hard & Dramatic; Night; 16:9 framing')
  })

  it('keeps a tight lens on an extreme close-up', () => {
    const result = reconcileLensWithShotType(
      '24mm wide-angle; Macro (100mm) for extreme detail on the needle; 16:9 framing',
      'Extreme Close-Up'
    )
    expect(result).toContain('Macro (100mm)')
    expect(result).not.toMatch(/24mm/)
  })
})

describe('provider reference captions', () => {
  it('uses unbracketed names with no send-index prefix', () => {
    expect(providerCaptionForAttachedRef({ characterName: 'Piper Hayes', refRole: 'identity' })).toBe(
      'Piper Hayes identity'
    )
    expect(
      providerCaptionForAttachedRef({
        characterName: 'Gideon Croft',
        refRole: 'wardrobe-diptych',
      })
    ).toBe('Gideon Croft identity and wardrobe')
    expect(
      providerCaptionForAttachedRef({
        locationName: 'FREIGHT TUNNEL VAULT - PNEUMATIC ACCESS',
        role: 'location',
      })
    ).toBe('FREIGHT TUNNEL VAULT - PNEUMATIC ACCESS location')

    expect(buildProviderIdentityLabel('Piper Hayes')).not.toMatch(/\[|Reference image/)
    expect(buildProviderDiptychLabel('Gideon Croft')).not.toMatch(/\[|LEFT|RIGHT/)
    expect(buildProviderLocationLabel('Tunnel')).not.toMatch(/\[/)
  })
})
