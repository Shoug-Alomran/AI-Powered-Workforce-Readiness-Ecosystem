"""Parser for knowledge-base-catalog.md.

The catalog is the authoritative source of *what* belongs in the knowledge base:
19 Saudi policy documents, each with a URL, provenance metadata, a curated summary,
and — for several entries — an explicitly identified policy gap.

Every field is preserved as chunk metadata so RAG answers can cite
"KB-010 — Jadarat (HRDF, 2024)" rather than an anonymous passage.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

_ENTRY_RE = re.compile(r"^###\s+(KB-\d+):\s*(.+?)\s*$", re.MULTILINE)
_FIELD_RE = re.compile(r"^-\s+\*\*(.+?):\*\*\s*(.*)$", re.MULTILINE)
_CATEGORY_RE = re.compile(r"^##\s+CATEGORY\s+\d+:\s*(.+?)\s*$", re.MULTILINE)

_FIELD_KEYS = {
    "source": "source",
    "type": "doc_type",
    "url": "url",
    "date": "date",
    "domain tags": "tags",
    "summary": "summary",
    "kb value": "kb_value",
    "policy gap": "policy_gap",
}


@dataclass
class CatalogEntry:
    kb_id: str
    title: str
    category: str = ""
    source: str = ""
    doc_type: str = ""
    url: str = ""
    date: str = ""
    tags: str = ""
    summary: str = ""
    kb_value: str = ""
    policy_gap: str = ""
    extras: dict[str, str] = field(default_factory=dict)

    @property
    def label(self) -> str:
        return f"{self.kb_id} — {self.title}"

    def as_metadata(self) -> dict[str, str]:
        """Chroma metadata values must be scalars, so everything is a string."""
        return {
            "kb_id": self.kb_id,
            "title": self.title,
            "category": self.category,
            "source": self.source,
            "doc_type": self.doc_type,
            "url": self.url,
            "date": self.date,
            "tags": self.tags,
        }

    def catalog_card(self) -> str:
        """A self-contained prose card built from the curated metadata.

        Indexed alongside the scraped page text. It guarantees that every one of
        the 19 documents is answerable even when its source URL is unreachable,
        JS-rendered, or geo-blocked — a real risk with government portals.
        """
        parts = [
            f"{self.label}",
            f"Category: {self.category}" if self.category else "",
            f"Source: {self.source}" if self.source else "",
            f"Document type: {self.doc_type}" if self.doc_type else "",
            f"Date: {self.date}" if self.date else "",
            f"Domain tags: {self.tags}" if self.tags else "",
            f"URL: {self.url}" if self.url else "",
            f"Summary: {self.summary}" if self.summary else "",
            f"Relevance to the Fursa platform: {self.kb_value}" if self.kb_value else "",
            f"Identified policy gap: {self.policy_gap}" if self.policy_gap else "",
        ]
        return "\n".join(p for p in parts if p)


def _split_sections(text: str) -> list[tuple[int, str]]:
    """Return (offset, category_name) markers so entries can be attributed."""
    return [(m.start(), m.group(1).strip()) for m in _CATEGORY_RE.finditer(text)]


def _category_at(markers: list[tuple[int, str]], offset: int) -> str:
    current = ""
    for start, name in markers:
        if start < offset:
            current = name
        else:
            break
    return current


def parse_catalog(path: Path) -> list[CatalogEntry]:
    """Parse the catalog markdown into structured entries."""
    text = path.read_text(encoding="utf-8")
    categories = _split_sections(text)

    matches = list(_ENTRY_RE.finditer(text))
    entries: list[CatalogEntry] = []

    for i, match in enumerate(matches):
        body_start = match.end()
        body_end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[body_start:body_end]

        entry = CatalogEntry(
            kb_id=match.group(1),
            title=match.group(2),
            category=_category_at(categories, match.start()),
        )

        for fm in _FIELD_RE.finditer(body):
            raw_key = fm.group(1).strip().lower()
            value = fm.group(2).strip()
            attr = _FIELD_KEYS.get(raw_key)
            if attr:
                setattr(entry, attr, value)
            else:
                entry.extras[raw_key] = value

        entries.append(entry)

    return entries


def policy_gap_entries(entries: list[CatalogEntry]) -> list[CatalogEntry]:
    return [e for e in entries if e.policy_gap]
