import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  mergeModerationReports,
  aggregateScriptText,
  reportIsBlocked,
  reportHasWarnings,
  applyValidationMode,
  type ModerationReport,
} from '@/lib/moderation/moderationPipeline'
import {
  MODERATION_CREDITS,
  getModerationValidationCost,
} from '@/lib/credits/creditCosts'
import { aggregateBlueprintInputText, aggregateBlueprintOutputText } from '@/lib/moderation/blueprintText'
import {
  isHiveModerationMasterEnabled,
  isStageModerationEnabled,
  isPromptModerationEnabled,
  isValidationApiEnabled,
} from '@/lib/moderation/moderationFlags'
import {
  parseCelebrityHiveResponse,
  parseLikenessHiveResponse,
  parseCopyrightMediaHiveResponse,
} from '@/services/HiveModerationService'

describe('moderationFlags', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.HIVE_MODERATION_ENABLED = process.env.HIVE_MODERATION_ENABLED
    envBackup.HIVE_MODERATION_BLUEPRINT = process.env.HIVE_MODERATION_BLUEPRINT
  })

  afterEach(() => {
    process.env.HIVE_MODERATION_ENABLED = envBackup.HIVE_MODERATION_ENABLED
    process.env.HIVE_MODERATION_BLUEPRINT = envBackup.HIVE_MODERATION_BLUEPRINT
  })

  it('master flag defaults off', () => {
    delete process.env.HIVE_MODERATION_ENABLED
    expect(isHiveModerationMasterEnabled()).toBe(false)
  })

  it('stage auto-run is always disabled', () => {
    process.env.HIVE_MODERATION_ENABLED = 'true'
    process.env.HIVE_MODERATION_BLUEPRINT = 'true'
    expect(isStageModerationEnabled('blueprint')).toBe(false)
    expect(isPromptModerationEnabled()).toBe(false)
  })

  it('validation API follows master flag', () => {
    delete process.env.HIVE_MODERATION_ENABLED
    expect(isValidationApiEnabled()).toBe(false)
    process.env.HIVE_MODERATION_ENABLED = 'true'
    expect(isValidationApiEnabled()).toBe(true)
  })
})

describe('moderation validation credits', () => {
  it('getModerationValidationCost returns stage pricing', () => {
    expect(getModerationValidationCost('blueprint')).toBe(MODERATION_CREDITS.TEXT_VALIDATE)
    expect(getModerationValidationCost('script')).toBe(MODERATION_CREDITS.TEXT_VALIDATE)
    expect(getModerationValidationCost('storyboard')).toBe(MODERATION_CREDITS.IMAGE_VALIDATE)
    expect(getModerationValidationCost('fal_video')).toBe(MODERATION_CREDITS.VIDEO_VALIDATE)
    expect(
      getModerationValidationCost('fal_video', { includeCopyrightMedia: true })
    ).toBe(MODERATION_CREDITS.VIDEO_VALIDATE + MODERATION_CREDITS.COPYRIGHT_MEDIA_ADDON)
  })
})

describe('applyValidationMode', () => {
  it('downgrades harmful blocks to informational warnings', () => {
    const blocked: ModerationReport = {
      id: '1',
      stage: 'script',
      allowed: false,
      action: 'blocked',
      checks: [
        {
          check: 'harmful_text',
          provider: 'hive',
          allowed: false,
          severity: 'block',
          categories: ['violence'],
        },
      ],
      summary: 'Blocked',
      createdAt: new Date().toISOString(),
    }
    const result = applyValidationMode(blocked)
    expect(result.allowed).toBe(true)
    expect(result.action).toBe('warning')
    expect(result.checks[0].severity).toBe('warn')
    expect(result.checks[0].allowed).toBe(true)
  })
})

describe('moderationPipeline helpers', () => {
  const warnReport: ModerationReport = {
    id: '1',
    stage: 'blueprint',
    allowed: true,
    action: 'warning',
    checks: [
      {
        check: 'copyright_text',
        provider: 'heuristic',
        allowed: true,
        severity: 'warn',
        categories: ['trademark/franchise'],
      },
    ],
    summary: 'Allowed with warnings',
    createdAt: new Date().toISOString(),
  }

  const blockReport: ModerationReport = {
    id: '2',
    stage: 'script',
    allowed: false,
    action: 'blocked',
    checks: [
      {
        check: 'harmful_text',
        provider: 'hive',
        allowed: false,
        severity: 'block',
        categories: ['violence'],
      },
    ],
    summary: 'Blocked',
    createdAt: new Date().toISOString(),
  }

  it('mergeModerationReports blocks when any report blocks', () => {
    const merged = mergeModerationReports([warnReport, blockReport])
    expect(merged?.allowed).toBe(false)
    expect(merged?.checks).toHaveLength(2)
  })

  it('reportIsBlocked and reportHasWarnings', () => {
    expect(reportIsBlocked(blockReport)).toBe(true)
    expect(reportHasWarnings(warnReport)).toBe(true)
    expect(reportHasWarnings(blockReport)).toBe(false)
  })

  it('aggregateBlueprintInputText collects fields', () => {
    const text = aggregateBlueprintInputText({
      title: 'Test',
      logline: 'A hero saves the day',
      beats: [{ beat_title: 'Opening', beat_description: 'Dawn' }],
    })
    expect(text).toContain('Test')
    expect(text).toContain('Opening')
    expect(text).toContain('Dawn')
  })

  it('aggregateBlueprintOutputText handles arrays', () => {
    const text = aggregateBlueprintOutputText([
      { title: 'A', logline: 'B' },
      { title: 'C', synopsis: 'D' },
    ])
    expect(text).toContain('A')
    expect(text).toContain('D')
  })

  it('aggregateScriptText joins scenes', () => {
    const text = aggregateScriptText([
      {
        heading: 'INT. ROOM',
        action: 'She enters.',
        dialogue: [{ character: 'ALICE', line: 'Hello.' }],
      },
    ])
    expect(text).toContain('INT. ROOM')
    expect(text).toContain('ALICE: Hello.')
  })
})

describe('Hive IP parse helpers', () => {
  it('parseCelebrityHiveResponse warns on matches', () => {
    const result = parseCelebrityHiveResponse({
      id: 'req-1',
      status: {
        output: [
          {
            celebrities: [{ name: 'Example Star', score: 0.9 }],
          },
        ],
      },
    })
    expect(result.allowed).toBe(true)
    expect(result.action).toBe('warning')
    expect(result.flaggedCategories).toContain('celebrity_match')
  })

  it('parseLikenessHiveResponse warns on high scores', () => {
    const result = parseLikenessHiveResponse({
      status: {
        output: [{ classes: [{ class: 'protected_likeness', score: 0.8 }] }],
      },
    })
    expect(result.flaggedCategories).toContain('likeness_match')
  })

  it('parseCopyrightMediaHiveResponse warns on media matches', () => {
    const result = parseCopyrightMediaHiveResponse({
      status: {
        output: [{ classes: [{ class: 'match', score: 0.7 }] }],
      },
    })
    expect(result.flaggedCategories).toContain('copyright_media_match')
  })
})
