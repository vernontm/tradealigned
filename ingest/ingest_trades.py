"""Ingest trade-analyzer output into Supabase Postgres.

Reads every trades_analyzed.json under ~/Desktop/trade-analyzer/trades/
and upserts videos + trades + transcripts into the database.

Embeddings are generated in a separate pass (embed_corpus.py) so that
ingest is idempotent and re-runnable as the batch keeps producing data.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

ANALYZER_ROOT = Path("/Users/raysmacbook/Desktop/trade-analyzer")
TRADES_ROOT = ANALYZER_ROOT / "trades"
TRANSCRIPTS_ROOT = ANALYZER_ROOT / "transcripts"


def get_client() -> Client:
    load_dotenv()
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env "
            "(found at Supabase Project Settings > API)"
        )
    return create_client(url, key)


def upsert_video(sb: Client, video_meta: dict, video_dir: Path) -> str:
    """Return the videos.id (uuid string)."""
    filename = video_meta.get("video_name") or video_dir.name
    payload = {
        "filename": filename,
        "display_name": video_dir.name,
        "video_date": video_meta.get("video_date"),
        "date_source": video_meta.get("date_source"),
        "source_path": video_meta.get("video_path"),
        "kind": "trading",
    }
    result = sb.table("videos").upsert(payload, on_conflict="filename").execute()
    return result.data[0]["id"]


def upsert_trade(sb: Client, video_id: str, trade: dict) -> None:
    a = trade.get("analysis") or {}
    payload = {
        "video_id": video_id,
        "trade_index": trade.get("id"),
        "entry_time_sec": trade.get("entry_time"),
        "exit_time_sec": trade.get("exit_time"),
        "entry_chart_time": a.get("entry_chart_time"),
        "exit_chart_time": a.get("exit_chart_time"),
        "entry_phrase": trade.get("entry_phrase"),
        "exit_phrase": trade.get("exit_phrase"),
        "detected_direction": trade.get("direction"),
        "instrument": a.get("instrument"),
        "is_my_instrument": _coerce_bool(a.get("is_my_instrument")),
        "position_visible": _coerce_bool(a.get("position_visible")),
        "direction": a.get("direction") if a.get("direction") in ("long","short") else None,
        "entry_price": a.get("entry_price"),
        "stop_loss": a.get("stop_loss"),
        "take_profit": a.get("take_profit"),
        "position_size": a.get("position_size"),
        "setup_type": a.get("setup_type"),
        "outcome_raw": a.get("outcome"),
        "final_outcome": a.get("final_outcome") or a.get("outcome") or "unknown",
        "estimated_rr": a.get("estimated_rr"),
        "exit_reason": a.get("exit_reason"),
        "reasoning": a.get("reasoning"),
        "notes": a.get("notes"),
        "entry_frame_path": (trade.get("entry_frames") or [{}])[-1].get("path"),
        "exit_frame_path": ((trade.get("exit_frames") or [{}])[-1].get("path")) if trade.get("exit_frames") else None,
        "entry_clip_path": trade.get("entry_clip"),
        "exit_clip_path": trade.get("exit_clip"),
        "trade_clip_path": trade.get("trade_clip"),
    }
    sb.table("trades").upsert(payload, on_conflict="video_id,trade_index").execute()


def upsert_transcript_chunks(sb: Client, video_id: str, transcript: dict) -> int:
    """Chunk the transcript into ~30s windows and upsert each chunk."""
    segments = transcript.get("segments") or []
    if not segments:
        return 0
    # Group segments into ~30s rolling chunks
    CHUNK_SECS = 30.0
    chunks: list[dict] = []
    current_start = None
    current_text: list[str] = []
    current_end = 0.0
    for seg in segments:
        if current_start is None:
            current_start = seg["start"]
        current_text.append(seg["text"])
        current_end = seg["end"]
        if current_end - current_start >= CHUNK_SECS:
            txt = " ".join(current_text).strip()
            if txt and txt not in ("", "."):
                chunks.append({
                    "video_id": video_id,
                    "start_sec": current_start,
                    "end_sec": current_end,
                    "text": txt,
                })
            current_start = None
            current_text = []
    if current_text:
        txt = " ".join(current_text).strip()
        if txt and txt not in ("", "."):
            chunks.append({
                "video_id": video_id,
                "start_sec": current_start,
                "end_sec": current_end,
                "text": txt,
            })
    # Clear existing transcript chunks for this video, then insert fresh
    sb.table("transcript_chunks").delete().eq("video_id", video_id).execute()
    if chunks:
        # Insert in batches to stay under Supabase row limit
        for i in range(0, len(chunks), 200):
            sb.table("transcript_chunks").insert(chunks[i:i+200]).execute()
    return len(chunks)


def _coerce_bool(v) -> bool | None:
    if isinstance(v, bool): return v
    if isinstance(v, str):
        s = v.strip().lower()
        if s in ("true","yes","y"): return True
        if s in ("false","no","n"): return False
    return None


def main() -> int:
    sb = get_client()
    video_dirs = sorted(d for d in TRADES_ROOT.iterdir() if d.is_dir())
    total_trades = 0
    total_videos = 0
    total_chunks = 0
    for d in video_dirs:
        analyzed = d / "trades_analyzed.json"
        meta_file = d / "video_meta.json"
        if not analyzed.exists():
            continue
        try:
            meta = json.loads(meta_file.read_text()) if meta_file.exists() else {}
            trades = json.loads(analyzed.read_text())
            if not trades:
                continue
            print(f"[{d.name}] {len(trades)} trade(s)")
            video_id = upsert_video(sb, meta, d)
            for t in trades:
                upsert_trade(sb, video_id, t)
                total_trades += 1
            # transcript
            stem = Path(meta.get("video_name", d.name)).stem
            transcript_path = TRANSCRIPTS_ROOT / f"{stem}.transcript.json"
            if transcript_path.exists():
                transcript = json.loads(transcript_path.read_text())
                n = upsert_transcript_chunks(sb, video_id, transcript)
                total_chunks += n
                print(f"  + {n} transcript chunks")
            total_videos += 1
        except Exception as e:
            print(f"  ERROR on {d.name}: {e}")
    print(f"\n=== ingest done: {total_videos} videos, {total_trades} trades, {total_chunks} chunks ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
