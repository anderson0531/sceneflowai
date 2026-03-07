/**
 * IndexedDB Storage for Rendered Videos
 * 
 * Provides client-side persistence for rendered video files.
 * Videos are stored locally in the browser for offline access and
 * faster retrieval, while cloud URLs are used as the primary source.
 * 
 * Storage Strategy:
 * - Videos are stored with a reference key (projectId + sceneId)
 * - Cloud URL is stored alongside the blob for fallback
 * - Blobs can be retrieved even when offline
 * - Storage is automatically cleaned up for old/unused videos
 * 
 * NOTE: This module is safe to import on the server side.
 * All functions check for browser environment before accessing IndexedDB.
 */

// SSR guard - check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined'

const DB_NAME = 'sceneflow-renders'
const DB_VERSION = 1
const VIDEOS_STORE = 'videos'

// Maximum age for cached videos (7 days)
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000

export interface StoredVideo {
  /** Unique key: `${projectId}-${sceneId}-${language}` */
  id: string
  /** The video blob data */
  blob: Blob
  /** MIME type (video/mp4, video/webm) */
  mimeType: string
  /** Cloud URL for fallback */
  cloudUrl: string
  /** Project ID */
  projectId: string
  /** Scene ID */
  sceneId: string
  /** Language code */
  language: string
  /** When the video was stored */
  createdAt: number
  /** File size in bytes */
  size: number
}

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Get or create the IndexedDB database
 */
function getDB(): Promise<IDBDatabase> {
  // SSR guard
  if (!isBrowser) {
    return Promise.reject(new Error('IndexedDB not available (server-side)'))
  }
  
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[IndexedDB] Failed to open database:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      console.log('[IndexedDB] Database opened successfully')
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      console.log('[IndexedDB] Upgrading database schema')
      const db = (event.target as IDBOpenDBRequest).result

      // Create videos store if it doesn't exist
      if (!db.objectStoreNames.contains(VIDEOS_STORE)) {
        const store = db.createObjectStore(VIDEOS_STORE, { keyPath: 'id' })
        // Index by project for cleanup queries
        store.createIndex('projectId', 'projectId', { unique: false })
        // Index by creation date for cleanup
        store.createIndex('createdAt', 'createdAt', { unique: false })
        console.log('[IndexedDB] Created videos store')
      }
    }
  })

  return dbPromise
}

/**
 * Generate a storage key for a video
 */
export function getVideoKey(projectId: string, sceneId: string, language: string = 'en'): string {
  return `${projectId}-${sceneId}-${language}`
}

/**
 * Store a rendered video in IndexedDB
 */
export async function storeVideo(
  projectId: string,
  sceneId: string,
  language: string,
  blob: Blob,
  cloudUrl: string
): Promise<void> {
  // SSR guard - silently no-op on server
  if (!isBrowser) {
    return
  }
  
  try {
    const db = await getDB()
    const id = getVideoKey(projectId, sceneId, language)

    const video: StoredVideo = {
      id,
      blob,
      mimeType: blob.type || 'video/mp4',
      cloudUrl,
      projectId,
      sceneId,
      language,
      createdAt: Date.now(),
      size: blob.size,
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(VIDEOS_STORE, 'readwrite')
      const store = tx.objectStore(VIDEOS_STORE)
      const request = store.put(video)

      request.onsuccess = () => {
        console.log(`[IndexedDB] Stored video: ${id} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Failed to store video:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[IndexedDB] Error storing video:', error)
    // Don't throw - local storage is optional
  }
}

/**
 * Retrieve a video from IndexedDB
 * Returns the blob URL if found, or null
 */
export async function getVideo(
  projectId: string,
  sceneId: string,
  language: string = 'en'
): Promise<{ blobUrl: string; cloudUrl: string } | null> {
  // SSR guard - return null on server
  if (!isBrowser) {
    return null
  }
  
  try {
    const db = await getDB()
    const id = getVideoKey(projectId, sceneId, language)

    return new Promise((resolve, reject) => {
      const tx = db.transaction(VIDEOS_STORE, 'readonly')
      const store = tx.objectStore(VIDEOS_STORE)
      const request = store.get(id)

      request.onsuccess = () => {
        const video = request.result as StoredVideo | undefined
        if (video) {
          // Check if the cached video is still valid
          if (Date.now() - video.createdAt > MAX_CACHE_AGE_MS) {
            console.log(`[IndexedDB] Video expired, removing: ${id}`)
            deleteVideo(projectId, sceneId, language)
            resolve(null)
            return
          }

          const blobUrl = URL.createObjectURL(video.blob)
          console.log(`[IndexedDB] Retrieved video from cache: ${id}`)
          resolve({ blobUrl, cloudUrl: video.cloudUrl })
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        console.error('[IndexedDB] Failed to get video:', request.error)
        resolve(null) // Don't reject, just return null
      }
    })
  } catch (error) {
    console.error('[IndexedDB] Error getting video:', error)
    return null
  }
}

/**
 * Check if a video exists in IndexedDB
 */
export async function hasVideo(
  projectId: string,
  sceneId: string,
  language: string = 'en'
): Promise<boolean> {
  try {
    const db = await getDB()
    const id = getVideoKey(projectId, sceneId, language)

    return new Promise((resolve) => {
      const tx = db.transaction(VIDEOS_STORE, 'readonly')
      const store = tx.objectStore(VIDEOS_STORE)
      const request = store.count(IDBKeyRange.only(id))

      request.onsuccess = () => resolve(request.result > 0)
      request.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

/**
 * Delete a specific video from IndexedDB
 */
export async function deleteVideo(
  projectId: string,
  sceneId: string,
  language: string = 'en'
): Promise<void> {
  try {
    const db = await getDB()
    const id = getVideoKey(projectId, sceneId, language)

    return new Promise((resolve, reject) => {
      const tx = db.transaction(VIDEOS_STORE, 'readwrite')
      const store = tx.objectStore(VIDEOS_STORE)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log(`[IndexedDB] Deleted video: ${id}`)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Failed to delete video:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[IndexedDB] Error deleting video:', error)
  }
}

/**
 * Delete all videos for a project
 */
export async function deleteProjectVideos(projectId: string): Promise<void> {
  try {
    const db = await getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(VIDEOS_STORE, 'readwrite')
      const store = tx.objectStore(VIDEOS_STORE)
      const index = store.index('projectId')
      const request = index.openCursor(IDBKeyRange.only(projectId))

      let deletedCount = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          console.log(`[IndexedDB] Deleted ${deletedCount} videos for project: ${projectId}`)
          resolve()
        }
      }

      request.onerror = () => {
        console.error('[IndexedDB] Failed to delete project videos:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[IndexedDB] Error deleting project videos:', error)
  }
}

/**
 * Clean up old cached videos to free storage space
 */
export async function cleanupOldVideos(): Promise<void> {
  try {
    const db = await getDB()
    const cutoffTime = Date.now() - MAX_CACHE_AGE_MS

    return new Promise((resolve, reject) => {
      const tx = db.transaction(VIDEOS_STORE, 'readwrite')
      const store = tx.objectStore(VIDEOS_STORE)
      const index = store.index('createdAt')
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime))

      let deletedCount = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          if (deletedCount > 0) {
            console.log(`[IndexedDB] Cleaned up ${deletedCount} old videos`)
          }
          resolve()
        }
      }

      request.onerror = () => {
        console.error('[IndexedDB] Failed to cleanup old videos:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[IndexedDB] Error cleaning up videos:', error)
  }
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  videoCount: number
  totalSize: number
  oldestVideo: number | null
}> {
  try {
    const db = await getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(VIDEOS_STORE, 'readonly')
      const store = tx.objectStore(VIDEOS_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const videos = request.result as StoredVideo[]
        const totalSize = videos.reduce((sum, v) => sum + v.size, 0)
        const oldestVideo = videos.length > 0
          ? Math.min(...videos.map(v => v.createdAt))
          : null

        resolve({
          videoCount: videos.length,
          totalSize,
          oldestVideo,
        })
      }

      request.onerror = () => {
        console.error('[IndexedDB] Failed to get storage stats:', request.error)
        resolve({ videoCount: 0, totalSize: 0, oldestVideo: null })
      }
    })
  } catch {
    return { videoCount: 0, totalSize: 0, oldestVideo: null }
  }
}

/**
 * Fetch a video from a URL and store it in IndexedDB
 */
export async function cacheVideoFromUrl(
  projectId: string,
  sceneId: string,
  language: string,
  cloudUrl: string
): Promise<string> {
  // SSR guard - return cloud URL on server
  if (!isBrowser) {
    return cloudUrl
  }
  
  // First check if we already have it cached
  const cached = await getVideo(projectId, sceneId, language)
  if (cached) {
    return cached.blobUrl
  }

  try {
    // Fetch the video
    console.log(`[IndexedDB] Caching video from: ${cloudUrl.substring(0, 50)}...`)
    const response = await fetch(cloudUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`)
    }

    const blob = await response.blob()
    
    // Store in IndexedDB
    await storeVideo(projectId, sceneId, language, blob, cloudUrl)
    
    // Return a blob URL
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('[IndexedDB] Failed to cache video:', error)
    // Return the cloud URL as fallback
    return cloudUrl
  }
}
