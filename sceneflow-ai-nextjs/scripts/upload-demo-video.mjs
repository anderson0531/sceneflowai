#!/usr/bin/env node

import { put } from '@vercel/blob';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load env vars
config({ path: '.env.vercel.local' });

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!BLOB_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN not found in environment');
  process.exit(1);
}

const videoPath = process.argv[2];
if (!videoPath) {
  console.error('Usage: node upload-demo-video.mjs <video-file-path>');
  process.exit(1);
}

async function uploadVideo() {
  console.log('Reading video file:', videoPath);
  const videoBuffer = readFileSync(videoPath);
  
  console.log('Uploading to Vercel Blob...');
  console.log('File size:', (videoBuffer.length / 1024 / 1024).toFixed(2), 'MB');
  
  const blob = await put('demo/sceneflow-demo.mp4', videoBuffer, {
    access: 'public',
    contentType: 'video/mp4',
    token: BLOB_TOKEN,
  });
  
  console.log('Upload successful!');
  console.log('Blob URL:', blob.url);
  console.log('\nUpdate HeroSection.tsx with this URL for the demo video.');
}

uploadVideo().catch(console.error);
