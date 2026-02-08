"""File manager tool — create folders, write/read files, copy, move, delete, list."""

from __future__ import annotations

import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from tools import BaseTool


class FileManagerTool(BaseTool):
    """Manage local files: create folders, write/read, copy, move, delete, list."""

    name = "file_manager"
    description = "Manage local files: create folders, write/read files, copy, move, delete, list directory"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        operation = kwargs.get("operation", "list")
        base_dir = kwargs.get("base_dir", "")
        confirm = kwargs.get("confirm", False)
        destination = kwargs.get("destination", "")
        content_source = kwargs.get("content_source", "input")

        # Also check global config base_dir
        if not base_dir:
            try:
                from config import settings
                base_dir = getattr(settings, "file_manager_base_dir", "")
            except Exception:
                pass

        target = input_text.strip()

        # Sandbox enforcement
        if base_dir:
            base = Path(base_dir).resolve()
            if target:
                resolved = (base / target).resolve()
                if not str(resolved).startswith(str(base)):
                    return f"[file_manager] Path traversal blocked: {target} is outside base dir {base_dir}"
                target = str(resolved)
            if destination:
                dest_resolved = (base / destination).resolve()
                if not str(dest_resolved).startswith(str(base)):
                    return f"[file_manager] Path traversal blocked: destination is outside base dir {base_dir}"
                destination = str(dest_resolved)

        if operation == "list":
            return self._list_dir(target or ".")
        if operation == "create_folder":
            # Prefer destination config, then target if it looks like a path,
            # then auto-generate a short name from input content
            folder_path = destination or (target if self._looks_like_path(target) else "")
            if not folder_path:
                folder_path = f"./output/{self._auto_slug(input_text)}"
            return self._create_folder(folder_path)
        if operation == "write_file":
            # Content comes from input, path from destination
            content = input_text if content_source == "input" else ""
            file_path = destination or kwargs.get("file_path", "")
            if not file_path:
                if target and self._looks_like_path(target):
                    file_path = target
            if not file_path:
                # Auto-generate a filename from content
                slug = self._auto_slug(input_text)
                file_path = f"./output/{slug}.md"
            return self._write_file(file_path, content)
        if operation == "read_file":
            return self._read_file(target)
        if operation == "copy":
            return self._copy(target, destination)
        if operation == "move":
            return self._move(target, destination)
        if operation == "delete":
            return self._delete(target, confirm)
        if operation == "info":
            return self._info(target)

        return f"[file_manager] Unknown operation: {operation}"

    def _list_dir(self, path: str) -> str:
        """List directory contents as a markdown table."""
        p = Path(path)
        if not p.exists():
            return f"[file_manager] Directory not found: {path}"
        if not p.is_dir():
            return f"[file_manager] Not a directory: {path}"

        entries = sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))
        if not entries:
            return f"Directory `{path}` is empty."

        lines = [
            f"Contents of `{p.resolve()}` ({len(entries)} items)\n",
            "| Type | Name | Size | Modified |",
            "| --- | --- | --- | --- |",
        ]

        for entry in entries[:200]:
            try:
                stat = entry.stat()
                etype = "DIR" if entry.is_dir() else "FILE"
                size = self._format_size(stat.st_size) if entry.is_file() else "-"
                mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
                lines.append(f"| {etype} | {entry.name} | {size} | {mtime} |")
            except OSError:
                lines.append(f"| ? | {entry.name} | - | - |")

        if len(entries) > 200:
            lines.append(f"\n... ({len(entries) - 200} more entries)")

        return "\n".join(lines)

    def _create_folder(self, path: str) -> str:
        """Create a directory (with parents)."""
        if not path:
            return "[file_manager] No path provided for create_folder."
        p = Path(path)
        try:
            p.mkdir(parents=True, exist_ok=True)
            return f"Directory created: `{p.resolve()}`"
        except OSError as e:
            return f"[file_manager] Error creating directory: {e}"

    def _write_file(self, path: str, content: str) -> str:
        """Write content to a file."""
        if not path:
            return "[file_manager] No file path provided for write_file. Set destination in config."
        p = Path(path)
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content, encoding="utf-8")
            return f"File written: `{p.resolve()}` ({len(content)} chars, {self._format_size(len(content.encode('utf-8')))})"
        except OSError as e:
            return f"[file_manager] Error writing file: {e}"

    def _read_file(self, path: str) -> str:
        """Read content of a file."""
        if not path:
            return "[file_manager] No path provided for read_file."
        p = Path(path)
        if not p.exists():
            return f"[file_manager] File not found: {path}"
        if not p.is_file():
            return f"[file_manager] Not a file: {path}"
        try:
            content = p.read_text(encoding="utf-8", errors="replace")
            if len(content) > 50_000:
                content = content[:50_000] + f"\n\n... (truncated, {len(content)} total chars)"
            return content
        except OSError as e:
            return f"[file_manager] Error reading file: {e}"

    def _copy(self, source: str, destination: str) -> str:
        """Copy a file or directory."""
        if not source or not destination:
            return "[file_manager] Both source path (input) and destination are required for copy."
        src = Path(source)
        dst = Path(destination)
        if not src.exists():
            return f"[file_manager] Source not found: {source}"
        try:
            if src.is_dir():
                shutil.copytree(str(src), str(dst))
            else:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(str(src), str(dst))
            return f"Copied: `{src}` -> `{dst.resolve()}`"
        except OSError as e:
            return f"[file_manager] Error copying: {e}"

    def _move(self, source: str, destination: str) -> str:
        """Move/rename a file or directory."""
        if not source or not destination:
            return "[file_manager] Both source path (input) and destination are required for move."
        src = Path(source)
        dst = Path(destination)
        if not src.exists():
            return f"[file_manager] Source not found: {source}"
        try:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dst))
            return f"Moved: `{src}` -> `{dst.resolve()}`"
        except OSError as e:
            return f"[file_manager] Error moving: {e}"

    def _delete(self, path: str, confirm: bool) -> str:
        """Delete a file or directory (requires confirm=true)."""
        if not path:
            return "[file_manager] No path provided for delete."
        if not confirm:
            return f"[file_manager] Delete blocked: set confirm=true to delete `{path}`."
        p = Path(path)
        if not p.exists():
            return f"[file_manager] Path not found: {path}"
        try:
            if p.is_dir():
                shutil.rmtree(str(p))
                return f"Directory deleted: `{p.resolve()}`"
            else:
                p.unlink()
                return f"File deleted: `{p.resolve()}`"
        except OSError as e:
            return f"[file_manager] Error deleting: {e}"

    def _info(self, path: str) -> str:
        """Show file/directory metadata."""
        if not path:
            return "[file_manager] No path provided for info."
        p = Path(path)
        if not p.exists():
            return f"[file_manager] Path not found: {path}"
        try:
            stat = p.stat()
            etype = "Directory" if p.is_dir() else "File"
            lines = [
                f"**{etype}:** `{p.resolve()}`",
                f"**Name:** {p.name}",
                f"**Size:** {self._format_size(stat.st_size)}",
                f"**Modified:** {datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
                f"**Created:** {datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
                f"**Permissions:** {oct(stat.st_mode)[-3:]}",
            ]
            if p.is_file():
                lines.append(f"**Extension:** {p.suffix or '(none)'}")
            if p.is_dir():
                count = sum(1 for _ in p.iterdir())
                lines.append(f"**Items:** {count}")
            return "\n".join(lines)
        except OSError as e:
            return f"[file_manager] Error getting info: {e}"

    @staticmethod
    def _auto_slug(text: str) -> str:
        """Generate a short, filesystem-safe slug from input text.

        Takes the first few meaningful words and converts to a kebab-case slug.
        Falls back to a timestamp-based name if text is empty or non-alphanumeric.
        """
        # Take first 60 chars of the first line
        first_line = text.strip().split("\n")[0][:60] if text.strip() else ""
        # Remove markdown headers, special chars
        clean = re.sub(r'[#*`\[\](){}]', '', first_line)
        # Keep only alphanumeric, spaces, hyphens
        clean = re.sub(r'[^a-zA-Z0-9À-ÿ\s-]', '', clean).strip()
        # Take first 4 words
        words = clean.split()[:4]
        if not words:
            return datetime.now().strftime("output-%Y%m%d-%H%M%S")
        slug = "-".join(w.lower() for w in words)
        # Truncate to 50 chars max
        return slug[:50]

    @staticmethod
    def _looks_like_path(text: str) -> bool:
        """Check if text looks like a filesystem path rather than AI-generated content."""
        if not text or len(text) > 200:
            return False
        if "\n" in text:
            return False
        # Reject text that looks like natural language (multiple spaces, commas, sentences)
        if text.count(" ") > 5:
            return False
        if ", " in text or ". " in text:
            return False
        # Accept explicit paths
        if text.startswith(("/", "./", "../", "~/")):
            return True
        # Accept simple names (e.g. "my-folder", "output.txt") — no spaces or very few
        if " " not in text and len(text) < 150:
            return True
        return False

    @staticmethod
    def _format_size(size: int) -> str:
        """Format byte size to human-readable string."""
        for unit in ("B", "KB", "MB", "GB"):
            if size < 1024:
                return f"{size:.1f} {unit}" if unit != "B" else f"{size} B"
            size /= 1024
        return f"{size:.1f} TB"
