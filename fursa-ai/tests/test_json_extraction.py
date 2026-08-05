"""Offline tests for the JSON extraction that every ML function depends on.

No API key and no network. These cover the ways a model actually wraps JSON in
practice — fences, preamble prose, trailing commentary, braces inside strings —
so a malformed response degrades to a retry rather than a 500.

    python tests/test_json_extraction.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fursa.chunking import chunk_text, clean_text  # noqa: E402
from fursa.llm import LLMError, _extract_json  # noqa: E402
from fursa.ml.forecasting import aggregate_postings  # noqa: E402

PASS, FAIL = "\033[32mpass\033[0m", "\033[31mFAIL\033[0m"
_results: list[bool] = []


def check(name: str, got, want) -> None:
    ok = got == want
    _results.append(ok)
    print(f"  {PASS if ok else FAIL}  {name}")
    if not ok:
        print(f"        expected {want!r}\n        got      {got!r}")


print("JSON extraction")
check("bare object", _extract_json('{"a": 1}'), {"a": 1})
check("json fence", _extract_json('```json\n{"a": 1}\n```'), {"a": 1})
check("bare fence", _extract_json('```\n{"a": 1}\n```'), {"a": 1})
check(
    "preamble prose",
    _extract_json('Here is the result:\n{"match_score": 72}'),
    {"match_score": 72},
)
check(
    "trailing commentary",
    _extract_json('{"a": 1}\n\nLet me know if you need anything else.'),
    {"a": 1},
)
check(
    "braces inside a string value",
    _extract_json('{"note": "use {curly} braces", "n": 2}'),
    {"note": "use {curly} braces", "n": 2},
)
check(
    "escaped quote inside a string",
    _extract_json(r'{"note": "he said \"hi\"", "n": 3}'),
    {"note": 'he said "hi"', "n": 3},
)
check("nested objects", _extract_json('{"a": {"b": {"c": 1}}}'), {"a": {"b": {"c": 1}}})
check("top-level array", _extract_json('```json\n[1, 2, 3]\n```'), [1, 2, 3])
check(
    "prose wrapping both sides",
    _extract_json('Sure!\n```json\n{"gaps": ["SQL"]}\n```\nHope that helps.'),
    {"gaps": ["SQL"]},
)

raised = False
try:
    _extract_json("I cannot help with that request.")
except LLMError:
    raised = True
check("unparseable input raises LLMError", raised, True)

# Regression: a response truncated by max_tokens leaves the top-level object
# unclosed but its first field array perfectly balanced. Salvaging that array
# returned a plausible-looking fragment instead of the real payload, which then
# blew up downstream as "list indices must be integers".
truncated = '{\n "trending_up": [{"skill": "Python"}, {"skill": "SQL"}],\n "trending_down": [{"skill": "'
raised = False
try:
    _extract_json(truncated)
except LLMError:
    raised = True
check("truncated object does not yield its nested array", raised, True)

truncated_array = '[{"skill": "Python"}, {"skill": "SQ'
raised = False
try:
    _extract_json(truncated_array)
except LLMError:
    raised = True
check("truncated array raises rather than returning item 0", raised, True)

print("\nChunking")
check("empty input", chunk_text(""), [])
check("short text stays whole", chunk_text("Hello world."), ["Hello world."])
check("boilerplate stripped", "Accept all" in clean_text("Accept all cookies\nReal text."), False)
long_text = "\n\n".join(f"Paragraph {i} with some policy content about skills." for i in range(60))
chunks = chunk_text(long_text, chunk_size=500, overlap=50)
check("long text splits", len(chunks) > 1, True)
check("no chunk exceeds size + overlap", max(len(c) for c in chunks) <= 550, True)
check("content preserved", "Paragraph 59" in " ".join(chunks), True)

print("\nOutput normalization (prevents response-validation 500s)")
from fursa.normalize import coerce_int, norm_choice, str_list  # noqa: E402
from fursa.schemas import MatchResponse  # noqa: E402

check("capitalized enum normalised", norm_choice("Promising", {"promising"}, "developing"), "promising")
check("spaced enum normalised", norm_choice("Strong Match", {"strong_match"}, "developing"), "strong_match")
check("synonym fallback", norm_choice("nice to have", {"nice_to_have"}, "important", {"nice": "nice_to_have"}), "nice_to_have")
check("unknown enum falls to default", norm_choice("excellent", {"promising"}, "developing"), "developing")
check("None falls to default", norm_choice(None, {"promising"}, "developing"), "developing")
check("score above 100 clamped", coerce_int(105, 0, 100), 100)
check("negative score clamped", coerce_int(-3, 0, 100), 0)
check("numeric string parses", coerce_int("72", 0, 100), 72)
check("range string takes first number", coerce_int("4-6 weeks", 0, 520), 4)
check("non-numeric falls to default", coerce_int("soon", 0, 100, None), None)
check("bool rejected as number", coerce_int(True, 0, 100, None), None)
check("str_list keeps strings", str_list(["SQL", 42, None, " "]), ["SQL", "42"])
check("str_list wraps a bare string", str_list("SQL"), ["SQL"])
check("str_list rejects non-list", str_list({"a": 1}), [])

# End-to-end: the exact deviations that 500'd against the response model now
# validate after the matching normalization logic runs.
from fursa.ml.matching import _verdict_for  # noqa: E402
deviant = {
    "match_score": "105",
    "verdict": "Promising",
    "explanation": None,
    "gaps": ["Power BI", {"skill": "SQL", "importance": "Critical", "closable_in_weeks": "4-6"}],
}
score = coerce_int(deviant["match_score"], 0, 100)
normalised = {
    "match_score": score,
    "verdict": norm_choice(deviant["verdict"], {"strong_match", "promising", "developing", "not_yet_ready"}, _verdict_for(score)),
    "explanation": str(deviant["explanation"] or ""),
    "gaps": [
        {"skill": "Power BI", "importance": "important", "closable_in_weeks": None},
        {"skill": "SQL", "importance": "critical", "closable_in_weeks": 4},
    ],
}
try:
    MatchResponse(**normalised)
    check("deviant match payload validates after normalization", True, True)
except Exception as exc:
    check(f"deviant match payload validates after normalization ({exc})", False, True)

print("\nQuestion splitting (multi-query retrieval)")
from fursa.rag import split_question  # noqa: E402

check("single-topic question is not split", split_question("What is Nitaqat?"), [])
check("short fragments ignored", split_question("Why? Because."), [])
two_part = split_question(
    "What gap does Jadarat leave in Saudi Arabia's employment infrastructure, "
    "and how does that relate to the Human Capability Development Program's goals?"
)
check("two-part question splits in two", len(two_part), 2)
check("second clause carries the HCDP term", "Human Capability" in two_part[1], True)
check("first clause carries Jadarat", "Jadarat" in two_part[0], True)
check(
    "semicolon splits",
    len(split_question("Describe the Tawteen program; explain how HRDF funds it.")),
    2,
)
check(
    "clause count is capped",
    len(split_question(
        "What is A and how is B and why is C and which is D and where is E here?"
    )) <= 3,
    True,
)

print("\nPrompt-size control")
from fursa.ml.forecasting import compact_aggregates, load_seed_postings  # noqa: E402
from fursa.config import get_settings  # noqa: E402

seed = load_seed_postings(get_settings().seed_jobs_path)
full = aggregate_postings(seed)
compact = compact_aggregates(full)
check("seed dataset loads", len(seed) > 0, True)
check("compact drops by_period", any("by_period" in s for s in compact["skills"]), False)
check("compact caps skill rows", len(compact["skills"]) <= 35, True)
check("full aggregates keep by_period", "by_period" in full["skills"][0], True)
check(
    "compact prompt is materially smaller",
    len(json.dumps(compact)) < len(json.dumps(full)) // 2,
    True,
)

print("\nForecast aggregation")
postings = [
    {"posted_at": "2025-01-01", "required_skills": ["Python", "SQL"]},
    {"posted_at": "2025-02-01", "required_skills": ["SQL"]},
    {"posted_at": "2026-01-01", "required_skills": ["Python", "Kubernetes"], "count": 3},
    {"posted_at": "2026-02-01", "required_skills": ["Kubernetes"]},
]
agg = aggregate_postings(postings)
by_skill = {s["skill"]: s for s in agg["skills"]}
check("postings counted", agg["postings_analysed"], 4)
check("weights respected (count=3)", by_skill["Python"]["recent_count"], 3)
check("declining skill detected", by_skill["SQL"]["growth_rate"], -1.0)
check("recent-only skill is emerging", by_skill["Kubernetes"]["growth_rate"], None)
check("comma-separated skills parse", aggregate_postings(
    [{"posted_at": "2025-01-01", "skills": "SQL, Power BI"}]
)["distinct_skills"], 2)
check("sector filter applies", aggregate_postings(
    postings + [{"posted_at": "2026-03-01", "sector": "Retail", "required_skills": ["Arabic"]}],
    sector="Retail",
)["postings_analysed"], 1)

total, failed = len(_results), _results.count(False)
print(f"\n{total - failed}/{total} checks passed.")
raise SystemExit(1 if failed else 0)
