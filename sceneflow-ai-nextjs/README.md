# Export Studio – FFmpeg Pipeline Overview

The Creatomate workflow has been superseded by a local FFmpeg-based export pipeline that runs inside the Electron desktop renderer. This document summarizes how the new system is structured and how to operate it.

## 1. Feature Overview

* **Segmented video rendering:** Scenes are rendered in parallel-friendly `.ts` chunks (pass 1) and concatenated into a silent master (pass 2).
* **Audio assembly:** Narration, dialogue, SFX, and music stems are generated with proper offsets and optional looping (pass 3), then ducked/normalized into a final mix (pass 4).
* **Final mux:** Silent master and final mix are stream-copied into the finished MP4 along with duration QA metadata (pass 5).
* **Progress engine:** Each pass emits weighted progress + ETA so the UI can surface end-to-end status updates.
* **Metadata & publishing stubs:** Titles/descriptions persist per project and can be pushed through placeholder YouTube/TikTok hooks (disabled by default).

## 2. Prerequisites

1. **Desktop renderer:** Run the Electron app (`npm run electron:dev`) from the project root. The renderer must be active while the Next.js frontend is in use.
2. **Environment flags:**
   * `EXPORT_STUDIO_ENABLED=true` (Electron) – required. When false, export requests return an error.
   * `NEXT_PUBLIC_EXPORT_STUDIO_ENABLED=true` (Next.js) – required for the UI to show Export Studio actions.
   * `EXPORT_ENABLE_PUBLISH=true` (Electron) – enables stubbed YouTube/TikTok handlers.
   * `NEXT_PUBLIC_EXPORT_PUBLISH_ENABLED=true` (Next.js) – shows publish buttons in the UI.
   * `NEXT_PUBLIC_EXPORT_HWACCEL_DEFAULT=true` (optional) – pre-checks the hardware acceleration toggle in the dialog.
   * `NEXT_PUBLIC_EXPORT_FEEDBACK_URL=https://example.com/form` (optional) – enables the in-app “Share Feedback” button after export completes.
3. **FFmpeg binaries:** Automatically installed via `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg/@ffprobe-installer/ffprobe`. Ensure they remain unpacked in distribution builds (handled by `asarUnpack`).

## 3. Using Export Studio

1. Open the Script screen and click **Export Studio**.
2. Adjust per-track volumes, choose a preset, and optionally enable hardware acceleration.
3. Provide metadata (title/description) – drafts persist per project in `localStorage`.
4. Start the export. The progress header shows:
   * Current pipeline phase.
   * Aggregated progress percentage.
   * ETA (calculated from elapsed time and pass weights).
5. When complete, the preview pane auto-loads the MP4 and the footer presents download/copy actions. Duration QA + performance metrics appear in the status panel.
6. (Optional) Trigger stubbed uploads. Buttons remain disabled unless both publish flags are enabled; responses are logged and surfaced via toast notifications.

## 4. Error Handling & QA

* Failures are reported with stage identifiers (`pass1-scenes`, `pass4-mix`, etc.), allowing the UI to highlight the offending phase.
* Workspace paths are logged for inspection; on failure the workspace is preserved when `keepOnFailure=true` (default).
* Duration QA compares expected scene runtime with rendered clips, concatenated video, and each audio stem. Warnings appear in the status panel if tolerance (0.25 s) is exceeded.

## 5. Hardware Acceleration Notes

* The hardware toggle adds `-hwaccel auto` during scene rendering. On systems without GPU support FFmpeg transparently falls back to CPU.
* Because GPU availability varies, the toggle defaults to off unless `NEXT_PUBLIC_EXPORT_HWACCEL_DEFAULT=true`. Users can override per export.

## 6. Project Structure Cheatsheet

| Area | Files |
| --- | --- |
| Pipeline passes | `electron/pipeline/pass1Scenes.js` … `pass5Mux.js` |
| QA utilities | `electron/pipeline/qa/durationCheck.js` |
| Performance reporting | `electron/pipeline/index.js` (stage timings) |
| IPC schemas | `electron/ipc/exportChannels.js` |
| Renderer bridge | `electron/preload.js`, `src/types/export-api.d.ts` |
| Export dialog UI | `src/components/vision/ExportStudioDialog.tsx` |

## 7. Future Work

* **feature-flag:** Gate Export Studio behind a runtime toggle so legacy Creatomate path remains available.
* **analytics:** Capture telemetry around export success/latency.
* **feedback-loop:** Collect beta feedback to refine presets and polish the publish stubs.

Refer to `fix-script-ai-issues.plan.md` for the full migration roadmap and remaining tasks.
