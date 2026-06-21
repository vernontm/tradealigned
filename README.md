# Ray AI by TGFX

Personalized trading mentor agent trained on Ray Vaughn's real trade data and teaching videos.

## Architecture

```
~/Desktop/trade-analyzer/   # pipeline (Whisper + Claude vision + frame extraction)
        |
        | trades_analyzed.json + transcripts
        v
~/Desktop/ray-ai/
  ├── db/         Postgres schema (Supabase) + pgvector RPCs
  ├── ingest/     Push corpus into Supabase + generate embeddings
  ├── agent/      Q&A, chart-roast, quiz logic
  ├── web/        Next.js app (chat + preview pane + quiz UI)
  └── scripts/    one-offs
```

## Bring-up order

### 1. Create a Supabase project

- Go to https://supabase.com/dashboard → New project
- Project settings → API → copy `URL` + `service_role` key into `.env`

### 2. Apply the schema

In the Supabase SQL editor, run in order:

```
db/schema.sql
db/rpcs.sql
```

### 3. Install Python deps + ingest the existing corpus

```bash
cd ~/Desktop/ray-ai
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in credentials

python ingest/ingest_trades.py    # push videos + trades + transcript chunks
python ingest/embed_corpus.py     # generate OpenAI embeddings
```

The ingest is idempotent — re-run anytime as the batch processes more videos.

### 4. Test the agent

```bash
python agent/ask.py "show me 3 of my best EURUSD shorts"
python agent/ask.py "what's an order consumption wick?"
python agent/ask.py "what conditions show up before my wins?"
```

### 5. Web app (next phase)

Next.js scaffold lives in `web/`. Built with:

- Next.js 16 (App Router)
- Vercel AI SDK (streaming chat + tool calls for preview pane cards)
- Supabase JS client (DB + Storage)
- Clerk (auth)
- Stripe (subscriptions + $1 trial)
- shadcn/ui

## Pricing (single source of truth)

Tier limits live in `../trade-analyzer/pricing.json`. Both the agent and
the web app read this file.

| Tier | Price | Chat | Quiz | Chart roast | Refresh |
|---|---|---|---|---|---|
| Free | $0 | 10 | 5 | 1 | once |
| $1 Trial | $1 hold | 20 | 20 | 3 | once |
| Ray AI | $29.99/mo | 600 | 1,000 | 200 | monthly |
| Live Trade Lab + AI | $80/mo | same | same | same | monthly |
| Lifetime | $500 once | unlimited-ish | unlimited-ish | unlimited | monthly forever |
