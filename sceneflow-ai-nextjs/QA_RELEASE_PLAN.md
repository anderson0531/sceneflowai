# SceneFlow Vision QA Plan

Video rendering is deferred until the Polish phase, so QA now concentrates on the Vision workflow: script refinement, scene management, audio planning, and collaboration.

## 1. Automated Verification

| Stage | Command | Purpose |
|-------|---------|---------|
| Lint | `npm run lint` | Ensure UI/state updates remain consistent |
| Build | `npm run build` | Catch regressions introduced by component changes |

## 2. Manual QA Checklist

| Area | Scenario | Expected Outcome |
|------|----------|------------------|
| Storyboard | Reorder scenes, edit metadata, verify persistence | Changes survive reload; no export buttons remain |
| Audio Mixer | Trigger narration/dialogue/SFX previews | Audio controls function; download icons only appear for audio stems |
| Screening Room | Play scenes, start/stop recording | Recording works but no MP4 download option is shown |
| Reports | Export script/storyboard PDFs | Downloads succeed and exclude video-export messaging |

## 3. Regression Notes

- Verify no references to `/api/export/*` remain in the network log.
- Confirm `Render Video`, Export Studio buttons, and Screening Room download controls are absent.
- Docs (`README.md`, onboarding) describe the new scope.

## 4. Exit Criteria

- [ ] Lint & build pass.
- [ ] Manual checklist executed with no Sev 1/2 issues.
- [ ] Documentation and env examples updated to remove hosted export references.

