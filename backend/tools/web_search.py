"""Web search tool using httpx."""

from __future__ import annotations

import json
from typing import Any

import httpx

from tools import BaseTool


class WebSearchTool(BaseTool):
    """Search the web and return parsed results."""

    name = "web_search"
    description = "Search the web for information and return summarized results"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        max_results = kwargs.get("max_results", 5)
        # Use DuckDuckGo HTML search (no API key required)
        try:
            results = await self._search_ddg(input_text, max_results)
            if not results:
                return f"No search results found for: {input_text}"
            output_lines = [f"Search results for: {input_text}\n"]
            for i, r in enumerate(results, 1):
                output_lines.append(f"{i}. **{r['title']}**")
                output_lines.append(f"   {r['snippet']}")
                output_lines.append(f"   URL: {r['url']}\n")
            return "\n".join(output_lines)
        except Exception as e:
            return f"Search error: {e}"

    async def _search_ddg(self, query: str, max_results: int) -> list[dict[str, str]]:
        """Search DuckDuckGo via their lite HTML interface."""
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                "https://lite.duckduckgo.com/lite/",
                params={"q": query},
                headers={"User-Agent": "Mozilla/5.0 (compatible; Gennaro/1.0)"},
            )
            resp.raise_for_status()
            return self._parse_ddg_lite(resp.text, max_results)

    def _parse_ddg_lite(self, html: str, max_results: int) -> list[dict[str, str]]:
        """Extract results from DuckDuckGo Lite HTML."""
        results: list[dict[str, str]] = []
        # Simple extraction from the lite page
        import re
        # Find result links
        links = re.findall(
            r'<a[^>]+rel="nofollow"[^>]+href="([^"]+)"[^>]*>\s*(.*?)\s*</a>',
            html, re.DOTALL,
        )
        # Find snippets (td class="result-snippet")
        snippets = re.findall(
            r'<td[^>]*class="result-snippet"[^>]*>(.*?)</td>',
            html, re.DOTALL,
        )

        for i, (url, title) in enumerate(links[:max_results]):
            title_clean = re.sub(r'<[^>]+>', '', title).strip()
            snippet = ""
            if i < len(snippets):
                snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip()
            if url and title_clean:
                results.append({"title": title_clean, "url": url, "snippet": snippet})

        return results
