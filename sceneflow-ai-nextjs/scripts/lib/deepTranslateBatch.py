#!/usr/bin/env python3
"""Batch translate strings via deep-translator (Google). Reads JSON from stdin."""

import json
import sys
import time

from deep_translator import GoogleTranslator


def main() -> None:
    payload = json.load(sys.stdin)
    target = payload["target"]
    texts = payload["texts"]
    translator = GoogleTranslator(source="en", target=target)
    out: list[str] = []

    for text in texts:
        if not text.strip():
            out.append(text)
            continue
        try:
            out.append(translator.translate(text))
        except Exception as err:  # noqa: BLE001
            print(f"deep-translator failed for target={target}: {err}", file=sys.stderr)
            sys.exit(1)
        time.sleep(0.15)

    json.dump({"translations": out}, sys.stdout)


if __name__ == "__main__":
    main()
