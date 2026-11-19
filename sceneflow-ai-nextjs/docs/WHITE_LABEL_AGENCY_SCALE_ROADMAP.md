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

## Sprint 2 — Multi-PM Team Isolation, Series Delegation & Guardrails (**NEXT — P0**)

1. **Series-Level PM Assignments (`series_assignments` table)**:
   - Allow assigning a PM to an entire Series (e.g., a 6-episode Retiree Life-Series) so the PM automatically inherits access to the Series Room Bible (`referenceLibrary`, character portraits, locations) and all child episode projects.
2. **Real Invite Flow + Workspace Switcher**:
   - Send signed email invite links (`/invite/[token]`) when adding a PM in Team settings; auto-link `member_user_id` upon signup/login.
   - Add a header **Workspace Switcher** (`Personal Workspace` vs `Agency: LifeFocus Stories`) so PMs working across workspaces never mix credits or projects.
3. **Seat Caps & Role Guardrails**:
   - Enforce plan seat caps from `tierCatalog.ts` (`Operator Pro = 3 seats`, `Agency Scale = 10 seats`, `Enterprise = custom`).
   - Add `qa_reviewer` role (view/comment/approve without spending video generation credits) and `canDeleteProjects: false` guardrail for `project_manager` roles.
4. **Locale-Based Auto-Routing on `/intake`**:
   - Allow owners to map a default PM per language locale (e.g., `es -> PM Maria`, `pt -> PM Lucas`) so incoming multilingual client intakes auto-create a `ProjectAssignment`.

---

## Sprint 3 — Agency Ops Pipeline, Client Directory & Storage Hygiene (**P1**)

1. **Kanban Production Pipeline & SLA Tracking**:
   - Toggle between Grid / List / Kanban columns (`Intake -> Blueprint -> Storyboard -> Production -> Client Review -> Delivered`) on `/dashboard/projects`.
   - Persist `targetDeliveryDate` and `revisionCount` on `metadata.clientOrder`, surfacing overdue and `> 48h waiting on client` SLA badges.
2. **Client CRM Directory (`/dashboard/clients`)**:
   - Group multi-project repeat clients by `customerEmail` / `clientId` showing active projects, completed vault links, total credits spent, and language locale.
3. **Owner PM Workload & Margin Scorecard**:
   - Per-PM active project count, overdue count, monthly credit burn vs `monthly_credit_limit`, and average turnaround time (Intake → Approved).
4. **Per-Project Storage Accounting & 1-Click Purge**:
   - Track `storageBytes` per project against plan storage limits (`150 GB` Pro / `750 GB` Agency Scale) and provide a 1-click **"Archive & Purge Draft Intermediates"** action that keeps final masters + Blueprint JSON while reclaiming unused candidate clips.
