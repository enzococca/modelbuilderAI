"""HTTP Request tool — call any REST API endpoint."""

from __future__ import annotations

import json
from base64 import b64encode
from typing import Any

import httpx

from tools import BaseTool


class HTTPRequestTool(BaseTool):
    """Call any REST API: GET, POST, PUT, DELETE, PATCH."""

    name = "http_request"
    description = "Call REST APIs: GET, POST, PUT, DELETE, PATCH with headers, body, and authentication"

    MAX_OUTPUT = 10_000

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        method = (kwargs.get("method", "GET") or "GET").upper()
        url_template = kwargs.get("url_template", "") or "{input}"
        headers_raw = kwargs.get("headers", "") or ""
        body_raw = kwargs.get("body", "") or ""
        auth_type = kwargs.get("auth_type", "none") or "none"
        auth_token = kwargs.get("auth_token", "") or ""
        timeout = int(kwargs.get("timeout", 15) or 15)

        # Resolve URL
        url = url_template.replace("{input}", input_text.strip())
        if not url:
            url = input_text.strip()

        if not url:
            return "[http_request] No URL provided."

        # Parse headers
        headers: dict[str, str] = {"User-Agent": "Gennaro/1.0"}
        if headers_raw:
            try:
                parsed = json.loads(headers_raw) if isinstance(headers_raw, str) else headers_raw
                if isinstance(parsed, dict):
                    headers.update(parsed)
            except (json.JSONDecodeError, TypeError):
                pass

        # Authentication
        if auth_type == "bearer" and auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        elif auth_type == "basic" and auth_token:
            # Expect "user:password"
            encoded = b64encode(auth_token.encode()).decode()
            headers["Authorization"] = f"Basic {encoded}"

        # Parse body
        body: Any = None
        if body_raw and method in ("POST", "PUT", "PATCH"):
            body_str = body_raw.replace("{input}", input_text.strip()) if isinstance(body_raw, str) else body_raw
            try:
                body = json.loads(body_str) if isinstance(body_str, str) else body_str
            except (json.JSONDecodeError, TypeError):
                body = body_str

        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                if isinstance(body, dict):
                    resp = await client.request(method, url, headers=headers, json=body)
                elif body:
                    headers.setdefault("Content-Type", "text/plain")
                    resp = await client.request(method, url, headers=headers, content=str(body))
                else:
                    resp = await client.request(method, url, headers=headers)

            # Format output
            lines = [
                f"**{method}** `{url}` → **{resp.status_code}** {resp.reason_phrase}",
                "",
            ]

            # Response headers (key ones)
            ct = resp.headers.get("content-type", "")
            lines.append(f"Content-Type: {ct}")
            lines.append("")

            # Response body
            text = resp.text
            if len(text) > self.MAX_OUTPUT:
                text = text[: self.MAX_OUTPUT] + f"\n\n... (truncated, {len(resp.text)} total chars)"

            # Try to pretty-print JSON
            if "json" in ct:
                try:
                    parsed_json = resp.json()
                    text = json.dumps(parsed_json, indent=2, ensure_ascii=False)
                    if len(text) > self.MAX_OUTPUT:
                        text = text[: self.MAX_OUTPUT] + "\n... (truncated)"
                except Exception:
                    pass

            lines.append(text)
            return "\n".join(lines)

        except httpx.TimeoutException:
            return f"[http_request] Timeout after {timeout}s: {url}"
        except httpx.ConnectError as e:
            return f"[http_request] Connection error: {e}"
        except Exception as e:
            return f"[http_request] Error: {e}"
