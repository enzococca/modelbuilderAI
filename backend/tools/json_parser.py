"""JSON Parser tool — extract, filter, transform, and validate JSON data."""

from __future__ import annotations

import csv
import io
import json
import re
from typing import Any

from tools import BaseTool


class JSONParserTool(BaseTool):
    """Parse and transform JSON: extract fields, filter arrays, flatten, convert to CSV."""

    name = "json_parser"
    description = "Parse JSON data: extract fields (dot notation), filter arrays, flatten, convert to CSV, validate"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        operation = kwargs.get("operation", "extract")
        path = kwargs.get("path", "") or ""
        filter_field = kwargs.get("filter_field", "") or ""
        filter_value = kwargs.get("filter_value", "") or ""

        text = input_text.strip()

        if operation == "validate":
            return self._validate(text)

        # Parse JSON
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            return f"[json_parser] Invalid JSON: {e}"

        if operation == "extract":
            return self._extract(data, path)
        if operation == "keys":
            return self._keys(data)
        if operation == "filter":
            return self._filter(data, filter_field, filter_value)
        if operation == "flatten":
            return self._flatten(data)
        if operation == "to_csv":
            return self._to_csv(data)
        if operation == "pretty":
            result = json.dumps(data, indent=2, ensure_ascii=False)
            if len(result) > 10_000:
                result = result[:10_000] + "\n... (truncated)"
            return result
        if operation == "minify":
            return json.dumps(data, separators=(",", ":"), ensure_ascii=False)
        if operation == "count":
            if isinstance(data, list):
                return f"Array with {len(data)} elements"
            if isinstance(data, dict):
                return f"Object with {len(data)} keys"
            return f"Value of type {type(data).__name__}"

        return f"[json_parser] Unknown operation: {operation}"

    def _validate(self, text: str) -> str:
        try:
            data = json.loads(text)
            dtype = type(data).__name__
            if isinstance(data, list):
                return f"Valid JSON: array with {len(data)} elements"
            if isinstance(data, dict):
                return f"Valid JSON: object with {len(data)} keys ({', '.join(list(data.keys())[:10])})"
            return f"Valid JSON: {dtype} = {str(data)[:200]}"
        except json.JSONDecodeError as e:
            return f"Invalid JSON at position {e.pos}: {e.msg}"

    def _extract(self, data: Any, path: str) -> str:
        if not path:
            return "[json_parser] No path provided. Use dot notation: data.items[0].name"

        try:
            value = self._resolve_path(data, path)
            if isinstance(value, (dict, list)):
                result = json.dumps(value, indent=2, ensure_ascii=False)
                if len(result) > 10_000:
                    result = result[:10_000] + "\n... (truncated)"
                return result
            return str(value)
        except (KeyError, IndexError, TypeError) as e:
            return f"[json_parser] Path '{path}' not found: {e}"

    def _resolve_path(self, data: Any, path: str) -> Any:
        """Resolve a dot-notation path like 'data.items[0].name'."""
        # Split on dots but respect array indices
        parts = re.split(r'\.', path)
        current = data
        for part in parts:
            if not part:
                continue
            # Check for array index: key[0]
            match = re.match(r'^(\w+)\[(\d+)\]$', part)
            if match:
                key, idx = match.group(1), int(match.group(2))
                if isinstance(current, dict):
                    current = current[key]
                current = current[idx]
            elif re.match(r'^\[\d+\]$', part):
                idx = int(part[1:-1])
                current = current[idx]
            elif isinstance(current, dict):
                current = current[part]
            elif isinstance(current, list) and part.isdigit():
                current = current[int(part)]
            else:
                raise KeyError(f"Cannot access '{part}' on {type(current).__name__}")
        return current

    def _keys(self, data: Any) -> str:
        if isinstance(data, dict):
            keys = list(data.keys())
            lines = [f"Object keys ({len(keys)}):\n"]
            for k in keys:
                vtype = type(data[k]).__name__
                lines.append(f"- **{k}** ({vtype})")
            return "\n".join(lines)
        if isinstance(data, list):
            if data and isinstance(data[0], dict):
                keys = list(data[0].keys())
                return f"Array of objects. First element keys ({len(keys)}):\n" + "\n".join(f"- **{k}**" for k in keys)
            return f"Array with {len(data)} elements (not objects)"
        return f"Not an object or array: {type(data).__name__}"

    def _filter(self, data: Any, field: str, value: str) -> str:
        if not isinstance(data, list):
            return "[json_parser] Filter requires a JSON array as input."
        if not field:
            return "[json_parser] No filter_field provided."

        results = []
        for item in data:
            if not isinstance(item, dict):
                continue
            item_val = str(item.get(field, ""))
            if value.lower() in item_val.lower():
                results.append(item)

        if not results:
            return f"[json_parser] No items match {field} containing '{value}'"

        output = json.dumps(results, indent=2, ensure_ascii=False)
        if len(output) > 10_000:
            output = output[:10_000] + f"\n... (truncated, {len(results)} matches total)"
        return f"Filtered: {len(results)} of {len(data)} items match {field}='{value}'\n\n{output}"

    def _flatten(self, data: Any, prefix: str = "", sep: str = ".") -> str:
        flat = self._flatten_recursive(data, prefix, sep)
        if not flat:
            return "[json_parser] Nothing to flatten."
        lines = ["| Key | Value |", "| --- | --- |"]
        for k, v in list(flat.items())[:200]:
            lines.append(f"| {k} | {str(v)[:100]} |")
        if len(flat) > 200:
            lines.append(f"\n... ({len(flat) - 200} more)")
        return "\n".join(lines)

    def _flatten_recursive(self, data: Any, prefix: str, sep: str) -> dict[str, Any]:
        items: dict[str, Any] = {}
        if isinstance(data, dict):
            for k, v in data.items():
                new_key = f"{prefix}{sep}{k}" if prefix else k
                items.update(self._flatten_recursive(v, new_key, sep))
        elif isinstance(data, list):
            for i, v in enumerate(data[:50]):
                new_key = f"{prefix}[{i}]"
                items.update(self._flatten_recursive(v, new_key, sep))
        else:
            items[prefix] = data
        return items

    def _to_csv(self, data: Any) -> str:
        if not isinstance(data, list):
            return "[json_parser] to_csv requires a JSON array of objects."
        if not data or not isinstance(data[0], dict):
            return "[json_parser] Array items must be objects."

        # Collect all keys
        all_keys: list[str] = []
        seen: set[str] = set()
        for item in data:
            if isinstance(item, dict):
                for k in item.keys():
                    if k not in seen:
                        all_keys.append(k)
                        seen.add(k)

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=all_keys)
        writer.writeheader()
        for item in data[:500]:
            if isinstance(item, dict):
                writer.writerow({k: str(item.get(k, "")) for k in all_keys})

        result = output.getvalue()
        if len(data) > 500:
            result += f"\n... ({len(data) - 500} more rows)"
        return result
