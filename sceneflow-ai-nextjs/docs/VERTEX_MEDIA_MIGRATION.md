# Vertex media migration (production)

Production image and video generation uses **Vertex AI** (`aiplatform.googleapis.com`) with service account auth. The temporary Google AI Studio path (`generativelanguage.googleapis.com` + `GEMINI_API_KEY`) is deprecated for media.

## Required environment

- `VERTEX_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` (or ADC)
- `VEO_LOCATION` / `VEO_REGIONS` for video
- `VERTEX_LOCATION` or `VERTEX_IMAGE_LOCATION` for images

## Image routing

All production image generation uses **Vertex AI** (Imagen 4 / Gemini image). Fal.ai-hosted Kling is deprecated and no longer routed.

| Use case | Implementation |
|----------|----------------|
| Reference / character lock | `generateVertexGeminiImage` in `src/lib/vertexai/vertexImageClient.ts` |
| Text-only (eco / standard) | Imagen 4 via `callVertexAIImagen` when `VERTEX_USE_IMAGEN_4` is not `false` |
| Legacy shim imports | `@/lib/gemini/geminiStudioImageClient` → Vertex only |

## Video routing

| Mode | Implementation |
|------|----------------|
| T2V / I2V / FTV / REF | `generateProductionVideo` → `videoClient.ts` (Vertex Veo 3.1) |
| EXT | `sourceVideo` on Vertex instance (prior `veoVideoRef` from completion) |

## Policy fallback

After up to `VEO_POLICY_MAX_ATTEMPTS` (default 3) Vertex policy failures on **video**, optional **direct Kling API** fallback may run when `KLING_*` credentials are set. Fal.ai (`FAL_KEY`) is deprecated and no longer used. See [`docs/KLING_POLICY_FALLBACK.md`](./KLING_POLICY_FALLBACK.md).

Image policy exhaustion returns a clear `ContentPolicyExhaustedError` — no Fal fallback.

## Verification

1. Scene with character refs: logs show `aiplatform.googleapis.com`, not `generativelanguage.googleapis.com`.
2. Continuous beat EXT completes on Vertex without `forceProvider: 'gemini'`.
3. Failed policy attempts do not charge segment video credits until blob upload succeeds.
