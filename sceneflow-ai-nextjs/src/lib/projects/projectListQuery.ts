import { Op, literal, type WhereOptions, type Order } from 'sequelize'

export type ProjectStatusFilter =
  | 'all'
  | 'active'
  | 'draft'
  | 'completed'
  | 'archived'

export type ProjectStageFilter = 'all' | 'blueprint' | 'production'

export type ClientActionFilter =
  | 'all'
  | 'client_only'
  | 'action_required'
  | 'waiting_on_client'
  | 'client_approved'

export type ProjectSortOption = 'recent' | 'created' | 'alphabetical' | 'progress'

export interface ParsedProjectListParams {
  q: string
  status: ProjectStatusFilter
  hasExplicitStatus: boolean
  stage: ProjectStageFilter
  clientAction: ClientActionFilter
  assignedPm: string // 'all' | 'unassigned' | <memberUserId>
  locale: string // 'all' | locale code
  vertical: string // 'all' | vertical slug
  sort: ProjectSortOption
  page: number
  pageSize: number
  isSummary: boolean
  includeFacets: boolean
}

export interface ProjectFacetCounts {
  totalNonArchived: number
  blueprintCount: number
  productionCount: number
  activeCount: number
  completedCount: number
  archivedCount: number
  clientTotal: number
  actionRequiredCount: number
  waitingOnClientCount: number
  clientApprovedCount: number
  unassignedCount: number
}

export const BLUEPRINT_RAW_STEPS = ['blueprint', 'ideation', 'storyboard'] as const

const VALID_STATUSES = new Set<ProjectStatusFilter>([
  'all',
  'active',
  'draft',
  'completed',
  'archived',
])

const VALID_STAGES = new Set<ProjectStageFilter>(['all', 'blueprint', 'production'])

const VALID_CLIENT_ACTIONS = new Set<ClientActionFilter>([
  'all',
  'client_only',
  'action_required',
  'waiting_on_client',
  'client_approved',
])

const VALID_SORTS = new Set<ProjectSortOption>([
  'recent',
  'created',
  'alphabetical',
  'progress',
])

/**
 * Escapes `%`, `_`, and `\` for PostgreSQL ILIKE patterns.
 */
export function escapeLikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

export function parseProjectListParams(
  searchParams: URLSearchParams
): ParsedProjectListParams {
  const rawQ = (searchParams.get('q') || '').trim().slice(0, 120)

  const hasExplicitStatus = searchParams.has('status')
  const rawStatus = (searchParams.get('status') || 'all').trim().toLowerCase()
  const normalizedStatus =
    rawStatus === 'in-progress' || rawStatus === 'in_progress'
      ? 'active'
      : rawStatus
  const status: ProjectStatusFilter = VALID_STATUSES.has(
    normalizedStatus as ProjectStatusFilter
  )
    ? (normalizedStatus as ProjectStatusFilter)
    : 'all'

  const rawStage = (searchParams.get('stage') || 'all').trim().toLowerCase()
  const stage: ProjectStageFilter = VALID_STAGES.has(rawStage as ProjectStageFilter)
    ? (rawStage as ProjectStageFilter)
    : 'all'

  const rawClientAction = (searchParams.get('clientAction') || 'all').trim().toLowerCase()
  const clientAction: ClientActionFilter = VALID_CLIENT_ACTIONS.has(
    rawClientAction as ClientActionFilter
  )
    ? (rawClientAction as ClientActionFilter)
    : 'all'

  const assignedPm = (searchParams.get('assignedPm') || 'all').trim().slice(0, 80) || 'all'
  const locale = (searchParams.get('locale') || 'all').trim().slice(0, 20) || 'all'
  const vertical = (searchParams.get('vertical') || 'all').trim().slice(0, 40) || 'all'

  const rawSort = (searchParams.get('sort') || 'recent').trim().toLowerCase()
  const sort: ProjectSortOption = VALID_SORTS.has(rawSort as ProjectSortOption)
    ? (rawSort as ProjectSortOption)
    : 'recent'

  const parsedPage = Number(searchParams.get('page') || '1')
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1

  const parsedSize = Number(searchParams.get('pageSize') || '24')
  // Supports up to 100 per page with true server-side pagination across unlimited projects.
  const pageSize =
    Number.isFinite(parsedSize) && parsedSize >= 1
      ? Math.min(100, Math.floor(parsedSize))
      : 24

  const isSummary =
    searchParams.get('summary') === '1' || searchParams.get('summary') === 'true'
  const includeFacets =
    searchParams.get('includeFacets') === '1' ||
    searchParams.get('includeFacets') === 'true'

  return {
    q: rawQ,
    status,
    hasExplicitStatus,
    stage,
    clientAction,
    assignedPm,
    locale,
    vertical,
    sort,
    page,
    pageSize,
    isSummary,
    includeFacets,
  }
}

export interface BuildProjectFilterOptions {
  baseAccessWhere: WhereOptions
  params: ParsedProjectListParams
  /** Project IDs matching the requested `assignedPm` filter, if any. */
  assignedProjectIdsForPm?: string[] | null
  /** All assigned project IDs in this workspace, used when `assignedPm === 'unassigned'`. */
  allAssignedProjectIds?: string[] | null
  /** Custom SQL escaper for unit testing without live DB dialect initialization. */
  escapeSql?: (val: string) => string
}

/**
 * Escapes a string as a safe PostgreSQL single-quoted string literal
 * (standard_conforming_strings = on, null bytes stripped).
 */
export function escapeSqlLiteral(val: string): string {
  const sanitized = val.replace(/\0/g, '')
  return `'${sanitized.replace(/'/g, "''")}'`
}

/**
 * Builds the combined Sequelize WHERE clause for server-side project search,
 * faceted filtering, PM assignment filtering, and archive exclusion.
 */
export function buildProjectListWhere({
  baseAccessWhere,
  params,
  assignedProjectIdsForPm,
  allAssignedProjectIds,
  escapeSql = escapeSqlLiteral,
}: BuildProjectFilterOptions): WhereOptions {
  const andClauses: WhereOptions[] = [baseAccessWhere]

  // 1. Status filter (archived excluded whenever status filter is explicitly active, unless 'archived')
  if (params.status === 'archived') {
    andClauses.push({ status: 'archived' })
  } else if (params.hasExplicitStatus || params.includeFacets) {
    andClauses.push({ status: { [Op.ne]: 'archived' } })
    if (params.status === 'active') {
      andClauses.push({
        [Op.or]: [
          { status: { [Op.in]: ['in_progress', 'draft'] } },
          literal(`status::text IN ('in-progress', 'active')`),
        ],
      })
    } else if (params.status === 'draft') {
      andClauses.push({ status: 'draft' })
    } else if (params.status === 'completed') {
      andClauses.push({
        [Op.or]: [
          { status: 'completed' },
          literal(
            `CASE WHEN (step_progress->>'overall') ~ '^[0-9]+(\\.[0-9]+)?$' THEN (step_progress->>'overall')::numeric ELSE 0 END >= 100`
          ),
        ],
      })
    }
  }

  // 2. Stage filter (Blueprint Room vs Production Stage)
  if (params.stage === 'blueprint') {
    andClauses.push({
      [Op.or]: [
        { current_step: { [Op.in]: [...BLUEPRINT_RAW_STEPS] } },
        { current_step: { [Op.is]: null } },
      ],
    })
  } else if (params.stage === 'production') {
    andClauses.push({
      current_step: { [Op.notIn]: [...BLUEPRINT_RAW_STEPS] },
    })
  }

  // 3. Client Order / Action Triage filter
  if (params.clientAction === 'client_only') {
    andClauses.push(
      literal(
        `LOWER(COALESCE(metadata->'clientOrder'->>'isClientProject', 'false')) = 'true'`
      )
    )
  } else if (params.clientAction !== 'all') {
    const escapedAction = escapeSql(params.clientAction)
    andClauses.push(
      literal(
        `LOWER(COALESCE(metadata->'clientOrder'->>'isClientProject', 'false')) = 'true' AND metadata->'clientOrder'->>'actionState' = ${escapedAction}`
      )
    )
  }

  // 4. Client Locale filter
  if (params.locale !== 'all') {
    const escapedLocale = escapeSql(params.locale)
    andClauses.push(
      literal(`LOWER(COALESCE(metadata->'clientOrder'->>'locale', '')) = LOWER(${escapedLocale})`)
    )
  }

  // 5. Client Vertical filter
  if (params.vertical !== 'all') {
    const escapedVertical = escapeSql(params.vertical)
    andClauses.push(
      literal(`COALESCE(metadata->'clientOrder'->>'vertical', '') = ${escapedVertical}`)
    )
  }

  // 6. Assigned PM filter
  if (params.assignedPm === 'unassigned') {
    if (allAssignedProjectIds && allAssignedProjectIds.length > 0) {
      andClauses.push({ id: { [Op.notIn]: allAssignedProjectIds } })
    }
  } else if (params.assignedPm !== 'all') {
    if (assignedProjectIdsForPm && assignedProjectIdsForPm.length > 0) {
      andClauses.push({ id: { [Op.in]: assignedProjectIdsForPm } })
    } else {
      // Force empty result cleanly when a PM has 0 assigned projects
      andClauses.push(literal('1 = 0'))
    }
  }

  // 7. Full-text search across title, description, genre, and client order metadata
  if (params.q) {
    const escapedLike = escapeSql(`%${escapeLikePattern(params.q)}%`)
    andClauses.push({
      [Op.or]: [
        literal(`title ILIKE ${escapedLike} ESCAPE '\\'`),
        literal(`COALESCE(description, '') ILIKE ${escapedLike} ESCAPE '\\'`),
        literal(`COALESCE(genre, '') ILIKE ${escapedLike} ESCAPE '\\'`),
        literal(`COALESCE(metadata->>'genre', '') ILIKE ${escapedLike} ESCAPE '\\'`),
        literal(`COALESCE(metadata->'clientOrder'->>'customerName', '') ILIKE ${escapedLike} ESCAPE '\\'`),
        literal(`COALESCE(metadata->'clientOrder'->>'customerLabel', '') ILIKE ${escapedLike} ESCAPE '\\'`),
        literal(`COALESCE(metadata->'clientOrder'->>'customerEmail', '') ILIKE ${escapedLike} ESCAPE '\\'`),
        literal(`COALESCE(metadata->'clientOrder'->>'orderCode', '') ILIKE ${escapedLike} ESCAPE '\\'`),
      ],
    })
  }

  return andClauses.length === 1 ? andClauses[0] : { [Op.and]: andClauses }
}

/**
 * Builds the PostgreSQL ORDER BY specification for server-side sorting.
 */
export function buildProjectListOrder(sort: ProjectSortOption): Order {
  switch (sort) {
    case 'alphabetical':
      return [
        [literal('LOWER(title)'), 'ASC'],
        ['updated_at', 'DESC'],
      ]
    case 'created':
      return [['created_at', 'DESC']]
    case 'progress':
      return [
        [
          literal(
            `CASE WHEN (step_progress->>'overall') ~ '^[0-9]+(\\.[0-9]+)?$' THEN (step_progress->>'overall')::numeric WHEN status = 'completed' THEN 100 ELSE 0 END`
          ),
          'DESC',
        ],
        ['updated_at', 'DESC'],
      ]
    case 'recent':
    default:
      return [['updated_at', 'DESC']]
  }
}
