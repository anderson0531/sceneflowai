const { put } = require('@vercel/blob');
const fs = require('fs');

const BLOB_TOKEN = 'vercel_blob_rw_xXAvFKdHDEbrqidA_COR0OTjWdxUilIlvAlUSlT81aUZLvS';
const videoPath = '/Users/briananderson/Downloads/SceneFlow AI Demo.mp4';

async function upload() {
  const stats = fs.statSync(videoPath);
  const sizeMB = stats.size / 1024 / 1024;
  console.log('File size:', sizeMB.toFixed(2), 'MB');
  console.log('Starting upload... (this may take several minutes for large files)');
  
  const startTime = Date.now();
  
  // Read file into buffer for large file upload
  console.log('Reading file into memory...');
  const fileBuffer = fs.readFileSync(videoPath);
  console.log('File loaded, uploading to Vercel Blob...');
  
  const blob = await put('demo/sceneflow-demo-v2.mp4', fileBuffer, {
    access: 'public',
    contentType: 'video/mp4',
    token: BLOB_TOKEN,
    multipart: true, // Enable multipart upload for large files
  });
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Upload complete in ${elapsed}s!`);
  console.log('Blob URL:', blob.url);
}

upload().catch(err => {
  console.error('Upload failed:', err.message);
  process.exit(1);
});
