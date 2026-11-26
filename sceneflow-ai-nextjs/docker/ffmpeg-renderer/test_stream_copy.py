"""Eligibility tests for scene-stitch stream copy. No FFmpeg binary required."""

import unittest

from ffmpeg_utils import (
    _overlay_audio_filter,
    build_concat_ffmpeg_command,
    build_stream_copy_ffmpeg_command,
    build_video_encode_args,
    fallback_nvenc_cmd_to_libx264,
    full_stream_copy_block_reason,
    narration_bass_filters,
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

    def test_nvenc_hardware_encoding_args_and_cpu_fallback(self):
        nv_delivery = build_video_encode_args('delivery', use_nvenc=True)
        self.assertEqual(nv_delivery[:4], ['-c:v', 'h264_nvenc', '-preset', 'p5'])
        self.assertIn('-spatial-aq', nv_delivery)
        self.assertIn('-temporal-aq', nv_delivery)
        self.assertEqual(nv_delivery[nv_delivery.index('-cq') + 1], '23')

        nv_draft = build_video_encode_args('draft', use_nvenc=True)
        self.assertEqual(nv_draft[:4], ['-c:v', 'h264_nvenc', '-preset', 'p2'])
        self.assertNotIn('-spatial-aq', nv_draft)
        self.assertEqual(nv_draft[nv_draft.index('-cq') + 1], '28')

        cpu_delivery = build_video_encode_args('delivery', use_nvenc=False)
        self.assertEqual(cpu_delivery, ['-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p'])

        nv_cmd = ['ffmpeg', '-y', '-i', 'in.mp4', *nv_delivery, '-c:a', 'aac', '/tmp/out.mp4']
        rewritten = fallback_nvenc_cmd_to_libx264(nv_cmd, encode_quality='delivery')
        self.assertIsNotNone(rewritten)
        self.assertIn('libx264', rewritten)
        self.assertNotIn('h264_nvenc', rewritten)
        self.assertNotIn('-spatial-aq', rewritten)
        self.assertEqual(rewritten[-3:], ['-c:a', 'aac', '/tmp/out.mp4'])
        self.assertIsNone(fallback_nvenc_cmd_to_libx264(rewritten))

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


class NarrationBassTests(unittest.TestCase):
    def test_shelf_is_only_on_narration(self):
        self.assertEqual(narration_bass_filters({'type': 'narration'}), ['bass=g=6:f=120:w=0.5'])
        self.assertEqual(
            narration_bass_filters({'type': 'narration', 'warmBroadcastEq': False}),
            [],
        )
        self.assertEqual(narration_bass_filters({'type': 'music'}), [])

    def test_overlay_filter_places_the_shelf_before_volume(self):
        narration = _overlay_audio_filter(2, {'type': 'narration', 'volume': 1.5, 'startTime': 0}, '[na]')
        music = _overlay_audio_filter(3, {'type': 'music', 'volume': 0.22, 'startTime': 0}, '[mu]')
        self.assertIn('bass=g=6:f=120:w=0.5,volume=1.5', narration)
        self.assertNotIn('bass=', music)

    def test_overlay_filter_trims_explicit_duration_in_stream_copy_mode(self):
        shot_one = _overlay_audio_filter(
            1,
            {'type': 'music', 'volume': 0.25, 'startTime': 0, 'duration': 5.0},
            '[m0]',
        )
        self.assertIn('atrim=duration=5.000,asetpts=PTS-STARTPTS', shot_one)
        self.assertIn('volume=0.25', shot_one)

    def test_overlay_filter_trims_source_window_without_duplicate_duration_trim(self):
        shot_two = _overlay_audio_filter(
            2,
            {'type': 'music', 'volume': 0.125, 'startTime': 5.0, 'duration': 5.0, 'trimStart': 5.0},
            '[m1]',
        )
        self.assertIn('atrim=start=5.000,atrim=end=10.000,asetpts=PTS-STARTPTS', shot_two)
        self.assertNotIn('atrim=duration=', shot_two)
        self.assertIn('adelay=5000|5000', shot_two)
        self.assertIn('volume=0.125', shot_two)


class HybridAndAlignmentConcatTests(unittest.TestCase):
    def test_pre_hold_and_still_segments_reject_stream_copy(self):
        self.assertIn(
            'pre-segment hold',
            video_stream_copy_block_reason([segment(preSegmentHoldSec=2.0)], [probe()]) or '',
        )
        self.assertIn(
            'still image',
            video_stream_copy_block_reason([segment(assetType='image')], [None]) or '',
        )
        self.assertEqual(
            video_stream_copy_block_reason(
                [segment()],
                [probe()],
                scene_intro_transition={'effect': 'fade_in', 'durationSec': 1.0},
            ),
            'scene intro transition',
        )
        self.assertEqual(
            full_stream_copy_block_reason(
                [segment()],
                [probe()],
                audio_clips=[],
                loudness_target='web-14lufs',
            ),
            'loudness target',
        )

    def test_concat_command_supports_intro_freeze_hybrid_still_and_loudnorm(self):
        cmd = build_concat_ffmpeg_command(
            video_segments=[
                {
                    'localFile': 'shot1.mp4',
                    'assetType': 'video',
                    'audioSource': 'original',
                    'audioVolume': 1.0,
                    'duration': 5.0,
                    'preSegmentHoldSec': 2.0,
                    'pauseDuration': 1.5,
                },
                {
                    'localFile': 'shot2.png',
                    'assetType': 'image',
                    'audioSource': 'none',
                    'duration': 4.0,
                    'holdStyle': 'push',
                    'pauseDuration': 0,
                },
            ],
            audio_clips=[
                {
                    'localFile': 'cue1.mp3',
                    'type': 'narration',
                    'startTime': 0.5,
                    'duration': 6.0,
                    'volume': 0.9,
                }
            ],
            output_path='/tmp/out.mp4',
            include_segment_audio=True,
            scene_intro_transition={'effect': 'fade_in', 'durationSec': 1.0},
            loudness_target='web-14lufs',
        )
        joined = ' '.join(cmd)
        self.assertIn('-loop 1 -framerate 24 -t 4.000 -i /tmp/assets/shot2.png', joined)
        self.assertIn('tpad=start_mode=clone:start_duration=2.000:stop_mode=clone:stop_duration=1.5', joined)
        self.assertIn('adelay=2000|2000', joined)
        self.assertIn('zoompan=', joined)
        self.assertIn('fade=t=in:st=0:d=1.000:color=black', joined)
        self.assertIn('loudnorm=I=-14.0:TP=-1.5:LRA=11.0', joined)


if __name__ == '__main__':
    unittest.main()
