"""Fetch and extract readable text from the catalog's source URLs.

Government portals are hostile to naive scraping: some are JS-rendered, some
geo-restrict, some serve PDFs from an HTML-looking URL. Every failure is
recorded rather than raised, so ingestion of the other 18 documents continues.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass

import httpx

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
}

_MIN_USEFUL_CHARS = 400
_TAG_STRIP = re.compile(r"<[^>]+>")


@dataclass
class FetchResult:
    url: str
    ok: bool
    text: str = ""
    content_type: str = ""
    status: int | None = None
    error: str = ""
    extractor: str = ""

    @property
    def usable(self) -> bool:
        return self.ok and len(self.text) >= _MIN_USEFUL_CHARS


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    return "\n\n".join((page.extract_text() or "") for page in reader.pages)


def _extract_html(html: str, url: str) -> tuple[str, str]:
    """Try trafilatura (boilerplate-aware) then BeautifulSoup, then raw strip."""
    try:
        import trafilatura

        extracted = trafilatura.extract(
            html,
            url=url,
            include_comments=False,
            include_tables=True,
            favor_recall=True,
        )
        if extracted and len(extracted) >= _MIN_USEFUL_CHARS:
            return extracted, "trafilatura"
    except Exception:
        pass

    try:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "lxml")
        for tag in soup(["script", "style", "nav", "header", "footer", "noscript", "form"]):
            tag.decompose()
        main = soup.find("main") or soup.find("article") or soup.body or soup
        return main.get_text("\n", strip=True), "beautifulsoup"
    except Exception:
        pass

    return _TAG_STRIP.sub(" ", html), "regex"


def fetch_url(url: str, timeout: float = 30.0) -> FetchResult:
    if not url or not url.startswith("http"):
        return FetchResult(url=url, ok=False, error="missing or non-HTTP URL")

    try:
        with httpx.Client(
            headers=_HEADERS,
            timeout=timeout,
            follow_redirects=True,
            verify=False,  # several .gov.sa hosts serve incomplete cert chains
        ) as client:
            response = client.get(url)
    except Exception as exc:  # DNS, TLS, timeout, connection reset
        return FetchResult(url=url, ok=False, error=f"{type(exc).__name__}: {exc}")

    if response.status_code >= 400:
        return FetchResult(
            url=url, ok=False, status=response.status_code, error=f"HTTP {response.status_code}"
        )

    content_type = response.headers.get("content-type", "").lower()

    try:
        if "pdf" in content_type or url.lower().endswith(".pdf"):
            text = _extract_pdf(response.content)
            extractor = "pypdf"
        else:
            text = response.text
            text, extractor = _extract_html(text, url)
    except Exception as exc:
        return FetchResult(
            url=url,
            ok=False,
            status=response.status_code,
            content_type=content_type,
            error=f"extraction failed — {type(exc).__name__}: {exc}",
        )

    text = (text or "").strip()
    result = FetchResult(
        url=url,
        ok=bool(text),
        text=text,
        content_type=content_type,
        status=response.status_code,
        extractor=extractor,
    )
    if not result.usable and result.ok:
        result.error = f"only {len(text)} chars extracted (likely JS-rendered)"
    return result
