#!/usr/bin/env python3
"""
Cloud Run Demucs stem worker.

Environment:
  - GCS_BUCKET
  - JOB_SPEC_PATH (format: "<bucket>/<path>" OR "<path>")
  - CALLBACK_URL
  - JOB_ID
  - DEMUCS_MODEL (optional, default: htdemucs_ft)
  - STEM_TMP_DIR (optional, default: /tmp/stem-worker)

Job spec JSON:
  {
    "jobId": "...",
    "projectId": "...",
    "sceneId": "...",
    "segmentId": "...",
    "takeId": "...",
    "sourceAudioUrl": "https://...",
    "sourceHash": "...",
    "outputPrefix": "stems/<sourceHash>/",
    "callbackUrl": "https://.../api/audio/stems/callback",
    "provider": "demucs",
    "model": "htdemucs_ft"
  }
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Dict

import requests
from google.cloud import storage


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def post_callback(callback_url: str, payload: Dict[str, Any]) -> None:
    try:
        requests.post(callback_url, json=payload, timeout=15)
    except Exception as exc:  # noqa: BLE001
        print(f"[StemWorker] callback failed: {exc}")


def load_job_spec(bucket_name: str, job_spec_path: str) -> Dict[str, Any]:
    client = storage.Client()
    if "/" not in job_spec_path or job_spec_path.startswith("stem-job-specs/"):
        blob_path = job_spec_path
        bucket = client.bucket(bucket_name)
    else:
        parts = job_spec_path.split("/", 1)
        bucket = client.bucket(parts[0])
        blob_path = parts[1]
    blob = bucket.blob(blob_path)
    return json.loads(blob.download_as_text())


def upload_file(bucket_name: str, local_path: Path, remote_path: str, content_type: str) -> str:
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(remote_path)
    blob.upload_from_filename(str(local_path), content_type=content_type)
    return f"https://storage.googleapis.com/{bucket_name}/{remote_path}"


def main() -> int:
    job_id = os.environ.get("JOB_ID", "")
    bucket_name = os.environ.get("GCS_BUCKET", "")
    job_spec_path = os.environ.get("JOB_SPEC_PATH", "")
    callback_url = os.environ.get("CALLBACK_URL", "")
    model = os.environ.get("DEMUCS_MODEL", "htdemucs_ft")

    if not bucket_name or not job_spec_path:
        raise RuntimeError("Missing GCS_BUCKET or JOB_SPEC_PATH")

    spec = load_job_spec(bucket_name, job_spec_path)
    callback_url = spec.get("callbackUrl") or callback_url
    source_audio_url = spec["sourceAudioUrl"]
    source_hash = spec.get("sourceHash") or "unknown"
    output_prefix = spec.get("outputPrefix") or f"stems/{source_hash}/"
    model = spec.get("model") or model
    started = time.time()

    if callback_url:
        post_callback(
            callback_url,
            {
                "jobId": spec.get("jobId", job_id),
                "status": "PROCESSING",
                "progress": 15,
                "projectId": spec.get("projectId"),
                "sceneId": spec.get("sceneId"),
                "segmentId": spec.get("segmentId"),
                "takeId": spec.get("takeId"),
                "provider": "demucs",
                "sourceAudioUrl": source_audio_url,
                "sourceHash": source_hash,
                "model": model,
            },
        )

    tmp_root = Path(os.environ.get("STEM_TMP_DIR", "/tmp/stem-worker"))
    tmp_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=str(tmp_root)) as tmp_dir:
        tmp = Path(tmp_dir)
        input_audio = tmp / "full_mix.wav"
        demucs_out = tmp / "demucs_out"

        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                source_audio_url,
                "-vn",
                "-ac",
                "2",
                "-ar",
                "48000",
                "-c:a",
                "pcm_s16le",
                str(input_audio),
            ]
        )

        run(
            [
                "demucs",
                "-n",
                model,
                "--two-stems=vocals",
                "--out",
                str(demucs_out),
                str(input_audio),
            ]
        )

        stem_folder = demucs_out / model / input_audio.stem
        vocals = stem_folder / "vocals.wav"
        no_vocals = stem_folder / "no_vocals.wav"
        if not no_vocals.exists():
            raise RuntimeError(f"Demucs output missing no_vocals stem at {no_vocals}")

        background_remote = f"{output_prefix.rstrip('/')}/background-{source_hash}.wav"
        speech_remote = f"{output_prefix.rstrip('/')}/speech-{source_hash}.wav"
        background_url = upload_file(bucket_name, no_vocals, background_remote, "audio/wav")
        speech_url = upload_file(bucket_name, vocals, speech_remote, "audio/wav") if vocals.exists() else None

        processing_ms = int((time.time() - started) * 1000)
        if callback_url:
            post_callback(
                callback_url,
                {
                    "jobId": spec.get("jobId", job_id),
                    "status": "COMPLETED",
                    "progress": 100,
                    "projectId": spec.get("projectId"),
                    "sceneId": spec.get("sceneId"),
                    "segmentId": spec.get("segmentId"),
                    "takeId": spec.get("takeId"),
                    "provider": "demucs",
                    "sourceAudioUrl": source_audio_url,
                    "sourceHash": source_hash,
                    "model": model,
                    "processingMs": processing_ms,
                    "speechStemUrl": speech_url,
                    "backgroundStemUrl": background_url,
                    "speechStemPath": f"gs://{bucket_name}/{speech_remote}" if speech_url else None,
                    "backgroundStemPath": f"gs://{bucket_name}/{background_remote}",
                },
            )

    shutil.rmtree(tmp_root, ignore_errors=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"[StemWorker] fatal: {exc}")
        callback_url = os.environ.get("CALLBACK_URL", "")
        if callback_url:
            post_callback(
                callback_url,
                {
                    "jobId": os.environ.get("JOB_ID"),
                    "status": "FAILED",
                    "progress": 0,
                    "error": str(exc),
                },
            )
        raise
