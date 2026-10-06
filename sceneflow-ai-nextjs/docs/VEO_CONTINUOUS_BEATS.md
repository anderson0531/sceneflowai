# Continuous beats (dialogue splits)

Spoken lines that exceed the **Omni Standard 10s** clip budget are split across multiple production segments. The full line is preserved: excerpts concatenate back to the original text. Dialogue is never shortened to fit one clip.

| Step | Method | Timeline |
|------|--------|----------|
| Part 0 | REF (labeled character / location / prop images) | Up to **10s** spoken |
| Parts 1…N | **EXT** when a prior Omni interaction ref exists, otherwise REF + `CONTINUE` | Next excerpt, same eyeline |

Example: ~18s speech → two ~9–10s excerpts on the same beat, first REF, rest CONTINUE/EXT.

## Requirements for EXT

- Omni Standard takes are **10s**
- Input must be a valid Omni `previous_interaction_id` from the prior part (`veoVideoRef`)
- References are valid for **~2 days**; then regenerate earlier parts in order
- If the prior interaction id is missing, the continuation still generates as REF with incoming-continuity prompt language (not a dropped shot)

## Code map

- **Text split:** `src/lib/scene/dialogueSegmentSplit.ts` — `planDialogueLineSplits`
- **Auto-split on derive:** `src/lib/scene/deriveSegmentsFromBeats.ts` — continuation rows get `generationMethod: 'EXT'`, `dialoguePortion`, `videoChain`, `transitionType: 'CONTINUE'`
- **Planner (optional chain math):** `src/lib/scene/veoExtensionChain.ts`
- **Shared generation:** `src/lib/video/generateSegmentVideo.ts`
- **Serial orchestrator:** `POST /api/scenes/[sceneId]/beats/[beatId]/generate-continuous`
- **Batch queue:** `src/hooks/useVideoQueue.ts` — concurrency 1 when a chain is in the batch; passes fresh `veoVideoRef` between parts

## User-facing errors

- **VEO_EXT_REF_REQUIRED** — extension part started without a prior `veoVideoRef`; generate the previous part first
- Queue toast — same guidance when batch hits a continuation without a ref

## Planning-only durations

`veoDuration.ts` may list 10s / 12s for quantized clip lengths. Omni Standard routing uses **10s** clips; split count follows spoken duration, not a fixed shot budget.
