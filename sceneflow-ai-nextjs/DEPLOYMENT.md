# Deployment Instructions

**Merge to `main` is the production release.** Do not use Vercel Promote Preview → Production. See the repo-root `DEPLOYMENT.md` and `AGENTS.md`.

## Standard Deployment Process

**ALWAYS use this command for deployments:**

```bash
bash deploy-dol-production.sh "Your commit message here"
```

Or with auto-generated timestamp:

```bash
bash deploy-dol-production.sh
```

## What This Script Does

1. ✅ Validates you're in the correct directory
2. ✅ Checks environment configuration
3. ✅ Builds the application (`npm run build`)
4. ✅ Runs database migrations (`npm run db:migrate`)
5. ✅ Runs tests (`npm run test:dol`)
6. ✅ Commits all changes to Git
7. ✅ Pushes to GitHub (triggers Vercel auto-deployment)
8. ✅ Waits for deployment
9. ✅ Runs health check

## For AI Assistant

When the user says **"deploy"**, **"deploy now"**, or **"deploy to production"**:

**RUN THIS COMMAND:**
```bash
cd /Users/briananderson/SceneFlowAI/sceneflow-ai-nextjs/sceneflow-ai-nextjs && bash deploy-dol-production.sh "Description of changes"
```

**DO NOT:**
- Try to run `npm run deploy:dol` (doesn't exist)
- Try to run `npx vercel --prod` directly (has path issues)
- Manually commit and push (the script handles this)

## Monitoring

After deployment, monitor at:
- **Vercel Dashboard**: https://vercel.com/anderson0531-3626s-projects/sceneflow-ai-nextjs
- **Production URL**: https://sceneflowai.studio
- **Admin Dashboard**: https://sceneflowai.studio/admin/dol

## Background jobs (Inngest + HTTP fallback)

Production Studio Audience Resonance (`script_analysis`) and full-blueprint
guided-revise prefer **Inngest**. Set these on the Vercel Production environment
(or connect the Inngest Vercel integration), then redeploy:

| Variable | Purpose |
|----------|---------|
| `INNGEST_EVENT_KEY` | Send `generation/job.queued` events |
| `INNGEST_SIGNING_KEY` | Verify `/api/inngest` serve callbacks |
| `INTERNAL_JOB_SECRET` | Auth for HTTP step workers when Inngest is missing |
| `NEXT_PUBLIC_APP_URL` | Absolute app URL so step `fetch` targets production |

Confirm Inngest syncs functions from `src/app/api/inngest/route.ts` (includes
`processScriptAnalysis`). Without `INNGEST_EVENT_KEY`, start routes still queue
work via internal step workers (`/api/internal/jobs/script-analysis/step` and
`/api/internal/jobs/blueprint-guided-revise/step`).

## Troubleshooting

If deployment fails:
1. Check build output in terminal
2. Check Vercel dashboard for deployment logs
3. Verify environment variables are set in Vercel project settings
4. Run `git status` to check repository state
