/**
 * Upload helper functions
 * 
 * These functions delegate to the appropriate storage backend (GCS).
 * They use dynamic imports to avoid bundling server-only code in client builds.
 */

export async function uploadAssetToBlob(
  file: File | Blob,
  filename: string,
  projectId: string
): Promise<string> {
  // Dynamic import to avoid bundling @google-cloud/storage in client builds
  const { uploadAsset } = await import('./gcsAssets');
  return uploadAsset(file, filename, projectId);
}

export async function uploadGeneratedVideo(
  videoBlob: Blob,
  projectId: string
): Promise<string> {
  const filename = `final-video-${Date.now()}.mp4`;
  return uploadAssetToBlob(videoBlob, filename, projectId);
}

