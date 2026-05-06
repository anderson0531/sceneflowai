#!/bin/bash
# Find and replace 8s with 12s in prompts and logic

# src/lib/scene/veoDuration.ts
sed -i '' 's/\[4, 6, 8\] as const/\[4, 6, 8, 10, 12\] as const/g' src/lib/scene/veoDuration.ts
sed -i '' 's/return 8/if (duration <= 9) return 8\n  if (duration <= 11) return 10\n  return 12/g' src/lib/scene/veoDuration.ts
sed -i '' 's/maxDuration: number = 8/maxDuration: number = 12/g' src/lib/scene/veoDuration.ts
sed -i '' 's/eightCount:/twelveCount:/g' src/lib/scene/veoDuration.ts
sed -i '' 's/d === 8/d === 12/g' src/lib/scene/veoDuration.ts
sed -i '' 's/a.eightCount/a.twelveCount/g' src/lib/scene/veoDuration.ts
sed -i '' 's/b.eightCount/b.twelveCount/g' src/lib/scene/veoDuration.ts
sed -i '' 's/8s-first/12s-first/g' src/lib/scene/veoDuration.ts

# src/app/api/scenes/[sceneId]/generate-segments/route.ts
sed -i '' 's/MAX_SEGMENT_SECONDS = 8/MAX_SEGMENT_SECONDS = 12/g' "src/app/api/scenes/[sceneId]/generate-segments/route.ts"
sed -i '' 's/MAX_SEGMENT_DURATION = 8.0/MAX_SEGMENT_DURATION = 12.0/g' "src/app/api/scenes/[sceneId]/generate-segments/route.ts"
sed -i '' 's/8s/12s/g' "src/app/api/scenes/[sceneId]/generate-segments/route.ts"
sed -i '' 's/8 seconds/12 seconds/g' "src/app/api/scenes/[sceneId]/generate-segments/route.ts"
sed -i '' 's/4, 6, or 8/4, 6, 8, 10, or 12/g' "src/app/api/scenes/[sceneId]/generate-segments/route.ts"
sed -i '' 's/4\/6\/8s/4\/6\/8\/10\/12s/g' "src/app/api/scenes/[sceneId]/generate-segments/route.ts"
sed -i '' 's/maxDuration: number = 8/maxDuration: number = 12/g' "src/app/api/scenes/[sceneId]/generate-segments/route.ts"

# UI files
sed -i '' 's/CLIENT_MAX_SEGMENT_DURATION = 8/CLIENT_MAX_SEGMENT_DURATION = 12/g' src/components/vision/scene-production/SegmentBuilder.tsx
sed -i '' 's/4, 6, or 8s/4, 6, 8, 10, or 12s/g' src/components/vision/scene-production/SegmentBuilder.tsx
sed -i '' 's/4–8s/4–12s/g' src/components/vision/scene-production/SegmentBuilder.tsx
sed -i '' 's/8s/12s/g' src/components/vision/scene-production/SceneProductionManager.tsx
sed -i '' 's/8s/12s/g' src/components/vision/scene-production/SceneTimelineV2.tsx
sed -i '' 's/8s/12s/g' src/components/vision/scene-production/AddSegmentDialog.tsx
sed -i '' 's/8s/12s/g' src/types/scene-direction.ts
sed -i '' 's/MAX_SEGMENT_SECONDS = 8/MAX_SEGMENT_SECONDS = 12/g' src/components/vision/scene-production/SceneTimelineV2.tsx
sed -i '' 's/MAX_SEGMENT_SECONDS = 8/MAX_SEGMENT_SECONDS = 12/g' src/app/dashboard/workflow/vision/[projectId]/page.tsx
sed -i '' 's/8s/12s/g' src/components/vision/scene-production/audioTrackBuilder.ts

# Fixes in tests
sed -i '' 's/8s/12s/g' src/__tests__/veoDuration.test.ts
sed -i '' 's/8s/12s/g' src/__tests__/audioTrackBuilderDialogueStagger.test.ts

