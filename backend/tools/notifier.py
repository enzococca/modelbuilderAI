"""Notifier tool — send notifications to Slack, Discord, Telegram, or generic webhooks."""

from __future__ import annotations

import json
from typing import Any

import httpx

from tools import BaseTool


class NotifierTool(BaseTool):
    """Send notifications via Slack, Discord, Telegram, or generic webhook."""

    name = "notifier"
    description = "Send notifications: Slack, Discord, Telegram, or generic webhook"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        channel = kwargs.get("channel", "webhook") or "webhook"
        webhook_url = kwargs.get("webhook_url", "") or ""
        # Telegram-specific
        bot_token = kwargs.get("bot_token", "") or ""
        chat_id = kwargs.get("chat_id", "") or ""
        # Generic webhook
        method = (kwargs.get("method", "POST") or "POST").upper()
        headers_raw = kwargs.get("headers", "") or ""
        timeout = int(kwargs.get("timeout", 10) or 10)

        message = input_text.strip()
        if not message:
            return "[notifier] No message provided (input is empty)."

        if channel == "slack":
            return await self._send_slack(webhook_url, message, timeout)
        if channel == "discord":
            return await self._send_discord(webhook_url, message, timeout)
        if channel == "telegram":
            return await self._send_telegram(bot_token, chat_id, message, timeout)
        if channel == "webhook":
            return await self._send_webhook(webhook_url, method, headers_raw, message, timeout)

        return f"[notifier] Unknown channel: {channel}"

    async def _send_slack(self, webhook_url: str, message: str, timeout: int) -> str:
        if not webhook_url:
            return "[notifier] Slack webhook_url is required."
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(
                    webhook_url,
                    json={"text": message},
                    headers={"Content-Type": "application/json"},
                )
            if resp.status_code == 200:
                return f"Slack notification sent successfully."
            return f"[notifier] Slack returned {resp.status_code}: {resp.text[:200]}"
        except Exception as e:
            return f"[notifier] Slack error: {e}"

    async def _send_discord(self, webhook_url: str, message: str, timeout: int) -> str:
        if not webhook_url:
            return "[notifier] Discord webhook_url is required."
        try:
            # Discord supports content (plain) and embeds
            payload: dict[str, Any] = {"content": message[:2000]}
            if len(message) > 2000:
                # Use embed for longer messages
                payload = {
                    "content": "",
                    "embeds": [{
                        "title": "Gennaro Notification",
                        "description": message[:4096],
                        "color": 5814783,  # Blue
                    }],
                }
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(
                    webhook_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
            if resp.status_code in (200, 204):
                return f"Discord notification sent successfully."
            return f"[notifier] Discord returned {resp.status_code}: {resp.text[:200]}"
        except Exception as e:
            return f"[notifier] Discord error: {e}"

    async def _send_telegram(self, bot_token: str, chat_id: str, message: str, timeout: int) -> str:
        if not bot_token:
            return "[notifier] Telegram bot_token is required."
        if not chat_id:
            return "[notifier] Telegram chat_id is required."
        try:
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json={
                    "chat_id": chat_id,
                    "text": message[:4096],
                    "parse_mode": "Markdown",
                })
            data = resp.json()
            if data.get("ok"):
                return f"Telegram notification sent to chat {chat_id}."
            return f"[notifier] Telegram error: {data.get('description', resp.text[:200])}"
        except Exception as e:
            return f"[notifier] Telegram error: {e}"

    async def _send_webhook(self, url: str, method: str, headers_raw: str, message: str, timeout: int) -> str:
        if not url:
            return "[notifier] Webhook URL is required."

        headers: dict[str, str] = {"Content-Type": "application/json", "User-Agent": "Gennaro/1.0"}
        if headers_raw:
            try:
                parsed = json.loads(headers_raw) if isinstance(headers_raw, str) else headers_raw
                if isinstance(parsed, dict):
                    headers.update(parsed)
            except (json.JSONDecodeError, TypeError):
                pass

        try:
            body = json.dumps({"message": message, "source": "gennaro"})
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.request(method, url, content=body, headers=headers)
            return f"Webhook {method} {url} → {resp.status_code} {resp.reason_phrase}"
        except Exception as e:
            return f"[notifier] Webhook error: {e}"
