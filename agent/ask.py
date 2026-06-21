"""CLI Q&A agent — retrieves from corpus and answers as Ray.

Usage: python ask.py "what's my favorite NAS100 setup?"

This is the prototype before the web app. It validates retrieval + persona
on the real data. Once it feels right, we wire the same logic into a Next.js
route handler.
"""
from __future__ import annotations

import os
import sys

from anthropic import Anthropic
from dotenv import load_dotenv
from openai import OpenAI
from supabase import Client, create_client

EMBED_MODEL = "text-embedding-3-small"
CHAT_MODEL = "claude-sonnet-4-6"

SYSTEM = """You are Ray Vaughn (Twitter: @rayvaughnceo), founder of TGFX Academy. Your students are asking you trading questions. Respond IN YOUR VOICE: direct, lowercase-leaning, mentor energy, says "bro/man" occasionally, ties every concept back to a real example. Never invent trades — only reference real ones from the retrieved records below.

When citing a trade, format it like: "**[2023-02-16] EURUSD short** — 1:3.06R win on a bearish OB retest". When citing your own words from a transcript, quote yourself directly.

If the retrieved records don't have enough info to answer, say so honestly — never make up a setup, price, or outcome.

Style cues:
- short paragraphs
- avoid bullet-points unless listing examples
- end with a teaching takeaway when natural
- never use em-dashes; use a comma or period instead
"""


def get_clients():
    load_dotenv()
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    oai = OpenAI()
    claude = Anthropic()
    return sb, oai, claude


def embed_query(oai: OpenAI, q: str) -> list[float]:
    return oai.embeddings.create(model=EMBED_MODEL, input=q).data[0].embedding


def retrieve(sb: Client, embedding: list[float], k_trades: int = 5, k_chunks: int = 8) -> dict:
    """Pull top-K similar trades + transcript chunks via pgvector RPC."""
    # NOTE: these RPCs need to exist in Supabase — defined in db/rpcs.sql
    trades = sb.rpc("match_trades", {"query_embedding": embedding, "match_count": k_trades}).execute().data or []
    chunks = sb.rpc("match_chunks", {"query_embedding": embedding, "match_count": k_chunks}).execute().data or []
    return {"trades": trades, "chunks": chunks}


def format_context(ctx: dict) -> str:
    out = ["=== RAY'S REAL TRADES (top matches) ==="]
    for t in ctx["trades"]:
        out.append(
            f"- [{t.get('video_date') or '?'}] {t.get('direction')} {t.get('instrument')} "
            f"| outcome: {t.get('final_outcome')} | RR: {t.get('estimated_rr')} "
            f"| setup: {t.get('setup_type')}"
        )
        if t.get("reasoning"):
            out.append(f"  reasoning: {t['reasoning'][:400]}")
    out.append("\n=== RAY'S SPOKEN TRANSCRIPT CHUNKS (top matches) ===")
    for c in ctx["chunks"]:
        out.append(f'- "{c["text"][:350]}"')
    return "\n".join(out)


def ask(question: str) -> None:
    sb, oai, claude = get_clients()
    emb = embed_query(oai, question)
    ctx = retrieve(sb, emb)
    context_text = format_context(ctx)

    user_msg = f"Student question: {question}\n\n{context_text}\n\nAnswer as Ray, grounded in the records above."

    msg = claude.messages.create(
        model=CHAT_MODEL,
        max_tokens=1200,
        system=SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
    )
    print(msg.content[0].text)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('usage: python ask.py "your question"')
        sys.exit(1)
    ask(" ".join(sys.argv[1:]))
