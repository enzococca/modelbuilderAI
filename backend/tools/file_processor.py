"""Multi-format file processing tool."""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path
from typing import Any

from tools import BaseTool


class FileProcessorTool(BaseTool):
    """Parse and extract text from various file formats."""

    name = "file_processor"
    description = "Parse PDF, DOCX, CSV, JSON, and plain text files"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        """Input is either a file path or raw text content."""
        path = input_text.strip()
        p = Path(path)
        if p.exists() and p.is_file():
            return self._process_file(p)
        # Treat as raw text
        return f"Text content ({len(input_text)} characters):\n{input_text[:5000]}"

    def _process_file(self, path: Path) -> str:
        suffix = path.suffix.lower()

        if suffix == ".pdf":
            return self._process_pdf(path)
        if suffix == ".docx":
            return self._process_docx(path)
        if suffix == ".csv":
            return self._process_csv(path)
        if suffix == ".json":
            return self._process_json(path)
        if suffix in (".txt", ".md", ".py", ".js", ".ts", ".html", ".xml", ".yaml", ".yml"):
            return path.read_text(errors="replace")

        return f"Unsupported file format: {suffix}"

    def _process_pdf(self, path: Path) -> str:
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(str(path))
            pages = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    pages.append(f"--- Page {i + 1} ---\n{text}")
            return "\n\n".join(pages) if pages else "No text extracted from PDF."
        except ImportError:
            return "PyPDF2 not installed. Cannot process PDF files."
        except Exception as e:
            return f"PDF processing error: {e}"

    def _process_docx(self, path: Path) -> str:
        try:
            from docx import Document
            doc = Document(str(path))
            return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
        except ImportError:
            return "python-docx not installed. Cannot process DOCX files."
        except Exception as e:
            return f"DOCX processing error: {e}"

    def _process_csv(self, path: Path) -> str:
        try:
            text = path.read_text(errors="replace")
            reader = csv.reader(io.StringIO(text))
            rows = list(reader)
            if not rows:
                return "Empty CSV file."
            # Format as markdown table
            header = rows[0]
            lines = ["| " + " | ".join(header) + " |"]
            lines.append("| " + " | ".join(["---"] * len(header)) + " |")
            for row in rows[1:50]:  # limit to 50 rows
                lines.append("| " + " | ".join(row) + " |")
            if len(rows) > 51:
                lines.append(f"\n... ({len(rows) - 51} more rows)")
            return "\n".join(lines)
        except Exception as e:
            return f"CSV processing error: {e}"

    def _process_json(self, path: Path) -> str:
        try:
            data = json.loads(path.read_text(errors="replace"))
            formatted = json.dumps(data, indent=2, ensure_ascii=False)
            if len(formatted) > 10000:
                return formatted[:10000] + "\n... (truncated)"
            return formatted
        except Exception as e:
            return f"JSON processing error: {e}"
