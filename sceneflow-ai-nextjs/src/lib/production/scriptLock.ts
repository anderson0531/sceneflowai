/**
 * Script lock state for production gates (Draft → Reviewed → Locked).
 */

export type ScriptLockStatus = 'draft' | 'reviewed' | 'locked'

const VALID: ScriptLockStatus[] = ['draft', 'reviewed', 'locked']

export function normalizeScriptLockStatus(value: unknown): ScriptLockStatus {
  if (typeof value === 'string' && VALID.includes(value as ScriptLockStatus)) {
    return value as ScriptLockStatus
  }
  return 'draft'
}

export function getScriptLockStatusFromMetadata(metadata: unknown): ScriptLockStatus {
  if (!metadata || typeof metadata !== 'object') return 'draft'
  const visionPhase = (metadata as Record<string, unknown>).visionPhase
  if (!visionPhase || typeof visionPhase !== 'object') return 'draft'
  return normalizeScriptLockStatus((visionPhase as Record<string, unknown>).scriptLockStatus)
}

export function getScriptLockLabel(status: ScriptLockStatus): string {
  switch (status) {
    case 'locked':
      return 'Locked'
    case 'reviewed':
      return 'Reviewed'
    default:
      return 'Draft'
  }
}

export function isScriptLocked(status: ScriptLockStatus): boolean {
  return status === 'locked'
}

export function canAdvanceScriptLock(current: ScriptLockStatus): ScriptLockStatus | null {
  if (current === 'draft') return 'reviewed'
  if (current === 'reviewed') return 'locked'
  return null
}

export function canRetreatScriptLock(current: ScriptLockStatus): ScriptLockStatus | null {
  if (current === 'locked') return 'reviewed'
  if (current === 'reviewed') return 'draft'
  return null
}
