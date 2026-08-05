"""Coercion helpers applied to model output before it reaches a response model.

The API contracts in `schemas.py` are deliberately strict — enum verdicts,
0-100 score ranges — because the frontend should be able to switch on them.
But strictness at the boundary means one off-vocabulary token from the model
("Promising" capitalized, a score of 105, a gap emitted as a bare string)
becomes an HTTP 500 at FastAPI's response validation. These helpers absorb
that class of deviation at the source, so the contract stays strict without
the fragility.
"""

from __future__ import annotations

import re
from typing import Any, Iterable, Mapping

_SEPARATORS = re.compile(r"[\s\-]+")
_FIRST_NUMBER = re.compile(r"-?\d+(?:\.\d+)?")


def coerce_int(
    value: Any,
    lo: int | None = None,
    hi: int | None = None,
    default: int | None = None,
) -> int | None:
    """Best-effort int with clamping.

    Accepts ints, floats, and numeric strings — including ranges like "4-6",
    where the first number wins. Returns `default` when nothing numeric is
    there.
    """
    number: float | None = None
    if isinstance(value, bool):
        return default
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        match = _FIRST_NUMBER.search(value)
        if match:
            number = float(match.group())
    if number is None:
        return default
    result = int(round(number))
    if lo is not None:
        result = max(lo, result)
    if hi is not None:
        result = min(hi, result)
    return result


def norm_choice(
    value: Any,
    allowed: Iterable[str],
    default: str,
    synonyms: Mapping[str, str] | None = None,
) -> str:
    """Normalise an enum-ish value onto the allowed vocabulary.

    Lowercases and converts separators to underscores, so "Strong Match" and
    "strong-match" both land on "strong_match". Unrecognised values fall to
    substring synonyms, then to the default.
    """
    allowed_set = set(allowed)
    text = _SEPARATORS.sub("_", str(value or "").strip().lower())
    if text in allowed_set:
        return text
    for fragment, target in (synonyms or {}).items():
        if fragment in text:
            return target
    return default


def str_list(value: Any) -> list[str]:
    """Coerce a model-produced list into a clean list of strings."""
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item is not None and str(item).strip()]
