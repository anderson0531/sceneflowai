# Vertex AI Context Caching — Implementation Guide

## Overview

This document covers the full Vertex AI Context Caching (Explicit Caching) implementation for SceneFlow AI Studio. The system reduces redundant token costs by caching large, stable content (system prompts, formatting rules, treatment data) on Vertex AI and only sending the changing user delta as uncached input.

**Expected Cost Impact**: ~75-94% reduction on cached input tokens (cached tokens cost $0.025/1M vs $0.10/1M for Flash models).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  useCacheStore (Zustand) ◄──── useCacheHeartbeat hook   │
│  - Tracks active cache refs    - 15-min TTL extensions  │
│  - Session-scoped (no persist) - sendBeacon on close    │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
    ┌──────────▼──────────┐   ┌──────────▼──────────────┐
    │  Zone API Routes    │   │  Cache Management APIs  │
    │  - /api/vision/     │   │  - POST /api/cache/     │
    │    revise-scene     │   │    heartbeat             │
    │  - /api/cue/respond │   │  - DELETE /api/cache/    │
    │  - scene-image-     │   │    invalidate            │
    │    intelligence     │   │  - POST /api/cache/      │
    │                     │   │    cleanup               │
    └──────────┬──────────┘   │  - GET /api/cache/stats  │
               │              └──────────────────────────┘
    ┌──────────▼──────────────────────────────────────────┐
    │           generateTextCacheAware()                  │
    │  gemini.ts — Transparent wrapper over generateText  │
    │  Three paths:                                       │
    │    1. Fast path (caching disabled/not requested)    │
    │    2. Path A: Reuse existing cache by resourceName  │
    │    3. Path B: Create-or-reuse cache, then generate  │
    │  Always falls back to uncached on any error         │
    └──────────┬──────────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────────┐
    │              cacheManager.ts                        │
    │  - getOrCreateCache()   - SHA-256 change detection  │
    │  - generateWithCache()  - Token threshold validation│
    │  - heartbeat()          - Multi-region scoping      │
    │  - invalidateCache()    - In-memory + REST lifecycle│
    │  - cleanupProjectCaches()                           │
    └──────────┬──────────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────────┐
    │            cacheObservability.ts                     │
    │  - logCacheEvent() → structured console + DB logs   │
    │  - getCacheMetrics() → in-memory hit/miss counters  │
    │  - APIUsageLog integration (fire-and-forget)        │
    └─────────────────────────────────────────────────────┘
```

---

## Files Created/Modified

### New Files
| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/vertexai/cacheManager.ts` | Core lifecycle manager — create, reuse, heartbeat, invalidate, cleanup | ~620 |
| `src/lib/vertexai/cacheObservability.ts` | Structured logging, metrics, APIUsageLog integration | ~220 |
| `src/store/useCacheStore.ts` | Client-side Zustand store for cache references | ~80 |
| `src/hooks/useCacheHeartbeat.ts` | React hook for TTL extension + cleanup on close | ~80 |
| `src/app/api/cache/heartbeat/route.ts` | POST — extends cache TTL | ~40 |
| `src/app/api/cache/invalidate/route.ts` | DELETE — invalidates by resourceName or zone | ~50 |
| `src/app/api/cache/cleanup/route.ts` | POST — session cleanup (sendBeacon compatible) | ~40 |
| `src/app/api/cache/stats/route.ts` | GET — diagnostics + metrics for admin dashboard | ~35 |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/vertexai/gemini.ts` | Added `generateTextCacheAware()`, `CacheAwareTextGenerationOptions`, `skipCache`, observability import |
| `src/app/api/vision/revise-scene/route.ts` | **Zone A**: Split prompt, use `generateTextCacheAware`, thread `projectId`, add observability |
| `src/lib/intelligence/scene-image-intelligence.ts` | **Zone B**: Cache static system prompt via `generateTextCacheAware`, added `projectId` to request interface |
| `src/app/api/cue/respond/route.ts` | **Zone C**: Added cache-aware path for batch callers, `cacheZone`/`cacheContext` in CueContext |
| `src/app/api/generate/script-batch/route.ts` | **Zone C**: Builds treatment context, passes `cacheZone`/`cacheContext` to cue/respond |

---

## Cache Zones

| Zone | Route | Cacheable Content | User Delta | Est. Savings |
|------|-------|-------------------|------------|--------------|
| `script_doctor` | `/api/vision/revise-scene` | Scene data + formatting rules + dialogue tags (~5K tokens) | Revision instruction (~200 tokens) | ~94% |
| `style_consistency` | `scene-image-intelligence.ts` | Static system prompt (cinematic rules, ~2K tokens) | Per-scene composition request | ~70% |
| `batch_brief` | `/api/cue/respond` (via script-batch) | Treatment context (logline, characters) | Per-scene brief request | ~60% |
| `batch_script` | `/api/cue/respond` (via script-batch) | Treatment context (logline, characters) | Per-scene script request | ~60% |

---

## Activation

### Enable Caching
Set the environment variable:
```
ENABLE_VERTEX_CACHING=true
```

The feature defaults to **disabled** (`false`). When disabled, all cache-aware functions transparently fall back to standard `generateText()` with zero behavior change.

### Verify
```bash
curl https://your-domain.com/api/cache/stats
# Returns: { enabled: true, totalCaches: 0, caches: [], metrics: { ... } }
```

---

## Further Considerations & Recommendations

### 1. Model Compatibility & Token Threshold Validation

**Status**: ✅ Implemented

The `cacheManager.ts` module validates token minimums per model family before attempting to create a cache:
- **Flash models** (gemini-3.0-flash, gemini-2.5-flash): minimum 2,048 tokens
- **Pro models** (gemini-3.1-pro-preview): minimum 4,096 tokens
- **Lite models** (gemini-3.1-flash-lite-preview): minimum 2,048 tokens

Token counting uses the Vertex AI `countTokens` API for accurate measurement with a fast estimation fallback (~4 chars per token).

**Recommendation**: When new Gemini models are released, update `TOKEN_MINIMUMS` and `MODEL_FAMILY_PATTERNS` in `cacheManager.ts`. Monitor the Vertex AI documentation for changes to caching support in newer model families.

### 2. Multi-Region Cache Scoping

**Status**: ✅ Implemented

Cache keys are scoped as `${vertexProjectId}:${location}:${sceneflowProjectId}:${zone}`, which ensures:
- Caches are project-specific (not shared across GCP projects)
- Location-aware (caches created in `us-central1` won't conflict with `europe-west4`)
- Zone-isolated (script_doctor caches don't collide with style_consistency)

Gemini 3.x text models automatically use the `global` endpoint (hardcoded in `gemini.ts`), so most caches will share the same location. However, video/image generation routes that rotate across `VERTEX_PROJECT_IDS` and `VEO_REGIONS` will correctly scope caches per project-region pair.

**Recommendation**: If you add multi-region Gemini text model routing in the future, the cache key format already handles it. No changes needed.

### 3. BYOK (Bring Your Own Key) Edge Cases

**Status**: ✅ Implemented

The `generateTextCacheAware()` function accepts a `skipCache: boolean` option. When a BYOK user's own Vertex AI credentials are detected, callers should pass `skipCache: true` to bypass caching entirely.

Currently, BYOK for Gemini text generation is not yet implemented (only video providers use BYOK). The infrastructure is ready for when it is.

**Recommendation**: When implementing BYOK for Gemini, add this pattern to the route handlers:
```typescript
const isBYOK = await checkUserHasOwnVertexCredentials(userId)
const result = await generateTextCacheAware(prompt, {
  ...options,
  skipCache: isBYOK,
})
```

### 4. Serverless Cache Persistence (Vercel-Specific)

**Status**: ⚠️ Partially addressed

In-memory cache maps in `cacheManager.ts` don't persist across Vercel serverless cold starts. This is mitigated by:
1. The client-side `useCacheStore` (Zustand) holds cache references and passes `cacheResourceName` back to API routes
2. `getCacheEntryByResourceName()` validates against the Vertex AI REST API for cross-container scenarios
3. Cache creation is idempotent — if the in-memory map is empty, a new request checks Vertex AI and recreates the local entry

**Recommendation for production scale**: Consider adding a Redis/Upstash layer to share cache metadata across containers:
```
Container A creates cache → writes metadata to Redis
Container B receives request → checks Redis → finds existing cache → reuses it
```
This eliminates redundant `getOrCreateCache()` calls that currently fall through to Vertex AI's `list` API.

### 5. Cache Invalidation Strategy

**Status**: ✅ Implemented with routes

Invalidation is available via:
- `DELETE /api/cache/invalidate` — explicit invalidation by resource name or zone
- `POST /api/cache/cleanup` — session cleanup on browser close
- TTL-based expiry (default 60 minutes, configurable per zone)

**Recommendation**: Add invalidation triggers when:
- A project's treatment/characters are edited (invalidate `batch_brief` and `batch_script` zones)
- A scene's base content changes (invalidate `script_doctor` zone for that project)
- Art style settings change (invalidate `style_consistency` zone)

Wire these into the respective save/update API routes:
```typescript
// In project update route:
await fetch('/api/cache/invalidate', {
  method: 'DELETE',
  body: JSON.stringify({ projectId, zone: 'batch_brief' })
})
```

### 6. Cost Monitoring & Alerts

**Status**: ✅ Basic implementation

The `cacheObservability.ts` module logs:
- Per-request cache hit/miss with token counts
- Estimated dollar savings per request
- Aggregated metrics via `getCacheMetrics()`

**Recommendation**: Set up monitoring alerts:
- Alert if cache hit rate drops below 50% (indicates misconfigured zones or content thrashing)
- Alert if `cachedContentTokenCount` is consistently 0 (indicates token minimum not met)
- Dashboard widget showing daily token savings and cost impact
- Use the `GET /api/cache/stats` endpoint for dashboard integration

### 7. Testing Strategy

**Recommendation**: Add these test scenarios before production deployment:

1. **Feature flag off**: Verify all routes work identically with `ENABLE_VERTEX_CACHING=false`
2. **Token threshold**: Test with prompts below 2,048 tokens — should gracefully fall back
3. **Cache TTL expiry**: Test that expired caches trigger recreation
4. **Content change detection**: Modify scene content and verify cache is invalidated (SHA-256 hash change)
5. **Error resilience**: Mock Vertex AI cache API failures and verify fallback to uncached path
6. **BYOK skip**: Test `skipCache: true` bypasses caching
7. **Concurrent requests**: Verify race conditions in `getOrCreateCache()` don't create duplicate caches

### 8. Future Optimizations

1. **Prompt template caching**: Cache the static portions of dialogue formatting rules as a shared "template cache" that persists across all projects (not project-scoped)
2. **Streaming support**: `generateTextCacheAware` currently doesn't support streaming. For `generate-script-v2` (SSE streaming), a `generateStreamCacheAware` variant would be needed
3. **Image data caching**: Vertex AI context caching supports inline image data. Character reference images could be cached alongside text for the `style_consistency` zone
4. **Batch optimization**: Instead of sequential cache-aware calls in `script-batch`, batch the cache creation once and parallelize the generation calls using the same cache

---

## Quick Reference

### Enable
```bash
ENABLE_VERTEX_CACHING=true
```

### Check Status
```bash
curl -s https://your-app.vercel.app/api/cache/stats | jq
```

### Force Invalidate All
```bash
curl -X DELETE https://your-app.vercel.app/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"projectId": "all", "zone": "script_doctor"}'
```

### Monitor Logs
Look for `[Cache Observability]` structured JSON in Vercel logs:
```json
{
  "type": "vertex_cache_event",
  "zone": "script_doctor",
  "cacheHit": true,
  "cachedTokens": 4823,
  "estimatedSavings": "$0.000362"
}
```
