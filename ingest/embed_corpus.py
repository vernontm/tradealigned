"""Generate OpenAI embeddings for trades + transcript_chunks + teaching_moments.

Run after ingest_trades.py. Idempotent: only embeds rows where embedding IS NULL.

Cost: text-embedding-3-small @ $0.02 / 1M tokens.
A full corpus of ~300 trades + ~20k transcript chunks ≈ a few cents total.
"""
from __future__ import annotations

import os
import sys
import time

from dotenv import load_dotenv
from openai import OpenAI
from supabase import Client, create_client

EMBED_MODEL = "text-embedding-3-small"
BATCH_SIZE = 96


def get_clients() -> tuple[Client, OpenAI]:
    load_dotenv()
    if not (os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_ROLE_KEY")):
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("Set OPENAI_API_KEY in .env")
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    oai = OpenAI()
    return sb, oai


def trade_to_text(t: dict) -> str:
    """Compose a richly indexable description of a trade for embedding."""
    parts = []
    if t.get("instrument"): parts.append(t["instrument"])
    if t.get("direction"): parts.append(t["direction"])
    if t.get("setup_type"): parts.append(f"setup: {t['setup_type']}")
    if t.get("final_outcome"): parts.append(f"outcome: {t['final_outcome']}")
    if t.get("estimated_rr"): parts.append(f"RR: {t['estimated_rr']}")
    if t.get("reasoning"): parts.append(t["reasoning"])
    if t.get("notes"): parts.append(t["notes"])
    return " | ".join(parts)


def with_retry(fn, label: str, attempts: int = 6, backoff: float = 1.5):
    """Retry on transient SSL/network errors with exponential backoff."""
    for i in range(attempts):
        try:
            return fn()
        except Exception as e:
            msg = str(e)
            transient = (
                "bad record mac" in msg
                or "SSL" in msg
                or "Connection" in msg
                or "Timeout" in msg
                or "timed out" in msg
                or "ReadError" in msg
            )
            if not transient or i == attempts - 1:
                raise
            wait = backoff * (2 ** i)
            print(f"  retry {i+1}/{attempts} {label}: {type(e).__name__}; sleeping {wait:.1f}s", flush=True)
            time.sleep(wait)


def embed_table(sb: Client, oai: OpenAI, table: str, text_fn) -> int:
    """Embed all rows where embedding is null. text_fn(row) -> str."""
    total = 0
    while True:
        rows = with_retry(
            lambda: (sb.table(table)
                       .select("*")
                       .is_("embedding", "null")
                       .limit(BATCH_SIZE)
                       .execute()).data,
            f"select {table}",
        )
        if not rows: break
        texts = [text_fn(r) for r in rows]
        # Drop empty texts
        pairs = [(r, t) for r, t in zip(rows, texts) if t and t.strip()]
        if not pairs:
            for r in rows:
                with_retry(
                    lambda r=r: sb.table(table).update({"embedding": [0.0] * 1536}).eq("id", r["id"]).execute(),
                    f"zero-fill {table}",
                )
            continue
        resp = with_retry(
            lambda: oai.embeddings.create(model=EMBED_MODEL, input=[t for _, t in pairs]),
            f"openai embed {table}",
        )
        for (row, _), e in zip(pairs, resp.data):
            with_retry(
                lambda row=row, e=e: sb.table(table).update({"embedding": e.embedding}).eq("id", row["id"]).execute(),
                f"update {table}",
            )
            total += 1
        print(f"  embedded {total} {table}", flush=True)
        time.sleep(0.1)
    return total


def main() -> int:
    sb, oai = get_clients()
    print("=== Embedding trades ===")
    n_trades = embed_table(sb, oai, "trades", trade_to_text)
    print(f"\n=== Embedding transcript_chunks ===")
    n_chunks = embed_table(sb, oai, "transcript_chunks", lambda r: r["text"])
    print(f"\n=== Embedding teaching_moments ===")
    n_teach = embed_table(sb, oai, "teaching_moments", lambda r: f"{r['concept']}: {r['quote']}")
    print(f"\nDONE: {n_trades} trades, {n_chunks} chunks, {n_teach} teaching moments")
    return 0


if __name__ == "__main__":
    sys.exit(main())
