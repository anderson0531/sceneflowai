# SceneFlow Hosted Export QA Plan

This playbook covers quality checks for the reconstituted cloud rendering pipeline. Desktop installers are archived; exports route through GCP again.

## 1. Automated Verification

| Stage | Command | Purpose |
|-------|---------|---------|
| Lint | `npm run lint` | Ensure frontend/API changes stay conformant |
| Type check | `npx tsc --noEmit` | Validate new models/services |
| Unit smoke | `npm run test -- export` (todo) | Placeholder for worker unit tests |

**CI Integration**

1. Add worker build (`npm run --prefix cloud/export-worker build`) to CI.
2. Ensure Docker image builds before deploying to Cloud Run.
3. Gate merges on lint + typecheck + worker build passing.

## 2. Manual QA Matrix

| Surface | Scenario | Expected Outcome |
|---------|----------|------------------|
| Vision UI | Click **Render Video** with valid scenes | Job queued, toast confirms submission |
| Status poll | Refresh status modal | Progress badge updates while job runs |
| Completion | Job finishes | Download link opens signed URL from GCS |
| Failure path | Force worker failure (invalid FFmpeg binary) | UI displays failure toast + retains job log |
| BYOK messaging | View pricing banner | Messaging clarifies SceneFlow covers export compute |

### Worker Validation

- Run worker locally with Pub/Sub emulator; publish sample payload and confirm placeholder output uploads to the output bucket.
- Verify callbacks require `x-export-worker-token`.
- Confirm signed URLs expire after configured TTL.

## 3. Staged Rollout Strategy

1. **Dev/Staging**
   - Deploy worker to staging Cloud Run project.
   - Point `/api/export/*` env vars at staging buckets/topics.
   - Run multiple renders (happy path + failure) and inspect logs.

2. **Production Shadow**
   - Deploy worker to production project.
   - Enable feature flag for internal users; compare latency with archived desktop flow.

3. **Full Release**
   - Remove desktop download CTA entirely.
   - Update onboarding docs to describe hosted exports.
   - Monitor job failure rate and Pub/Sub backlog for 48 hours.

Rollback: Redirect `/api/export/start` to respond `503` and disable UI button if worker health checks fail. Jobs remain in `queued` status for later replay.

## 4. Exit Criteria Checklist

- [ ] All env vars configured in Vercel + Cloud Run secrets.
- [ ] Worker image deployed with successful end-to-end render in production.
- [ ] QA matrix executed on staging with zero Sev 1/2 issues.
- [ ] Observability dashboard tracks job counts, durations, and failures.
- [ ] README + customer docs updated.

## 5. Contacts

| Area | Owner | Channel |
|------|-------|---------|
| Cloud exports | @cloud-platform | `#sceneflow-cloud` |
| Frontend UX | @web-experience | `#web-ui` |
| Incident response | @support-leads | PagerDuty `sceneflow-hosted-export` |

