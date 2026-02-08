"""Text transformer tool — regex, split, join, template, and more without LLM."""

from __future__ import annotations

import re
from typing import Any

from tools import BaseTool


class TextTransformerTool(BaseTool):
    """Transform text: regex, split, join, template, case change, count, strip HTML."""

    name = "text_transformer"
    description = "Transform text without AI: regex replace/extract, split, join, template, upper/lower, count, strip HTML"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        operation = kwargs.get("operation", "trim")
        pattern = kwargs.get("pattern", "") or ""
        replacement = kwargs.get("replacement", "") or ""
        separator = kwargs.get("separator", "\n") or "\n"
        template = kwargs.get("template", "") or ""
        max_length = int(kwargs.get("max_length", 0) or 0)

        if operation == "regex_replace":
            return self._regex_replace(input_text, pattern, replacement)
        if operation == "regex_extract":
            return self._regex_extract(input_text, pattern)
        if operation == "split":
            return self._split(input_text, separator)
        if operation == "join":
            return self._join(input_text, separator)
        if operation == "template":
            return self._template(input_text, template)
        if operation == "upper":
            return input_text.upper()
        if operation == "lower":
            return input_text.lower()
        if operation == "trim":
            return input_text.strip()
        if operation == "truncate":
            limit = max_length or 500
            if len(input_text) <= limit:
                return input_text
            return input_text[:limit] + f"... ({len(input_text)} total chars)"
        if operation == "count":
            return self._count(input_text)
        if operation == "remove_html":
            return self._remove_html(input_text)
        if operation == "reverse_lines":
            lines = input_text.split("\n")
            return "\n".join(reversed(lines))
        if operation == "unique_lines":
            lines = input_text.split("\n")
            seen: set[str] = set()
            unique: list[str] = []
            for line in lines:
                stripped = line.strip()
                if stripped and stripped not in seen:
                    seen.add(stripped)
                    unique.append(line)
            return "\n".join(unique)
        if operation == "sort_lines":
            lines = input_text.split("\n")
            return "\n".join(sorted(lines, key=str.strip))
        if operation == "number_lines":
            lines = input_text.split("\n")
            return "\n".join(f"{i+1}. {line}" for i, line in enumerate(lines))

        return f"[text_transformer] Unknown operation: {operation}"

    def _regex_replace(self, text: str, pattern: str, replacement: str) -> str:
        if not pattern:
            return "[text_transformer] No regex pattern provided."
        try:
            return re.sub(pattern, replacement, text)
        except re.error as e:
            return f"[text_transformer] Regex error: {e}"

    def _regex_extract(self, text: str, pattern: str) -> str:
        if not pattern:
            return "[text_transformer] No regex pattern provided."
        try:
            matches = re.findall(pattern, text)
            if not matches:
                return f"[text_transformer] No matches for pattern: {pattern}"
            lines = [f"Found {len(matches)} match(es):\n"]
            for i, m in enumerate(matches[:200], 1):
                if isinstance(m, tuple):
                    lines.append(f"{i}. {' | '.join(m)}")
                else:
                    lines.append(f"{i}. {m}")
            if len(matches) > 200:
                lines.append(f"\n... ({len(matches) - 200} more)")
            return "\n".join(lines)
        except re.error as e:
            return f"[text_transformer] Regex error: {e}"

    def _split(self, text: str, separator: str) -> str:
        # Handle escape sequences
        sep = separator.replace("\\n", "\n").replace("\\t", "\t")
        parts = text.split(sep)
        lines = [f"Split into {len(parts)} parts:\n"]
        for i, part in enumerate(parts, 1):
            lines.append(f"{i}. {part.strip()}")
        return "\n".join(lines)

    def _join(self, text: str, separator: str) -> str:
        sep = separator.replace("\\n", "\n").replace("\\t", "\t")
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        return sep.join(lines)

    def _template(self, text: str, template: str) -> str:
        if not template:
            return "[text_transformer] No template provided."
        result = template.replace("{input}", text)
        # Also replace {line_N} with Nth line
        lines = text.split("\n")
        for i, line in enumerate(lines[:50], 1):
            result = result.replace(f"{{line_{i}}}", line.strip())
        # Replace {word_count}, {char_count}, {line_count}
        result = result.replace("{word_count}", str(len(text.split())))
        result = result.replace("{char_count}", str(len(text)))
        result = result.replace("{line_count}", str(len(lines)))
        return result

    def _count(self, text: str) -> str:
        words = len(text.split())
        chars = len(text)
        chars_no_space = len(text.replace(" ", "").replace("\n", "").replace("\t", ""))
        lines = len(text.split("\n"))
        sentences = len(re.split(r'[.!?]+', text))
        return (
            f"**Characters:** {chars} ({chars_no_space} without spaces)\n"
            f"**Words:** {words}\n"
            f"**Lines:** {lines}\n"
            f"**Sentences:** ~{sentences}"
        )

    def _remove_html(self, text: str) -> str:
        # Remove HTML tags
        clean = re.sub(r'<[^>]+>', '', text)
        # Decode common entities
        clean = clean.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
        clean = clean.replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " ")
        # Collapse whitespace
        clean = re.sub(r'\s+', ' ', clean).strip()
        return clean
