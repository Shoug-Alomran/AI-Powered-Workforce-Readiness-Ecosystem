"""Build the Fursa knowledge base.

    catalog -> fetch source URLs -> extract -> chunk -> embed -> ChromaDB

Two kinds of chunk land in the collection, tagged by an `origin` metadata field:

  origin=catalog  one curated card per document, built from the catalog's own
                  summary / KB-value / policy-gap fields. Always present.
  origin=web      chunks of the live page or PDF at the document's URL, when it
                  could be fetched and yielded usable text.

The catalog cards matter: Saudi government portals are frequently JS-rendered or
geo-restricted, so a URL-only knowledge base would silently lose documents. This
way every one of the 19 is retrievable even when its source is unreachable.

Usage:
    python scripts/ingest.py                 # incremental
    python scripts/ingest.py --reset         # wipe and rebuild
    python scripts/ingest.py --catalog-only  # skip the network entirely
    python scripts/ingest.py --only KB-007 KB-010
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fursa.catalog import CatalogEntry, parse_catalog  # noqa: E402
from fursa.chunking import chunk_text  # noqa: E402
from fursa.config import get_settings  # noqa: E402
from fursa.fetch import fetch_url  # noqa: E402
from fursa.vectorstore import KnowledgeBase, chunk_id  # noqa: E402


def _safe_name(kb_id: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in kb_id)


def read_manual(manual_dir: Path, kb_id: str) -> tuple[str, str]:
    """Read a manually supplied copy of a document, if the team dropped one in.

    Several sources cannot be scraped: vision2030.gov.sa, plc.pearson.com and
    the HCDP page answer bot-challenge pages, tvtc.gov.sa is a JS-rendered SPA,
    and two catalog URLs point at a portal homepage rather than a document.
    Saving the page or PDF by hand into data/manual/<KB-ID>.{txt,md,pdf} is the
    supported way to fill those in — it takes precedence over the network.
    """
    stem = _safe_name(kb_id)
    for suffix in (".txt", ".md", ".pdf"):
        path = manual_dir / f"{stem}{suffix}"
        if not path.exists():
            continue
        if suffix == ".pdf":
            from pypdf import PdfReader

            reader = PdfReader(str(path))
            text = "\n\n".join((page.extract_text() or "") for page in reader.pages)
        else:
            text = path.read_text(encoding="utf-8", errors="replace")
        if text.strip():
            return text, path.name
    return "", ""


def ingest_entry(
    entry: CatalogEntry,
    kb: KnowledgeBase,
    raw_dir: Path,
    manual_dir: Path,
    chunk_size: int,
    overlap: int,
    catalog_only: bool,
    force_refetch: bool,
) -> dict:
    ids: list[str] = []
    docs: list[str] = []
    metas: list[dict] = []
    base_meta = entry.as_metadata()

    # 1. Curated catalog card — always indexed.
    card = entry.catalog_card()
    ids.append(chunk_id(entry.kb_id, "catalog", 0, card))
    docs.append(card)
    metas.append({**base_meta, "origin": "catalog", "chunk_index": 0})

    report = {
        "kb_id": entry.kb_id,
        "title": entry.title,
        "url": entry.url,
        "catalog_chunks": 1,
        "web_chunks": 0,
        "status": "catalog-only",
        "note": "",
    }

    # 2. A manually supplied copy wins over the network.
    text, manual_name = read_manual(manual_dir, entry.kb_id)
    origin = "manual" if text else "web"
    if text:
        report["note"] = f"manual: {manual_name}"

    if not text:
        if catalog_only or not entry.url:
            kb.delete_document(entry.kb_id, origin="catalog")
            kb.upsert(ids, docs, metas)
            return report

        # 3. Live source text, cached on disk so re-runs are cheap.
        cache = raw_dir / f"{_safe_name(entry.kb_id)}.txt"
        if cache.exists() and not force_refetch:
            text = cache.read_text(encoding="utf-8")
            report["note"] = "cached"
        else:
            result = fetch_url(entry.url)
            if result.usable:
                text = result.text
                cache.write_text(text, encoding="utf-8")
                report["note"] = f"fetched via {result.extractor}"
            else:
                report["status"] = "fetch-failed"
                report["note"] = result.error or "no usable text"

    if text:
        chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)
        for i, chunk in enumerate(chunks):
            ids.append(chunk_id(entry.kb_id, origin, i, chunk))
            docs.append(f"{entry.label}\n\n{chunk}")
            metas.append({**base_meta, "origin": origin, "chunk_index": i})
        report["web_chunks"] = len(chunks)
        report["status"] = "ok" if chunks else "empty-after-chunking"

    # Clear only the origins being rewritten. A failed fetch must not delete
    # previously good web chunks — those stay until fresher text replaces them.
    kb.delete_document(entry.kb_id, origin="catalog")
    if text:
        kb.delete_document(entry.kb_id, origin=origin)
    kb.upsert(ids, docs, metas)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the Fursa knowledge base.")
    parser.add_argument("--reset", action="store_true", help="Delete the collection first.")
    parser.add_argument("--catalog-only", action="store_true", help="No network calls.")
    parser.add_argument("--refetch", action="store_true", help="Ignore the on-disk cache.")
    parser.add_argument("--only", nargs="*", metavar="KB-ID", help="Limit to these documents.")
    parser.add_argument("--delay", type=float, default=0.8, help="Seconds between fetches.")
    args = parser.parse_args()

    settings = get_settings()

    if not settings.catalog_path.exists():
        print(f"[x] Catalog not found: {settings.catalog_path}", file=sys.stderr)
        return 1

    entries = parse_catalog(settings.catalog_path)
    if args.only:
        wanted = {k.upper() for k in args.only}
        entries = [e for e in entries if e.kb_id.upper() in wanted]

    print(f"Catalog      : {settings.catalog_path.name} ({len(entries)} documents)")
    print(f"Vector store : {settings.chroma_dir}")

    kb = KnowledgeBase(settings)
    print(f"Embeddings   : {kb.embedder.name}")
    if args.reset:
        kb.reset()
        print("Collection reset.")
    print("-" * 78)

    reports = []
    for i, entry in enumerate(entries, 1):
        print(f"[{i:>2}/{len(entries)}] {entry.kb_id} {entry.title[:48]:<48}", end=" ", flush=True)
        try:
            report = ingest_entry(
                entry,
                kb,
                settings.raw_dir,
                settings.manual_dir,
                settings.chunk_size,
                settings.chunk_overlap,
                args.catalog_only,
                args.refetch,
            )
        except Exception as exc:
            report = {
                "kb_id": entry.kb_id,
                "title": entry.title,
                "url": entry.url,
                "catalog_chunks": 0,
                "web_chunks": 0,
                "status": "error",
                # Library errors can embed whole vectors in the message — cap it.
                "note": f"{type(exc).__name__}: {exc}"[:300],
            }
        reports.append(report)
        total = report["catalog_chunks"] + report["web_chunks"]
        print(f"{total:>4} chunks  {report['status']:<16} {report['note'][:40]}")
        if not args.catalog_only and report["note"] != "cached":
            time.sleep(args.delay)

    print("-" * 78)
    ok = sum(1 for r in reports if r["status"] == "ok")
    failed = [r for r in reports if r["status"] in {"fetch-failed", "error"}]
    print(f"Live text retrieved for {ok}/{len(reports)} documents.")
    print(f"All {len(reports)} documents are retrievable via their curated catalog card.")
    if failed:
        print("\nSources that could not be scraped (catalog card still indexed):")
        for r in failed:
            print(f"  {r['kb_id']:<8} {r['note'][:70]}")
        print(
            f"\nTo add full text for these, save the page or PDF as\n"
            f"  {settings.manual_dir}\\<KB-ID>.txt|.md|.pdf\n"
            f"then re-run this script. Manual copies take precedence over the network."
        )

    stats = kb.stats()
    print(f"\nCollection '{stats['collection']}': {stats['chunks']} chunks "
          f"across {stats['documents']} documents.")
    print(f"By origin: {stats['chunks_by_origin']}")

    (settings.raw_dir / "_ingest_report.json").write_text(
        json.dumps({"reports": reports, "stats": stats}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Report written to {settings.raw_dir / '_ingest_report.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
