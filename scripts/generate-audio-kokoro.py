#!/usr/bin/env python3
"""Generate Spanish MP3 assets for GemLang with Kokoro TTS.

The app reads public/audio/manifest.json as an exact text -> MP3 path map.
If an entry is missing or an MP3 fails to load, LessonPlayer falls back to
browser speechSynthesis.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULES_DIR = ROOT / "src" / "data" / "modules"
OUTPUT_DIR = ROOT / "public" / "audio" / "generated"
MANIFEST_PATH = ROOT / "public" / "audio" / "manifest.json"
DEFAULT_VOICES = ("ef_dora", "em_alex", "em_santa")


def normalize_text(text: str) -> str:
    return " ".join(str(text).split())


def audio_id(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def voice_slug(voice: str) -> str:
    return "".join(char if char.isalnum() or char in ("-", "_") else "-" for char in voice)


def mp3_filename(text: str, voice: str, voice_count: int) -> str:
    base = audio_id(text)
    if voice_count == 1 or voice == DEFAULT_VOICES[0]:
        return f"{base}.mp3"
    return f"{base}.{voice_slug(voice)}.mp3"


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


def synthesize_with_kokoro(texts: list[str], voices: list[str], overwrite: bool) -> dict[str, str | list[str]]:
    try:
        import numpy as np
        import soundfile as sf
        from kokoro import KPipeline
    except ImportError as exc:
        raise SystemExit(
            "Missing audio dependencies. Run: python3 -m pip install -r requirements-audio.txt"
        ) from exc

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    pipeline = KPipeline(lang_code="e")
    manifest: dict[str, str | list[str]] = {}

    for index, text in enumerate(texts, start=1):
        entries = []
        for voice in voices:
            mp3_name = mp3_filename(text, voice, len(voices))
            entries.append(f"audio/generated/{mp3_name}")

        manifest[text] = entries[0] if len(entries) == 1 else entries

        for voice, entry in zip(voices, entries):
            mp3_path = ROOT / "public" / entry
            if mp3_path.exists() and not overwrite:
                continue

            print(f"[{index}/{len(texts)}] {voice}: {text}", flush=True)
            chunks = []
            for _, _, audio in pipeline(text, voice=voice):
                chunks.append(np.asarray(audio, dtype=np.float32))

            if not chunks:
                print(f"  skipped: no audio returned", file=sys.stderr)
                continue

            audio = np.concatenate(chunks)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                wav_path = Path(tmp.name)

            try:
                sf.write(wav_path, audio, 24000)
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-hide_banner",
                        "-loglevel",
                        "error",
                        "-i",
                        str(wav_path),
                        "-codec:a",
                        "libmp3lame",
                        "-b:a",
                        "64k",
                        str(mp3_path),
                    ],
                    check=True,
                )
            finally:
                wav_path.unlink(missing_ok=True)

    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--voices",
        default=",".join(DEFAULT_VOICES),
        help="Comma-separated Kokoro Spanish voices to generate.",
    )
    parser.add_argument("--overwrite", action="store_true", help="Regenerate existing MP3s.")
    parser.add_argument("--limit", type=int, default=0, help="Generate only the first N texts.")
    parser.add_argument("--dry-run", action="store_true", help="Only print the text count.")
    args = parser.parse_args()

    texts = collect_texts()
    if args.limit > 0:
        texts = texts[: args.limit]

    print(f"Collected {len(texts)} unique Spanish audio texts.")
    if args.dry_run:
        return

    voices = [voice.strip() for voice in args.voices.split(",") if voice.strip()]
    if not voices:
        raise SystemExit("No voices provided.")

    print(f"Using voices: {', '.join(voices)}")
    manifest = synthesize_with_kokoro(texts, voices, args.overwrite)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {MANIFEST_PATH.relative_to(ROOT)} with {len(manifest)} entries.")


if __name__ == "__main__":
    main()
