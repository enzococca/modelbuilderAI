"""Web scraper tool — extract text, links, tables, or structured data from web pages."""

from __future__ import annotations

from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

from tools import BaseTool


class WebScraperTool(BaseTool):
    """Scrape web pages and extract content in various formats."""

    name = "web_scraper"
    description = "Scrape web pages: extract text, links, tables, or structured data via CSS selectors"

    MAX_OUTPUT = 10_000

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        operation = kwargs.get("operation", "extract_text")
        url = input_text.strip()
        timeout = int(kwargs.get("timeout", 15))
        user_agent = kwargs.get("user_agent", "") or "Mozilla/5.0 (compatible; Gennaro/1.0)"
        css_selector = kwargs.get("css_selector", "")

        if not url:
            return "[web_scraper] No URL provided. Pass a URL as input."

        # Validate URL
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            # Try prepending https
            url = f"https://{url}"
            parsed = urlparse(url)
        if not parsed.netloc:
            return f"[web_scraper] Invalid URL: {input_text.strip()}"

        try:
            html = await self._fetch(url, timeout, user_agent)
        except Exception as e:
            return f"[web_scraper] Fetch error: {e}"

        try:
            from bs4 import BeautifulSoup
        except ImportError:
            return "[web_scraper] beautifulsoup4 not installed. Run: pip install beautifulsoup4"

        soup = BeautifulSoup(html, "html.parser")

        # Remove script/style elements
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()

        if operation == "extract_text":
            return self._extract_text(soup, url)
        if operation == "extract_links":
            return self._extract_links(soup, url)
        if operation == "extract_tables":
            return self._extract_tables(soup, url)
        if operation == "extract_structured":
            return self._extract_structured(soup, url, css_selector)

        return f"[web_scraper] Unknown operation: {operation}"

    async def _fetch(self, url: str, timeout: int, user_agent: str) -> str:
        """Fetch a web page with httpx."""
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": user_agent},
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text

    def _extract_text(self, soup: Any, url: str) -> str:
        """Extract readable text from the page."""
        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        # Get meta description
        meta_desc = ""
        meta = soup.find("meta", attrs={"name": "description"})
        if meta and meta.get("content"):
            meta_desc = meta["content"].strip()

        # Extract main content (prefer article/main, fall back to body)
        main = soup.find("article") or soup.find("main") or soup.find("body") or soup
        text = main.get_text(separator="\n", strip=True)

        # Build output
        lines = [f"# {title}" if title else f"# {url}"]
        if meta_desc:
            lines.append(f"> {meta_desc}")
        lines.append(f"Source: {url}\n")
        lines.append(text)

        output = "\n".join(lines)
        if len(output) > self.MAX_OUTPUT:
            output = output[: self.MAX_OUTPUT] + f"\n\n... (truncated, {len(output)} total chars)"
        return output

    def _extract_links(self, soup: Any, url: str) -> str:
        """Extract all links from the page."""
        links: list[dict[str, str]] = []
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith(("#", "javascript:", "mailto:")):
                continue
            absolute = urljoin(url, href)
            text = a.get_text(strip=True) or "[no text]"
            links.append({"text": text, "url": absolute})

        if not links:
            return f"[web_scraper] No links found on {url}"

        lines = [f"Links extracted from {url} ({len(links)} total)\n"]
        for i, link in enumerate(links[:200], 1):
            lines.append(f"{i}. [{link['text'][:80]}]({link['url']})")

        if len(links) > 200:
            lines.append(f"\n... ({len(links) - 200} more links)")

        return "\n".join(lines)

    def _extract_tables(self, soup: Any, url: str) -> str:
        """Extract HTML tables as markdown."""
        tables = soup.find_all("table")
        if not tables:
            return f"[web_scraper] No tables found on {url}"

        results: list[str] = [f"Tables extracted from {url} ({len(tables)} found)\n"]

        for idx, table in enumerate(tables[:10], 1):
            rows = table.find_all("tr")
            if not rows:
                continue

            results.append(f"### Table {idx}")

            md_rows: list[list[str]] = []
            for tr in rows[:50]:
                cells = tr.find_all(["th", "td"])
                md_rows.append([c.get_text(strip=True).replace("|", "\\|") for c in cells])

            if not md_rows:
                continue

            # Determine max columns
            max_cols = max(len(r) for r in md_rows)
            for r in md_rows:
                while len(r) < max_cols:
                    r.append("")

            # Header
            results.append("| " + " | ".join(md_rows[0]) + " |")
            results.append("| " + " | ".join(["---"] * max_cols) + " |")
            for r in md_rows[1:]:
                results.append("| " + " | ".join(r) + " |")
            results.append("")

        output = "\n".join(results)
        if len(output) > self.MAX_OUTPUT:
            output = output[: self.MAX_OUTPUT] + "\n\n... (truncated)"
        return output

    def _extract_structured(self, soup: Any, url: str, selector: str) -> str:
        """Extract elements matching a CSS selector."""
        if not selector:
            return "[web_scraper] No CSS selector provided. Set css_selector in config."

        elements = soup.select(selector)
        if not elements:
            return f"[web_scraper] No elements match selector '{selector}' on {url}"

        lines = [f"Elements matching `{selector}` on {url} ({len(elements)} found)\n"]
        for i, el in enumerate(elements[:100], 1):
            tag_name = el.name
            text = el.get_text(strip=True)[:200]
            attrs = " ".join(f'{k}="{v}"' for k, v in list(el.attrs.items())[:5] if isinstance(v, str))
            lines.append(f"{i}. <{tag_name} {attrs}> {text}")

        if len(elements) > 100:
            lines.append(f"\n... ({len(elements) - 100} more)")

        output = "\n".join(lines)
        if len(output) > self.MAX_OUTPUT:
            output = output[: self.MAX_OUTPUT] + "\n\n... (truncated)"
        return output
