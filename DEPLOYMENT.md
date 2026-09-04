# Deployment — sceneflowai monorepo

Production at **https://sceneflowai.studio** deploys through **Vercel’s GitHub integration**: push to `main` on `anderson0531/sceneflowai` and Vercel builds automatically.

## Vercel project settings (required)

In **Vercel → Project → Settings → General → Root Directory**, set:

```text
sceneflow-ai-nextjs
```

That makes Vercel use:

- `sceneflow-ai-nextjs/package.json` (Node **22.x**, Next.js **16**)
- `sceneflow-ai-nextjs/vercel.json` (function timeouts, crons, regions)

The repo-root `vercel.json` is a **fallback** only if Root Directory is left empty (monorepo install/build from root). Prefer the Root Directory setting above so crons and API timeouts stay in effect.

## Deploy command

From the **repository root**:

```bash
bash scripts/deploy-production.sh "Short description of changes"
```

This script:

1. Builds `sceneflow-ai-nextjs` (`npm run build`)
2. Runs unit tests (`npm run test`)
3. Commits any pending changes (if provided a message or auto-timestamp)
4. Pushes to `origin/main` → **Vercel production deploy**

Legacy app-level script (same Git push, runs from app folder):

```bash
bash sceneflow-ai-nextjs/deploy-dol-production.sh "Your message"
```

## Environment variables

Vercel **Production** must include at least:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres (required at build time for some API routes) |
| `NEXTAUTH_SECRET` / auth vars | Login sessions |
| `BLOB_READ_WRITE_TOKEN` | Waitlist and private blob storage (optional; graceful fallback) |

Builds fail locally without `DATABASE_URL`; Vercel Production already has it configured.

## Node version

- `.nvmrc` at repo root and in `sceneflow-ai-nextjs/` → **22**
- Root and app `package.json` → `"engines": { "node": "22.x" }`

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| “No Next.js version detected” on Vercel | Set Root Directory to `sceneflow-ai-nextjs`, or ensure root `package.json` has `next` and `build` script |
| Build succeeds locally but not on Vercel | Match Node 22; confirm env vars in Vercel Production |
| Push works but site unchanged | Confirm Vercel project is linked to `anderson0531/sceneflowai` and production branch is `main` |
| Cloud Agent cannot push | Run `bash scripts/deploy-production.sh` from your machine (GitHub credentials required) |

## Monitoring

- Vercel: https://vercel.com/anderson0531-3626s-projects/sceneflow-ai-nextjs  
- Production: https://sceneflowai.studio  
- Health: https://sceneflowai.studio/api/health  
