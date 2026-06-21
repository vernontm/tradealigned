"""Ingest a single video's trades_analyzed.json by folder name substring.
Usage: python ingest/ingest_one.py 2023-02-16
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from ingest_trades import (
    ANALYZER_ROOT,
    TRADES_ROOT,
    TRANSCRIPTS_ROOT,
    get_client,
    upsert_trade,
    upsert_transcript_chunks,
    upsert_video,
)


def main() -> int:
    needle = sys.argv[1] if len(sys.argv) > 1 else ""
    if not needle:
        print("usage: python ingest_one.py <folder-substring>")
        return 1

    sb = get_client()
    matching = [d for d in TRADES_ROOT.iterdir() if d.is_dir() and needle.lower() in d.name.lower()]
    if not matching:
        print(f"no folder matches {needle!r}")
        return 1

    for d in matching:
        analyzed = d / "trades_analyzed.json"
        meta_file = d / "video_meta.json"
        if not analyzed.exists():
            print(f"  skip {d.name}: no trades_analyzed.json")
            continue
        meta = json.loads(meta_file.read_text()) if meta_file.exists() else {}
        trades = json.loads(analyzed.read_text())
        print(f"[{d.name}] {len(trades)} trade(s)")
        video_id = upsert_video(sb, meta, d)
        for t in trades:
            upsert_trade(sb, video_id, t)
            a = (t.get("analysis") or {})
            print(f"  trade #{t.get('id')}: {a.get('chart_instrument')} / {a.get('spoken_instrument')} -> {a.get('final_outcome')}")

        stem = Path(meta.get("video_name", d.name)).stem
        transcript_path = TRANSCRIPTS_ROOT / f"{stem}.transcript.json"
        if transcript_path.exists():
            transcript = json.loads(transcript_path.read_text())
            n = upsert_transcript_chunks(sb, video_id, transcript)
            print(f"  + {n} transcript chunks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
