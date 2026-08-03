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

Node does **not** size its V8 heap from the Vercel function `memory` setting: a function with
`memory: 3009` still gets the default old-space cap (~1.8–1.9 GB), which is where
`/api/treatment/guided-revise` OOMed (`FATAL ERROR: Ineffective mark-compacts near heap limit`).

Set a project Environment Variable in the Vercel dashboard (all environments), or rely on
`vercel.json` `env.NODE_OPTIONS` in this repo:

```bash
NODE_OPTIONS=--max-old-space-size=2560
```

- 2560 MB keeps ~15% headroom under the 3009 MB configured for the heaviest functions.
- Caveat: functions still on the 2048 MB default that actually exceed physical RAM will be
  killed by the kernel (exit 137) instead of throwing a JS OOM — the user-visible result is
  the same 500, so this trade-off is acceptable.
- `guided-revise` also logs `[Guided Revise][mem]` heap checkpoints (request start, body size,
  around each LLM call, before response) plus the build commit SHA at module init — use these
  to pinpoint where memory jumps if an OOM recurs.

## Verification

1. Scene with character refs: logs show `aiplatform.googleapis.com`, not `generativelanguage.googleapis.com`.
2. Continuous beat EXT completes on Vertex without `forceProvider: 'gemini'`.
3. Failed policy attempts do not charge segment video credits until blob upload succeeds.
4. `GET /api/diagnostic/vertexai` returns ok using `gemini-2.5-flash-image`.
