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
4. **Desktop builds:** Generate installers from the host OS—`npm run electron:build:mac` (macOS arm64/x64 DMG + ZIP) and `npm run electron:build:win` (Windows x64 NSIS; requires Windows or macOS with Wine/Mono). Artifacts land in `dist/desktop/`.

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

## 4. Screening Room Screen Capture (Browser)

The in-app MP4 download now runs entirely client-side using the browser’s `MediaRecorder` API:

1. Open **Screening Room** and use the new **Record** control in the header (or the menu on mobile). Grant the "Share your tab/window" permission when prompted.
2. While recording, the button turns red and displays a running timer. Press **Stop** to finalize the capture; a toast confirms when the blob is ready.
3. Use **Save** to download the WebM (Chrome/Edge) or MP4 (Safari when supported) file, or **Discard** to reset.
4. The recorder auto-stops if playback reaches the end of the script or if the dialog is closed. If recording isn’t supported, an inline warning explains the Chrome/Edge/Firefox requirement.

> Tip: ask users to share the **Screening Room tab with audio** to capture both narration/dialogue and visuals.

## 5. Error Handling & QA

* Failures are reported with stage identifiers (`pass1-scenes`, `pass4-mix`, etc.), allowing the UI to highlight the offending phase.
* Workspace paths are logged for inspection; on failure the workspace is preserved when `keepOnFailure=true` (default).
* Duration QA compares expected scene runtime with rendered clips, concatenated video, and each audio stem. Warnings appear in the status panel if tolerance (0.25 s) is exceeded.

## 6. Hardware Acceleration Notes

* The hardware toggle adds `-hwaccel auto` during scene rendering. On systems without GPU support FFmpeg transparently falls back to CPU.
* Because GPU availability varies, the toggle defaults to off unless `NEXT_PUBLIC_EXPORT_HWACCEL_DEFAULT=true`. Users can override per export.

## 7. Project Structure Cheatsheet

| Area | Files |
| --- | --- |
| Pipeline passes | `electron/pipeline/pass1Scenes.js` … `pass5Mux.js` |
| QA utilities | `electron/pipeline/qa/durationCheck.js` |
| Performance reporting | `electron/pipeline/index.js` (stage timings) |
| IPC schemas | `electron/ipc/exportChannels.js` |
| Renderer bridge | `electron/preload.js`, `src/types/export-api.d.ts` |
| Export dialog UI | `src/components/vision/ExportStudioDialog.tsx` |

## 8. Desktop Installer Workflow

1. **Build the web app (optional but recommended):** `npm run build`
2. **Generate installers:**
   * macOS (run on macOS) – `npm run electron:build:mac` produces a signed DMG + ZIP in `dist/desktop/`.
   * Windows (run on Windows or macOS with Wine/Mono) – `npm run electron:build:win` produces an NSIS `.exe`.
   * Both platforms (from their respective hosts) – `npm run electron:build:all`.
3. **Upload to Vercel Blob:** set `VERCEL_BLOB_RW_TOKEN` (or `BLOB_READ_WRITE_TOKEN`) in your shell, then execute `npm run electron:upload`. The script publishes every installer in `dist/desktop/` and refreshes `desktop/renderer-manifest.json` with the public URLs + checksums.
4. **Commit manifest updates:** the manifest is imported by the Next.js app at build time. Commit the updated JSON so production deployments expose the new links automatically.
5. **Trigger a web redeploy:** push to `main` (or redeploy in Vercel) so the Export Studio dialog picks up the latest manifest.

## 9. Future Work

* **feature-flag:** Gate Export Studio behind a runtime toggle so legacy Creatomate path remains available.
* **analytics:** Capture telemetry around export success/latency.
* **feedback-loop:** Collect beta feedback to refine presets and polish the publish stubs.

Refer to `fix-script-ai-issues.plan.md` for the full migration roadmap and remaining tasks.

## Desktop Export Only

SceneFlow now ships with a desktop FFmpeg renderer. The web experience no longer submits jobs to Google Cloud—install the SceneFlow Desktop app and trigger exports from the Vision workflow UI. All former GCP-related instructions have been retired.

### macOS Notarization

Before distributing macOS builds, submit the DMG/ZIP to Apple notarization:

```
APPLE_ID=you@example.com \
APPLE_TEAM_ID=ABCDE12345 \
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx \
scripts/notarize-macos.sh dist/desktop/SceneFlow-Renderer-<version>-x64.dmg
```

You may alternatively configure a `NOTARYTOOL_PROFILE` via `xcrun notarytool store-credentials` and pass only the artifact path.

### Publishing Installers

Use the upload helper to push DMG/ZIP/EXE artifacts and blockmaps to Vercel Blob after running `npm run electron:build`:

```
VERCEL_BLOB_RW_TOKEN=xxxxx node scripts/upload-renderer.js
```

Set `DRY_RUN=true` to preview the uploads without writing to Blob storage. The script also refreshes `desktop/renderer-manifest.json` with checksums for the new release.

In CI you can invoke `scripts/ci/upload-desktop.sh --platform all` to build macOS/Windows installers, notarize (if Apple credentials are set), and publish artifacts.

A GitHub Actions workflow (`.github/workflows/upload-desktop.yml`) is configured to run on `desktop-v*` tags and call the helper script with credentials stored in repository secrets.

For manual Windows verification, use `scripts/windows/smoke-test.ps1` with an NSIS installer path to install, launch, check logs, and uninstall automatically.

### Windows Packaging & Signing

Build a Windows installer from a Windows environment (or cross-platform build host with wine/NSIS):

```
npm run electron:build:win
```

For code signing, set the following environment variables before running the build:

- `CSC_LINK`: Path/URL to the PFX (code-signing certificate)
- `CSC_KEY_PASSWORD`: Password for the PFX
- `WIN_CSC_LINK`/`WIN_CSC_KEY_PASSWORD`: Windows-specific overrides (optional)

Post-build verification checklist (PowerShell):

```powershell
./dist/desktop/SceneFlow-Renderer-<version>-Setup.exe /VERYSILENT
Start-Sleep -Seconds 5
Start-Process "C:\\Program Files\\SceneFlow Desktop Renderer\\SceneFlow Desktop Renderer.exe"
Get-AuthenticodeSignature .\dist\desktop\SceneFlow-Renderer-<version>-Setup.exe
```

Uninstall via “Add or Remove Programs” and ensure `%APPDATA%\SceneFlow` cleanup. Document SmartScreen dialogs if the installer is unsigned.
