import { put } from '@vercel/blob';

export async function uploadAssetToBlob(
  file: File | Blob,
  filename: string,
  projectId: string
): Promise<string> {
  const blob = await put(`projects/${projectId}/assets/${filename}`, file, {
    access: 'public',
    addRandomSuffix: true
  });
  
  return blob.url;
}

export async function uploadGeneratedVideo(
  videoBlob: Blob,
  projectId: string
): Promise<string> {
  const filename = `final-video-${Date.now()}.mp4`;
  return uploadAssetToBlob(videoBlob, filename, projectId);
}

