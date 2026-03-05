# Gemini 2.5 → 3.0 Migration Plan

**Created:** March 5, 2026  
**Status:** 📋 PLANNED (Pending video production optimization completion)  
**Priority:** High - After video production fixes

---

## Overview

Phased migration from Gemini 2.5 to 3.0 Flash across 40+ API routes, starting with the central `geminiClient.ts` utility and progressing through high-priority creative workflows (Series, Treatment, Script generation), with feature flags for A/B testing.

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

## Phase 1: Foundation & Testing Infrastructure (Week 1)

### Tasks

- [ ] Add Gemini 3.0 model constants to `modelConfig.ts`
  - `GEMINI_3_FLASH = 'gemini-3.0-flash'`
  - `GEMINI_3_PRO = 'gemini-3.1-pro-preview'`
  - Add thinking level and media resolution type definitions

- [ ] Create feature flag system for model selection
  - Add `useGemini3` toggle in environment variables
  - Allow per-route override via query param `?model=gemini3` for testing

- [ ] Update central client `geminiClient.ts`
  - Add new parameters: `thinkingLevel`, `mediaResolution`, `outputVerbosity`
  - Support both 2.5 and 3.0 model strings with graceful fallback

---

## Phase 2: High-Priority Creative Workflows (Week 2-3)

### Series Generation - 3 routes
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

### Script Generation - 8 routes
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

### Migrate direct `@google/generative-ai` SDK calls to Vertex AI
- [ ] `/api/prompt/modify/route.ts`
- [ ] `/api/prompt/enhance/route.ts`
- [ ] `/api/concept/analyze/route.ts`
- [ ] `/api/concept/iterate/route.ts`
- [ ] `/api/character/generate-description/route.ts`

### Update remaining routes
- [ ] Cue Assistant routes (2)
- [ ] Scene/Segment generation routes (6)
- [ ] Vision pipeline routes (8)
- [ ] Character utility routes (4)

---

## API Inventory Tracking Table

| Category | Route | Current Model | Target Model | Thinking | Status |
|----------|-------|---------------|--------------|----------|--------|
| **Series** | `/api/series/[seriesId]/generate` | 2.5-flash | 3.0-flash | high | ⬜ TODO |
| **Series** | `/api/series/[seriesId]/analyze-resonance` | 2.5-flash | 3.0-flash | high | ⬜ TODO |
| **Treatment** | `/api/ideation/film-treatment` | 2.5-flash | 3.0-flash | high | ⬜ TODO |
| **Treatment** | `/api/ideation/core-concept` | 2.5-flash | 3.0-flash | medium | ⬜ TODO |
| **Treatment** | `/api/ideation/character-breakdown` | 2.5-flash | 3.0-flash | high | ⬜ TODO |
| **Treatment** | `/api/ideation/beat-sheet` | 2.5-flash | 3.0-flash | high | ⬜ TODO |
| **Treatment** | `/api/ideation/generate` | 2.5-flash | 3.0-flash | high | ⬜ TODO |
| **Treatment** | `/api/ideation/generate-sequential` | 2.5-flash | 3.0-flash | high | ⬜ TODO |
| **Resonance** | `/api/treatment/analyze-resonance` | 2.5-flash | 3.0-flash | high | ⬜ TODO |
| **Resonance** | `/api/treatment/optimize` | 2.5-flash | 3.0-flash | medium | ⬜ TODO |
| **Script** | `/api/vision/generate-script` | 2.5-flash | 3.0-flash | high | ⬜ TODO |
| **Script** | `/api/vision/generate-script-v2` | 2.5-flash | 3.0-flash | high | ⬜ TODO |
| **Script** | `/api/generate/script` | 2.5-flash | 3.0-flash | medium | ⬜ TODO |
| **Script** | `/api/generate/outline` | 2.5-flash | 3.0-flash | medium | ⬜ TODO |
| **Script** | `/api/vision/optimize-script` | 2.5-flash | 3.0-flash | medium | ⬜ TODO |
| **Script** | `/api/vision/review-script` | 2.5-flash | 3.0-flash | high | ⬜ TODO |
| **Script** | `/api/vision/analyze-script` | 2.5-flash | 3.0-flash | high | ⬜ TODO |
| **Prompt** | `/api/prompt/modify` | 2.5-flash-preview | 3.0-flash | minimal | ⬜ TODO |
| **Prompt** | `/api/prompt/enhance` | 2.0-flash | 3.0-flash | minimal | ⬜ TODO |

---

## Testing Strategy

**Recommended: Feature flag per-user (beta testers get Gemini 3)**

1. Add environment variable `GEMINI_3_ENABLED=false`
2. Allow admin override in DOL dashboard
3. Beta users can opt-in via settings
4. A/B comparison reporting in analytics

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

## Rollback Strategy

1. Keep 2.5 model strings in config as fallback
2. Feature flag allows instant rollback without deployment
3. Monitor error rates and quality metrics during rollout

---

## Central Migration Points

### `src/lib/gemini/geminiClient.ts` ⭐ CRITICAL
- Default Model: `gemini-2.5-flash`
- **SINGLE POINT OF MIGRATION** - Most API routes use this
- Changing the default here affects all routes using `geminiClient`

### `src/lib/ai/llmService.ts`
- LLM abstraction layer for multi-provider support
- Wraps `generateContent` from Vertex AI client

---

## Implementation Code Snippet (Vertex AI Node.js SDK)

```typescript
// New Gemini 3.0 configuration options
interface Gemini3Config {
  model: 'gemini-3.0-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite-preview'
  thinkingConfig?: {
    thinkingBudget: 'minimal' | 'low' | 'medium' | 'high'
  }
  mediaResolution?: 'media_resolution_high' | 'media_resolution_medium'
}

// Example generateContent call with Gemini 3.0
const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 8192,
  },
  // New Gemini 3.0 parameters
  thinkingConfig: {
    thinkingBudget: 'high', // For complex reasoning tasks
  },
})
```

---

## Files Using Direct `@google/generative-ai` SDK (Require Migration)

These files bypass Vertex AI client and need refactoring:

1. `src/app/api/prompt/modify/route.ts`
2. `src/app/api/prompt/enhance/route.ts`
3. `src/app/api/concept/analyze/route.ts`
4. `src/app/api/concept/iterate/route.ts`
5. `src/app/api/character/generate-description/route.ts`
6. `src/app/api/continuity/analyze/route.ts` (partial)

---

## Dependencies

- Complete video production optimization first
- Ensure Vertex AI SDK supports Gemini 3.0 parameters
- Update `@google-cloud/vertexai` package if needed
