"""Check built pages, navigation, metadata, sitemap and publication boundaries."""
from __future__ import annotations

import sys
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree

from content import GUIDES

OUT = Path(__file__).resolve().parent / "dist"
SITE = "https://kemas.vijeron.com"


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags: list[tuple[str, dict[str, str]]] = []
        self.h1 = 0
        self.jsonld = False

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        self.tags.append((tag, data))
        if tag == "h1":
            self.h1 += 1
        if tag == "script" and data.get("type") == "application/ld+json":
            self.jsonld = True


def local_target(url: str) -> Path | None:
    if not url.startswith("/") or url.startswith("//"):
        return None
    path = urlsplit(url).path
    return OUT / (path.lstrip("/") + "index.html" if path.endswith("/") else path.lstrip("/"))


def check() -> None:
    assert len(GUIDES) == 8
    pages = sorted(OUT.rglob("*.html"))
    assert len(pages) == 29, f"expected 28 public pages plus 404, got {len(pages)}"
    for file in pages:
        if file.name == "404.html":
            continue
        raw = file.read_text(encoding="utf-8")
        page = Page()
        page.feed(raw)
        rel = file.relative_to(OUT).as_posix().removesuffix("index.html")
        url = SITE + "/" + rel
        lang = "en" if rel.startswith("en/") else "id"
        assert page.h1 == 1, f"one H1 required: {file}"
        assert page.jsonld, f"missing JSON-LD: {file}"
        match = re.search(r"<script type='application/ld\+json'>(.*?)</script>", raw)
        assert match, f"missing structured data: {file}"
        schema = json.loads(match.group(1))
        assert schema["url"] == url and schema["inLanguage"] == lang
        assert schema["@type"] != "Product", f"unsupported product claim: {file}"
        if "panduan/" in rel:
            assert schema["@type"] == "Article" and schema["headline"] == schema["name"]
        if "alat/" in rel:
            assert schema["@type"] == "WebApplication" and schema["applicationCategory"] == "UtilityApplication"
        assert f"<html lang='{lang}'>" in raw
        assert f"<link rel='canonical' href='{url}'>" in raw
        assert raw.count("hreflang=") == 3
        assert "<meta name='description'" in raw
        if "privasi/" in rel:
            assert "pagead2.googlesyndication.com" not in raw
        else:
            assert "ca-pub-6180580801533680" in raw
            assert raw.index("gtag('consent','default'") < raw.index("gtag('config'")
        for tag, attrs in page.tags:
            if tag not in ("a", "link", "script"):
                continue
            target = attrs.get("href") or attrs.get("src")
            if target:
                local = local_target(target)
                assert local is None or local.exists(), f"broken link {target} in {file}"
    tree = ElementTree.parse(OUT / "sitemap.xml")
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = [n.text for n in tree.findall("s:url/s:loc", ns)]
    assert len(urls) == 28 and len(set(urls)) == 28
    assert all(url.startswith(SITE + "/") for url in urls)
    assert (OUT / "robots.txt").read_text(encoding="utf-8").find("sitemap.xml") >= 0
    print("PASS: 28 public pages, 8 bilingual packaging guides, local links, sitemap, metadata, tags")


if __name__ == "__main__":
    try:
        check()
    except AssertionError as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)


