"""WhatsApp Business Cloud API tool — send messages, templates, documents, images."""

from __future__ import annotations

import json
from typing import Any

import httpx

from tools import BaseTool


class WhatsAppTool(BaseTool):
    """Send WhatsApp messages via Meta Business Cloud API."""

    name = "whatsapp"
    description = "WhatsApp Business API: send messages, templates, documents, images"

    API_VERSION = "v21.0"
    BASE_URL = "https://graph.facebook.com"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        operation = kwargs.get("operation", "send_message") or "send_message"
        token = kwargs.get("token", "") or ""
        phone_number_id = kwargs.get("phone_number_id", "") or ""

        # Fallback to env config
        if not token or not phone_number_id:
            try:
                from config import settings
                if not token:
                    token = settings.whatsapp_token
                if not phone_number_id:
                    phone_number_id = settings.whatsapp_phone_number_id
            except Exception:
                pass

        if not token:
            return "[whatsapp] Access token required. Set in node config or WHATSAPP_TOKEN env."
        if not phone_number_id:
            return "[whatsapp] Phone number ID required. Set in node config or WHATSAPP_PHONE_NUMBER_ID env."

        recipient = kwargs.get("recipient", "") or ""
        template_name = kwargs.get("template_name", "") or ""
        timeout = int(kwargs.get("timeout", 15) or 15)

        url = f"{self.BASE_URL}/{self.API_VERSION}/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        if operation == "send_message":
            return await self._send_message(url, headers, recipient, input_text, timeout)
        if operation == "send_template":
            return await self._send_template(url, headers, recipient, template_name, input_text, timeout)
        if operation == "send_document":
            return await self._send_document(url, headers, recipient, input_text, timeout)
        if operation == "send_image":
            return await self._send_image(url, headers, recipient, input_text, timeout)

        return f"[whatsapp] Unknown operation: {operation}"

    async def _send_message(self, url: str, headers: dict, recipient: str, text: str, timeout: int) -> str:
        if not recipient:
            return "[whatsapp] Recipient phone number is required."
        if not text.strip():
            return "[whatsapp] No message text provided."
        try:
            payload = {
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "text",
                "text": {"body": text[:4096]},
            }
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)
            data = resp.json()
            if resp.status_code in (200, 201):
                msg_id = data.get("messages", [{}])[0].get("id", "?")
                return f"WhatsApp message sent to {recipient} (id: {msg_id})"
            error = data.get("error", {}).get("message", resp.text[:300])
            return f"[whatsapp] Error: {error}"
        except Exception as e:
            return f"[whatsapp] send_message error: {e}"

    async def _send_template(self, url: str, headers: dict, recipient: str, template_name: str, input_text: str, timeout: int) -> str:
        if not recipient:
            return "[whatsapp] Recipient phone number is required."
        if not template_name:
            return "[whatsapp] Template name is required for send_template."
        try:
            payload: dict[str, Any] = {
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": "it"},
                },
            }
            # If input text provided, use as body parameter
            if input_text.strip():
                payload["template"]["components"] = [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": input_text[:1024]}],
                    }
                ]
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)
            data = resp.json()
            if resp.status_code in (200, 201):
                msg_id = data.get("messages", [{}])[0].get("id", "?")
                return f"WhatsApp template '{template_name}' sent to {recipient} (id: {msg_id})"
            error = data.get("error", {}).get("message", resp.text[:300])
            return f"[whatsapp] Error: {error}"
        except Exception as e:
            return f"[whatsapp] send_template error: {e}"

    async def _send_document(self, url: str, headers: dict, recipient: str, doc_url: str, timeout: int) -> str:
        if not recipient:
            return "[whatsapp] Recipient phone number is required."
        doc_url = doc_url.strip()
        if not doc_url:
            return "[whatsapp] Document URL is required (input text)."
        try:
            payload = {
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "document",
                "document": {"link": doc_url},
            }
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)
            data = resp.json()
            if resp.status_code in (200, 201):
                return f"WhatsApp document sent to {recipient}"
            error = data.get("error", {}).get("message", resp.text[:300])
            return f"[whatsapp] Error: {error}"
        except Exception as e:
            return f"[whatsapp] send_document error: {e}"

    async def _send_image(self, url: str, headers: dict, recipient: str, image_url: str, timeout: int) -> str:
        if not recipient:
            return "[whatsapp] Recipient phone number is required."
        image_url = image_url.strip()
        if not image_url:
            return "[whatsapp] Image URL is required (input text)."
        try:
            payload = {
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "image",
                "image": {"link": image_url},
            }
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)
            data = resp.json()
            if resp.status_code in (200, 201):
                return f"WhatsApp image sent to {recipient}"
            error = data.get("error", {}).get("message", resp.text[:300])
            return f"[whatsapp] Error: {error}"
        except Exception as e:
            return f"[whatsapp] send_image error: {e}"
