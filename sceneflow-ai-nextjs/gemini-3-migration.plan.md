# Gemini 2.5 → 3.0 Migration Plan

**Created:** March 5, 2026  
**Updated:** March 8, 2026  
**Status:** 🚧 IN PROGRESS — Phase 0 (Pre-Migration Hardening) complete  
**Priority:** High - After video production fixes

---

## Overview

Phased migration from Gemini 2.5 to 3.0 Flash across 40+ API routes, built on a **single-source-of-truth model registry** so that future model upgrades (3.0 → 4.0, etc.) require changing one file instead of 40+.

### Architecture Principle: Future-Proof Model Consistency

All AI model versions are now centralized in `src/lib/config/modelConfig.ts`. This file already housed Veo (video) and Imagen (image) model constants — Gemini text model constants follow the exact same pattern:

```typescript
// One place to change for the next model upgrade
export const GEMINI_TEXT_MODELS = {
  flash: 'gemini-3.0-flash',        // primary workhorse
  pro:   'gemini-3.1-pro-preview',   // complex reasoning
  lite:  'gemini-3.1-flash-lite-preview', // lightweight/cheap
}

// Every route uses this — no hardcoded strings anywhere
getGeminiTextModel()       // → env override or 'gemini-3.0-flash'
getGeminiTextModel('pro')  // → 'gemini-3.1-pro-preview'
```

### Thinking Config Abstraction

Gemini 2.5 used numeric `thinkingBudget` (0–24576). Gemini 3.0+ uses string levels. The abstraction handles both transparently via `buildThinkingConfig()`:

```typescript
// Routes use semantic levels — the config maps to the correct format
thinkingLevel: 'minimal'  // 3.0: string, 2.5: maps to 0
thinkingLevel: 'high'     // 3.0: string, 2.5: maps to 8192
```

If Gemini 4.0 changes the format again, only `buildThinkingConfig()` needs updating.

### Gemini 3.0 New Features to Utilize

1. **Thinking Levels** (Internal Reasoning / Chain of Thought)
   - `minimal`: Best for pure throughput (Flash only)
   - `high`: Maximum reasoning depth (default for Pro)

2. **Media Resolution** (for multimodal/vision tasks)
   - `media_resolution_high`: Best for reading fine text or complex diagrams
   - `media_resolution_medium`: Optimized for document understanding

3. **Output Verbosity**
   - Gemini 3 is more concise by default
   - Add "Explain in detail as a helpful assistant" for prompts needing long output

---

## ✅ Phase 0: Pre-Migration Hardening (COMPLETE — March 8, 2026)

Infrastructure consolidation before any model version change.

### Completed Tasks

- [x] **Central model constants** — Added `GEMINI_TEXT_MODELS`, `getGeminiTextModel()`, `getModelFamily()`, `buildThinkingConfig()` to `src/lib/config/modelConfig.ts`
- [x] **Updated `gemini.ts` core client** — `generateText()` and `generateWithVision()` now default to `getGeminiTextModel()` instead of hardcoded `'gemini-2.5-flash'`
- [x] **Thinking config gate fixed** — Replaced `model.includes('2.5')` check with `buildThinkingConfig()` that supports both 2.5 numeric and 3.0+ string levels
- [x] **Removed 14+ hardcoded model strings** — All routes that passed `model: 'gemini-2.5-flash'` to `generateText()` now omit the model param (picks up central default)
- [x] **Migrated 6 direct SDK routes to Vertex AI** — Eliminated `@google/generative-ai` imports from:
  - `prompt/modify` (was on stale `gemini-2.0-flash`!)
  - `prompt/rephrase` (was on `gemini-2.0-flash`!)
  - `character/suggest-wardrobes`
  - `vision/suggest-objects`
  - `review/summarize`
  - `scenes/[sceneId]/generate-segments` (3 internal functions consolidated)
- [x] **V2/DOL services aligned** — `BlueprintService`, `DirectionService`, `StoryboardService`, `ModelSelector`, `PromptConstructor` now use `getGeminiTextModel()` / `GEMINI_TEXT_MODELS.flash`
- [x] **JSON handling standardized** — `llmGateway.ts` now uses `safeParseJsonFromText()` from `src/lib/safeJson.ts` instead of its own `normalizeToJsonString()`. Migrated SDK routes now use `safeParseJsonFromText` + `responseMimeType: 'application/json'`
- [x] **Deploy verification relaxed** — `deploy-verify.js` no longer hardcodes `model === 'gemini-2.5-flash'`; checks `model.startsWith('gemini-')` instead
- [x] **Cost tracking updated** — `costTracking.ts` model mappings updated from `gemini-2.5-flash` → `gemini-3.0-flash`

### Impact

After Phase 0, **changing the default model is a one-line edit** in `GEMINI_TEXT_MODELS.flash`. The `GEMINI_MODEL` env var provides per-environment override for rollback without any code changes.

---

## Phase 1: Model Flip & Feature Flags (Week 1)

### Tasks

- [ ] Set `GEMINI_MODEL=gemini-2.5-flash` in production env (explicit rollback safety net)
- [ ] Deploy Phase 0 code to production (model stays 2.5 via env override)
- [ ] Remove env override in staging → staging runs 3.0
- [ ] Validate all routes on staging against 3.0:
  - JSON parse success rate ≥ 99% over 20 test calls per route
  - Latency within 2× of 2.5 baseline
  - No output schema regressions (Zod validation where available)
- [ ] Add `useGemini3` feature flag for beta users
- [ ] Allow admin override in DOL dashboard

---

## Phase 2: High-Priority Creative Workflows (Week 2-3)

### Series Generation - 2 routes
| Route | Purpose | Thinking Level |
|-------|---------|----------------|
| `/api/series/[seriesId]/generate` | Full series storyline | high |
| `/api/series/[seriesId]/analyze-resonance` | Audience analysis | high |

### Film Treatment (Blueprint) - 6 routes
| Route | Purpose | Thinking Level |
|-------|---------|----------------|
| `/api/ideation/film-treatment` | Core treatment generation | high |
| `/api/ideation/core-concept` | Concept extraction | medium |
| `/api/ideation/character-breakdown` | Character analysis | high |
| `/api/ideation/beat-sheet` | 3-act structure | high |
| `/api/ideation/generate` | Full pipeline | high |
| `/api/ideation/generate-sequential` | Sequential pipeline | high |

### Treatment Resonance Analysis - 2 routes
| Route | Purpose | Thinking Level |
|-------|---------|----------------|
| `/api/treatment/analyze-resonance` | 5-axis scoring | high |
| `/api/treatment/optimize` | Resonance-based optimization | medium |

---

## Phase 3: Script Generation & Analysis (Week 4)

### Script Generation - 7 routes
| Route | Purpose | Thinking Level |
|-------|---------|----------------|
| `/api/vision/generate-script` | Main screenplay generation | high |
| `/api/vision/generate-script-v2` | Enhanced V2 pipeline | high |
| `/api/generate/script` | From beat sheet | medium |
| `/api/generate/outline` | Scene outline | medium |
| `/api/vision/optimize-script` | AI suggestions | medium |
| `/api/vision/review-script` | Quality review | high |
| `/api/vision/analyze-script` | Structure analysis | high |

**Note:** Add verbosity instruction for detailed script output

---

## Phase 4: Supporting Features (Week 5-6)

### Update remaining routes
- [ ] Cue Assistant routes (2)
- [ ] Scene/Segment generation routes (6)
- [ ] Vision pipeline routes (8)
- [ ] Character utility routes (4)
- [ ] Prompt refinement routes (3)

---

## API Inventory Tracking Table

| Category | Route | Thinking | Validation | Status |
|----------|-------|----------|------------|--------|
| **V2 Services** | `BlueprintService` | high | Zod schema | ✅ DONE (central constant) |
| **V2 Services** | `DirectionService` | medium | Zod schema | ✅ DONE (central constant) |
| **V2 Services** | `StoryboardService` | medium | Zod schema | ✅ DONE (central constant) |
| **Series** | `/api/series/[seriesId]/generate` | high | JSON parse | ⬜ TODO |
| **Series** | `/api/series/[seriesId]/analyze-resonance` | high | JSON parse | ⬜ TODO |
| **Treatment** | `/api/ideation/film-treatment` | high | safeParseJsonFromText | ⬜ TODO |
| **Treatment** | `/api/ideation/core-concept` | medium | safeParseJsonFromText | ⬜ TODO |
| **Treatment** | `/api/ideation/character-breakdown` | high | safeParseJsonFromText | ⬜ TODO |
| **Treatment** | `/api/ideation/beat-sheet` | high | safeParseJsonFromText | ⬜ TODO |
| **Treatment** | `/api/ideation/generate` | high | safeParseJsonFromText | ⬜ TODO |
| **Treatment** | `/api/ideation/generate-sequential` | high | safeParseJsonFromText | ⬜ TODO |
| **Resonance** | `/api/treatment/analyze-resonance` | high | safeParseJsonFromText | ⬜ TODO |
| **Resonance** | `/api/treatment/optimize` | medium | safeParseJsonFromText | ⬜ TODO |
| **Script** | `/api/vision/generate-script` | high | JSON parse | ⬜ TODO |
| **Script** | `/api/vision/generate-script-v2` | high | JSON parse | ⬜ TODO |
| **Script** | `/api/generate/script` | medium | JSON parse | ⬜ TODO |
| **Script** | `/api/generate/outline` | medium | text | ⬜ TODO |
| **Script** | `/api/vision/optimize-script` | medium | safeParseJsonFromText | ⬜ TODO |
| **Script** | `/api/vision/review-script` | high | JSON parse | ⬜ TODO |
| **Script** | `/api/vision/analyze-script` | high | JSON parse | ⬜ TODO |
| **Prompt** | `/api/prompt/modify` | minimal | text (no JSON) | ✅ DONE (migrated to Vertex AI) |
| **Prompt** | `/api/prompt/rephrase` | minimal | text (no JSON) | ✅ DONE (migrated to Vertex AI) |
| **Prompt** | `/api/prompt/enhance` | minimal | text | ✅ DONE (central constant) |
| **Segments** | `/api/scenes/[sceneId]/generate-segments` | minimal | responseMimeType JSON | ✅ DONE (migrated to Vertex AI) |
| **Objects** | `/api/vision/suggest-objects` | medium | safeParseJsonFromText | ✅ DONE (migrated to Vertex AI) |
| **Wardrobe** | `/api/character/suggest-wardrobes` | medium | safeParseJsonFromText | ✅ DONE (migrated to Vertex AI) |
| **Review** | `/api/review/summarize` | medium | safeParseJsonFromText | ✅ DONE (migrated to Vertex AI) |

---

## Per-Route Validation Gate

Each route moves from ⬜ TODO → ✅ DONE only after passing:

1. **JSON Parse Success**: ≥ 99% success rate over 20 test calls (for JSON-returning routes)
2. **Schema Validation**: No regressions in output schema (Zod where V2 services use it, manual spot-check elsewhere)
3. **Latency**: Within 2× of Gemini 2.5 baseline
4. **Quality**: Spot-check output quality on 3 representative inputs

---

## Testing Strategy

**Recommended: Environment-variable rollback per environment**

1. Deploy Phase 0 code with `GEMINI_MODEL=gemini-2.5-flash` env override in production
2. Staging uses the default (`gemini-3.0-flash` from `modelConfig.ts`)
3. Remove production env override once staging validation passes
4. If issues arise, re-add `GEMINI_MODEL=gemini-2.5-flash` — instant rollback, zero code changes

---

## Verbosity Handling

Gemini 3 is more concise by default. Add explicit instructions for routes needing long output:

```
"Provide a comprehensive, detailed response. Explain thoroughly as a helpful creative assistant."
```

**Routes requiring verbosity boost:**
- Script generation (all)
- Character breakdown
- Beat sheet
- Film treatment

---

## Rollback Strategy (Per-Route)

1. **Global rollback**: Set `GEMINI_MODEL=gemini-2.5-flash` in environment → all routes revert instantly
2. **Per-route rollback**: Pass `model: GEMINI_TEXT_MODELS_PREVIOUS.flash` in the specific route's `generateText()` options
3. **Previous-gen constants**: `GEMINI_TEXT_MODELS_PREVIOUS` map kept in `modelConfig.ts` for easy reference
4. No deployment required for global rollback — just env var change

---

## Central Files Reference

### `src/lib/config/modelConfig.ts` ⭐ SINGLE SOURCE OF TRUTH
- `GEMINI_TEXT_MODELS` — current model strings (`flash`, `pro`, `lite`)
- `GEMINI_TEXT_MODELS_PREVIOUS` — previous-gen for rollback
- `getGeminiTextModel(tier?)` — accessor with `GEMINI_MODEL` env override
- `getModelFamily(model)` — returns `'2.5'` or `'3.0'` for thinking config
- `buildThinkingConfig(model, options)` — cross-family thinking config builder
- Also: `VEO_MODELS`, `IMAGEN_MODELS` (video/image — separate from text migration)

### `src/lib/vertexai/gemini.ts` ⭐ UNIFIED AI CLIENT
- `generateText()` — all text generation goes through here
- `generateWithVision()` — all vision/multimodal goes through here
- Both default to `getGeminiTextModel()` — no hardcoded model strings
- Retry, timeout, auth, safety settings all built-in

### `src/lib/safeJson.ts` — CANONICAL JSON PARSER
- `safeParseJsonFromText()` — multi-strategy parser (direct → fenced → balanced → sanitized)
- `strictJsonPromptSuffix` — append to prompts requesting JSON output
- Used by `llmGateway.ts` and all migrated routes

---

## Implementation Code Snippet (Vertex AI REST API)

```typescript
import { generateText } from '@/lib/vertexai/gemini'

// Simple call — picks up central model default
const result = await generateText(prompt, {
  temperature: 0.7,
  responseMimeType: 'application/json',
})

// With thinking level (works on both 2.5 and 3.0)
const result = await generateText(prompt, {
  thinkingLevel: 'high',  // semantic level, auto-mapped per model family
  responseMimeType: 'application/json',
})

// Pin a specific tier
import { getGeminiTextModel } from '@/lib/config/modelConfig'
const result = await generateText(prompt, {
  model: getGeminiTextModel('pro'),  // 'gemini-3.1-pro-preview'
})
```

---

## Scope Exclusions

- **`gemini-2.5-flash-image`** in `geminiStudioImageClient.ts` — image generation model, separate capability, stays on 2.5 until a 3.0 equivalent is confirmed
- **Imagen models** (`imagen-3.0-*`) — already managed separately in `modelConfig.ts`, not part of this migration
- **Veo models** (`veo-3.1-*`) — already managed separately in `modelConfig.ts`

---

## Dependencies

- ✅ Video production optimization (complete)
- ✅ Phase 0 hardening (complete)
- Validate Gemini 3.0 Flash availability in `us-central1` and `global` endpoints
- Monitor Google Cloud billing for 3.0 pricing changes
