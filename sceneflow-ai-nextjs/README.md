# SceneFlow Hosted Export Pipeline

SceneFlow now renders videos through a managed Google Cloud pipeline. The Electron desktop renderer has been archived—exports are queued from the web app and processed on Cloud Run, ensuring consistent performance without client-side dependencies.

## Architecture Overview

- **Next.js API (`/api/export/*`)** – Accepts export requests, issues signed upload URLs, tracks job state in Postgres, and publishes Pub/Sub messages.
- **Postgres (`export_jobs` table)** – Persists job metadata, status, progress, and output locations.
- **Pub/Sub (`export-jobs`)** – Dispatches work to the export worker.
- **Cloud Run worker (`cloud/export-worker`)** – Receives Pub/Sub push events, prepares FFmpeg workloads, writes results to GCS, and updates job status via authenticated callbacks.
- **Google Cloud Storage** – Two buckets separate raw inputs (`EXPORT_INPUT_BUCKET`) from rendered outputs (`EXPORT_OUTPUT_BUCKET`).

BYOK remains scoped to upstream model usage (OpenAI, ElevenLabs, etc.). SceneFlow covers compute for exports so teams can stay focused on storytelling.

## Environment Variables

Update your `.env.local` (or Vercel project settings) with the following hosted-export settings:

```
GOOGLE_APPLICATION_CREDENTIALS_JSON="{...service account json...}"
EXPORT_INPUT_BUCKET=sceneflow-exports-raw
EXPORT_OUTPUT_BUCKET=sceneflow-exports-output
EXPORT_JOBS_TOPIC=sceneflow-export-jobs
EXPORT_WORKER_TOKEN=generate-a-long-random-token
EXPORT_API_BASE=https://your-sceneflow-domain.vercel.app
```

See `env.example` for the complete list, including database and provider credentials.

## Local Development

1. **Database** – `npm run db:setup` (or `npm run db:migrate`) to sync the schema. The new `export_jobs` table is created automatically via Sequelize `sync({ alter: true })`.
2. **Credentials** – Create a GCP service account with Storage Admin + Pub/Sub Publisher roles. Save its JSON to `.env.local` via `GOOGLE_APPLICATION_CREDENTIALS_JSON`.
3. **Buckets & Topics** – Provision `EXPORT_INPUT_BUCKET`, `EXPORT_OUTPUT_BUCKET`, and `EXPORT_JOBS_TOPIC`. Local development can target a staging project.
4. **Next.js** – `npm run dev` starts the app. Export actions will queue jobs and expose status in the Vision workspace UI.
5. **Worker** – The placeholder worker lives in `cloud/export-worker`. For end-to-end testing you can run it locally with the same env vars and a Pub/Sub emulator.

## Export Flow

1. Authors click **Render Video** in the Script panel.
2. The frontend posts to `/api/export/start`, storing a job row and publishing to Pub/Sub.
3. The worker marks the job as `running`, renders via FFmpeg (placeholder implementation uploads the payload JSON), writes the output path to GCS, and calls `/api/export/jobs/:id/complete`.
4. The UI polls `/api/export/status?jobId=...` until the job resolves, then surfaces a download link.

## Worker Service

`cloud/export-worker` is a standalone TypeScript project designed for Cloud Run:

```bash
cd cloud/export-worker
npm install
npm run build
PORT=8080 EXPORT_API_BASE=http://localhost:3000 \
EXPORT_WORKER_TOKEN=dev-token \ 
EXPORT_OUTPUT_BUCKET=sceneflow-exports-output \ 
GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat service-account.json)" \ 
node dist/index.js
```

Deploy the container to Cloud Run with a Pub/Sub push subscription targeting `/`. Ensure the `EXPORT_WORKER_TOKEN` matches the value configured in Vercel so worker callbacks are authorized.

## Observability & Follow-up

- Capture Cloud Logging metrics (success/failure counts, duration) from the worker container.
- Add Prometheus or Cloud Monitoring alerts for Pub/Sub dead-letter messages and job failures.
- Future work: replace the placeholder JSON output with the full FFmpeg rendering pipeline from the archived Electron codebase.
