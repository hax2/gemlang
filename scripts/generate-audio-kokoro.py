#!/usr/bin/env python3
"""Fill missing GemLang sentence audio with the local Kokoro Spanish voice."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULES_DIR = ROOT / "src" / "data" / "modules"
OUTPUT_DIR = ROOT / "public" / "audio" / "generated"
MANIFEST_PATH = ROOT / "public" / "audio" / "manifest.json"
DEFAULT_VOICE = "ef_dora"


def normalize_text(text: str) -> str:
    return " ".join(str(text).split())


def audio_id(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def collect_texts() -> list[str]:
    texts: dict[str, None] = {}
    for module_path in sorted(MODULES_DIR.glob("*.json")):
        module = json.loads(module_path.read_text(encoding="utf-8"))
        for sentence in module.get("sentences") or []:
            spanish = normalize_text(sentence.get("spanish", ""))
            if spanish:
                texts[spanish] = None
        if module.get("specialPractice") == "ser-estar-rules":
            for rule in module.get("rules") or []:
                for example in rule.get("examples") or []:
                    prompt = normalize_text(example.get("prompt", ""))
                    answer = normalize_text(
                        f"{example.get('correct', '')} {example.get('continuation', '')}"
                    )
                    if prompt:
                        texts[prompt] = None
                    if answer:
                        texts[answer] = None
                for translation in rule.get("translations") or []:
                    spanish = normalize_text(translation.get("spanish", ""))
                    if spanish:
                        texts[spanish] = None
    return sorted(texts)


def entry_exists(entry: str | list[str]) -> bool:
    entries = entry if isinstance(entry, list) else [entry]
    return bool(entries) and all((ROOT / "public" / item).exists() for item in entries)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Kokoro Spanish voice.")
    parser.add_argument("--dry-run", action="store_true", help="Only report missing audio.")
    args = parser.parse_args()

    try:
        import numpy as np
        import soundfile as sf
        from kokoro import KPipeline
    except ImportError as exc:
        raise SystemExit(
            "Missing Kokoro dependencies. Run: python3 -m pip install -r requirements-audio.txt"
        ) from exc

    current_manifest = (
        json.loads(MANIFEST_PATH.read_text(encoding="utf-8")) if MANIFEST_PATH.exists() else {}
    )
    texts = collect_texts()
    missing = [text for text in texts if not entry_exists(current_manifest.get(text, []))]
    print(f"Collected {len(texts)} current Spanish audio texts.")
    print(f"Missing recorded audio: {len(missing)}.")
    if args.dry_run:
        return

    pipeline = KPipeline(lang_code="e")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    new_entries: dict[str, str] = {}
    for index, text in enumerate(missing, start=1):
        filename = f"{audio_id(text)}.kokoro-{args.voice}.mp3"
        destination = OUTPUT_DIR / filename
        new_entries[text] = f"audio/generated/{filename}"
        if destination.exists():
            print(f"[{index}/{len(missing)}] reuse: {text}", flush=True)
            continue

        print(f"[{index}/{len(missing)}] {args.voice}: {text}", flush=True)
        chunks = [np.asarray(audio, dtype=np.float32) for _, _, audio in pipeline(text, voice=args.voice)]
        if not chunks:
            raise RuntimeError(f"Kokoro returned no audio for: {text}")
        audio = np.concatenate(chunks)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            wav_path = Path(tmp.name)
        try:
            sf.write(wav_path, audio, 24000)
            subprocess.run(
                [
                    "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                    "-i", str(wav_path), "-codec:a", "libmp3lame", "-b:a", "64k",
                    str(destination),
                ],
                check=True,
            )
        finally:
            wav_path.unlink(missing_ok=True)

    manifest = {
        text: new_entries[text] if text in new_entries else current_manifest[text]
        for text in texts
        if text in new_entries or text in current_manifest
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {MANIFEST_PATH.relative_to(ROOT)} with {len(manifest)} entries.")


if __name__ == "__main__":
    main()
