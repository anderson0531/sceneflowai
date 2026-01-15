"""
FFmpeg Utilities for SceneFlow Video Rendering

Provides functions for building FFmpeg commands with:
- Ken Burns effects (zoom/pan on static images)
- Audio track mixing
- Resolution and quality settings
"""

import os
import subprocess
import json
from typing import List, Dict, Any, Optional

# Resolution presets
RESOLUTIONS = {
    '720p': {'width': 1280, 'height': 720},
    '1080p': {'width': 1920, 'height': 1080},
    '4K': {'width': 3840, 'height': 2160},
}

# Ken Burns effect parameters
# We scale images 2x to allow for pan/zoom headroom
SCALE_FACTOR = 2


def build_ken_burns_filter(
    segment_index: int,
    duration_frames: int,
    fps: int,
    zoom_start: float = 1.0,
    zoom_end: float = 1.1,
    pan_x: float = 0.0,
    pan_y: float = 0.0,
    width: int = 1920,
    height: int = 1080,
) -> str:
    """
    Build FFmpeg zoompan filter for Ken Burns effect.
    
    Args:
        segment_index: Index of this segment (for input reference)
        duration_frames: Number of frames for this segment
        fps: Output frames per second
        zoom_start: Starting zoom level (1.0 = no zoom)
        zoom_end: Ending zoom level
        pan_x: Pan direction X (-1 to 1, negative = pan left, positive = pan right)
        pan_y: Pan direction Y (-1 to 1, negative = pan up, positive = pan down)
        width: Output width
        height: Output height
    
    Returns:
        FFmpeg filter string for this segment
    """
    # Calculate zoom rate per frame
    zoom_diff = zoom_end - zoom_start
    zoom_rate = zoom_diff / duration_frames if duration_frames > 0 else 0
    
    # Zoompan expression for zoom
    # z = zoom_start + (frame_number * zoom_rate)
    zoom_expr = f"'{zoom_start}+{zoom_rate}*on'"
    
    # Calculate pan expressions
    # Center starts at middle, moves based on pan direction
    # x position: starts at center, moves left or right
    # Scaled image is 2x, so we have headroom to pan
    scaled_w = width * SCALE_FACTOR
    scaled_h = height * SCALE_FACTOR
    
    # Pan distance over the duration (as percentage of available headroom)
    pan_headroom_x = (scaled_w - width) / 2
    pan_headroom_y = (scaled_h - height) / 2
    
    # Calculate per-frame pan movement
    pan_per_frame_x = (pan_x * pan_headroom_x) / duration_frames if duration_frames > 0 else 0
    pan_per_frame_y = (pan_y * pan_headroom_y) / duration_frames if duration_frames > 0 else 0
    
    # Start at center of scaled image
    center_x = (scaled_w - width) / 2
    center_y = (scaled_h - height) / 2
    
    # x and y expressions: start at center, move based on pan direction
    x_expr = f"'{center_x}+{pan_per_frame_x}*on'"
    y_expr = f"'{center_y}+{pan_per_frame_y}*on'"
    
    # Build the zoompan filter
    # First scale to 2x for headroom, then apply zoompan
    filter_str = (
        f"[{segment_index}:v]"
        f"scale={scaled_w}:{scaled_h}:force_original_aspect_ratio=increase,"
        f"crop={scaled_w}:{scaled_h},"
        f"zoompan=z={zoom_expr}:x={x_expr}:y={y_expr}:d={duration_frames}:s={width}x{height}:fps={fps}"
        f"[v{segment_index}]"
    )
    
    return filter_str


def build_ffmpeg_command(
    segments: List[Dict[str, Any]],
    audio_clips: List[Dict[str, Any]],
    output_path: str,
    resolution: str = '1080p',
    fps: int = 24,
    temp_dir: str = '/tmp',
) -> List[str]:
    """
    Build complete FFmpeg command for video rendering.
    
    Args:
        segments: List of video segments with image paths and Ken Burns settings
        audio_clips: List of audio clips with paths and timing
        output_path: Path for output MP4 file
        resolution: Output resolution ('720p', '1080p', '4K')
        fps: Output frames per second
        temp_dir: Directory containing downloaded assets
    
    Returns:
        FFmpeg command as list of arguments
    """
    res = RESOLUTIONS.get(resolution, RESOLUTIONS['1080p'])
    width, height = res['width'], res['height']
    
    cmd = ['ffmpeg', '-y']  # -y = overwrite output
    
    # Add input files (images)
    for i, segment in enumerate(segments):
        image_path = os.path.join(temp_dir, 'assets', segment['localFile'])
        cmd.extend(['-loop', '1', '-i', image_path])
    
    # Add audio input files
    audio_inputs_start = len(segments)
    for i, clip in enumerate(audio_clips):
        audio_path = os.path.join(temp_dir, 'assets', clip['localFile'])
        cmd.extend(['-i', audio_path])
    
    # Build filter complex
    filter_parts = []
    video_concat_inputs = []
    
    # Video filters with Ken Burns
    for i, segment in enumerate(segments):
        duration = segment.get('duration', 5)
        duration_frames = int(duration * fps)
        
        # Ken Burns settings
        kb = segment.get('kenBurns', {})
        zoom_start = kb.get('zoomStart', 1.0)
        zoom_end = kb.get('zoomEnd', 1.05)
        pan_x = kb.get('panX', 0.0)
        pan_y = kb.get('panY', 0.0)
        
        filter_str = build_ken_burns_filter(
            segment_index=i,
            duration_frames=duration_frames,
            fps=fps,
            zoom_start=zoom_start,
            zoom_end=zoom_end,
            pan_x=pan_x,
            pan_y=pan_y,
            width=width,
            height=height,
        )
        filter_parts.append(filter_str)
        video_concat_inputs.append(f"[v{i}]")
    
    # Concatenate all video segments
    if len(video_concat_inputs) > 1:
        concat_filter = f"{''.join(video_concat_inputs)}concat=n={len(segments)}:v=1:a=0[outv]"
        filter_parts.append(concat_filter)
        video_output = "[outv]"
    else:
        video_output = "[v0]"
    
    # Audio mixing (if we have audio clips)
    if audio_clips:
        # Build audio mix with proper timing using adelay
        audio_mix_inputs = []
        for i, clip in enumerate(audio_clips):
            input_idx = audio_inputs_start + i
            delay_ms = int(clip.get('startTime', 0) * 1000)
            duration = clip.get('duration', 10)
            volume = clip.get('volume', 1.0)
            
            # Apply delay and volume adjustment
            audio_filter = f"[{input_idx}:a]adelay={delay_ms}|{delay_ms},volume={volume}[a{i}]"
            filter_parts.append(audio_filter)
            audio_mix_inputs.append(f"[a{i}]")
        
        # Mix all audio tracks
        if len(audio_mix_inputs) > 1:
            mix_filter = f"{''.join(audio_mix_inputs)}amix=inputs={len(audio_clips)}:duration=longest:normalize=0[outa]"
            filter_parts.append(mix_filter)
            audio_output = "[outa]"
        else:
            audio_output = "[a0]"
    else:
        audio_output = None
    
    # Add filter complex to command
    if filter_parts:
        cmd.extend(['-filter_complex', ';'.join(filter_parts)])
    
    # Map outputs
    cmd.extend(['-map', video_output])
    if audio_output:
        cmd.extend(['-map', audio_output])
    
    # Output settings
    cmd.extend([
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
    ])
    
    if audio_output:
        cmd.extend([
            '-c:a', 'aac',
            '-b:a', '192k',
        ])
    
    # Set output duration based on total video length
    total_duration = sum(seg.get('duration', 5) for seg in segments)
    cmd.extend(['-t', str(total_duration)])
    
    # Output file
    cmd.append(output_path)
    
    return cmd


def run_ffmpeg(cmd: List[str], timeout: int = 3600) -> bool:
    """
    Execute FFmpeg command with progress logging.
    
    Args:
        cmd: FFmpeg command as list of arguments
        timeout: Maximum execution time in seconds
    
    Returns:
        True if successful, False otherwise
    """
    print(f"[FFmpeg] Running command: {' '.join(cmd[:10])}...")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        
        if result.returncode != 0:
            print(f"[FFmpeg] Error: {result.stderr}")
            return False
        
        print("[FFmpeg] Render completed successfully")
        return True
        
    except subprocess.TimeoutExpired:
        print(f"[FFmpeg] Timeout after {timeout} seconds")
        return False
    except Exception as e:
        print(f"[FFmpeg] Exception: {e}")
        return False


# ============================================================================
# Video Concatenation Functions (for scene-level renders)
# ============================================================================

def build_concat_ffmpeg_command(
    video_segments: List[Dict[str, Any]],
    audio_clips: List[Dict[str, Any]],
    output_path: str,
    resolution: str = '1080p',
    fps: int = 24,
    temp_dir: str = '/tmp',
) -> List[str]:
    """
    Build FFmpeg command for concatenating video segments with audio mixing.
    
    This is used for scene-level renders where we already have MP4 segments
    and need to concatenate them with audio tracks.
    
    Args:
        video_segments: List of video segments with paths and timing
        audio_clips: List of audio clips with paths and timing
        output_path: Path for output MP4 file
        resolution: Output resolution ('720p', '1080p', '4K')
        fps: Output frames per second
        temp_dir: Directory containing downloaded assets
    
    Returns:
        FFmpeg command as list of arguments
    """
    res = RESOLUTIONS.get(resolution, RESOLUTIONS['1080p'])
    width, height = res['width'], res['height']
    
    cmd = ['ffmpeg', '-y']  # -y = overwrite output
    
    # Add input files (videos)
    for i, segment in enumerate(video_segments):
        video_path = os.path.join(temp_dir, 'assets', segment['localFile'])
        cmd.extend(['-i', video_path])
    
    # Add audio input files
    audio_inputs_start = len(video_segments)
    for i, clip in enumerate(audio_clips):
        audio_path = os.path.join(temp_dir, 'assets', clip['localFile'])
        cmd.extend(['-i', audio_path])
    
    # Build filter complex
    filter_parts = []
    
    # Scale and normalize all video inputs
    video_concat_inputs = []
    for i, segment in enumerate(video_segments):
        # Scale to target resolution and set framerate
        filter_str = (
            f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
            f"fps={fps},setsar=1[v{i}]"
        )
        filter_parts.append(filter_str)
        video_concat_inputs.append(f"[v{i}]")
    
    # Concatenate all video segments
    if len(video_concat_inputs) > 1:
        concat_filter = f"{''.join(video_concat_inputs)}concat=n={len(video_segments)}:v=1:a=0[outv]"
        filter_parts.append(concat_filter)
        video_output = "[outv]"
    else:
        video_output = "[v0]"
    
    # Audio mixing (if we have audio clips)
    if audio_clips:
        audio_mix_inputs = []
        for i, clip in enumerate(audio_clips):
            input_idx = audio_inputs_start + i
            delay_ms = int(clip.get('startTime', 0) * 1000)
            duration = clip.get('duration', 10)
            volume = clip.get('volume', 1.0)
            
            # Apply delay and volume adjustment
            audio_filter = f"[{input_idx}:a]adelay={delay_ms}|{delay_ms},volume={volume}[a{i}]"
            filter_parts.append(audio_filter)
            audio_mix_inputs.append(f"[a{i}]")
        
        # Mix all audio tracks
        if len(audio_mix_inputs) > 1:
            mix_filter = f"{''.join(audio_mix_inputs)}amix=inputs={len(audio_clips)}:duration=longest:normalize=0[outa]"
            filter_parts.append(mix_filter)
            audio_output = "[outa]"
        else:
            audio_output = "[a0]"
    else:
        # No external audio - try to use audio from first video
        audio_output = None
    
    # Add filter complex to command
    if filter_parts:
        cmd.extend(['-filter_complex', ';'.join(filter_parts)])
    
    # Map outputs
    cmd.extend(['-map', video_output])
    if audio_output:
        cmd.extend(['-map', audio_output])
    
    # Output settings
    cmd.extend([
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
    ])
    
    if audio_output:
        cmd.extend([
            '-c:a', 'aac',
            '-b:a', '192k',
        ])
    
    # Set output duration based on total video length
    total_duration = sum(seg.get('duration', 5) for seg in video_segments)
    cmd.extend(['-t', str(total_duration)])
    
    # Output file
    cmd.append(output_path)
    
    return cmd
