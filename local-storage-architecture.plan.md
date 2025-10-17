# Local Storage Architecture for Images and Videos

## Overview

Implement local storage for all generated content (images, videos, thumbnails) using browser-based storage with file references. This eliminates cloud storage costs, gives users full control of their content, and aligns with professional tools like CapCut.

## Current Architecture (Cloud Storage)

❌ **Current approach:**
- Generate image → Upload to Vercel Blob
- Store Blob URL in database
- Costs accumulate with storage
- User doesn't own the files
- Requires `BLOB_READ_WRITE_TOKEN`

## Target Architecture (Local Storage)

✅ **New approach:**
- Generate image → Save to browser IndexedDB
- Store local reference ID in database
- Zero storage costs
- User owns files locally
- Can export/backup anytime
- Can regenerate if lost

## Benefits

✅ **Zero storage costs** - No Vercel Blob, S3, or GCS fees  
✅ **User control** - Files stay on user's device  
✅ **Privacy** - Content never leaves user's machine  
✅ **Fast access** - Local files load instantly  
✅ **Regenerable** - Lost files can be recreated from project data  
✅ **Professional workflow** - Matches CapCut, Premiere Pro philosophy  
✅ **Offline capable** - View content without internet  

## Storage Strategy

### 1. IndexedDB for Binary Data

Use browser IndexedDB to store:
- Thumbnails (images)
- Character images
- Scene images
- Generated video files
- Audio files (TTS output)

**Storage limits:**
- Chrome: ~50% of available disk space
- Safari: ~1 GB
- Firefox: ~10 GB
- More than enough for project assets

### 2. Database Stores References Only

In PostgreSQL (Supabase), store:
- Project metadata
- File reference IDs
- Generation parameters (for regeneration)
- File type, size, created date

**Example:**
```typescript
{
  thumbnailRef: 'thumb-abc123',  // Not a URL, just a reference ID
  thumbnailParams: { prompt: '...', model: 'imagen-3.0' }, // For regeneration
  scenes: [
    {
      sceneId: 1,
      imageRef: 'scene-1-xyz456',
      imageParams: { prompt: '...', style: '...' }
    }
  ]
}
```

## Implementation

### 1. Create Local Storage Helper

**New file**: `src/lib/storage/local.ts`

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface SceneFlowDB extends DBSchema {
  images: {
    key: string // Reference ID
    value: {
      id: string
      data: Blob
      mimeType: string
      projectId: string
      type: 'thumbnail' | 'scene' | 'character' | 'video'
      createdAt: number
      size: number
    }
  }
  videos: {
    key: string
    value: {
      id: string
      data: Blob
      mimeType: string
      projectId: string
      createdAt: number
      size: number
      duration: number
    }
  }
  audio: {
    key: string
    value: {
      id: string
      data: Blob
      mimeType: string
      projectId: string
      createdAt: number
      size: number
    }
  }
}

let db: IDBPDatabase<SceneFlowDB> | null = null

async function getDB(): Promise<IDBPDatabase<SceneFlowDB>> {
  if (!db) {
    db = await openDB<SceneFlowDB>('sceneflow-assets', 1, {
      upgrade(db) {
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('audio')) {
          db.createObjectStore('audio', { keyPath: 'id' })
        }
      }
    })
  }
  return db
}

/**
 * Save image to local IndexedDB
 * @param base64Data - Base64 encoded image data
 * @param metadata - Image metadata (projectId, type, etc.)
 * @returns Reference ID for the stored image
 */
export async function saveImageLocally(
  base64Data: string,
  metadata: {
    projectId: string
    type: 'thumbnail' | 'scene' | 'character'
  }
): Promise<string> {
  const db = await getDB()
  
  // Convert base64 to Blob
  const base64WithoutPrefix = base64Data.replace(/^data:image\/\w+;base64,/, '')
  const mimeMatch = base64Data.match(/^data:(image\/\w+);base64,/)
  const mimeType = mimeMatch?.[1] || 'image/png'
  
  const buffer = Buffer.from(base64WithoutPrefix, 'base64')
  const blob = new Blob([buffer], { type: mimeType })
  
  // Generate unique ID
  const id = `${metadata.type}-${metadata.projectId}-${Date.now()}`
  
  // Store in IndexedDB
  await db.put('images', {
    id,
    data: blob,
    mimeType,
    projectId: metadata.projectId,
    type: metadata.type,
    createdAt: Date.now(),
    size: blob.size
  })
  
  console.log(`[Local Storage] Saved image: ${id} (${(blob.size / 1024).toFixed(1)} KB)`)
  
  return id
}

/**
 * Get image from local IndexedDB
 * @param id - Reference ID
 * @returns Data URL for displaying in <img> tag
 */
export async function getImageLocally(id: string): Promise<string | null> {
  const db = await getDB()
  const image = await db.get('images', id)
  
  if (!image) {
    console.warn(`[Local Storage] Image not found: ${id}`)
    return null
  }
  
  // Convert Blob to data URL
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(image.data)
  })
}

/**
 * Delete image from local storage
 */
export async function deleteImageLocally(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('images', id)
  console.log(`[Local Storage] Deleted image: ${id}`)
}

/**
 * Get all images for a project
 */
export async function getProjectImages(projectId: string): Promise<Array<{ id: string; type: string; size: number }>> {
  const db = await getDB()
  const allImages = await db.getAll('images')
  
  return allImages
    .filter(img => img.projectId === projectId)
    .map(img => ({
      id: img.id,
      type: img.type,
      size: img.size
    }))
}

/**
 * Export project assets as zip for backup/download
 */
export async function exportProjectAssets(projectId: string): Promise<Blob> {
  const db = await getDB()
  const images = await db.getAll('images')
  const videos = await db.getAll('videos')
  const audio = await db.getAll('audio')
  
  const projectImages = images.filter(img => img.projectId === projectId)
  const projectVideos = videos.filter(vid => vid.projectId === projectId)
  const projectAudio = audio.filter(aud => aud.projectId === projectId)
  
  // Use JSZip to create download
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  
  projectImages.forEach((img, i) => {
    zip.file(`images/${img.type}-${i}.png`, img.data)
  })
  
  projectVideos.forEach((vid, i) => {
    zip.file(`videos/video-${i}.mp4`, vid.data)
  })
  
  projectAudio.forEach((aud, i) => {
    zip.file(`audio/audio-${i}.mp3`, aud.data)
  })
  
  return await zip.generateAsync({ type: 'blob' })
}

/**
 * Clear storage for a deleted project
 */
export async function clearProjectAssets(projectId: string): Promise<void> {
  const db = await getDB()
  
  // Get all assets for project
  const allImages = await db.getAll('images')
  const allVideos = await db.getAll('videos')
  const allAudio = await db.getAll('audio')
  
  // Delete matching assets
  const imagesToDelete = allImages.filter(img => img.projectId === projectId)
  const videosToDelete = allVideos.filter(vid => vid.projectId === projectId)
  const audioToDelete = allAudio.filter(aud => aud.projectId === projectId)
  
  for (const img of imagesToDelete) {
    await db.delete('images', img.id)
  }
  for (const vid of videosToDelete) {
    await db.delete('videos', vid.id)
  }
  for (const aud of audioToDelete) {
    await db.delete('audio', aud.id)
  }
  
  console.log(`[Local Storage] Cleared ${imagesToDelete.length} images, ${videosToDelete.length} videos, ${audioToDelete.length} audio files`)
}
```

### 2. Update Thumbnail Generation Route

**File**: `src/app/api/projects/generate-thumbnail/route.ts`

**Changes:**
```typescript
// Remove Vercel Blob upload
// import { uploadImageToBlob } from '@/lib/storage/blob' // REMOVE

export async function POST(request: NextRequest) {
  // ... generate image with Vertex AI
  
  const base64Image = await callVertexAIImagen(enhancedPrompt, {
    aspectRatio: '16:9',
    numberOfImages: 1
  })
  
  // Don't upload to cloud - return base64 for client to store locally
  return NextResponse.json({ 
    success: true, 
    imageData: base64Image, // Return base64, not URL
    model: 'imagen-3.0-generate-001',
    provider: 'vertex-ai-imagen-3',
    storageType: 'local' // Client will handle storage
  })
}
```

### 3. Update Frontend to Store Locally

**File**: `src/app/dashboard/components/ProjectCard.tsx`

```typescript
import { saveImageLocally, getImageLocally } from '@/lib/storage/local'

const handleGenerateThumbnail = async () => {
  try {
    setIsGeneratingThumbnail(true)
    
    // Call API to generate image (returns base64, not URL)
    const res = await fetch('/api/projects/generate-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        description: project.description,
        title: project.title
      })
    })
    
    const data = await res.json()
    
    if (data.success && data.imageData) {
      // Save to local IndexedDB
      const localRef = await saveImageLocally(data.imageData, {
        projectId: project.id,
        type: 'thumbnail'
      })
      
      // Update project metadata with local reference (not URL)
      await fetch(`/api/projects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: project.id,
          metadata: {
            ...project.metadata,
            thumbnailRef: localRef, // Local reference, not URL
            thumbnailParams: {
              prompt: data.prompt,
              model: data.model
            }
          }
        })
      })
      
      toast.success('Thumbnail generated and saved locally')
      
      // Refresh project to show new thumbnail
      loadProjects()
    }
  } catch (error) {
    toast.error('Failed to generate thumbnail')
  } finally {
    setIsGeneratingThumbnail(false)
  }
}

// Load thumbnail from local storage
useEffect(() => {
  if (project.metadata?.thumbnailRef) {
    getImageLocally(project.metadata.thumbnailRef)
      .then(dataUrl => {
        if (dataUrl) setThumbnailUrl(dataUrl)
      })
  }
}, [project.metadata?.thumbnailRef])
```

### 4. Add Export/Backup Feature

**New component**: `src/components/project/ExportButton.tsx`

```typescript
import { exportProjectAssets } from '@/lib/storage/local'

export function ExportButton({ projectId }: { projectId: string }) {
  const handleExport = async () => {
    const zipBlob = await exportProjectAssets(projectId)
    
    // Download zip file
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `project-${projectId}-assets.zip`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  return (
    <button onClick={handleExport}>
      Export Assets (.zip)
    </button>
  )
}
```

## Migration Plan

### Phase 1: Remove Vercel Blob Dependency

1. ✅ Remove `uploadImageToBlob` calls
2. ✅ Return base64 data from API instead of URLs
3. ✅ No need for `BLOB_READ_WRITE_TOKEN`

### Phase 2: Implement Local Storage

1. ✅ Install `idb` package for IndexedDB helper
2. ✅ Create `src/lib/storage/local.ts` helper
3. ✅ Update frontend to save/load from IndexedDB

### Phase 3: Update All Image/Video Generation

1. ✅ Thumbnails → local storage
2. ✅ Character images → local storage
3. ✅ Scene images → local storage
4. ✅ Generated videos → local storage
5. ✅ TTS audio → local storage

### Phase 4: Add Export/Backup Features

1. ✅ Export project assets as .zip
2. ✅ Import/restore assets
3. ✅ Clear cache for deleted projects

## Technical Considerations

### Storage Limits

**Per-domain limits:**
- Chrome: ~50% disk space (~100-500 GB on modern machines)
- Safari: ~1 GB (can request more via quota API)
- Firefox: ~10 GB

**Workaround for Safari:**
```typescript
// Request persistent storage (prevents eviction)
if (navigator.storage && navigator.storage.persist) {
  await navigator.storage.persist()
}

// Request quota increase
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate()
  console.log(`Storage: ${estimate.usage} / ${estimate.quota}`)
}
```

### Regeneration Logic

If file is missing (user cleared browser data):

```typescript
async function getThumbnail(project: Project): Promise<string | null> {
  // Try to load from local storage
  const localData = await getImageLocally(project.metadata.thumbnailRef)
  
  if (localData) {
    return localData // Found locally
  }
  
  // Not found - show regenerate button
  return null // UI shows "Regenerate Thumbnail" button
}
```

### Cross-Device Sync (Future Enhancement)

For users working across devices:
- Export assets to cloud (user's choice: Google Drive, Dropbox, etc.)
- Or offer paid cloud backup feature
- Or project-by-project export/import

## UX Flow

### Creating a Project with Thumbnail

1. User clicks "Generate Thumbnail"
2. API generates image with Vertex AI Imagen
3. API returns base64 image data
4. **Frontend saves to IndexedDB**
5. **Frontend updates project metadata** with reference ID
6. Thumbnail displays immediately from local storage

### Loading Projects List

1. Fetch projects from database (metadata only)
2. For each project with `thumbnailRef`:
   - Load thumbnail from IndexedDB
   - Display in ProjectCard
3. If thumbnail missing → Show "Regenerate" button

### Deleting a Project

1. Delete project from database
2. **Also clear local assets** via `clearProjectAssets(projectId)`
3. Frees up local storage space

## Implementation Order

1. **Install dependencies:**
   ```bash
   npm install idb
   ```

2. **Create local storage helper** (`src/lib/storage/local.ts`)

3. **Update thumbnail generation:**
   - Remove Vercel Blob upload
   - Return base64 from API
   - Save to IndexedDB on frontend

4. **Update ProjectCard:**
   - Load thumbnails from IndexedDB
   - Show regenerate button if missing

5. **Update scene/character generation:**
   - Same pattern for all images

6. **Add export feature:**
   - Download project assets as zip

## Cost Savings

**Before (Cloud Storage):**
- Vercel Blob: $0.15/GB stored + $0.20/GB transfer
- 100 projects × 5 MB/project = 500 MB = ~$15/year + transfer

**After (Local Storage):**
- **$0** storage costs
- **$0** transfer costs
- Users manage their own storage

## Fallback for Missing Files

If user clears browser data and loses assets:

```typescript
<div className="border-dashed border-2 p-4 text-center">
  <p>Thumbnail not found locally</p>
  <button onClick={regenerateThumbnail}>
    Regenerate Thumbnail
  </button>
</div>
```

The project metadata has all parameters needed to regenerate!

---

## Next Steps

**Would you like me to:**

1. **Implement local storage architecture now** (removes Vercel Blob, adds IndexedDB)
2. **Keep current approach temporarily** (until app is more stable)
3. **Hybrid approach** (local storage for images, cloud for videos due to size)

This is a great architectural decision that makes the app more user-friendly and cost-effective!

