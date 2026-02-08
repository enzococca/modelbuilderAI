"""Telegram Bot tool — full Telegram Bot API integration."""

from __future__ import annotations

import json
from typing import Any

import httpx

from tools import BaseTool


class TelegramBotTool(BaseTool):
    """Interact with Telegram Bot API: send messages, documents, photos, get updates."""

    name = "telegram_bot"
    description = "Telegram Bot API: send messages, documents, photos, get updates, chat info"

    BASE_URL = "https://api.telegram.org/bot"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        operation = kwargs.get("operation", "send_message") or "send_message"
        bot_token = kwargs.get("bot_token", "") or ""

        # Fallback to env config
        if not bot_token:
            try:
                from config import settings
                bot_token = settings.telegram_bot_token
            except Exception:
                pass

        if not bot_token:
            return "[telegram_bot] bot_token is required. Set it in node config or TELEGRAM_BOT_TOKEN env."

        chat_id = kwargs.get("chat_id", "") or ""
        parse_mode = kwargs.get("parse_mode", "Markdown") or "Markdown"
        timeout = int(kwargs.get("timeout", 15) or 15)

        if operation == "send_message":
            return await self._send_message(bot_token, chat_id, input_text, parse_mode, timeout)
        if operation == "send_document":
            return await self._send_document(bot_token, chat_id, input_text, timeout)
        if operation == "send_photo":
            return await self._send_photo(bot_token, chat_id, input_text, timeout)
        if operation == "get_updates":
            return await self._get_updates(bot_token, timeout)
        if operation == "get_chat_info":
            return await self._get_chat_info(bot_token, chat_id, timeout)

        return f"[telegram_bot] Unknown operation: {operation}"

    async def _send_message(self, token: str, chat_id: str, text: str, parse_mode: str, timeout: int) -> str:
        if not chat_id:
            return "[telegram_bot] chat_id is required for send_message."
        if not text.strip():
            return "[telegram_bot] No message text provided."
        try:
            url = f"{self.BASE_URL}{token}/sendMessage"
            payload: dict[str, Any] = {
                "chat_id": chat_id,
                "text": text[:4096],
            }
            if parse_mode and parse_mode != "plain":
                payload["parse_mode"] = parse_mode

            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=payload)
            data = resp.json()
            if data.get("ok"):
                msg_id = data["result"].get("message_id", "?")
                return f"Message sent to chat {chat_id} (message_id: {msg_id})"
            return f"[telegram_bot] Error: {data.get('description', resp.text[:300])}"
        except Exception as e:
            return f"[telegram_bot] send_message error: {e}"

    async def _send_document(self, token: str, chat_id: str, file_path: str, timeout: int) -> str:
        if not chat_id:
            return "[telegram_bot] chat_id is required for send_document."
        file_path = file_path.strip()
        if not file_path:
            return "[telegram_bot] File path is required (input text)."
        try:
            import os
            if not os.path.isfile(file_path):
                return f"[telegram_bot] File not found: {file_path}"

            url = f"{self.BASE_URL}{token}/sendDocument"
            async with httpx.AsyncClient(timeout=timeout) as client:
                with open(file_path, "rb") as f:
                    resp = await client.post(
                        url,
                        data={"chat_id": chat_id},
                        files={"document": (os.path.basename(file_path), f)},
                    )
            data = resp.json()
            if data.get("ok"):
                return f"Document sent to chat {chat_id}: {os.path.basename(file_path)}"
            return f"[telegram_bot] Error: {data.get('description', resp.text[:300])}"
        except Exception as e:
            return f"[telegram_bot] send_document error: {e}"

    async def _send_photo(self, token: str, chat_id: str, photo_input: str, timeout: int) -> str:
        if not chat_id:
            return "[telegram_bot] chat_id is required for send_photo."
        photo_input = photo_input.strip()
        if not photo_input:
            return "[telegram_bot] Photo path or URL is required (input text)."
        try:
            url = f"{self.BASE_URL}{token}/sendPhoto"

            # If it's a URL, send directly
            if photo_input.startswith("http://") or photo_input.startswith("https://"):
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(url, json={"chat_id": chat_id, "photo": photo_input})
            else:
                import os
                if not os.path.isfile(photo_input):
                    return f"[telegram_bot] Photo file not found: {photo_input}"
                async with httpx.AsyncClient(timeout=timeout) as client:
                    with open(photo_input, "rb") as f:
                        resp = await client.post(
                            url,
                            data={"chat_id": chat_id},
                            files={"photo": (os.path.basename(photo_input), f)},
                        )

            data = resp.json()
            if data.get("ok"):
                return f"Photo sent to chat {chat_id}"
            return f"[telegram_bot] Error: {data.get('description', resp.text[:300])}"
        except Exception as e:
            return f"[telegram_bot] send_photo error: {e}"

    async def _get_updates(self, token: str, timeout: int) -> str:
        try:
            url = f"{self.BASE_URL}{token}/getUpdates"
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.get(url, params={"limit": 10})
            data = resp.json()
            if not data.get("ok"):
                return f"[telegram_bot] Error: {data.get('description', resp.text[:300])}"

            updates = data.get("result", [])
            if not updates:
                return "No new updates."

            lines = [f"**{len(updates)} updates:**"]
            for upd in updates[-10:]:
                msg = upd.get("message", {})
                sender = msg.get("from", {}).get("first_name", "?")
                text = msg.get("text", "[no text]")
                chat = msg.get("chat", {}).get("title", msg.get("chat", {}).get("first_name", "?"))
                lines.append(f"- [{chat}] {sender}: {text[:100]}")
            return "\n".join(lines)
        except Exception as e:
            return f"[telegram_bot] get_updates error: {e}"

    async def _get_chat_info(self, token: str, chat_id: str, timeout: int) -> str:
        if not chat_id:
            return "[telegram_bot] chat_id is required for get_chat_info."
        try:
            url = f"{self.BASE_URL}{token}/getChat"
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json={"chat_id": chat_id})
            data = resp.json()
            if not data.get("ok"):
                return f"[telegram_bot] Error: {data.get('description', resp.text[:300])}"

            chat = data["result"]
            info = {
                "id": chat.get("id"),
                "type": chat.get("type"),
                "title": chat.get("title", chat.get("first_name", "")),
                "username": chat.get("username", ""),
                "description": chat.get("description", ""),
                "members_count": chat.get("members_count", "N/A"),
            }
            return json.dumps(info, indent=2, ensure_ascii=False)
        except Exception as e:
            return f"[telegram_bot] get_chat_info error: {e}"
