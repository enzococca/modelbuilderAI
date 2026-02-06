"""Image analysis tool using vision-capable models."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Any

from tools import BaseTool


class ImageTool(BaseTool):
    """Analyze images using vision-capable AI models."""

    name = "image_tool"
    description = "Analyze images using vision models (describe, extract text, identify objects)"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        prompt = kwargs.get("prompt", "Describe this image in detail.")
        model = kwargs.get("model", "claude-sonnet-4-5-20250929")

        # Check if input is a file path to an image
        path = Path(input_text.strip())
        if path.exists() and path.suffix.lower() in (".png", ".jpg", ".jpeg", ".gif", ".webp"):
            return await self._analyze_image_file(path, prompt, model)

        return f"No valid image file found at: {input_text}"

    async def _analyze_image_file(self, path: Path, prompt: str, model: str) -> str:
        """Encode image and send to a vision model."""
        image_data = base64.b64encode(path.read_bytes()).decode()
        media_type = self._get_media_type(path.suffix)

        from orchestrator.router import get_provider_for_model
        from models.agent_models import Provider

        provider = get_provider_for_model(model)

        if provider == Provider.ANTHROPIC:
            return await self._analyze_with_anthropic(image_data, media_type, prompt, model)
        if provider == Provider.OPENAI:
            return await self._analyze_with_openai(image_data, media_type, prompt, model)

        return "Vision analysis requires an Anthropic or OpenAI model."

    async def _analyze_with_anthropic(self, b64_data: str, media_type: str, prompt: str, model: str) -> str:
        try:
            import anthropic
            from config import settings
            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            message = await client.messages.create(
                model=model,
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64_data}},
                        {"type": "text", "text": prompt},
                    ],
                }],
            )
            return message.content[0].text
        except Exception as e:
            return f"Anthropic vision error: {e}"

    async def _analyze_with_openai(self, b64_data: str, media_type: str, prompt: str, model: str) -> str:
        try:
            from openai import AsyncOpenAI
            from config import settings
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            resp = await client.chat.completions.create(
                model=model,
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{b64_data}"}},
                        {"type": "text", "text": prompt},
                    ],
                }],
            )
            return resp.choices[0].message.content or ""
        except Exception as e:
            return f"OpenAI vision error: {e}"

    def _get_media_type(self, suffix: str) -> str:
        return {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }.get(suffix.lower(), "image/png")
