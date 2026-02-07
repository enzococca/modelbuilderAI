"""Email sending tool — Gmail, Outlook (Microsoft Graph), or generic SMTP."""

from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from tools import BaseTool


class EmailSenderTool(BaseTool):
    """Send emails via Gmail API, Microsoft Graph, or SMTP."""

    name = "email_sender"
    description = "Send emails via Gmail, Outlook, or SMTP"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        source = kwargs.get("source", "smtp")
        to = kwargs.get("to", "")
        subject = kwargs.get("subject", "Gennaro Workflow Result")

        if not to:
            return "[Error] No recipient (to) address provided."

        body = input_text.strip()
        if not body:
            return "[Error] No email body provided (empty input)."

        try:
            if source == "gmail":
                return await self._send_gmail(to, subject, body)
            elif source == "outlook":
                return await self._send_outlook(to, subject, body)
            else:
                return await self._send_smtp(to, subject, body, **kwargs)
        except Exception as e:
            return f"[Email error] {e}"

    async def _send_gmail(self, to: str, subject: str, body: str) -> str:
        """Send via Gmail API using OAuth2 credentials."""
        import base64

        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build
        except ImportError:
            return "[Error] google-api-python-client not installed. Run: pip install google-api-python-client google-auth"

        from config import settings

        creds_path = settings.gmail_credentials_json
        token_path = settings.gmail_token_json

        if not creds_path or not token_path:
            return "[Error] Gmail credentials not configured. Set GMAIL_CREDENTIALS_JSON and GMAIL_TOKEN_JSON in .env"

        try:
            creds = Credentials.from_authorized_user_file(token_path)
        except Exception as e:
            return f"[Error] Failed to load Gmail token: {e}"

        service = build("gmail", "v1", credentials=creds)

        msg = MIMEMultipart()
        msg["to"] = to
        msg["subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))

        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        service.users().messages().send(
            userId="me", body={"raw": raw}
        ).execute()

        return f"Email sent via Gmail to {to}"

    async def _send_outlook(self, to: str, subject: str, body: str) -> str:
        """Send via Microsoft Graph API."""
        try:
            import httpx
        except ImportError:
            return "[Error] httpx not installed."

        from config import settings

        tenant = settings.microsoft_tenant_id
        client_id = settings.microsoft_client_id
        client_secret = settings.microsoft_client_secret
        user_id = settings.microsoft_user_id

        if not all([tenant, client_id, client_secret, user_id]):
            return "[Error] Microsoft Graph credentials not configured. Set MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_USER_ID in .env"

        # Get access token
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "scope": "https://graph.microsoft.com/.default",
                },
            )
            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                return f"[Error] Failed to get Microsoft token: {token_data.get('error_description', 'unknown')}"

            # Send email
            resp = await client.post(
                f"https://graph.microsoft.com/v1.0/users/{user_id}/sendMail",
                headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                json={
                    "message": {
                        "subject": subject,
                        "body": {"contentType": "Text", "content": body},
                        "toRecipients": [{"emailAddress": {"address": addr.strip()}} for addr in to.split(",")],
                    }
                },
            )
            if resp.status_code in (200, 202):
                return f"Email sent via Outlook to {to}"
            return f"[Error] Microsoft Graph returned {resp.status_code}: {resp.text}"

    async def _send_smtp(self, to: str, subject: str, body: str, **kwargs: Any) -> str:
        """Send via generic SMTP (works with any provider)."""
        from config import settings

        host = kwargs.get("smtp_host", "") or settings.imap_server.replace("imap.", "smtp.")
        port = int(kwargs.get("smtp_port", 587))
        username = kwargs.get("smtp_username", "") or settings.imap_username
        password = kwargs.get("smtp_password", "") or settings.imap_password
        use_tls = kwargs.get("smtp_tls", True)

        if not host:
            return "[Error] SMTP host not configured. Set smtp_host in node config or IMAP_SERVER in .env"
        if not username or not password:
            return "[Error] SMTP credentials not configured. Set smtp_username/smtp_password in node config or IMAP_USERNAME/IMAP_PASSWORD in .env"

        msg = MIMEMultipart()
        msg["From"] = username
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))

        import asyncio
        loop = asyncio.get_event_loop()

        def _do_send() -> str:
            with smtplib.SMTP(host, port) as server:
                if use_tls:
                    server.starttls()
                server.login(username, password)
                server.send_message(msg)
            return f"Email sent via SMTP ({host}) to {to}"

        return await loop.run_in_executor(None, _do_send)
