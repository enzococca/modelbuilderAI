"""Email search tool — search emails across Gmail, Outlook, IMAP."""

from __future__ import annotations

import asyncio
import email as email_mod
import imaplib
from typing import Any

from tools import BaseTool


class EmailSearchTool(BaseTool):
    """Search emails across multiple backends."""

    name = "email_search"
    description = (
        "Search emails across Gmail, Microsoft Outlook (Graph), "
        "and generic IMAP servers. Returns subject, sender, date, snippet."
    )

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        source = kwargs.get("source", "gmail")
        max_results = int(kwargs.get("max_results", 20))

        dispatch = {
            "gmail": self._search_gmail,
            "outlook": self._search_outlook,
            "imap": self._search_imap,
        }

        handler = dispatch.get(source)
        if handler is None:
            return f"Unknown source: {source}. Available: {', '.join(dispatch.keys())}"

        try:
            return await handler(input_text, max_results=max_results, **kwargs)
        except ImportError as e:
            return f"Missing dependency for {source}: {e}. Install it with pip."
        except Exception as e:
            return f"Email search error ({source}): {e}"

    # ── gmail ──────────────────────────────────────────────────

    async def _search_gmail(self, query: str, **kwargs: Any) -> str:
        """Search Gmail using the Gmail API."""
        from config import settings

        if not settings.gmail_credentials_json and not settings.gmail_token_json:
            return (
                "Gmail not configured. Set gmail_credentials_json and "
                "gmail_token_json in Settings, then run the OAuth flow once."
            )

        max_results = int(kwargs.get("max_results", 20))

        def _do_search() -> list[dict[str, Any]]:
            import os

            from google.auth.transport.requests import Request
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build

            creds = None
            token_path = settings.gmail_token_json
            scopes = ["https://www.googleapis.com/auth/gmail.readonly"]

            if token_path and os.path.exists(token_path):
                creds = Credentials.from_authorized_user_file(token_path, scopes)

            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    return [
                        {
                            "subject": "[Auth required]",
                            "from": "",
                            "date": "",
                            "snippet": (
                                "Gmail OAuth token not found or expired. "
                                "Run the initial OAuth flow to generate token.json."
                            ),
                        }
                    ]

            service = build("gmail", "v1", credentials=creds)
            result = (
                service.users()
                .messages()
                .list(userId="me", q=query, maxResults=max_results)
                .execute()
            )

            messages = result.get("messages", [])
            items: list[dict[str, Any]] = []
            for msg_ref in messages[:max_results]:
                msg = (
                    service.users()
                    .messages()
                    .get(
                        userId="me",
                        id=msg_ref["id"],
                        format="metadata",
                        metadataHeaders=["Subject", "From", "Date"],
                    )
                    .execute()
                )
                headers = {
                    h["name"]: h["value"]
                    for h in msg.get("payload", {}).get("headers", [])
                }
                items.append({
                    "subject": headers.get("Subject", "(no subject)"),
                    "from": headers.get("From", ""),
                    "date": headers.get("Date", ""),
                    "snippet": msg.get("snippet", ""),
                })
            return items

        results = await asyncio.to_thread(_do_search)
        return self._format_results("Gmail", query, results)

    # ── outlook ────────────────────────────────────────────────

    async def _search_outlook(self, query: str, **kwargs: Any) -> str:
        """Search Outlook via Microsoft Graph REST API."""
        from config import settings

        if not settings.microsoft_client_id or not settings.microsoft_tenant_id:
            return (
                "Microsoft not configured. Set microsoft_tenant_id, "
                "microsoft_client_id, and microsoft_client_secret in Settings."
            )

        max_results = int(kwargs.get("max_results", 20))

        # Reuse the shared MS token helper from file_search
        from tools.file_search import _get_ms_token

        token = await _get_ms_token(settings)
        headers = {"Authorization": f"Bearer {token}"}
        user_id = settings.microsoft_user_id or "me"

        import httpx

        url = f"https://graph.microsoft.com/v1.0/users/{user_id}/messages"
        params = {
            "$search": f'"{query}"',
            "$top": max_results,
            "$select": "subject,from,receivedDateTime,bodyPreview",
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()

        results: list[dict[str, Any]] = []
        for msg in data.get("value", []):
            from_addr = msg.get("from", {}).get("emailAddress", {})
            results.append({
                "subject": msg.get("subject", "(no subject)"),
                "from": f"{from_addr.get('name', '')} <{from_addr.get('address', '')}>",
                "date": msg.get("receivedDateTime", ""),
                "snippet": (msg.get("bodyPreview", "") or "")[:200],
            })

        return self._format_results("Outlook", query, results)

    # ── imap ───────────────────────────────────────────────────

    async def _search_imap(self, query: str, **kwargs: Any) -> str:
        """Search via IMAP (stdlib)."""
        from config import settings

        server = kwargs.get("imap_server", "") or settings.imap_server
        port = int(kwargs.get("imap_port", 0) or settings.imap_port)
        username = kwargs.get("imap_username", "") or settings.imap_username
        password = kwargs.get("imap_password", "") or settings.imap_password
        use_ssl = settings.imap_use_ssl
        max_results = int(kwargs.get("max_results", 20))

        if not server or not username:
            return (
                "IMAP not configured. Set imap_server, imap_username, "
                "imap_password in Settings or in the node configuration."
            )

        results = await asyncio.to_thread(
            self._imap_search_sync,
            server,
            port,
            username,
            password,
            use_ssl,
            query,
            max_results,
        )
        return self._format_results("IMAP", query, results)

    @staticmethod
    def _imap_search_sync(
        server: str,
        port: int,
        username: str,
        password: str,
        use_ssl: bool,
        query: str,
        max_results: int,
    ) -> list[dict[str, Any]]:
        """Synchronous IMAP search (runs in thread)."""
        if use_ssl:
            conn = imaplib.IMAP4_SSL(server, port)
        else:
            conn = imaplib.IMAP4(server, port)

        try:
            conn.login(username, password)
            conn.select("INBOX", readonly=True)

            # IMAP search — OR across subject and body
            safe_q = query.replace('"', "")
            status, msg_ids = conn.search(
                None, f'(OR SUBJECT "{safe_q}" BODY "{safe_q}")'
            )
            if status != "OK" or not msg_ids[0]:
                return []

            ids = msg_ids[0].split()[-max_results:]  # most recent last
            ids.reverse()

            results: list[dict[str, Any]] = []
            for mid in ids:
                status, data = conn.fetch(mid, "(RFC822.HEADER)")
                if status != "OK" or not data or not data[0]:
                    continue
                raw = data[0][1]
                if isinstance(raw, bytes):
                    msg = email_mod.message_from_bytes(raw)
                else:
                    continue
                results.append({
                    "subject": str(msg.get("Subject", "(no subject)")),
                    "from": str(msg.get("From", "")),
                    "date": str(msg.get("Date", "")),
                    "snippet": "",
                })
            return results
        finally:
            try:
                conn.logout()
            except Exception:
                pass

    # ── formatting ─────────────────────────────────────────────

    @staticmethod
    def _format_results(
        source: str, query: str, results: list[dict[str, Any]]
    ) -> str:
        if not results:
            return f"No emails found on {source} for: {query}"
        lines = [f"**Email Search Results** ({source}) — query: *{query}*\n"]
        for i, r in enumerate(results, 1):
            lines.append(f"{i}. **{r.get('subject', '(no subject)')}**")
            lines.append(f"   From: {r.get('from', '')}")
            lines.append(f"   Date: {r.get('date', '')}")
            if r.get("snippet"):
                lines.append(f"   Preview: {r['snippet'][:150]}...")
            lines.append("")
        lines.append(f"Total: {len(results)} email(s)")
        return "\n".join(lines)
