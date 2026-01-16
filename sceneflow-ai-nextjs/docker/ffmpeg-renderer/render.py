"""
SceneFlow AI Video Renderer for GCP Cloud Run Jobs

This script:
1. Reads job specification from GCS
2. Downloads image/video and audio assets to local /tmp
3. Executes FFmpeg with Ken Burns effects (images) or concatenation (videos)
4. Uploads the final MP4 back to GCS
5. Updates job status via callback URL

Environment Variables:
- JOB_SPEC_PATH: GCS path to job_spec.json (gs://bucket/path/to/job.json)
- GCS_BUCKET: Default GCS bucket for outputs (optional, can be in job spec)
- CALLBACK_URL: URL to POST status updates (optional)
- RENDER_MODE: 'ken_burns' (default) or 'concatenate' for video segments
"""

import os
import sys
import json
import time
import hashlib
import requests
from typing import Dict, Any, Optional
from urllib.parse import urlparse
from google.cloud import storage
from ffmpeg_utils import build_ffmpeg_command, build_concat_ffmpeg_command, run_ffmpeg

# Constants
TEMP_DIR = '/tmp'
ASSETS_DIR = os.path.join(TEMP_DIR, 'assets')
OUTPUT_DIR = os.path.join(TEMP_DIR, 'output')


def log(message: str, level: str = 'INFO'):
    """Log message with timestamp."""
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] [{level}] {message}")


def download_from_gcs(gcs_path: str, local_path: str) -> bool:
    """
    Download file from GCS to local path.
    
    Args:
        gcs_path: GCS URI (gs://bucket/path/to/file)
        local_path: Local file path to save to
    
    Returns:
        True if successful, False otherwise
    """
    try:
        # Parse GCS URI
        if not gcs_path.startswith('gs://'):
            log(f"Invalid GCS path: {gcs_path}", 'ERROR')
            return False
        
        path_parts = gcs_path[5:].split('/', 1)
        bucket_name = path_parts[0]
        blob_name = path_parts[1] if len(path_parts) > 1 else ''
        
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        blob.download_to_filename(local_path)
        log(f"Downloaded: {gcs_path} -> {local_path}")
        return True
        
    except Exception as e:
        log(f"Failed to download {gcs_path}: {e}", 'ERROR')
        return False


def download_from_url(url: str, local_path: str) -> bool:
    """
    Download file from HTTP/HTTPS URL to local path.
    
    Args:
        url: HTTP/HTTPS URL
        local_path: Local file path to save to
    
    Returns:
        True if successful, False otherwise
    """
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()
        
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        log(f"Downloaded: {url[:60]}... -> {local_path}")
        return True
        
    except Exception as e:
        log(f"Failed to download {url[:60]}...: {e}", 'ERROR')
        return False


def download_asset(url: str, asset_type: str, index: int) -> Optional[str]:
    """
    Download an asset (image, video, or audio) from URL or GCS.
    
    Args:
        url: Asset URL (GCS, HTTP, or HTTPS)
        asset_type: 'image', 'video', or 'audio'
        index: Index for naming
    
    Returns:
        Local filename (relative to ASSETS_DIR) or None if failed
    """
    # Generate deterministic filename from URL
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    
    # Determine file extension based on asset type
    parsed = urlparse(url)
    path = parsed.path.lower()
    
    if asset_type == 'image':
        ext = '.jpg' if '.jpg' in path or '.jpeg' in path else '.png'
    elif asset_type == 'video':
        ext = '.mp4' if '.mp4' in path else '.webm' if '.webm' in path else '.mov' if '.mov' in path else '.mp4'
    else:  # audio
        ext = '.mp3' if '.mp3' in path else '.wav' if '.wav' in path else '.m4a'
    
    filename = f"{asset_type}_{index:03d}_{url_hash}{ext}"
    local_path = os.path.join(ASSETS_DIR, filename)
    
    # Download based on URL type
    if url.startswith('gs://'):
        success = download_from_gcs(url, local_path)
    else:
        success = download_from_url(url, local_path)
    
    return filename if success else None


def upload_to_gcs(local_path: str, gcs_path: str) -> bool:
    """
    Upload file from local path to GCS.
    
    Args:
        local_path: Local file path
        gcs_path: GCS URI (gs://bucket/path/to/file)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        # Parse GCS URI
        if not gcs_path.startswith('gs://'):
            log(f"Invalid GCS path: {gcs_path}", 'ERROR')
            return False
        
        path_parts = gcs_path[5:].split('/', 1)
        bucket_name = path_parts[0]
        blob_name = path_parts[1] if len(path_parts) > 1 else ''
        
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        blob.upload_from_filename(local_path)
        log(f"Uploaded: {local_path} -> {gcs_path}")
        return True
        
    except Exception as e:
        log(f"Failed to upload to {gcs_path}: {e}", 'ERROR')
        return False


def send_callback(
    callback_url: str,
    job_id: str,
    status: str,
    progress: int = 0,
    output_url: Optional[str] = None,
    error: Optional[str] = None,
):
    """
    Send status update to callback URL.
    
    Args:
        callback_url: URL to POST status to
        job_id: Job ID
        status: 'PROCESSING', 'COMPLETED', 'FAILED'
        progress: Progress percentage (0-100)
        output_url: URL to download output (when completed)
        error: Error message (when failed)
    """
    if not callback_url:
        return
    
    try:
        payload = {
            'jobId': job_id,
            'status': status,
            'progress': progress,
        }
        if output_url:
            payload['outputUrl'] = output_url
        if error:
            payload['error'] = error
        
        response = requests.post(
            callback_url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=10,
        )
        log(f"Callback sent: {status} ({progress}%)")
        
    except Exception as e:
        log(f"Callback failed: {e}", 'WARN')


def main():
    """Main render pipeline."""
    log("=== SceneFlow FFmpeg Renderer Started ===")
    
    # Get job spec path from environment
    job_spec_path = os.environ.get('JOB_SPEC_PATH')
    if not job_spec_path:
        log("JOB_SPEC_PATH environment variable not set", 'ERROR')
        sys.exit(1)
    
    callback_url = os.environ.get('CALLBACK_URL', '')
    
    # Get render mode from environment or job spec
    render_mode_env = os.environ.get('RENDER_MODE', '')
    
    # Create directories
    os.makedirs(ASSETS_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Download job spec
    log(f"Downloading job spec from: {job_spec_path}")
    job_spec_local = os.path.join(TEMP_DIR, 'job_spec.json')
    
    if not download_from_gcs(job_spec_path, job_spec_local):
        log("Failed to download job spec", 'ERROR')
        sys.exit(1)
    
    # Parse job spec
    with open(job_spec_local, 'r') as f:
        job_spec = json.load(f)
    
    job_id = job_spec.get('jobId', 'unknown')
    project_id = job_spec.get('projectId', 'unknown')
    resolution = job_spec.get('resolution', '1080p')
    fps = job_spec.get('fps', 24)
    audio_clips = job_spec.get('audioClips', [])
    output_path_gcs = job_spec.get('outputPath', '')
    
    # Determine render mode
    # Priority: ENV > job_spec > default
    render_mode = render_mode_env or job_spec.get('renderMode', 'ken_burns')
    
    log(f"Job ID: {job_id}")
    log(f"Project ID: {project_id}")
    log(f"Resolution: {resolution}")
    log(f"Render Mode: {render_mode}")
    
    # Route to appropriate render function
    if render_mode == 'concatenate':
        # Video concatenation mode (for scene renders)
        video_segments = job_spec.get('videoSegments', [])
        include_segment_audio = job_spec.get('includeSegmentAudio', True)
        segment_audio_volume = job_spec.get('segmentAudioVolume', 1.0)
        log(f"Video Segments: {len(video_segments)}")
        log(f"Audio clips: {len(audio_clips)}")
        log(f"Include Segment Audio: {include_segment_audio}")
        log(f"Segment Audio Volume: {segment_audio_volume}")
        render_video_concatenation(job_id, video_segments, audio_clips, output_path_gcs, 
                                   resolution, fps, callback_url, include_segment_audio, segment_audio_volume)
    else:
        # Ken Burns mode (for project renders with images)
        segments = job_spec.get('segments', [])
        log(f"Image Segments: {len(segments)}")
        log(f"Audio clips: {len(audio_clips)}")
        render_ken_burns(job_id, segments, audio_clips, output_path_gcs, 
                         resolution, fps, callback_url)


def render_ken_burns(job_id: str, segments: list, audio_clips: list, 
                     output_path_gcs: str, resolution: str, fps: int, callback_url: str):
    """Render with Ken Burns effect on images (original behavior)."""
    
    # Send processing status
    send_callback(callback_url, job_id, 'PROCESSING', 10)
    
    # Download all assets
    log("=== Downloading Assets (Ken Burns Mode) ===")
    
    # Download images
    for i, segment in enumerate(segments):
        image_url = segment.get('imageUrl', '')
        if not image_url:
            log(f"Segment {i} has no imageUrl", 'ERROR')
            send_callback(callback_url, job_id, 'FAILED', 0, error=f"Segment {i} missing image")
            sys.exit(1)
        
        local_file = download_asset(image_url, 'image', i)
        if not local_file:
            log(f"Failed to download image for segment {i}", 'ERROR')
            send_callback(callback_url, job_id, 'FAILED', 0, error=f"Failed to download image {i}")
            sys.exit(1)
        
        segment['localFile'] = local_file
    
    send_callback(callback_url, job_id, 'PROCESSING', 30)
    
    # Download audio
    for i, clip in enumerate(audio_clips):
        audio_url = clip.get('url', '')
        if not audio_url:
            log(f"Audio clip {i} has no URL, skipping", 'WARN')
            continue
        
        local_file = download_asset(audio_url, 'audio', i)
        if local_file:
            clip['localFile'] = local_file
        else:
            log(f"Failed to download audio clip {i}, continuing without it", 'WARN')
    
    # Filter out audio clips without local files
    audio_clips_with_files = [c for c in audio_clips if c.get('localFile')]
    
    send_callback(callback_url, job_id, 'PROCESSING', 50)
    
    # Build and run FFmpeg command
    log("=== Starting FFmpeg Render (Ken Burns) ===")
    output_file = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")
    
    ffmpeg_cmd = build_ffmpeg_command(
        segments=segments,
        audio_clips=audio_clips_with_files,
        output_path=output_file,
        resolution=resolution,
        fps=fps,
        temp_dir=TEMP_DIR,
    )
    
    log(f"FFmpeg command length: {len(ffmpeg_cmd)} args")
    send_callback(callback_url, job_id, 'PROCESSING', 60)
    
    # Run FFmpeg (allow up to 2 hours for long videos)
    success = run_ffmpeg(ffmpeg_cmd, timeout=7200)
    
    if not success:
        log("FFmpeg render failed", 'ERROR')
        send_callback(callback_url, job_id, 'FAILED', 0, error="FFmpeg render failed")
        sys.exit(1)
    
    # Upload and finish
    finish_render(job_id, output_file, output_path_gcs, callback_url)


def render_video_concatenation(job_id: str, video_segments: list, audio_clips: list,
                               output_path_gcs: str, resolution: str, fps: int, callback_url: str,
                               include_segment_audio: bool = True, segment_audio_volume: float = 1.0):
    """Render by concatenating video segments with audio mixing."""
    
    # Send processing status
    send_callback(callback_url, job_id, 'PROCESSING', 10)
    
    # Download all assets
    log("=== Downloading Assets (Concatenation Mode) ===")
    
    # Download video segments
    for i, segment in enumerate(video_segments):
        video_url = segment.get('videoUrl', '')
        if not video_url:
            log(f"Video segment {i} has no videoUrl", 'ERROR')
            send_callback(callback_url, job_id, 'FAILED', 0, error=f"Segment {i} missing video")
            sys.exit(1)
        
        local_file = download_asset(video_url, 'video', i)
        if not local_file:
            log(f"Failed to download video for segment {i}", 'ERROR')
            send_callback(callback_url, job_id, 'FAILED', 0, error=f"Failed to download video {i}")
            sys.exit(1)
        
        segment['localFile'] = local_file
    
    log(f"Downloaded {len(video_segments)} video segments")
    send_callback(callback_url, job_id, 'PROCESSING', 30)
    
    # Download audio
    for i, clip in enumerate(audio_clips):
        audio_url = clip.get('url', '')
        if not audio_url:
            log(f"Audio clip {i} has no URL, skipping", 'WARN')
            continue
        
        local_file = download_asset(audio_url, 'audio', i)
        if local_file:
            clip['localFile'] = local_file
        else:
            log(f"Failed to download audio clip {i}, continuing without it", 'WARN')
    
    # Filter out audio clips without local files
    audio_clips_with_files = [c for c in audio_clips if c.get('localFile')]
    log(f"Downloaded {len(audio_clips_with_files)} audio clips")
    
    send_callback(callback_url, job_id, 'PROCESSING', 50)
    
    # Build and run FFmpeg command for video concatenation
    log("=== Starting FFmpeg Render (Concatenation) ===")
    output_file = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")
    
    ffmpeg_cmd = build_concat_ffmpeg_command(
        video_segments=video_segments,
        audio_clips=audio_clips_with_files,
        output_path=output_file,
        resolution=resolution,
        fps=fps,
        temp_dir=TEMP_DIR,
        include_segment_audio=include_segment_audio,
        segment_audio_volume=segment_audio_volume,
    )
    
    log(f"FFmpeg command length: {len(ffmpeg_cmd)} args")
    send_callback(callback_url, job_id, 'PROCESSING', 60)
    
    # Run FFmpeg (allow up to 2 hours for long videos)
    success = run_ffmpeg(ffmpeg_cmd, timeout=7200)
    
    if not success:
        log("FFmpeg render failed", 'ERROR')
        send_callback(callback_url, job_id, 'FAILED', 0, error="FFmpeg render failed")
        sys.exit(1)
    
    # Upload and finish
    finish_render(job_id, output_file, output_path_gcs, callback_url)


def finish_render(job_id: str, output_file: str, output_path_gcs: str, callback_url: str):
    """Common finishing steps: upload to GCS and cleanup."""
    
    send_callback(callback_url, job_id, 'PROCESSING', 90)
    
    # Upload output to GCS
    log("=== Uploading Output ===")
    
    if not output_path_gcs:
        log("No output path specified in job spec", 'ERROR')
        send_callback(callback_url, job_id, 'FAILED', 0, error="No output path specified")
        sys.exit(1)
    
    if not upload_to_gcs(output_file, output_path_gcs):
        log("Failed to upload output", 'ERROR')
        send_callback(callback_url, job_id, 'FAILED', 0, error="Failed to upload output")
        sys.exit(1)
    
    # Generate signed URL for download
    try:
        path_parts = output_path_gcs[5:].split('/', 1)
        bucket_name = path_parts[0]
        blob_name = path_parts[1]
        
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        # Generate signed URL valid for 7 days
        from datetime import timedelta
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(days=7),
            method="GET",
        )
        download_url = signed_url
    except Exception as e:
        log(f"Failed to generate signed URL: {e}", 'WARN')
        download_url = output_path_gcs
    
    # Send completion callback
    send_callback(callback_url, job_id, 'COMPLETED', 100, output_url=download_url)
    
    log("=== Render Complete ===")
    log(f"Output: {output_path_gcs}")
    
    # Cleanup
    log("Cleaning up temporary files...")
    import shutil
    shutil.rmtree(ASSETS_DIR, ignore_errors=True)
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    
    log("=== Job Finished Successfully ===")


if __name__ == '__main__':
    main()
