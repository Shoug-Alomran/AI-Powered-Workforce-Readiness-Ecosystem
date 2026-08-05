"""End-to-end smoke test against a running server.

    python scripts/smoke_test.py                     # all endpoints
    python scripts/smoke_test.py --no-llm            # only endpoints that need no key
    python scripts/smoke_test.py --url http://host:8000
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "examples"

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"


def load(name: str) -> dict:
    return json.loads((EXAMPLES / name).read_text(encoding="utf-8"))


def summarise(endpoint: str, data: dict) -> str:
    """One line proving the response actually carries the expected content."""
    endpoint = endpoint.split("?")[0]
    if endpoint == "/api/match":
        gaps = ", ".join(g.get("skill", "?") for g in data.get("gaps", [])[:3])
        return f"score={data.get('match_score')} verdict={data.get('verdict')} gaps=[{gaps}]"
    if endpoint == "/api/recommend-courses":
        top = data.get("recommendations", [])
        first = top[0].get("title", "?") if top else "none"
        return f"{len(top)} ranked, #1={first!r}, uncovered={data.get('uncovered_gaps')}"
    if endpoint == "/api/readiness-score":
        return (
            f"score={data.get('readiness_score')} band={data.get('band')} "
            f"next={str(data.get('highest_impact_next_step'))[:60]!r}"
        )
    if endpoint == "/api/adaptive-path":
        return f"status={data.get('status')} paths={len(data.get('alternative_paths', []))}"
    if endpoint == "/api/skill-trends":
        up = ", ".join(s.get("skill", "?") for s in data.get("trending_up", [])[:3])
        down = ", ".join(s.get("skill", "?") for s in data.get("trending_down", [])[:3])
        return f"up=[{up}] down=[{down}]"
    if endpoint == "/api/ask-kb":
        return (
            f"grounded={data.get('grounded')} confidence={data.get('confidence')} "
            f"citations={data.get('citations')}"
        )
    if endpoint == "/api/kb/stats":
        return f"{data.get('chunks')} chunks / {data.get('documents')} docs via {data.get('embedder')}"
    if endpoint == "/api/health":
        kb = data.get("knowledge_base", {})
        return f"model={data.get('model')} key={data.get('anthropic_key_configured')} kb={kb.get('chunks')}"
    return json.dumps(data)[:120]


def run(
    client: httpx.Client, method: str, endpoint: str, payload: dict | None
) -> tuple[bool, dict | None]:
    label = f"{method:<4} {endpoint:<24}"
    started = time.time()
    try:
        response = (
            client.get(endpoint) if method == "GET" else client.post(endpoint, json=payload)
        )
    except Exception as exc:
        print(f"{RED}FAIL{RESET} {label} {type(exc).__name__}: {exc}")
        return False, None

    elapsed = time.time() - started
    if response.status_code != 200:
        detail = response.text[:200]
        colour = YELLOW if response.status_code == 503 else RED
        print(f"{colour}HTTP {response.status_code}{RESET} {label} {detail}")
        return False, None

    data = response.json()
    print(f"{GREEN}OK{RESET}   {label} {elapsed:5.1f}s  {summarise(endpoint, data)}")
    return True, data


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    parser.add_argument("--no-llm", action="store_true", help="Skip endpoints that call Claude.")
    parser.add_argument("--save", action="store_true", help="Write responses to examples/_out/.")
    args = parser.parse_args()

    free = [
        ("GET", "/api/health", None),
        ("GET", "/api/kb/stats", None),
    ]
    llm = [
        ("POST", "/api/ask-kb", load("ask-kb.json")),
        ("POST", "/api/match", load("match.json")),
        ("POST", "/api/recommend-courses", load("recommend-courses.json")),
        ("POST", "/api/readiness-score", load("readiness-score.json")),
        ("POST", "/api/adaptive-path", load("adaptive-path.json")),
        ("GET", "/api/skill-trends?horizon_months=12", None),
    ]

    checks = free if args.no_llm else free + llm
    print(f"Target: {args.url}\n" + "-" * 78)

    passed = 0
    with httpx.Client(base_url=args.url, timeout=300.0) as client:
        for method, endpoint, payload in checks:
            ok, data = run(client, method, endpoint, payload)
            if not ok:
                continue
            passed += 1
            if args.save:
                # Reuse the response we already have. Re-issuing it would double
                # both the wall time and the Anthropic bill for every run.
                out = EXAMPLES / "_out"
                out.mkdir(exist_ok=True)
                name = endpoint.strip("/").replace("/", "_").split("?")[0]
                (out / f"{name}.json").write_text(
                    json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
                )

    print("-" * 78)
    print(f"{passed}/{len(checks)} endpoints healthy.")
    if passed < len(checks):
        print(f"{DIM}A 503 on a reasoning endpoint means the Claude call failed. Read the")
        print("detail text — the three common causes are distinct:")
        print("  'ANTHROPIC_API_KEY is not set'  -> add the key to .env, restart the server")
        print("  'no credit'                     -> add credits in the Anthropic console")
        print(f"  anything else                   -> a genuine API or payload error{RESET}")
    return 0 if passed == len(checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
