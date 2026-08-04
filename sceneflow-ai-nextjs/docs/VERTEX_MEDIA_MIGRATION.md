# Vertex media migration (production)

Production image and video generation uses **Vertex AI** (`aiplatform.googleapis.com`) with service account auth. The temporary Google AI Studio path (`generativelanguage.googleapis.com` + `GEMINI_API_KEY`) is deprecated for media.

## Required environment

- `VERTEX_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` (or ADC)
- `VEO_LOCATION` / `VEO_REGIONS` for video
- `VERTEX_LOCATION` or `VERTEX_IMAGE_LOCATION` for images

## Image routing

All production image generation uses **Gemini Image on Vertex** (`generateContent`). Fal.ai-hosted Kling is deprecated and no longer routed. **All Imagen `:predict` endpoints were retired by Google on 2026-06-30** and return 404 — `callVertexAIImagen` now throws `ImagenRetiredError`.

| Use case | Implementation |
|----------|----------------|
| Reference / character lock | `generateVertexGeminiImage` in `src/lib/vertexai/vertexImageClient.ts` (`gemini-3-pro-image-preview`, falls back to `gemini-2.5-flash-image`) |
| Text-only (eco tier) | `generateVertexGeminiImage` with `gemini-2.5-flash-image` (GA) |
| Legacy shim imports | `@/lib/gemini/imageClient` / `@/lib/gemini/geminiStudioImageClient` → Gemini Image only |

## Video routing

| Mode | Implementation |
|------|----------------|
| T2V / I2V / FTV / REF | `generateProductionVideo` → `videoClient.ts` (Vertex Veo 3.1) |
| EXT | `sourceVideo` on Vertex instance (prior `veoVideoRef` from completion) |

## Policy fallback

After up to `VEO_POLICY_MAX_ATTEMPTS` (default 3) Vertex policy failures on **video**, optional **direct Kling API** fallback may run when `KLING_*` credentials are set. Fal.ai (`FAL_KEY`) is deprecated and no longer used. See [`docs/KLING_POLICY_FALLBACK.md`](./KLING_POLICY_FALLBACK.md).

Image policy exhaustion returns a clear `ContentPolicyExhaustedError` — no Fal fallback.

## Node heap sizing on Vercel (OOM prevention)

Node does **not** size its V8 heap from the Vercel function `memory` setting. Even with
`memory: 3009`, Vercel may cap the V8 heap at ~**2036 MB** (logs show `v8HeapLimit=2036MB`
with `NODE_OPTIONS=set`). Warm Fluid Compute instances can accumulate heap from other routes
and OOM mid-request even when the current request's `heapUsed` is ~30 MB.

Set a project Environment Variable (or `vercel.json` `env.NODE_OPTIONS`):

```bash
NODE_OPTIONS=--max-old-space-size=2560
```

Do **not** rely on raising the heap further — the platform cap is the hard limit.

### Blueprint guided-revise routing (OOM fix)

| Edit scope | Route | Execution |
|------------|-------|-----------|
| Single section (Story, Beats, …) | `POST /api/treatment/refine` | Sync, one LLM call, `{ draft }` only |
| Full blueprint balance | `POST /api/treatment/guided-revise/start` | Inngest job `blueprint_guided_revise`; one durable step per section |
| Legacy | `POST /api/treatment/guided-revise` | **410 Gone** — use refine or start |

Full-balance jobs return `{ patch, diff, changePlan }` in `generation_jobs.result` (not the
full variant). The client merges the patch locally. Core logic lives in
`src/lib/treatment/runGuidedRevise.ts`.

Module init for the start route logs `v8HeapLimit` and the full `NODE_OPTIONS` string.

## Verification

1. Scene with character refs: logs show `aiplatform.googleapis.com`, not `generativelanguage.googleapis.com`.
2. Continuous beat EXT completes on Vertex without `forceProvider: 'gemini'`.
3. Failed policy attempts do not charge segment video credits until blob upload succeeds.
4. `GET /api/diagnostic/vertexai` returns ok using `gemini-2.5-flash-image`.
