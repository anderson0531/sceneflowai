# SceneFlow Export Worker

Cloud Run service that processes export jobs from Pub/Sub.

## Environment variables

- `GOOGLE_APPLICATION_CREDENTIALS_JSON` – Service account JSON with access to Pub/Sub and GCS buckets.
- `EXPORT_JOBS_TOPIC` – Name of the Pub/Sub topic publishing export jobs (used by Next.js backend). This must push to the worker URL.
- `EXPORT_OUTPUT_BUCKET` – GCS bucket where rendered outputs are stored.
- `EXPORT_API_BASE` – Base URL to the SceneFlow web app (e.g. `https://sceneflow-ai-nextjs.vercel.app`).
- `EXPORT_WORKER_TOKEN` – Shared secret used to authenticate when calling SceneFlow APIs.

## Pub/Sub push subscription payload

The worker expects messages with the following JSON payload (encoded as base64 in the Pub/Sub message data):

```json
{
  "jobId": "uuid",
  "projectId": "uuid",
  "userId": "uuid",
  "payload": { ... },
  "metadata": { ... }
}
```

## Build & Run locally

```bash
npm install
npm run build
EXPORT_API_BASE=http://localhost:3000 \
EXPORT_WORKER_TOKEN=dev-token \
EXPORT_OUTPUT_BUCKET=exports-output \
GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat service-account.json)" \
node dist/index.js
```

Use a Pub/Sub emulator or send HTTP POST with the Pub/Sub push format to test.
