"""File upload storage and text extraction."""

from __future__ import annotations

import uuid
from pathlib import Path

import aiofiles

from config import settings


async def save_upload(filename: str, content: bytes, project_id: str | None = None) -> str:
    """Save uploaded file bytes to disk and return the storage path."""
    ext = Path(filename).suffix
    unique = f"{uuid.uuid4().hex}{ext}"
    sub = project_id or "_general"
    dest_dir = Path(settings.upload_path) / sub
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / unique
    async with aiofiles.open(dest, "wb") as f:
        await f.write(content)
    return str(dest)


def extract_text(path: str) -> str:
    """Extract plain text from a file for indexing."""
    p = Path(path)
    suffix = p.suffix.lower()

    if suffix == ".pdf":
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(str(p))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return ""

    if suffix == ".docx":
        try:
            from docx import Document
            doc = Document(str(p))
            return "\n".join(para.text for para in doc.paragraphs)
        except Exception:
            return ""

    if suffix in (".txt", ".md", ".csv", ".json", ".py", ".js", ".ts"):
        return p.read_text(errors="replace")

    return ""
