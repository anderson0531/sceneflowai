"""Eligibility tests for scene-stitch stream copy. No FFmpeg binary required."""

import unittest

from ffmpeg_utils import (
    build_concat_ffmpeg_command,
    build_stream_copy_ffmpeg_command,
    full_stream_copy_block_reason,
    resolve_encode_settings,
    resolve_output_size,
    video_stream_copy_block_reason,
)


def probe(codec='h264', width=1920, height=1080, pix_fmt='yuv420p', fps=24.0, audio=True):
    return {
        'codec': codec,
        'width': width,
        'height': height,
        'pix_fmt': pix_fmt,
        'fps': fps,
        'audio_codec': 'aac' if audio else None,
        'sample_rate': 48000 if audio else None,
        'channels': 2 if audio else None,
    }


def segment(**overrides):
    base = {
        'audioSource': 'original',
        'audioVolume': 1.0,
        'pauseDuration': 0,
    }
    base.update(overrides)
    return base


class EncodeSettingsTest(unittest.TestCase):
    def test_delivery_is_the_default(self):
        self.assertEqual(resolve_encode_settings(None), ('medium', '23'))
        self.assertEqual(resolve_encode_settings('unknown'), ('medium', '23'))

    def test_draft_is_faster(self):
        self.assertEqual(resolve_encode_settings('draft'), ('veryfast', '28'))

    def test_reencode_command_uses_draft_preset(self):
        cmd = build_concat_ffmpeg_command(
            video_segments=[{'localFile': 'a.mp4', 'audioSource': 'none', 'duration': 1}],
            audio_clips=[],
            output_path='/tmp/out.mp4',
            include_segment_audio=False,
            encode_quality='draft',
        )
        preset_at = cmd.index('-preset')
        crf_at = cmd.index('-crf')
        self.assertEqual(cmd[preset_at + 1], 'veryfast')
        self.assertEqual(cmd[crf_at + 1], '28')

    def test_vertical_delivery_swaps_frame_and_pads(self):
        self.assertEqual(resolve_output_size('1080p', '9:16'), (1080, 1920))
        cmd = build_concat_ffmpeg_command(
            video_segments=[{'localFile': 'a.mp4', 'audioSource': 'none', 'duration': 1}],
            audio_clips=[],
            output_path='/tmp/out.mp4',
            include_segment_audio=False,
            aspect_ratio='9:16',
        )
        joined = ' '.join(cmd)
        self.assertIn('scale=1080:1920:force_original_aspect_ratio=decrease', joined)
        self.assertIn('pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black', joined)
        reason = video_stream_copy_block_reason(
            [segment()],
            [probe()],
            aspect_ratio='9:16',
        )
        self.assertIn('1080x1920', reason or '')


class StreamCopyEligibilityTest(unittest.TestCase):
    def test_matching_beats_can_copy(self):
        segments = [segment(), segment()]
        probes = [probe(), probe()]
        self.assertIsNone(video_stream_copy_block_reason(segments, probes))
        self.assertIsNone(full_stream_copy_block_reason(segments, probes, audio_clips=[]))

    def test_pause_rejects_copy(self):
        reason = video_stream_copy_block_reason(
            [segment(pauseDuration=1)],
            [probe()],
        )
        self.assertIn('pause', reason)

    def test_watermark_rejects_copy(self):
        reason = video_stream_copy_block_reason(
            [segment()],
            [probe()],
            watermark={'type': 'text', 'text': 'SceneFlow'},
        )
        self.assertEqual(reason, 'watermark')

    def test_resolution_mismatch_rejects_copy(self):
        reason = video_stream_copy_block_reason(
            [segment()],
            [probe(width=1280, height=720)],
            resolution='1080p',
        )
        self.assertIn('resolution', reason)

    def test_fps_mismatch_rejects_copy(self):
        reason = video_stream_copy_block_reason(
            [segment()],
            [probe(fps=30.0)],
            fps=24,
        )
        self.assertIn('fps', reason)

    def test_voiceover_rejects_copy(self):
        reason = video_stream_copy_block_reason(
            [segment(audioSource='voiceover')],
            [probe()],
        )
        self.assertIn('voiceover', reason)

    def test_per_segment_volume_rejects_copy(self):
        reason = video_stream_copy_block_reason(
            [segment(audioVolume=1.0), segment(audioVolume=0.4)],
            [probe(), probe()],
        )
        self.assertEqual(reason, 'per-segment volume')

    def test_overlay_audio_keeps_video_copy_but_not_full_copy(self):
        segments = [segment()]
        probes = [probe()]
        self.assertIsNone(video_stream_copy_block_reason(segments, probes))
        reason = full_stream_copy_block_reason(
            segments,
            probes,
            audio_clips=[{'localFile': 'music.wav'}],
        )
        self.assertEqual(reason, 'overlay audio')

    def test_full_copy_command_uses_stream_copy(self):
        cmd = build_stream_copy_ffmpeg_command(
            concat_list_path='/tmp/list.txt',
            audio_clips=[],
            output_path='/tmp/out.mp4',
            temp_dir='/tmp',
            full_copy=True,
        )
        self.assertIn('-c', cmd)
        self.assertIn('copy', cmd)
        self.assertNotIn('libx264', cmd)

    def test_video_copy_with_mix_reencodes_audio_only(self):
        cmd = build_stream_copy_ffmpeg_command(
            concat_list_path='/tmp/list.txt',
            audio_clips=[{'localFile': 'music.wav', 'startTime': 0, 'volume': 0.5}],
            output_path='/tmp/out.mp4',
            temp_dir='/tmp',
            full_copy=False,
        )
        self.assertIn('-c:v', cmd)
        self.assertEqual(cmd[cmd.index('-c:v') + 1], 'copy')
        self.assertIn('aac', cmd)
        self.assertNotIn('libx264', cmd)


if __name__ == '__main__':
    unittest.main()
