# Vertex media migration (production)

Production image and video generation uses **Vertex AI** (`aiplatform.googleapis.com`) with service account auth. The temporary Google AI Studio path (`generativelanguage.googleapis.com` + `GEMINI_API_KEY`) is deprecated for media.

## Required environment

- `VERTEX_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` (or ADC)
- `VEO_LOCATION` / `VEO_REGIONS` for video
- `VERTEX_LOCATION` or `VERTEX_IMAGE_LOCATION` for images

## Image routing

| Use case | Implementation |
|----------|----------------|
| Reference / character lock | `generateVertexGeminiImage` in `src/lib/vertexai/vertexImageClient.ts` |
| Text-only (eco / standard) | Imagen 4 via `callVertexAIImagen` when `VERTEX_USE_IMAGEN_4` is not `false` |
| Legacy shim imports | `@/lib/gemini/geminiStudioImageClient` → Vertex + Kling policy fallback |

## Video routing

| Mode | Implementation |
|------|----------------|
| T2V / I2V / FTV / REF | `generateProductionVideo` → `videoClient.ts` (Vertex Veo 3.1) |
| EXT | `sourceVideo` on Vertex instance (prior `veoVideoRef` from completion) |

## Policy fallback

After up to `VEO_POLICY_MAX_ATTEMPTS` (default 3) Vertex policy failures, platform **Kling** may run when `KLING_API_KEY` or `KLING_ACCESS_KEY` + `KLING_SECRET_KEY` is set. See `docs/KLING_POLICY_FALLBACK.md`.

## Verification

1. Scene with character refs: logs show `aiplatform.googleapis.com`, not `generativelanguage.googleapis.com`.
2. Continuous beat EXT completes on Vertex without `forceProvider: 'gemini'`.
3. Failed policy attempts do not charge segment video credits until blob upload succeeds.
