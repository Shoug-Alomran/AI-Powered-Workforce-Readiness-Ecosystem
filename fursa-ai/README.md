# Fursa — AI Pipeline

RAG + reasoning services for **Fursa (فرصة)**, an AI-Powered Workforce Readiness
Ecosystem for Saudi Arabia, aligned with ITU-T Y.3172 and Vision 2030.

```
knowledge-base-catalog.md ──▶ scrape ──▶ chunk ──▶ embed ──▶ ChromaDB
                                                               │
                          question ──▶ semantic search ────────┘
                                              │
                                        Claude API ──▶ grounded, cited answer

Skills Passport ─┐
Job requirements ─┼──▶ Claude API ──▶ scores + explanations + gaps
Course catalog   ─┤
Progress history ─┤
Job postings ────┘
```

---

## Quick start

```bash
cd fursa-ai
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env          # then paste your ANTHROPIC_API_KEY into .env
.venv\Scripts\python.exe scripts\ingest.py --reset
.venv\Scripts\python.exe -m uvicorn fursa.main:app --app-dir src --port 8000 --reload
```

Interactive API docs: **http://127.0.0.1:8000/docs**

Verify everything:

```bash
.venv\Scripts\python.exe tests\test_json_extraction.py    # 37 offline checks, no API key
.venv\Scripts\python.exe scripts\smoke_test.py --save     # all 8 endpoints, live
```

`--save` writes each response to `examples/_out/` — real payloads for the
frontend team to build against.

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/match` | Job requirements × Skills Passport → match score, gaps, explanation |
| `POST` | `/api/recommend-courses` | Skill gaps × course catalog → impact-ranked learning path |
| `POST` | `/api/readiness-score` | Skills Passport → 0–100 Career Readiness Score with breakdown |
| `POST` | `/api/adaptive-path` | Progress history → diagnosis + alternative routes when stuck |
| `POST` | `/api/ask-kb` | Question → answer grounded in the 19 Saudi policy documents |
| `GET`  | `/api/skill-trends` | Demand forecast from the seeded posting dataset |
| `POST` | `/api/skill-trends` | Demand forecast from your own posting data |
| `GET`  | `/api/health` | Model, key status, knowledge-base size |
| `GET`  | `/api/kb/stats` | Chunk counts per document and per origin |
| `GET`  | `/api/kb/search?q=…` | Raw semantic search, no LLM — useful for debugging retrieval |

Every request/response shape is typed in [`src/fursa/schemas.py`](src/fursa/schemas.py)
and rendered live at `/docs`. Ready-to-post sample bodies are in
[`examples/`](examples/):

```bash
curl -X POST http://127.0.0.1:8000/api/match \
  -H "Content-Type: application/json" -d @examples/match.json
```

---

## The knowledge base

`scripts/ingest.py` reads `../knowledge-base-catalog.md`, then for each of the
19 documents indexes **two kinds of chunk**, tagged by an `origin` metadata field:

| `origin` | What it is |
|---|---|
| `catalog` | One curated card per document, built from the catalog's own summary, KB-value and policy-gap fields. Always present. |
| `web` | Chunks of the live page or PDF at the document's URL, when it could be fetched. |
| `manual` | Chunks of a copy you supplied by hand (see below). Takes precedence over the network. |

**Why catalog cards exist.** Saudi government portals are hostile to scraping:
7 of the 19 sources cannot be retrieved programmatically — `vision2030.gov.sa`,
`plc.pearson.com` and the HCDP page answer bot-challenge pages (HTTP 403),
`tvtc.gov.sa` and the World Bank repository are JS-rendered shells, and two
catalog entries point at the SDAIA portal homepage rather than a document.
A URL-only knowledge base would silently lose those documents. With catalog
cards, all 19 stay retrievable and citable.

Current state after `--reset`:

```
139 chunks across 19 documents   {'catalog': 19, 'web': 120}
Live text retrieved for 12/19 sources.
```

### Filling the 7 gaps

Save the page or PDF yourself and drop it in — no code change needed:

```
data/manual/KB-007.txt     (or .md, or .pdf)
data/manual/KB-017.pdf
```

then re-run `python scripts/ingest.py`. Manual copies take precedence over the
network and are chunked identically.

### Ingest options

```bash
python scripts/ingest.py --reset          # wipe and rebuild
python scripts/ingest.py --catalog-only   # no network at all
python scripts/ingest.py --refetch        # ignore the on-disk page cache
python scripts/ingest.py --only KB-007 KB-010
```

Scraped pages are cached in `data/raw/`, so re-runs are near-instant. A per-run
report lands at `data/raw/_ingest_report.json`.

---

## Configuration

All settings live in `.env` (see `.env.example`). App-specific keys are
namespaced `FURSA_*` deliberately — bare names like `CLAUDE_MODEL` and
`CLAUDE_EFFORT` are already used by other developer tooling and would silently
override your file.

| Variable | Default | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | **Required.** Without it, the five reasoning endpoints return `503` with a clear message; retrieval endpoints still work. |
| `FURSA_CLAUDE_MODEL` | `claude-sonnet-4-6` | Per the project brief. `claude-sonnet-5` is the newer Sonnet at the same price tier; `claude-opus-5` is the highest-capability option. |
| `FURSA_CLAUDE_EFFORT` | `medium` | `low` \| `medium` \| `high` \| `max`. Raise for demo quality, lower for latency. |
| `FURSA_EMBEDDING_PROVIDER` | `local` | `local` \| `openai` \| `cohere` — see below. |
| `FURSA_RAG_TOP_K` | `6` | Passages retrieved per question. |
| `FURSA_CORS_ORIGINS` | `*` | Comma-separated origins for the frontend. |

Changing model or effort requires a server restart (settings are cached at startup).

### Embedding providers

| Provider | Model | Key needed | When to use |
|---|---|---|---|
| `local` | ChromaDB ONNX all-MiniLM-L6-v2 (384-d) | none | Default. Free, offline, ~80 MB one-time download. Good enough for this corpus. |
| `openai` | `text-embedding-3-small` (1536-d) | `OPENAI_API_KEY` | Better retrieval quality on nuanced policy questions. |
| `cohere` | `embed-multilingual-v3.0` (1024-d) | `COHERE_API_KEY` | Best choice once Arabic-language documents enter the corpus. |

Vectors from different providers are not comparable. The collection records
which one built it and refuses to mix — switching means:

```bash
python scripts/ingest.py --reset
```

---

## Design decisions worth knowing

**Explanations are not optional.** Every reasoning function returns a
decomposable breakdown alongside its number. SDAIA's AI Ethics Principles
(KB-003) require transparency for AI that affects a person's opportunities, and
the platform's value argument against Jadarat (KB-010) is precisely that Jadarat
matches without explaining. `_common.py` carries the shared guardrail prompt:
evidence-only judgement, no protected traits, no invented courses or statistics.

**Forecasting counts in Python, not in the model.** `ml/forecasting.py` computes
per-skill counts, period splits and growth rates deterministically, then asks
Claude to interpret the aggregates. The trend numbers are reproducible and
auditable — necessary for anything a university would plan curriculum on.

**JSON parsing is tolerant by design.** `llm.complete_json` strips fences, scans
for the first balanced object, and retries once with a corrective prompt. That
keeps the layer model-agnostic: it behaves identically on Sonnet 4.6, Sonnet 5
and Opus 5, which do not share the same structured-output support.

**Retrieval is debuggable without spending tokens.** `GET /api/kb/search`
returns raw passages and relevance scores with no LLM in the path. Use it first
when an answer looks wrong — usually the problem is retrieval, not generation.

**Retrieval diversifies and decomposes.** Two fixes, both driven by an observed
failure rather than theory:

- *Per-document cap.* Plain top-k let the labour-market report occupy three of
  six slots. `KnowledgeBase.search` now keeps at most 2 chunks per KB id.
- *Multi-query retrieval.* A two-part question averages into one vector and the
  louder half wins. Asking *"what gap does Jadarat leave, and how does that
  relate to the HCDP's goals?"* retrieved **nothing** about the HCDP at any
  `top_k` — yet its document ranked first the moment that clause was embedded
  alone. `rag.split_question` splits on clause boundaries, retrieves per clause,
  and interleaves **round-robin**. The round-robin matters: a distance-sorted
  merge ranks the HCDP hit seventh and drops it straight back out. Now every
  clause is guaranteed to put its best passage in the context.

The answer went from *"the context does not contain any passages about that
program"* to citing HCDP's SR 23B / 89-initiative figures and its own documented
policy gap — the absence of a national Skills Passport, which is Fursa's thesis.

---

## Layout

```
fursa-ai/
├── src/fursa/
│   ├── config.py        settings (FURSA_* env namespace)
│   ├── catalog.py       parser for knowledge-base-catalog.md
│   ├── fetch.py         URL fetching + HTML/PDF text extraction
│   ├── chunking.py      cleanup and boundary-aware chunking
│   ├── embeddings.py    local / openai / cohere providers
│   ├── vectorstore.py   persistent ChromaDB collection
│   ├── llm.py           Claude client + tolerant JSON completion
│   ├── rag.py           retrieval-augmented question answering
│   ├── schemas.py       request/response contracts
│   ├── main.py          FastAPI app
│   └── ml/
│       ├── matching.py      job × candidate
│       ├── courses.py       gaps × catalog
│       ├── readiness.py     Skills Passport → 0-100
│       ├── adaptive.py      progress history → re-route
│       └── forecasting.py   postings → trending skills
├── scripts/
│   ├── ingest.py        build the knowledge base
│   └── smoke_test.py    exercise every endpoint
├── tests/
│   └── test_json_extraction.py  37 offline checks, no API key needed
├── examples/            ready-to-post sample request bodies
└── data/
    ├── chroma/          persisted vectors
    ├── raw/             scraped page cache + ingest report
    ├── manual/          hand-supplied documents (see above)
    └── job_postings.json  seed dataset for GET /api/skill-trends
```

---

## Notes for the frontend team

- CORS is open by default (`FURSA_CORS_ORIGINS=*`). Lock it down before any
  public deployment.
- Reasoning endpoints take **15–35 seconds** (the seeded `GET /api/skill-trends`
  ~60s cold). Show a loading state; do not block the UI thread.
- `GET /api/skill-trends` is **cached** after the first call per parameter set
  (the seed file is static), so repeat calls return instantly — warm it once
  before a demo. `POST /api/skill-trends` is never cached.
- Enum fields (`verdict`, `band`, `status`, `confidence`) and score ranges are
  normalised server-side before response validation, so you can switch on them
  safely — off-vocabulary model output cannot reach you.
- Response models allow extra fields, so the reasoning layer can enrich a
  payload without a backend release. The documented fields are guaranteed.
- `POST /api/match` returns `gaps[].skill` — feed those straight into
  `POST /api/recommend-courses` as `skill_gaps`. The two endpoints are designed
  to chain.
- Every reasoning response carries an explanation string. Surface it. A score
  with no reason is exactly the gap this project exists to close.
