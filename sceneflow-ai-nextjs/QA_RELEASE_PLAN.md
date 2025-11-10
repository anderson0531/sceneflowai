# SceneFlow Desktop Export Release Playbook

This document captures quality checks for the desktop-only export workflow. Cloud queueing and GCP infrastructure have been removed.

## 1. Automated Verification

| Stage | Command | Purpose |
|-------|---------|---------|
| Static analysis | `npm run lint` | ESLint across Next.js and Electron code |
| Type integrity | `npx tsc --noEmit` | Compile-time regression guard for shared types & IPC contracts |
| Desktop build smoke | `npm run build:memory` | Ensures Next.js + preload scripts compile under memory cap |

**CI Integration**

1. Ensure lint + typecheck + build run in CI.
2. Skip container builds (no longer required).

## 2. Manual QA Matrix

| Surface | Scenario | Expected Outcome |
|---------|----------|------------------|
| Electron desktop | Export timeline with bundled FFmpeg | Local render completes, output saved to chosen folder |
| SceneFlow Web | Export CTA without desktop app | User prompted to install SceneFlow Desktop |
| Vision workflow | Audio mix + preset | Export dialog indicates desktop requirement; no server call |
| BYOK projects | Verify cost calculator | Shows zero cloud export cost |

### Windows QA Checklist

- Download the latest Windows installer (`SceneFlow-Renderer-<version>-Setup.exe`).
- Install via default NSIS wizard; confirm app launches without SmartScreen warning (or document override steps).
- Trigger a short export (e.g., 10s sample) and ensure FFmpeg output renders locally.
- Verify logs appear under `%APPDATA%/SceneFlow/logs` and no GPU/cloud calls occur.
- Uninstall via "Add or Remove Programs" and confirm residual files removed from `%LOCALAPPDATA%`.
- Run `Get-AuthenticodeSignature` on the installer; capture results if unsigned or expired.
- Optional automation: execute `powershell -ExecutionPolicy Bypass -File scripts/windows/smoke-test.ps1 -InstallerPath .\SceneFlow-Renderer-<version>-Setup.exe` on a QA host.

QA should execute the matrix in staging with the latest desktop build. Log issues with the `qa-desktop-export` label.

## 3. Staged Rollout Strategy

1. **Private Beta:**
   - Ship desktop installer to internal team.
   - Verify at least three end-to-end exports on macOS + Windows.

2. **Public Beta:**
   - Publish installer via auto-updater.
   - Collect feedback via support channel; monitor error telemetry from desktop logs.

3. **General Availability:**
   - Document desktop-first workflow in onboarding.
   - Remove legacy mentions of cloud export from marketing/docs.

Rollback plan: pause desktop auto-update and re-enable archival instructions for manual FFmpeg use if required.

## 4. Exit Criteria Checklist

- [ ] CI lint + typecheck + build jobs green on release branch
- [ ] Desktop export verified on macOS and Windows
- [ ] QA matrix executed with no Sev 1/2 issues
- [ ] Desktop error telemetry within acceptable thresholds for 24h
- [ ] Release notes and support FAQ updated

## 5. Contacts

| Area | Owner | Channel |
|------|-------|---------|
| Desktop renderer | @desktop-team | `#desktop-renderer` |
| UI/UX | @web-experience | `#web-ui` |
| Support escalation | @support-leads | PagerDuty `sceneflow-desktop` |

