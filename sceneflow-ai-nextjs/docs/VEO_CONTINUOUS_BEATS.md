# Veo 3.1 continuous beats (extension chains)

Long spoken dialogue is **not** one 16s or 30s MP4 from a single Veo call. SceneFlow models and generates **chains** of short clips:

| Step | API | Timeline added |
|------|-----|----------------|
| Part 0 | I2V or FTV (4, 6, or 8s initial) | Up to **8s** |
| Parts 1…N | **EXT** (Gemini API only) | **+7s** each |

Example: ~15s speech → 8s initial + 1× EXT ≈ 15s combined on the last EXT output. ~30s → 8s + 3× EXT ≈ 29s.

## Requirements for EXT

- `durationSeconds: 8` and **720p** on every extension request
- Input must be a **Veo-generated** `files/...` reference (`veoVideoRef` on the prior take)
- References are valid for **~2 days**; then regenerate earlier parts in order
- **Vertex AI does not support** native video extension — EXT forces the **Gemini API** provider

## Code map

- **Planner:** `src/lib/scene/veoExtensionChain.ts` — `planVeoExtensionChain`, `planContinuousDialogueBeat`
- **Auto-split on derive:** `src/lib/scene/deriveSegmentsFromBeats.ts` — continuation rows get `generationMethod: 'EXT'`, `videoChain` metadata
- **Shared generation:** `src/lib/video/generateSegmentVideo.ts`
- **Serial orchestrator:** `POST /api/scenes/[sceneId]/beats/[beatId]/generate-continuous`
- **Batch queue:** `src/hooks/useVideoQueue.ts` — concurrency 1 when a chain is in the batch; passes fresh `veoVideoRef` between parts

## User-facing errors

- **VEO_EXT_REF_REQUIRED** — extension part started without a prior `veoVideoRef`; generate the previous part first
- Queue toast — same guidance when batch hits a continuation without a ref

## Planning-only durations

`veoDuration.ts` may list 10s / 12s for legacy multi-clip splits. The **extension-first** path uses **8 + 7n** only.
