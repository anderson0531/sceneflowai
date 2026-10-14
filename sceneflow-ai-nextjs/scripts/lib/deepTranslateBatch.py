#!/usr/bin/env python3
"""Batch-translate strings via Google. Reads JSON from stdin.

Sends a chunk in one request (repeated `q` params) instead of sleeping between
every string. Falls back to concurrent single-string calls if the batch
endpoint rejects the payload.
"""

from __future__ import annotations

import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import requests
from deep_translator import GoogleTranslator

MAX_CHARS = 4500
MAX_ITEMS = 40
WORKERS = 6


def chunk_texts(texts: list[str]) -> list[list[tuple[int, str]]]:
    batches: list[list[tuple[int, str]]] = []
    current: list[tuple[int, str]] = []
    size = 0
    for index, text in enumerate(texts):
        if current and (len(current) >= MAX_ITEMS or size + len(text) > MAX_CHARS):
            batches.append(current)
            current = []
            size = 0
        current.append((index, text))
        size += len(text)
    if current:
        batches.append(current)
    return batches


def translate_chunk_request(texts: list[str], target: str) -> list[str]:
    params: list[tuple[str, str]] = [
        ("client", "gtx"),
        ("sl", "en"),
        ("tl", target),
        ("dt", "t"),
    ]
    for text in texts:
        params.append(("q", text))
    response = requests.get(
        "https://translate.googleapis.com/translate_a/single",
        params=params,
        timeout=60,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    if response.status_code == 429:
        raise RuntimeError("rate limited")
    response.raise_for_status()
    payload = response.json()
    # One `q` returns [[["translation", ...]]]. Several `q` values return a
    # list of those blocks, one per source string.
    if len(texts) == 1:
        translated = "".join(part[0] for part in payload[0] if part and part[0])
        return [translated]
    if not isinstance(payload, list) or len(payload) < len(texts):
        raise RuntimeError("unexpected batch payload")
    out: list[str] = []
    for block in payload[: len(texts)]:
        if not isinstance(block, list):
            raise RuntimeError("unexpected batch item")
        out.append("".join(part[0] for part in block if part and part[0]))
    if len(out) != len(texts):
        raise RuntimeError("batch size mismatch")
    return out


def translate_one(translator: GoogleTranslator, text: str) -> str:
    if not text.strip():
        return text
    delay = 1.0
    last_error: Exception | None = None
    for _attempt in range(5):
        try:
            return translator.translate(text)
        except Exception as err:  # noqa: BLE001
            last_error = err
            time.sleep(delay)
            delay = min(delay * 2, 20)
    raise RuntimeError(f"deep-translator failed: {last_error}")


def translate_chunk_concurrent(texts: list[str], target: str) -> list[str]:
    translator = GoogleTranslator(source="en", target=target)
    with ThreadPoolExecutor(max_workers=min(WORKERS, len(texts))) as pool:
        return list(pool.map(lambda text: translate_one(translator, text), texts))


def translate_all(texts: list[str], target: str) -> list[str]:
    out = [""] * len(texts)
    for batch in chunk_texts(texts):
        indexed = [(index, text) for index, text in batch if text.strip()]
        blanks = [index for index, text in batch if not text.strip()]
        for index in blanks:
            out[index] = texts[index]
        if not indexed:
            continue
        sources = [text for _index, text in indexed]
        delay = 1.0
        translated: list[str] | None = None
        last_error: Exception | None = None
        for _attempt in range(4):
            try:
                translated = translate_chunk_request(sources, target)
                break
            except Exception as err:  # noqa: BLE001
                last_error = err
                time.sleep(delay)
                delay = min(delay * 2, 20)
        if translated is None:
            print(
                f"batch endpoint failed for target={target}: {last_error}; using concurrent single requests",
                file=sys.stderr,
            )
            translated = translate_chunk_concurrent(sources, target)
        if len(translated) != len(sources):
            raise RuntimeError("translation count does not match the chunk")
        for (index, _text), value in zip(indexed, translated):
            out[index] = value
    return out


def main() -> None:
    payload = json.load(sys.stdin)
    target = payload["target"]
    texts = payload["texts"]
    try:
        translations = translate_all(texts, target)
    except Exception as err:  # noqa: BLE001
        print(f"deep-translator failed for target={target}: {err}", file=sys.stderr)
        sys.exit(1)
    json.dump({"translations": translations}, sys.stdout)


if __name__ == "__main__":
    main()
