# Scene Render Feature Implementation Plan

## Status: Phase 1 Complete ✅

### Completed Work (Phase 1)

1. **UI Components**
   - ✅ `SceneRenderDialog.tsx` - Dialog for configuring and triggering scene renders
   - ✅ "Render Scene" button added to `DirectorConsole.tsx` header
   - ✅ `Progress` UI component created

2. **Type Definitions**
   - ✅ `SceneRenderVideoSegment` - Video segment with URL and timing
   - ✅ `SceneRenderAudioClip` - Audio clip with type and character info
   - ✅ `SceneRenderJobSpec` - Complete job specification for scene renders
   - ✅ `CreateSceneRenderJobRequest` - API request type
   - ✅ `SceneRenderAudioConfig` - Audio track selection config

3. **API Routes**
   - ✅ `POST /api/scene/[sceneId]/render` - Create scene render job
   - ✅ `GET /api/scene/[sceneId]/render?jobId=xxx` - Check job status
   - ✅ `POST /api/scene/[sceneId]/render/callback` - Cloud Run callback

4. **Backend Services**
   - ✅ `createSceneRenderJob()` in CloudRunJobsService
   - ✅ `triggerSceneRenderJob()` for Cloud Run job triggering

5. **FFmpeg Renderer Updates**
   - ✅ `build_concat_ffmpeg_command()` for video concatenation
   - ✅ `render_video_concatenation()` function in render.py
   - ✅ Support for `RENDER_MODE=concatenate` environment variable
   - ✅ Video file download support

### Next Steps (Phase 2 - Deployment)

1. **Deploy Cloud Run FFmpeg Renderer**
   ```bash
   # Build and push Docker image
   cd docker/ffmpeg-renderer
   gcloud builds submit --tag gcr.io/YOUR_PROJECT/sceneflow-ffmpeg-renderer
   
   # Deploy Cloud Run Job
   gcloud run jobs update sceneflow-ffmpeg-renderer \
     --image gcr.io/YOUR_PROJECT/sceneflow-ffmpeg-renderer \
     --region us-central1
   ```

2. **Environment Variables**
   - Ensure these are set in Vercel:
     - `GCP_PROJECT_ID` - Your GCP project ID
     - `GCP_REGION` - Cloud Run region (default: us-central1)
     - `CLOUD_RUN_JOB_NAME` - Name of Cloud Run job (sceneflow-ffmpeg-renderer)
     - `RENDER_BUCKET` - GCS bucket for render outputs

3. **Test Render Flow**
   - Generate video segments in Director's Console
   - Click "Render Scene" button
   - Select audio tracks
   - Choose resolution
   - Monitor progress
   - Download final MP4

### Phase 3 - Enhancements

1. **Audio Timing Improvements**
   - Calculate actual audio durations from MP3/WAV files
   - Sync dialogue timing with segment assignments
   - Support for per-segment audio placement

2. **Persistent Job Storage**
   - Replace in-memory job status with database
   - Job history and download link retention

3. **Preview Mode**
   - Low-res preview render for quick review
   - Preview with selected audio tracks before full render

4. **Batch Scene Rendering**
   - Render multiple scenes at once
   - Progress tracking across scene batch

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Director's Console                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Play Scene  │  │Render Scene │  │    Generate (n)     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   SceneRenderDialog                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Video Segments: 5 of 5 ready           Duration: 0:24│   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Audio Tracks:                                        │   │
│  │ [✓] Narration     0:24                              │   │
│  │ [✓] Dialogue      4 clips                           │   │
│  │ [ ] Music         0:30                              │   │
│  │ [ ] SFX           0:05                              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Resolution: [1080p ▼]                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                    [Cancel] [Render Scene]  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            POST /api/scene/[sceneId]/render                  │
│  • Validate segments have video URLs                         │
│  • Build job spec with video segments + audio clips          │
│  • Upload job_spec.json to GCS                              │
│  • Trigger Cloud Run Job                                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Cloud Run Job: FFmpeg Renderer                 │
│  • Download video segments from GCS/URLs                    │
│  • Download audio clips from GCS/URLs                       │
│  • Run FFmpeg: concatenate videos + mix audio               │
│  • Upload final MP4 to GCS                                  │
│  • POST callback with signed download URL                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         POST /api/scene/[sceneId]/render/callback           │
│  • Update job status to COMPLETED                           │
│  • Store signed download URL                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SceneRenderDialog (polling)                     │
│  • Detects COMPLETED status                                 │
│  • Shows "Download MP4" button                              │
└─────────────────────────────────────────────────────────────┘
```

### Files Modified/Created

| File | Change |
|------|--------|
| `src/lib/video/renderTypes.ts` | Added scene render type definitions |
| `src/lib/video/CloudRunJobsService.ts` | Added `createSceneRenderJob()` |
| `src/app/api/scene/[sceneId]/render/route.ts` | NEW: Scene render API |
| `src/app/api/scene/[sceneId]/render/callback/route.ts` | NEW: Callback API |
| `src/components/ui/progress.tsx` | NEW: Progress bar component |
| `src/components/vision/scene-production/SceneRenderDialog.tsx` | NEW: Render dialog |
| `src/components/vision/scene-production/DirectorConsole.tsx` | Added button + dialog |
| `src/components/vision/ScriptPanel.tsx` | Added projectId prop |
| `docker/ffmpeg-renderer/render.py` | Added concatenation mode |
| `docker/ffmpeg-renderer/ffmpeg_utils.py` | Added `build_concat_ffmpeg_command()` |

### Commit Message

```
feat(render): Add "Render Scene" feature for MP4 export

- Add SceneRenderDialog for configuring audio tracks and resolution
- Add "Render Scene" button to Director's Console header
- Create /api/scene/[sceneId]/render API route
- Extend CloudRunJobsService with createSceneRenderJob()
- Update FFmpeg renderer to support video concatenation mode
- Add Progress UI component
- Support for narration, dialogue, music, and SFX audio mixing
```
