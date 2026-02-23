"""
FFmpeg Utilities for SceneFlow Video Rendering

Provides functions for building FFmpeg commands with:
- Ken Burns effects (zoom/pan on static images)
- Audio track mixing
- Resolution and quality settings
- Text overlays (drawtext filter)
"""

import os
import subprocess
import json
import re
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

# Font mapping for text overlays (maps UI font names to system font names)
FONT_MAP = {
    'Montserrat': 'Montserrat',
    'Roboto': 'Roboto',
    'RobotoMono': 'Roboto Mono',
    'Lora': 'Lora',
}

# Default fallback font
DEFAULT_FONT = 'DejaVu Sans'


def escape_drawtext(text: str) -> str:
    """
    Escape text for FFmpeg drawtext filter.
    Special characters need to be escaped: \\, ', :, %
    """
    # First escape backslashes
    text = text.replace('\\', '\\\\\\\\')
    # Escape single quotes
    text = text.replace("'", "\\'")
    # Escape colons
    text = text.replace(':', '\\:')
    # Escape percent signs (FFmpeg uses them for timestamps)
    text = text.replace('%', '\\%')
    return text


def hex_to_ffmpeg_color(hex_color: str, opacity: float = 1.0) -> str:
    """
    Convert hex color (#RRGGBB) to FFmpeg color format (0xRRGGBBAA).
    
    Args:
        hex_color: Color in #RRGGBB format
        opacity: Opacity from 0.0 to 1.0
    
    Returns:
        FFmpeg color string like 0xRRGGBBAA
    """
    # Remove # if present
    hex_color = hex_color.lstrip('#')
    
    # Convert opacity to hex (00-FF)
    alpha = int(opacity * 255)
    alpha_hex = f'{alpha:02X}'
    
    return f'0x{hex_color}{alpha_hex}'


def get_font_file(font_family: str, font_weight: int = 400) -> str:
    """
    Get the path to a font file based on family and weight.
    
    Args:
        font_family: Font family name (Montserrat, Roboto, etc.)
        font_weight: Font weight (100-900)
    
    Returns:
        Path to the font file
    """
    # Determine weight suffix based on weight value
    weight_suffixes = {
        100: 'Thin',
        200: 'ExtraLight',
        300: 'Light',
        400: 'Regular',
        500: 'Medium',
        600: 'SemiBold',
        700: 'Bold',
        800: 'ExtraBold',
        900: 'Black',
    }
    
    # Find closest weight
    closest_weight = min(weight_suffixes.keys(), key=lambda x: abs(x - font_weight))
    weight_name = weight_suffixes[closest_weight]
    
    # Build font file path
    font_dir_map = {
        'Montserrat': '/usr/share/fonts/google/montserrat',
        'Roboto': '/usr/share/fonts/google/roboto',
        'RobotoMono': '/usr/share/fonts/google/robotomono',
        'Lora': '/usr/share/fonts/liberation2',  # Lora falls back to Liberation Serif
    }
    
    # Font name mapping (in case of fallbacks)
    font_name_map = {
        'Montserrat': 'Montserrat',
        'Roboto': 'Roboto',
        'RobotoMono': 'RobotoMono',
        'Lora': 'LiberationSerif',  # Fallback for Lora
    }
    
    font_dir = font_dir_map.get(font_family, '')
    font_base_name = font_name_map.get(font_family, font_family)
    
    if not font_dir:
        # Return fontconfig name for fallback
        return DEFAULT_FONT
    
    # Try to find the font file with the right weight
    # Google Fonts use naming like: Montserrat-Bold.ttf, Roboto-Medium.ttf
    font_file = os.path.join(font_dir, f'{font_base_name}-{weight_name}.ttf')
    
    # Check if static folder exists (Google Fonts sometimes use static subfolder)
    static_font_file = os.path.join(font_dir, 'static', f'{font_base_name}-{weight_name}.ttf')
    
    if os.path.exists(static_font_file):
        return static_font_file
    elif os.path.exists(font_file):
        return font_file
    else:
        # Try with just the family name + Regular
        regular_file = os.path.join(font_dir, f'{font_base_name}-Regular.ttf')
        static_regular = os.path.join(font_dir, 'static', f'{font_base_name}-Regular.ttf')
        
        if os.path.exists(static_regular):
            return static_regular
        elif os.path.exists(regular_file):
            return regular_file
        else:
            print(f"[FFmpeg] Warning: Font file not found for {font_family}-{weight_name}, using fontconfig")
            return FONT_MAP.get(font_family, DEFAULT_FONT)


def build_drawtext_filter(
    overlay: Dict[str, Any],
    input_label: str,
    output_label: str,
    width: int = 1920,
    height: int = 1080,
) -> str:
    """
    Build FFmpeg drawtext filter for a text overlay.
    
    Args:
        overlay: Text overlay specification dict
        input_label: Input stream label (e.g., "[outv]")
        output_label: Output stream label (e.g., "[text0]")
        width: Video width in pixels
        height: Video height in pixels
    
    Returns:
        FFmpeg filter string for this text overlay
    """
    text = escape_drawtext(overlay.get('text', ''))
    x = overlay.get('x', 0)
    y = overlay.get('y', 0)
    anchor = overlay.get('anchor', 'top-left')
    font_family = overlay.get('fontFamily', 'Montserrat')
    font_size = overlay.get('fontSize', 48)
    font_weight = overlay.get('fontWeight', 400)
    color = overlay.get('color', '#FFFFFF')
    bg_color = overlay.get('backgroundColor')
    bg_opacity = overlay.get('backgroundOpacity', 0.7)
    text_shadow = overlay.get('textShadow', False)
    start_time = overlay.get('startTime', 0)
    duration = overlay.get('duration', -1)  # -1 means full video
    fade_in_ms = overlay.get('fadeInMs', 0)
    fade_out_ms = overlay.get('fadeOutMs', 0)
    subtext = overlay.get('subtext', '')
    
    # Get font file path
    font_file = get_font_file(font_family, font_weight)
    
    # Convert hex color to FFmpeg format
    fontcolor = hex_to_ffmpeg_color(color)
    
    # Build position expression based on anchor
    # x and y are pixel positions from UI
    if anchor == 'top-left':
        x_expr = str(x)
        y_expr = str(y)
    elif anchor == 'top-center':
        x_expr = f'{x}-(tw/2)'
        y_expr = str(y)
    elif anchor == 'center':
        x_expr = f'{x}-(tw/2)'
        y_expr = f'{y}-(th/2)'
    elif anchor == 'bottom-left':
        x_expr = str(x)
        y_expr = f'{y}-th'
    elif anchor == 'bottom-center':
        x_expr = f'{x}-(tw/2)'
        y_expr = f'{y}-th'
    elif anchor == 'bottom-right':
        x_expr = f'{x}-tw'
        y_expr = f'{y}-th'
    else:
        x_expr = str(x)
        y_expr = str(y)
    
    # Build enable expression for timing
    if duration > 0:
        end_time = start_time + duration
        enable_expr = f"between(t,{start_time},{end_time})"
    else:
        enable_expr = f"gte(t,{start_time})"
    
    # Build alpha expression for fade effects
    fade_in_sec = fade_in_ms / 1000.0
    fade_out_sec = fade_out_ms / 1000.0
    
    if fade_in_sec > 0 or fade_out_sec > 0:
        alpha_parts = []
        
        if fade_in_sec > 0:
            # Fade in: from 0 to 1 over fade_in duration
            alpha_parts.append(f"if(lt(t,{start_time + fade_in_sec}),(t-{start_time})/{fade_in_sec},1)")
        
        if fade_out_sec > 0 and duration > 0:
            end_time = start_time + duration
            fade_out_start = end_time - fade_out_sec
            # Fade out: from 1 to 0 over fade_out duration
            alpha_parts.append(f"if(gt(t,{fade_out_start}),({end_time}-t)/{fade_out_sec},1)")
        
        if len(alpha_parts) == 2:
            alpha_expr = f"min({alpha_parts[0]},{alpha_parts[1]})"
        elif len(alpha_parts) == 1:
            alpha_expr = alpha_parts[0]
        else:
            alpha_expr = "1"
    else:
        alpha_expr = "1"
    
    # Build drawtext filter parts
    filter_parts = [
        f"fontfile='{font_file}'" if os.path.exists(font_file) else f"font='{font_file}'",
        f"text='{text}'",
        f"fontsize={font_size}",
        f"fontcolor={fontcolor}",
        f"x={x_expr}",
        f"y={y_expr}",
        f"enable='{enable_expr}'",
    ]
    
    # Add alpha for fades
    if alpha_expr != "1":
        filter_parts.append(f"alpha='{alpha_expr}'")
    
    # Add background box if specified
    if bg_color:
        box_color = hex_to_ffmpeg_color(bg_color, bg_opacity)
        filter_parts.extend([
            "box=1",
            f"boxcolor={box_color}",
            "boxborderw=10",
        ])
    
    # Add text shadow
    if text_shadow:
        filter_parts.extend([
            "shadowcolor=0x00000080",
            "shadowx=2",
            "shadowy=2",
        ])
    
    # Build the filter string
    filter_str = f"{input_label}drawtext={':'.join(filter_parts)}{output_label}"
    
    return filter_str


def build_text_overlay_filters(
    text_overlays: List[Dict[str, Any]],
    input_label: str,
    output_label: str,
    width: int = 1920,
    height: int = 1080,
) -> List[str]:
    """
    Build FFmpeg filter chain for multiple text overlays.
    
    Args:
        text_overlays: List of text overlay specifications
        input_label: Input stream label (e.g., "[outv]")
        output_label: Final output stream label (e.g., "[final]")
        width: Video width in pixels
        height: Video height in pixels
    
    Returns:
        List of FFmpeg filter strings to chain together
    """
    if not text_overlays:
        return []
    
    filters = []
    current_label = input_label
    
    for i, overlay in enumerate(text_overlays):
        is_last = (i == len(text_overlays) - 1)
        next_label = output_label if is_last else f"[text{i}]"
        
        filter_str = build_drawtext_filter(
            overlay=overlay,
            input_label=current_label,
            output_label=next_label,
            width=width,
            height=height,
        )
        filters.append(filter_str)
        current_label = next_label
    
    return filters


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
    include_segment_audio: bool = True,
    segment_audio_volume: float = 1.0,
    text_overlays: Optional[List[Dict[str, Any]]] = None,
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
        include_segment_audio: Whether to include audio from video segments
        segment_audio_volume: Volume level for segment audio (0.0 to 1.0)
        text_overlays: List of text overlays to burn into the video
    
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
    
    # Track input indices
    video_input_count = len(video_segments)
    
    # Add voiceover input files for segments that use voiceover
    voiceover_input_map = {}  # Maps segment index to input index
    for i, segment in enumerate(video_segments):
        audio_source = segment.get('audioSource', 'original')
        voiceover_file = segment.get('voiceoverLocalFile')
        if audio_source == 'voiceover' and voiceover_file:
            voiceover_path = os.path.join(temp_dir, 'assets', voiceover_file)
            cmd.extend(['-i', voiceover_path])
            voiceover_input_map[i] = video_input_count + len(voiceover_input_map)
    
    # Add overlay audio input files (music, sfx, etc.)
    audio_inputs_start = video_input_count + len(voiceover_input_map)
    for i, clip in enumerate(audio_clips):
        audio_path = os.path.join(temp_dir, 'assets', clip['localFile'])
        cmd.extend(['-i', audio_path])
    
    # Build filter complex
    filter_parts = []
    
    # Scale and normalize all video inputs, and optionally prepare audio from each segment
    video_concat_inputs = []
    segment_audio_streams = []  # Track audio streams with their per-segment settings
    
    for i, segment in enumerate(video_segments):
        # Scale to target resolution and set framerate
        # setpts=PTS-STARTPTS resets video timestamps to start at 0 for proper concatenation sync
        filter_str = (
            f"[{i}:v]setpts=PTS-STARTPTS,scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
            f"fps={fps},setsar=1[v{i}]"
        )
        filter_parts.append(filter_str)
        video_concat_inputs.append(f"[v{i}]")
        
        # Check per-segment audio source and volume
        audio_source = segment.get('audioSource', 'original')
        seg_audio_volume = segment.get('audioVolume', segment_audio_volume)
        duration = segment.get('duration', 5)
        
        # Debug: Log per-segment audio settings
        print(f"[FFmpeg] Segment {i}: audioSource='{audio_source}', volume={seg_audio_volume}, duration={duration}")
        
        if audio_source == 'original':
            # Use original MP4 audio - normalize format for concat compatibility
            print(f"[FFmpeg] Segment {i}: Using ORIGINAL audio from MP4")
            # Always normalize audio format AND reset timestamps to ensure concat compatibility
            # asetpts=PTS-STARTPTS ensures audio starts at 0 for proper concatenation with silence streams
            audio_filter = f"[{i}:a]asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"
            if seg_audio_volume != 1.0:
                audio_filter += f",volume={seg_audio_volume}"
            audio_filter += f"[seg_audio_{i}]"
            filter_parts.append(audio_filter)
            segment_audio_streams.append((f"[seg_audio_{i}]", duration))
        elif audio_source == 'voiceover' and i in voiceover_input_map:
            # Use voiceover audio (with optional time slicing)
            voiceover_input_idx = voiceover_input_map[i]
            voiceover_start = segment.get('voiceoverStartTime', 0)
            voiceover_duration = segment.get('voiceoverDuration', duration)
            
            # Build filter: extract time slice, apply volume, and normalize format for concat compatibility
            vo_filter = f"[{voiceover_input_idx}:a]atrim=start={voiceover_start}:duration={voiceover_duration},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"
            if seg_audio_volume != 1.0:
                vo_filter += f",volume={seg_audio_volume}"
            vo_filter += f"[vo_audio_{i}]"
            filter_parts.append(vo_filter)
            segment_audio_streams.append((f"[vo_audio_{i}]", duration))
        else:
            # Muted segment - use volume=0 on original audio to preserve actual duration
            # This keeps audio track timing in sync with video (instead of synthetic silence based on metadata duration)
            print(f"[FFmpeg] Segment {i}: Muting original audio with volume=0 (preserves actual duration)")
            audio_filter = f"[{i}:a]asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=0[seg_audio_{i}]"
            filter_parts.append(audio_filter)
            segment_audio_streams.append((f"[seg_audio_{i}]", duration))
    
    # Concatenate all video segments (video only)
    if len(video_concat_inputs) > 1:
        concat_filter = f"{''.join(video_concat_inputs)}concat=n={len(video_segments)}:v=1:a=0[outv]"
        filter_parts.append(concat_filter)
        video_output = "[outv]"
    else:
        video_output = "[v0]"
    
    # Apply text overlays to the video stream
    if text_overlays and len(text_overlays) > 0:
        print(f"[FFmpeg] Adding {len(text_overlays)} text overlay(s)")
        text_filters = build_text_overlay_filters(
            text_overlays=text_overlays,
            input_label=video_output,
            output_label="[finalv]",
            width=width,
            height=height,
        )
        if text_filters:
            filter_parts.extend(text_filters)
            video_output = "[finalv]"
    
    # Initialize audio tracking
    src_audio_output = None
    all_audio_inputs = []
    
    # Concatenate all segment audio streams (each stream can be original, voiceover, or silence)
    if len(segment_audio_streams) > 0:
        if len(segment_audio_streams) > 1:
            audio_stream_refs = ''.join([s[0] for s in segment_audio_streams])
            src_audio_concat = f"{audio_stream_refs}concat=n={len(segment_audio_streams)}:v=0:a=1[src_audio]"
            filter_parts.append(src_audio_concat)
            src_audio_output = "[src_audio]"
        else:
            src_audio_output = segment_audio_streams[0][0]
        all_audio_inputs.append(src_audio_output)
    
    # Audio mixing: combine source audio with overlay audio clips
    if audio_clips:
        for i, clip in enumerate(audio_clips):
            input_idx = audio_inputs_start + i
            delay_ms = int(clip.get('startTime', 0) * 1000)
            duration = clip.get('duration', 10)
            volume = clip.get('volume', 1.0)
            
            # Apply delay and volume adjustment
            audio_filter = f"[{input_idx}:a]adelay={delay_ms}|{delay_ms},volume={volume}[overlay_a{i}]"
            filter_parts.append(audio_filter)
            all_audio_inputs.append(f"[overlay_a{i}]")
    
    # Mix all audio tracks (source + overlay) or use single source
    if len(all_audio_inputs) > 1:
        mix_filter = f"{''.join(all_audio_inputs)}amix=inputs={len(all_audio_inputs)}:duration=longest:normalize=0[outa]"
        filter_parts.append(mix_filter)
        audio_output = "[outa]"
    elif len(all_audio_inputs) == 1:
        # Only one audio source (either segment audio or single overlay)
        audio_output = all_audio_inputs[0]
    else:
        # No audio at all
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
    
    # Note: Removed forced -t duration flag to let FFmpeg determine output length
    # from actual concatenated video/audio streams (metadata duration may not match actual file duration)
    
    # Output file
    cmd.append(output_path)
    
    return cmd
