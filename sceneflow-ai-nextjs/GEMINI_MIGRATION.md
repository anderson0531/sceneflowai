# Media generation: Gemini Studio → Vertex AI (2026)

**Status:** Superseded — production media now uses **Vertex AI** again.

The December 2025 note below described a temporary move to Google AI Studio (`GEMINI_API_KEY` + `generativelanguage.googleapis.com`). That path is **deprecated** for production image and video.

## Current production stack

See **[docs/VERTEX_MEDIA_MIGRATION.md](./docs/VERTEX_MEDIA_MIGRATION.md)** for:

- Vertex Gemini Image + Imagen 4 for stills
- Vertex Veo 3.1 for video (including EXT)
- Optional Kling policy fallback: **[docs/KLING_POLICY_FALLBACK.md](./docs/KLING_POLICY_FALLBACK.md)**

## Historical note (December 2025 Studio migration)

The original Studio migration document is retained for context only. Do not configure new deployments with `GEMINI_API_KEY` as the primary media credential.

### Image Generation (historical)
- **Was (2025):** Gemini 3 Pro Image Preview via AI Studio
- **Now:** Vertex `vertexImageClient.ts` + `geminiStudioImageClient.ts` shim

### Authentication (historical)
- **Was:** `GEMINI_API_KEY`
- **Now:** `GOOGLE_APPLICATION_CREDENTIALS_JSON` + `VERTEX_PROJECT_ID`
