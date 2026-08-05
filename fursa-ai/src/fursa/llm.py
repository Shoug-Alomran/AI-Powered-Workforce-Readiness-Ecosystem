"""Claude client wrapper shared by the RAG pipeline and all five ML functions.

`complete_json` is the workhorse: every ML function needs a typed object back,
so the call is wrapped in tolerant JSON extraction plus one corrective retry.
That keeps the layer model-agnostic — it behaves identically on Sonnet 4.6,
Sonnet 5, and Opus 5, none of which share the same structured-output support.
"""

from __future__ import annotations

import json
import re
from typing import Any

import anthropic

from .config import get_settings

_FENCE = re.compile(r"^\s*```(?:json|JSON)?\s*|\s*```\s*$")

_client: anthropic.Anthropic | None = None


class LLMError(RuntimeError):
    pass


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.anthropic_api_key:
            raise LLMError(
                "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add "
                "your key from https://console.anthropic.com/settings/keys"
            )
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def _extract_json(raw: str) -> Any:
    """Parse JSON that may be fenced, prefixed with prose, or trailed by notes."""
    text = _FENCE.sub("", raw.strip())
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Scan for the first balanced {...} or [...], respecting string literals.
    #
    # Order matters, and so does bailing out. If the value opens with '{' but
    # never closes — the signature of a truncated response — we must NOT fall
    # through to scanning for '[', because the first balanced array inside a
    # cut-off object is one of its own fields. Returning that would hand the
    # caller a plausible-looking fragment instead of the real payload.
    first = next((c for c in text if not c.isspace()), "")
    candidates = (("{", "}"), ("[", "]"))
    if first == "{":
        candidates = (("{", "}"),)
    elif first == "[":
        candidates = (("[", "]"),)

    for opener, closer in candidates:
        start = text.find(opener)
        if start == -1:
            continue
        depth, in_string, escaped = 0, False, False
        for i in range(start, len(text)):
            ch = text[i]
            if in_string:
                if escaped:
                    escaped = False
                elif ch == "\\":
                    escaped = True
                elif ch == '"':
                    in_string = False
                continue
            if ch == '"':
                in_string = True
            elif ch == opener:
                depth += 1
            elif ch == closer:
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start : i + 1])
                    except json.JSONDecodeError:
                        break
    raise LLMError(f"Model did not return parseable JSON. First 400 chars: {raw[:400]}")


def _complete_raw(
    system: str,
    user: str,
    *,
    max_tokens: int,
    model: str | None,
    effort: str | None,
) -> tuple[str, str | None]:
    """Single-turn completion returning (text, stop_reason)."""
    settings = get_settings()
    try:
        response = get_client().messages.create(
            model=model or settings.claude_model,
            max_tokens=max_tokens,
            system=system,
            output_config={"effort": effort or settings.claude_effort},
            messages=[{"role": "user", "content": user}],
        )
    except anthropic.APIStatusError as exc:
        message = str(getattr(exc, "message", "") or exc)
        if "credit balance" in message.lower():
            raise LLMError(
                "The Anthropic account has no credit. The API key is valid, but the "
                "workspace cannot serve requests until credits are added at "
                "https://console.anthropic.com/settings/billing"
            ) from exc
        raise LLMError(f"Claude API error {exc.status_code}: {message}") from exc
    except anthropic.APIConnectionError as exc:
        raise LLMError(f"Could not reach the Claude API: {exc}") from exc

    if response.stop_reason == "refusal":
        raise LLMError("Claude declined this request on safety grounds.")

    text = "".join(b.text for b in response.content if b.type == "text").strip()
    return text, response.stop_reason


def complete(
    system: str,
    user: str,
    *,
    max_tokens: int = 4000,
    model: str | None = None,
    effort: str | None = None,
) -> str:
    """Single-turn text completion."""
    text, _ = _complete_raw(system, user, max_tokens=max_tokens, model=model, effort=effort)
    return text


def complete_json(
    system: str,
    user: str,
    *,
    max_tokens: int = 4000,
    model: str | None = None,
    effort: str | None = None,
) -> Any:
    """Text completion constrained to JSON, with one corrective retry."""
    json_rule = (
        "\n\nOUTPUT FORMAT: reply with a single raw JSON value and nothing else. "
        "No markdown fences, no commentary before or after, no trailing explanation."
    )
    raw, stop_reason = _complete_raw(
        system + json_rule, user, max_tokens=max_tokens, model=model, effort=effort
    )

    # Truncated output can still contain a well-formed *fragment*, so parsing it
    # would return a plausible-looking partial answer. Fail loudly instead.
    if stop_reason == "max_tokens":
        raise LLMError(
            f"Claude hit the {max_tokens}-token output limit before finishing its "
            f"JSON response ({len(raw)} chars produced). Raise max_tokens for this "
            f"call, or shrink the prompt."
        )

    try:
        return _extract_json(raw)
    except LLMError:
        repaired, repair_stop = _complete_raw(
            "You convert malformed model output into valid JSON. Return only the "
            "corrected JSON value — no fences, no commentary.",
            f"Rewrite the following as valid JSON matching the intended schema:\n\n{raw}",
            max_tokens=max_tokens,
            model=model,
            effort="low",
        )
        if repair_stop == "max_tokens":
            raise LLMError(
                f"The corrective retry also hit the {max_tokens}-token output "
                f"limit. Raise max_tokens for this call."
            )
        return _extract_json(repaired)


def complete_json_object(
    system: str,
    user: str,
    *,
    max_tokens: int = 4000,
    model: str | None = None,
    effort: str | None = None,
) -> dict[str, Any]:
    """`complete_json` that guarantees a dict.

    Every caller in this codebase wants an object. A model that answers with a
    bare array would otherwise blow up later with an opaque TypeError at the
    first `result["key"] = ...`.
    """
    value = complete_json(
        system, user, max_tokens=max_tokens, model=model, effort=effort
    )
    if isinstance(value, dict):
        return value
    if isinstance(value, list) and len(value) == 1 and isinstance(value[0], dict):
        return value[0]
    raise LLMError(
        f"Expected a JSON object but the model returned {type(value).__name__}."
    )
