# Multiplatform video generation (aggregator)

Optional **selectable primary** video provider that bypasses Google Veo content policy by routing through a single-API aggregator (Renderful primary, Pollo failover).

## Architecture

```
DirectorDialog (videoProvider=aggregator)
  → generate-asset API
  → generateSegmentVideoCore (skips Veo + preflight)
  → generateVideoWithAggregator
  → Renderful submit (+ poll sync, or webhook async)
  → Hive guard → GCS upload → segment asset
```

Vertex Veo remains the **default**. Existing Kling/Fal **opt-in fallback** path is unchanged.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VIDEO_AGGREGATOR_ENABLED` | on when key set | Master kill switch (`false` disables) |
| `VIDEO_AGGREGATOR_VENDOR` | `renderful` | Primary vendor |
| `VIDEO_AGGREGATOR_FAILOVER_VENDOR` | `pollo` | Failover on 5XX/429 |
| `VIDEO_AGGREGATOR_API_KEY` | — | Primary API key (Renderful) |
| `VIDEO_AGGREGATOR_FAILOVER_API_KEY` | — | Failover key (Pollo) |
| `VIDEO_AGGREGATOR_WEBHOOK_SECRET` | — | HMAC verify for webhooks |
| `VIDEO_AGGREGATOR_WEBHOOK_BASE_URL` | `VERCEL_URL` | Public base for webhook callback |
| `VIDEO_AGGREGATOR_ASYNC` | `false` | When `true`, submit-only + webhook completion |
| `VIDEO_AGGREGATOR_DEFAULT_MODEL` | `kling-2.6` | Default model id |
| `VIDEO_AGGREGATOR_POLL_TIMEOUT_SEC` | `280` | Sync poll budget (within 300s Vercel limit) |

## Models (UI catalog)

Defined in `src/lib/aggregator/modelRegistry.ts`: Kling 2.6/3.0, Seedance 2.0, Runway Gen-4, Wan 2.6.

## Webhook (async / scale)

- `POST /api/webhooks/video-aggregator` — Renderful completion callback
- `GET /api/aggregators/jobs/[jobId]` — poll job status (auth required)
- Job records stored in GCS (`aggregator-jobs/` prefix) + in-memory fallback

Modeled on the existing headless render callback pattern (`/api/render/headless/callback`).

## Storage

- **Vertex/Kling/Fal** output → Vercel Blob (unchanged)
- **Aggregator** output → **GCS** via `uploadVideo()` (`gcsAssets.ts`) for CDN delivery

## Credits

Charged on successful aggregator generation via `getAggregatorCreditsForModel()` (per-model $/s → credits).

## UI

DirectorDialog → **Advanced — API Prompt** → **Video provider** + **Model** (visible when `VIDEO_AGGREGATOR_API_KEY` is set).

When Multiplatform is selected, Veo backup-engine checkbox is hidden.

## Failover

`dispatch.ts` retries on primary vendor HTTP 429/5XX with failover vendor (Pollo poll path).

## Tests

- `aggregatorAdapter.test.ts`
- `aggregatorRouteSelection.test.ts`
- `aggregatorWebhook.test.ts`
