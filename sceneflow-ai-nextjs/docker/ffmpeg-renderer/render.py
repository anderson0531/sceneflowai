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
import subprocess
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse
from google.cloud import storage
from ffmpeg_utils import (
    build_ffmpeg_command,
    build_concat_ffmpeg_command,
    build_stream_copy_ffmpeg_command,
    full_stream_copy_block_reason,
    parse_frame_rate,
    resolve_encode_settings,
    run_ffmpeg,
    video_stream_copy_block_reason,
    write_concat_list,
)

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


def probe_media(path: str) -> Optional[Dict[str, Any]]:
    """Read video and audio stream facts needed for stream-copy eligibility."""
    cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,sample_rate,channels',
        '-of', 'json',
        path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    except Exception as exc:
        log(f"ffprobe failed for {path}: {exc}", 'WARN')
        return None
    if result.returncode != 0:
        log(f"ffprobe error for {path}: {result.stderr}", 'WARN')
        return None
    try:
        payload = json.loads(result.stdout or '{}')
    except json.JSONDecodeError:
        return None

    video_stream = None
    audio_stream = None
    for stream in payload.get('streams') or []:
        if stream.get('codec_type') == 'video' and video_stream is None:
            video_stream = stream
        elif stream.get('codec_type') == 'audio' and audio_stream is None:
            audio_stream = stream
    if not video_stream:
        return None
    return {
        'codec': video_stream.get('codec_name'),
        'width': video_stream.get('width'),
        'height': video_stream.get('height'),
        'pix_fmt': video_stream.get('pix_fmt'),
        'fps': parse_frame_rate(video_stream.get('avg_frame_rate')),
        'audio_codec': audio_stream.get('codec_name') if audio_stream else None,
        'sample_rate': audio_stream.get('sample_rate') if audio_stream else None,
        'channels': audio_stream.get('channels') if audio_stream else None,
    }


def download_assets_parallel(jobs: List[Dict[str, Any]], max_workers: int = 8) -> List[Optional[str]]:
    """
    Download assets concurrently. Each job is {url, asset_type, index}.
    Empty URLs stay None. Results keep input order.
    """
    results: List[Optional[str]] = [None] * len(jobs)
    pending = [
        (index, job)
        for index, job in enumerate(jobs)
        if job.get('url')
    ]
    if not pending:
        return results
    workers = max(1, min(max_workers, len(pending)))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        future_map = {
            pool.submit(download_asset, job['url'], job['asset_type'], job['index']): index
            for index, job in pending
        }
        for future in as_completed(future_map):
            index = future_map[future]
            try:
                results[index] = future.result()
            except Exception as exc:
                log(f"Download task failed: {exc}", 'ERROR')
                results[index] = None
    return results


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
    if render_mode == 'stitch':
        clip_urls = job_spec.get('clipUrls', [])
        log(f"Stitch clips: {len(clip_urls)}")
        render_stitch_clips(job_id, clip_urls, output_path_gcs, resolution, fps, callback_url)
    elif render_mode == 'concatenate':
        # Video concatenation mode (for scene renders)
        video_segments = job_spec.get('videoSegments', [])
        include_segment_audio = job_spec.get('includeSegmentAudio', True)
        segment_audio_volume = job_spec.get('segmentAudioVolume', 1.0)
        text_overlays = job_spec.get('textOverlays', [])
        watermark = job_spec.get('watermark')
        encode_quality = job_spec.get('encodeQuality') or 'delivery'
        log(f"Video Segments: {len(video_segments)}")
        log(f"Encode quality: {encode_quality}")
        
        # Debug: Log per-segment audio settings from job spec
        for i, seg in enumerate(video_segments):
            audio_src = seg.get('audioSource', 'original')
            audio_vol = seg.get('audioVolume', 1.0)
            log(
                f"  Segment {i}: audioSource='{audio_src}', audioVolume={audio_vol}, "
                f"watermarkCropPercent={seg.get('watermarkCropPercent', 'none')}"
            )
        
        log(f"Audio clips: {len(audio_clips)}")
        log(f"Include Segment Audio: {include_segment_audio}")
        log(f"Segment Audio Volume: {segment_audio_volume}")
        log(f"Text Overlays: {len(text_overlays)}")
        log(f"Watermark: {'enabled' if watermark else 'disabled'}")
        if watermark:
            log(f"  Watermark type: {watermark.get('type')}")
            log(f"  Watermark text: {watermark.get('text', '')[:30]}")
            log(f"  Watermark anchor: {watermark.get('anchor')}")
        render_video_concatenation(job_id, video_segments, audio_clips, output_path_gcs, 
                                   resolution, fps, callback_url, include_segment_audio, segment_audio_volume,
                                   text_overlays, watermark, encode_quality)
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
                               include_segment_audio: bool = True, segment_audio_volume: float = 1.0,
                               text_overlays: list = None, watermark: dict = None,
                               encode_quality: str = 'delivery'):
    """Render by concatenating video segments with audio mixing, text overlays, and watermark."""
    
    if text_overlays is None:
        text_overlays = []
    
    # Send processing status
    send_callback(callback_url, job_id, 'PROCESSING', 10)
    
    # Download all assets
    log("=== Downloading Assets (Concatenation Mode) ===")

    download_jobs = []
    video_job_at = []
    voiceover_job_at = {}
    for i, segment in enumerate(video_segments):
        video_url = segment.get('videoUrl', '')
        if not video_url:
            log(f"Video segment {i} has no videoUrl", 'ERROR')
            send_callback(callback_url, job_id, 'FAILED', 0, error=f"Segment {i} missing video")
            sys.exit(1)
        video_job_at.append(len(download_jobs))
        download_jobs.append({'url': video_url, 'asset_type': 'video', 'index': i})
        audio_source = segment.get('audioSource', 'original')
        voiceover_url = segment.get('voiceoverUrl', '')
        if audio_source == 'voiceover' and voiceover_url:
            voiceover_job_at[i] = len(download_jobs)
            download_jobs.append({'url': voiceover_url, 'asset_type': 'voiceover', 'index': i})

    audio_job_at = []
    for i, clip in enumerate(audio_clips):
        audio_url = clip.get('url', '')
        if not audio_url:
            log(f"Audio clip {i} has no URL, skipping", 'WARN')
            audio_job_at.append(None)
            continue
        audio_job_at.append(len(download_jobs))
        download_jobs.append({'url': audio_url, 'asset_type': 'audio', 'index': i})

    watermark_job_at = None
    if watermark and watermark.get('type') == 'image' and watermark.get('imageUrl'):
        watermark_job_at = len(download_jobs)
        download_jobs.append({'url': watermark['imageUrl'], 'asset_type': 'image', 'index': 997})

    downloaded = download_assets_parallel(download_jobs)

    for i, segment in enumerate(video_segments):
        local_file = downloaded[video_job_at[i]]
        if not local_file:
            log(f"Failed to download video for segment {i}", 'ERROR')
            send_callback(callback_url, job_id, 'FAILED', 0, error=f"Failed to download video {i}")
            sys.exit(1)
        segment['localFile'] = local_file
        voiceover_index = voiceover_job_at.get(i)
        if voiceover_index is None:
            continue
        voiceover_file = downloaded[voiceover_index]
        if voiceover_file:
            segment['voiceoverLocalFile'] = voiceover_file
            log(f"Downloaded voiceover for segment {i}")
        else:
            log(f"Failed to download voiceover for segment {i}, falling back to original", 'WARN')
            segment['audioSource'] = 'original'
    
    log(f"Downloaded {len(video_segments)} video segments")
    send_callback(callback_url, job_id, 'PROCESSING', 30)

    for i, clip in enumerate(audio_clips):
        job_index = audio_job_at[i]
        if job_index is None:
            continue
        local_file = downloaded[job_index]
        if local_file:
            clip['localFile'] = local_file
        else:
            log(f"Failed to download audio clip {i}, continuing without it", 'WARN')
    
    # Filter out audio clips without local files
    audio_clips_with_files = [c for c in audio_clips if c.get('localFile')]
    log(f"Downloaded {len(audio_clips_with_files)} audio clips")
    
    # Download image watermark asset (text watermarks need no extra file)
    wm_for_cmd = watermark
    if watermark_job_at is not None:
        wm_file = downloaded[watermark_job_at]
        if wm_file:
            wm_for_cmd = dict(watermark)
            wm_for_cmd['localFile'] = wm_file
            log(f"Downloaded watermark image -> {wm_file}")
        else:
            log("Watermark image download failed; falling back to text watermark", 'WARN')
            wm_for_cmd = dict(watermark)
            wm_for_cmd['type'] = 'text'
            wm_for_cmd['text'] = wm_for_cmd.get('text') or 'SceneFlow AI Studio'
    
    send_callback(callback_url, job_id, 'PROCESSING', 50)
    
    # Build and run FFmpeg command for video concatenation
    log("=== Starting FFmpeg Render (Concatenation) ===")
    preset, crf = resolve_encode_settings(encode_quality)
    log(f"Encode settings: quality={encode_quality if encode_quality in ('delivery', 'draft') else 'delivery'} preset={preset} crf={crf}")
    if text_overlays:
        log(f"Text overlays to apply: {len(text_overlays)}")
        for i, overlay in enumerate(text_overlays):
            log(f"  Overlay {i}: text='{overlay.get('text', '')[:30]}...', startTime={overlay.get('startTime', 0)}")
    
    output_file = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")

    probes = [
        probe_media(os.path.join(ASSETS_DIR, segment['localFile']))
        for segment in video_segments
    ]
    copy_block = video_stream_copy_block_reason(
        video_segments,
        probes,
        resolution=resolution,
        fps=fps,
        text_overlays=text_overlays,
        watermark=wm_for_cmd,
        include_segment_audio=include_segment_audio,
    )
    if copy_block:
        log(f"Stream copy rejected: {copy_block}")
        ffmpeg_cmd = build_concat_ffmpeg_command(
            video_segments=video_segments,
            audio_clips=audio_clips_with_files,
            output_path=output_file,
            resolution=resolution,
            fps=fps,
            temp_dir=TEMP_DIR,
            include_segment_audio=include_segment_audio,
            segment_audio_volume=segment_audio_volume,
            text_overlays=text_overlays,
            watermark=wm_for_cmd,
            encode_quality=encode_quality,
        )
    else:
        full_block = full_stream_copy_block_reason(
            video_segments,
            probes,
            audio_clips=audio_clips_with_files,
            include_segment_audio=include_segment_audio,
            segment_audio_volume=segment_audio_volume,
        )
        segment_gain = 1.0
        if include_segment_audio and video_segments:
            segment_gain = float(video_segments[0].get('audioVolume', 1.0))
        if full_block:
            log(f"Video stream copy with audio re-encode ({full_block})")
        else:
            log("Full stream copy")
        concat_list_path = os.path.join(TEMP_DIR, f"{job_id}-concat.txt")
        write_concat_list(
            [os.path.join(ASSETS_DIR, segment['localFile']) for segment in video_segments],
            concat_list_path,
        )
        ffmpeg_cmd = build_stream_copy_ffmpeg_command(
            concat_list_path=concat_list_path,
            audio_clips=audio_clips_with_files,
            output_path=output_file,
            temp_dir=TEMP_DIR,
            include_segment_audio=include_segment_audio,
            segment_audio_volume=segment_audio_volume,
            segment_audio_gain=segment_gain,
            full_copy=full_block is None,
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


def render_stitch_clips(job_id: str, clip_urls: list, output_path_gcs: str,
                        resolution: str, fps: int, callback_url: str):
    """Concatenate ordered clip URLs into a silent master MP4 (long-take stitch mode)."""
    send_callback(callback_url, job_id, 'PROCESSING', 10)
    log("=== Downloading Assets (Stitch Mode) ===")

    video_segments = []
    for i, url in enumerate(clip_urls):
        if not url:
            log(f"Stitch clip {i} has no URL", 'ERROR')
            send_callback(callback_url, job_id, 'FAILED', 0, error=f"Clip {i} missing URL")
            sys.exit(1)
        local_file = download_asset(url, 'video', i)
        if not local_file:
            log(f"Failed to download stitch clip {i}", 'ERROR')
            send_callback(callback_url, job_id, 'FAILED', 0, error=f"Failed to download clip {i}")
            sys.exit(1)
        video_segments.append({
            'videoUrl': url,
            'localFile': local_file,
            'startTime': 0,
            'duration': 0,
            'audioSource': 'none',
        })

    send_callback(callback_url, job_id, 'PROCESSING', 40)
    output_file = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")

    ffmpeg_cmd = build_concat_ffmpeg_command(
        video_segments=video_segments,
        audio_clips=[],
        output_path=output_file,
        resolution=resolution,
        fps=fps,
        temp_dir=TEMP_DIR,
        include_segment_audio=False,
        segment_audio_volume=0.0,
        text_overlays=[],
        watermark=None,
    )

    send_callback(callback_url, job_id, 'PROCESSING', 60)
    success = run_ffmpeg(ffmpeg_cmd, timeout=7200)
    if not success:
        log("Stitch FFmpeg render failed", 'ERROR')
        send_callback(callback_url, job_id, 'FAILED', 0, error="Stitch FFmpeg render failed")
        sys.exit(1)

    finish_render(job_id, output_file, output_path_gcs, callback_url)


if __name__ == '__main__':
    main()
