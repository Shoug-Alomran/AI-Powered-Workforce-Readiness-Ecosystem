"""Text cleanup and semantic-ish chunking.

Splits on the largest natural boundary that fits (headings -> paragraphs ->
sentences -> hard wrap), so a chunk rarely cuts a clause in half.
"""

from __future__ import annotations

import re

_WS_RUN = re.compile(r"[ \t ]+")
_BLANK_RUN = re.compile(r"\n{3,}")
_SENTENCE_END = re.compile(r"(?<=[.!?؟।])\s+")
_HEADING = re.compile(r"^(#{1,6}\s+.+|[A-Z][A-Z0-9 &/,'\-]{6,})$", re.MULTILINE)
# Navigation/consent boilerplate that survives extraction on government portals.
_BOILERPLATE = re.compile(
    r"^\s*(cookie[s]?\s+(policy|settings|notice)|accept all|skip to (main )?content|"
    r"privacy policy|terms of use|all rights reserved|sitemap|follow us|"
    r"back to top|share this page|font size|screen reader)\b.*$",
    re.IGNORECASE | re.MULTILINE,
)


def clean_text(text: str) -> str:
    """Normalise whitespace and drop obvious page furniture."""
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _BOILERPLATE.sub("", text)
    text = _WS_RUN.sub(" ", text)
    text = "\n".join(line.strip() for line in text.split("\n"))
    text = _BLANK_RUN.sub("\n\n", text)
    return text.strip()


def _split_units(text: str) -> list[str]:
    """Break text into the smallest units we are willing to keep together."""
    # Prefer heading-delimited blocks; fall back to paragraphs.
    blocks = [b.strip() for b in text.split("\n\n") if b.strip()]
    units: list[str] = []
    for block in blocks:
        if len(block) <= 2000:
            units.append(block)
            continue
        # Long block: fall back to sentences.
        sentences = [s.strip() for s in _SENTENCE_END.split(block) if s.strip()]
        units.extend(sentences or [block])
    return units


def chunk_text(text: str, chunk_size: int = 1100, overlap: int = 150) -> list[str]:
    """Greedy pack units into chunks of ~chunk_size chars with a trailing overlap."""
    text = clean_text(text)
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    units = _split_units(text)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    def flush() -> None:
        nonlocal current, current_len
        if current:
            chunks.append("\n\n".join(current).strip())
            current, current_len = [], 0

    for unit in units:
        # A single oversized unit gets hard-wrapped.
        if len(unit) > chunk_size:
            flush()
            for i in range(0, len(unit), chunk_size - overlap):
                piece = unit[i : i + chunk_size].strip()
                if piece:
                    chunks.append(piece)
            continue

        if current_len + len(unit) + 2 > chunk_size:
            flush()
            # Carry a tail of the previous chunk forward for context continuity.
            if chunks and overlap > 0:
                tail = chunks[-1][-overlap:].strip()
                if tail:
                    current, current_len = [tail], len(tail)

        current.append(unit)
        current_len += len(unit) + 2

    flush()
    return [c for c in chunks if len(c) > 40]
