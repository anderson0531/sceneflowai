# Deployment Instructions

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
- **Production URL**: https://sceneflow.app
- **Admin Dashboard**: https://sceneflow.app/admin/dol

## Troubleshooting

If deployment fails:
1. Check build output in terminal
2. Check Vercel dashboard for deployment logs
3. Verify environment variables are set in Vercel project settings
4. Run `git status` to check repository state
