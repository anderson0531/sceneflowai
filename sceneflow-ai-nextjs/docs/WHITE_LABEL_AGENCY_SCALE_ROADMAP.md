# White-Label Agency Scale Roadmap

**Target Persona:** White-label video service providers (e.g., Operator Pro `$149/mo` and Agency Scale `$599/mo`) operating with **multiple Project Managers (PMs)**, multilingual global clients, and **100s–1,000s of active and archived projects**.

---

## Sprint 1 — Break the 50-Project Ceiling & Agency Search/Filter/Bulk Ops (**COMPLETE**)

### Problem Solved
- `GET /api/projects` previously clamped `pageSize` to `50` and `/dashboard/projects` loaded a single `?pageSize=50` slice while performing search, status, stage, and archive filtering in client memory—silently hiding project #51+ from search, triage badges, and counters.
- Owners had no way to filter projects by assigned PM, client locale, or vertical, nor to bulk-assign PMs or bulk-archive completed deliverables.

### Shipped Deliverables
1. **Pure Server-Side Query Builder** (`src/lib/projects/projectListQuery.ts`):
   - `parseProjectListParams`: supports `q`, `status`, `stage`, `clientAction`, `assignedPm` (`all | unassigned | <memberUserId>`), `locale`, `vertical`, `sort` (`recent | created | alphabetical | progress`), `page`, `pageSize` (`1..100`, default `24`), `summary`, and `includeFacets`.
   - `buildProjectListWhere`: safe PostgreSQL `ILIKE` search across `title`, `description`, `genre`, `metadata->>'genre'`, `customerName`, `customerLabel`, `customerEmail`, and `orderCode`; crash-proof JSONB boolean/numeric predicates; backwards-compatible default status handling for legacy dashboard callers (`useDashboardData`).
   - `buildProjectListOrder`: server-side sorting across all projects before pagination.
2. **Upgraded `GET /api/projects`** (`src/app/api/projects/route.ts`):
   - Full-dataset PostgreSQL `COUNT(*) FILTER (WHERE ...)` `facets` computed in parallel when `includeFacets=1`.
   - Batch-hydrates `assignedMembers` (`memberUserId`, `memberEmail`, `role`) onto each project card with zero N+1 queries.
   - Returns `total`, `page`, `pageSize`, `totalPages`, and `facets`.
3. **Bulk & Inline PM Action Endpoint** (`src/app/api/projects/bulk/route.ts`):
   - Authenticated `POST /api/projects/bulk` supporting `archive`, `unarchive`, `status`, and `assign_pm` (assign or unassign) on up to 100 projects per call.
   - Strict owner / active workspace `admin` RBAC enforcement via `WorkspaceMember` and `ProjectAssignment`.
4. **Upgraded `/dashboard/projects` UI** (`src/app/dashboard/projects/page.tsx`):
   - Debounced (250ms) server-side search across all projects regardless of page.
   - Agency filter strip: **PM Assignment** (with Unassigned count), **Locale** (`EN/ES/PT/HI/ZH/AR/TH/FR/DE`), and **Vertical** (`Family Memoir`, `Memorial Tribute`, `Wedding`, `Milestone`, `Business`).
   - Multi-select checkboxes + floating bulk action bar (`Assign PM`, `Mark Completed`, `Archive` / `Restore`) + inline per-card PM assignment selector.
   - Real server-side pagination (`24 / 48 / 100` per page, `Prev / Page X of Y / Next`).
5. **Unit Test Suite** (`src/__tests__/projectsScaleQuery.test.ts`):
   - Covers LIKE/SQL escaping, parameter clamping, legacy compatibility, PM/locale/vertical/search WHERE building, sorting, and API/UI scale contracts.

---

## Sprint 2 — Multi-PM Team Isolation, Series Delegation & Guardrails (**COMPLETE**)

### Shipped Deliverables
1. **Series-Level PM Delegation (`series_assignments` table)** (`src/models/SeriesAssignment.ts`, `src/lib/database/migrateProducerPlatform.ts`, `src/lib/producer/workspaceAccess.ts`, `src/lib/producer/workspaceProjectsQuery.ts`):
   - Assigning a PM or QA Reviewer to a Series automatically grants access to the Series Room Bible (`/api/series`, `/api/series/[seriesId]`) AND inherits access to every child episode project across `/api/projects`, Mobile Companion PWA, and stakeholder notifications.
2. **Signed `/invite/[token]` Onboarding + Branded Invite Emails** (`src/app/api/workspace/members/route.ts`, `src/app/api/workspace/invite/[token]/route.ts`, `src/app/invite/[token]/page.tsx`):
   - Generates single-use 14-day signed invite tokens (`invite_token`, `invite_expires_at`), dispatches branded email invites via Resend (`sendEmail`), and exposes 1-click **Copy Invite** & **Resend** actions in Producer Hub.
   - Public `/invite/[token]` acceptance screen guides new PMs through Sign Up / Sign In and binds their seat automatically.
3. **Workspace Switcher & Context Isolation** (`src/app/api/workspace/contexts/route.ts`, `src/lib/producer/activeWorkspaceClient.ts`, `src/components/layout/WorkspaceSwitcher.tsx`, `src/components/layout/GlobalHeader.tsx`):
   - Header **Workspace Switcher** (auto-hidden for solo creators) lets PMs switch between `All Workspaces`, `Personal Workspace`, and specific Agency Workspaces, isolating `/dashboard/projects` and `/dashboard/series` via `workspaceOwnerId`.
4. **Seat Caps, `qa_reviewer` Role & Delete Guardrails** (`src/lib/producer/teamGovernance.ts`, `src/app/api/projects/[id]/route.ts`, `src/app/api/series/[seriesId]/route.ts`):
   - Enforces canonical seat caps from `tierCatalog.ts` (`Creator/Filmmaker = 1`, `Operator Pro = 3`, `Agency Scale = 10`, `Enterprise = Unlimited`).
   - Adds `qa_reviewer` role (view/review/approve with `0` credit spend and no Series Bible edit access) and blocks `project_manager` / `qa_reviewer` from permanently deleting projects or series (`403`).
5. **Locale-Based PM Auto-Routing on `/intake`** (`src/models/ProducerProfile.ts`, `src/lib/producer/producerProfileService.ts`, `src/lib/intake/intakeService.ts`, `src/app/dashboard/settings/producer/page.tsx`):
   - Owners map locales (`Default Fallback`, `EN`, `ES`, `PT`, `FR`, `DE`, `HI`, `ZH`, `AR`, `TH`) to active PMs in Producer Hub; incoming client intakes automatically create a `ProjectAssignment` for the matching-language PM.
6. **Unit Test Suite** (`src/__tests__/teamGovernanceSprint2.test.ts`):
   - Covers role capabilities, delete/spend guardrails, tier seat caps, locale routing resolution, signed token expiry, and Sprint 2 architectural contracts.

---

## Sprint 3 — Agency Ops Pipeline, Client Directory & Storage Hygiene (**COMPLETE**)

### Shipped Deliverables
1. **Pure Agency Ops, SLA, CRM, Scorecard & Storage Engine** (`src/lib/producer/agencyOps.ts`):
   - `resolveKanbanStage` & `buildKanbanMovePatch`: 6-stage Kanban pipeline (`Intake -> Blueprint -> Storyboard -> Production -> Client Review -> Delivered`).
   - `evaluateProjectSla`: tracks `targetDeliveryDate`, `revisionCount`, overdue days, 48h due-soon warnings, and `> 48h waiting on client` stale alerts.
   - `buildClientDirectory`: groups repeat client orders by normalized email with gross margin (`revenue - credits * $0.010`), active/completed/overdue counts, and Screening Room links.
   - `buildPmScorecard`: computes per-PM workload (including series-inherited episodes), overdue & action-required counts, monthly credit utilization %, revenue/margin, and average turnaround days.
   - `collectPurgeableDraftMedia` & `estimateProjectStorage`: deterministic Continuity Vault accounting plus safe draft intermediate purger preserving active masters, Blueprint JSON, and Continuity Bible.
2. **Kanban View & SLA Inline Editing on `/dashboard/projects`** (`src/components/projects/ProjectsKanbanBoard.tsx`, `src/app/dashboard/projects/page.tsx`, `src/app/api/projects/bulk/route.ts`):
   - Added 3rd view toggle (`Grid | List | Kanban`) with inline target delivery date pickers, SLA aging badges, PM pills, and 1-click stage transitions (`kanban_move` & `set_sla` actions).
3. **Clients & Agency Operations Command Center (`/dashboard/clients`)** (`src/app/dashboard/clients/page.tsx`, `src/app/api/producer/ops/route.ts`):
   - Full-workspace Client CRM Directory, PM Workload & Margin Scorecard, and Storage Hygiene Vault Dashboard scoped live to the Header Workspace Switcher.
4. **1-Click Archive & Purge Draft Intermediates** (`src/app/api/projects/[id]/purge-drafts/route.ts`):
   - Owner/Admin RBAC-enforced endpoint that strips superseded candidate takes & old storyboard image versions, best-effort deletes unreferenced Vercel Blob files, optionally clears raw client staging uploads and archives the project, and stamps updated `storageBytes` & `storagePurgedAt`.
5. **Unit Test Suite** (`src/__tests__/agencyOpsSprint3.test.ts`):
   - Covers Kanban classification/transitions, SLA aging, Client CRM margin grouping, PM Scorecard (with series inheritance), storage accounting & draft purge safety, and Sprint 3 API/UI contracts.
