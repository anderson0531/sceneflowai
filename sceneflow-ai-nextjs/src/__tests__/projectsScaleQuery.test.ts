import { readFileSync } from 'fs'
import path from 'path'
import { Op } from 'sequelize'
import { describe, expect, it } from 'vitest'
import {
  BLUEPRINT_RAW_STEPS,
  buildProjectListOrder,
  buildProjectListWhere,
  escapeLikePattern,
  escapeSqlLiteral,
  parseProjectListParams,
} from '@/lib/projects/projectListQuery'

describe('escapeLikePattern & escapeSqlLiteral', () => {
  it('escapes PostgreSQL LIKE wildcards and backslashes', () => {
    expect(escapeLikePattern('100% real_film\\cut')).toBe('100\\% real\\_film\\\\cut')
    expect(escapeLikePattern('ordinary title')).toBe('ordinary title')
  })

  it('escapes single quotes and strips null bytes in SQL string literals', () => {
    expect(escapeSqlLiteral("O'Connor's\0 Story")).toBe("'O''Connor''s Story'")
    expect(escapeSqlLiteral('en-US')).toBe("'en-US'")
  })
})

describe('parseProjectListParams', () => {
  it('applies safe defaults and supports up to 100 items per page (breaking the 50 ceiling)', () => {
    const defaults = parseProjectListParams(new URLSearchParams())
    expect(defaults).toEqual({
      q: '',
      status: 'all',
      hasExplicitStatus: false,
      stage: 'all',
      clientAction: 'all',
      assignedPm: 'all',
      locale: 'all',
      vertical: 'all',
      sort: 'recent',
      page: 1,
      pageSize: 24,
      isSummary: false,
      includeFacets: false,
    })

    const hundred = parseProjectListParams(new URLSearchParams('page=4&pageSize=100'))
    expect(hundred.page).toBe(4)
    expect(hundred.pageSize).toBe(100)

    const clamped = parseProjectListParams(new URLSearchParams('page=-2&pageSize=500'))
    expect(clamped.page).toBe(1)
    expect(clamped.pageSize).toBe(100)
  })

  it('normalizes legacy status aliases and rejects unknown enum inputs', () => {
    const legacy = parseProjectListParams(new URLSearchParams('status=in-progress&stage=production'))
    expect(legacy.status).toBe('active')
    expect(legacy.hasExplicitStatus).toBe(true)
    expect(legacy.stage).toBe('production')

    const bogus = parseProjectListParams(
      new URLSearchParams('status=dropped&stage=invalid&clientAction=bogus&sort=hacked')
    )
    expect(bogus.status).toBe('all')
    expect(bogus.stage).toBe('all')
    expect(bogus.clientAction).toBe('all')
    expect(bogus.sort).toBe('recent')
  })

  it('parses agency search, PM, locale, vertical, summary, and facet flags', () => {
    const parsed = parseProjectListParams(
      new URLSearchParams(
        'q=  Maria%20Silva  &assignedPm=pm-user-42&locale=es&vertical=memoir&clientAction=action_required&sort=alphabetical&summary=1&includeFacets=1'
      )
    )
    expect(parsed.q).toBe('Maria Silva')
    expect(parsed.assignedPm).toBe('pm-user-42')
    expect(parsed.locale).toBe('es')
    expect(parsed.vertical).toBe('memoir')
    expect(parsed.clientAction).toBe('action_required')
    expect(parsed.sort).toBe('alphabetical')
    expect(parsed.isSummary).toBe(true)
    expect(parsed.includeFacets).toBe(true)
  })
})

describe('buildProjectListWhere', () => {
  const baseAccessWhere = { user_id: 'owner-1' }

  it('preserves backwards compatibility for legacy callers omitting status and includeFacets', () => {
    const params = parseProjectListParams(new URLSearchParams('pageSize=50&summary=1'))
    const where = buildProjectListWhere({ baseAccessWhere, params })
    expect(where).toEqual(baseAccessWhere)
  })

  it('excludes archived projects when status=all is explicitly passed or includeFacets=1', () => {
    const params = parseProjectListParams(new URLSearchParams('status=all&includeFacets=1'))
    const where = buildProjectListWhere({ baseAccessWhere, params }) as Record<symbol, unknown[]>
    const clauses = where[Op.and]
    expect(clauses).toHaveLength(2)
    expect(clauses[0]).toEqual(baseAccessWhere)
    expect(clauses[1]).toEqual({ status: { [Op.ne]: 'archived' } })
  })

  it('selects only archived projects when status=archived', () => {
    const params = parseProjectListParams(new URLSearchParams('status=archived'))
    const where = buildProjectListWhere({ baseAccessWhere, params }) as Record<symbol, unknown[]>
    const clauses = where[Op.and]
    expect(clauses).toContainEqual({ status: 'archived' })
  })

  it('builds stage filters for blueprint and production', () => {
    const bpParams = parseProjectListParams(new URLSearchParams('stage=blueprint'))
    const bpWhere = buildProjectListWhere({ baseAccessWhere, params: bpParams }) as Record<symbol, unknown[]>
    expect(bpWhere[Op.and][1]).toEqual({
      [Op.or]: [
        { current_step: { [Op.in]: [...BLUEPRINT_RAW_STEPS] } },
        { current_step: { [Op.is]: null } },
      ],
    })

    const prodParams = parseProjectListParams(new URLSearchParams('stage=production'))
    const prodWhere = buildProjectListWhere({ baseAccessWhere, params: prodParams }) as Record<symbol, unknown[]>
    expect(prodWhere[Op.and][1]).toEqual({
      current_step: { [Op.notIn]: [...BLUEPRINT_RAW_STEPS] },
    })
  })

  it('filters unassigned and specific PM projects safely', () => {
    const unassignedParams = parseProjectListParams(new URLSearchParams('assignedPm=unassigned'))
    const unassignedWhere = buildProjectListWhere({
      baseAccessWhere,
      params: unassignedParams,
      allAssignedProjectIds: ['p1', 'p2'],
    }) as Record<symbol, unknown[]>
    expect(unassignedWhere[Op.and]).toContainEqual({ id: { [Op.notIn]: ['p1', 'p2'] } })

    const pmParams = parseProjectListParams(new URLSearchParams('assignedPm=pm-7'))
    const pmWhere = buildProjectListWhere({
      baseAccessWhere,
      params: pmParams,
      assignedProjectIdsForPm: ['p3'],
    }) as Record<symbol, unknown[]>
    expect(pmWhere[Op.and]).toContainEqual({ id: { [Op.in]: ['p3'] } })

    const emptyPmWhere = buildProjectListWhere({
      baseAccessWhere,
      params: pmParams,
      assignedProjectIdsForPm: [],
    }) as Record<symbol, Array<{ val?: string }>>
    expect(emptyPmWhere[Op.and][1]?.val).toBe('1 = 0')
  })

  it('generates safely escaped full-text search, locale, vertical, and clientAction SQL clauses', () => {
    const params = parseProjectListParams(
      new URLSearchParams(
        "q=O'Brien 50%_test&locale=pt-BR&vertical=memorial&clientAction=waiting_on_client&status=completed"
      )
    )
    const where = buildProjectListWhere({ baseAccessWhere, params })

    const literals: string[] = []
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) {
        node.forEach(walk)
        return
      }
      const rec = node as Record<string | symbol, unknown>
      if (typeof rec.val === 'string') {
        literals.push(rec.val)
      }
      for (const k of [...Object.keys(rec), ...Object.getOwnPropertySymbols(rec)]) {
        walk(rec[k])
      }
    }
    walk(where)
    const combinedSql = literals.join('\n')

    expect(combinedSql).toContain("O''Brien 50\\%\\_test")
    expect(combinedSql).toContain("LOWER('pt-BR')")
    expect(combinedSql).toContain("'memorial'")
    expect(combinedSql).toContain("'waiting_on_client'")
    expect(combinedSql).toContain("metadata->'clientOrder'->>'customerEmail'")
    expect(combinedSql).toContain("metadata->'clientOrder'->>'orderCode'")
  })
})

describe('buildProjectListOrder', () => {
  it('returns deterministic SQL ordering for all sort modes', () => {
    expect(buildProjectListOrder('recent')).toEqual([['updated_at', 'DESC']])
    expect(buildProjectListOrder('created')).toEqual([['created_at', 'DESC']])

    const alpha = buildProjectListOrder('alphabetical') as Array<unknown[]>
    expect((alpha[0][0] as { val: string }).val).toBe('LOWER(title)')
    expect(alpha[0][1]).toBe('ASC')

    const progress = buildProjectListOrder('progress') as Array<unknown[]>
    expect((progress[0][0] as { val: string }).val).toContain("step_progress->>'overall'")
    expect(progress[0][1]).toBe('DESC')
  })
})

describe('Sprint 1 scale architecture contracts', () => {
  const root = process.cwd()

  it('removes the hardcoded pageSize=50 ceiling from /dashboard/projects and wires server-side facets & bulk actions', () => {
    const pageSrc = readFileSync(path.join(root, 'src/app/dashboard/projects/page.tsx'), 'utf8')
    expect(pageSrc).not.toContain('pageSize=50')
    expect(pageSrc).toContain("includeFacets: '1'")
    expect(pageSrc).toContain('/api/projects/bulk')
    expect(pageSrc).toContain('assignedPm')
    expect(pageSrc).toContain('pageSize')
    expect(pageSrc).toContain('totalPages')
  })

  it('enforces owner or workspace admin RBAC on POST /api/projects/bulk', () => {
    const bulkSrc = readFileSync(path.join(root, 'src/app/api/projects/bulk/route.ts'), 'utf8')
    expect(bulkSrc).toContain('getAuthenticatedUserId')
    expect(bulkSrc).toContain("m.role === 'admin'")
    expect(bulkSrc).toContain('MAX_BULK_IDS = 100')
    expect(bulkSrc).toContain("action === 'archive'")
    expect(bulkSrc).toContain('ProjectAssignment')
  })

  it('hydrates assignedMembers and computes SQL facets in GET /api/projects', () => {
    const routeSrc = readFileSync(path.join(root, 'src/app/api/projects/route.ts'), 'utf8')
    expect(routeSrc).toContain('parseProjectListParams')
    expect(routeSrc).toContain('buildProjectListWhere')
    expect(routeSrc).toContain('buildProjectListOrder')
    expect(routeSrc).toContain('assignedMembers')
    expect(routeSrc).toContain('totalPages')
    expect(routeSrc).toContain('facets')
  })
})
