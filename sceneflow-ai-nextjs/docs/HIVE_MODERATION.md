# Hive content validation (opt-in, paid)

Optional server-side content validation using [Hive AI](https://thehive.ai). Validation is **user-initiated only** — generation, upload, and export routes do **not** auto-run Hive checks or block content.

## Policy

| Finding type | Validation API behavior |
|--------------|-------------------------|
| Harmful (NSFW, violence, CSAM, etc.) | **Informational warning** in `moderationReport` — never HTTP 403 |
| Copyright / trademark / celebrity / likeness (NIL) | **Informational warning** in `moderationReport` |

Client-side `promptModerator.ts` remains a UX preflight only. Paid validation is authoritative when the user explicitly requests it.

## Environment

| Variable | Purpose |
|----------|---------|
| `HIVE_MODERATION_ENABLED` | Enables `POST /api/moderation/validate` only (`true` required) |
| `HIVE_AI_ACCESS_KEY_ID` | Hive API token |

Per-stage env flags (`HIVE_MODERATION_BLUEPRINT`, `HIVE_MODERATION_SCRIPT`, etc.) are **deprecated** and ignored for auto-run.

## Credit pricing

| Operation | Credits | Stage |
|-----------|---------|-------|
| Text validation (blueprint / script) | **40** | `blueprint`, `script` |
| Image validation (character / storyboard) | **50** | `character`, `storyboard` |
| Video validation (clip) | **120** | `fal_video` |
| Copyright media add-on (video only) | **+60** | `includeCopyrightMedia: true` |

Charged via `CreditService` with `operation: 'moderation_validate'`. Insufficient balance returns **402**.

## Validation API

`POST /api/moderation/validate`

```json
{
  "projectId": "uuid",
  "stage": "blueprint | script | character | storyboard | fal_video",
  "source": "project_treatment | project_script | segment_asset | character_image",
  "resourceId": "optional segment or character id",
  "text": "optional inline text",
  "imageUrl": "optional inline image URL",
  "videoUrl": "optional inline video URL",
  "includeCopyrightMedia": false
}
```

**Flow:** auth → project ownership → `ensureCredits` → `runStageModeration({ forceEnabled: true, validationMode: true })` → `charge` → `{ success, moderationReport, creditsCharged, creditsBalance }`.

Never returns 403 for harmful findings; the report describes results only.

## UI

- **Studio / Project Idea:** “Validate treatment” after blueprint analysis (requires project).
- **Vision workflow:** “Validate script” in script menu; “Validate” per segment with a completed asset in Director Console.

Reports display in `ModerationReportPanel` after user-initiated validation.

## ModerationReport schema

```json
{
  "id": "uuid",
  "stage": "script",
  "allowed": true,
  "action": "allowed | warning",
  "checks": [
    {
      "check": "copyright_text",
      "provider": "heuristic",
      "allowed": true,
      "severity": "warn",
      "categories": ["trademark/franchise"]
    }
  ],
  "summary": "Validation: intellectual property warnings detected (informational)",
  "projectId": "optional",
  "resourceId": "optional",
  "createdAt": "ISO-8601"
}
```

## Audit API

`GET /api/projects/[projectId]/moderation-report?limit=50&stage=blueprint`

Returns recent `moderation_events.report_json` entries for trust & safety review.

## Database migration

```bash
npx tsx src/lib/database/migrateModerationEvents.ts
```

Adds `stage`, `report_json`, and extended `content_type` enum values on `moderation_events`.

## Platform overhead

`PLATFORM_OVERHEAD_COSTS.moderation` in `creditCosts.ts` is for margin analysis only. User-facing validation is billed via `MODERATION_CREDITS`.
