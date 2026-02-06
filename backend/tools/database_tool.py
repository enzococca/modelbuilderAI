"""SQL query execution tool."""

from __future__ import annotations

import sqlite3
from typing import Any

from tools import BaseTool


class DatabaseTool(BaseTool):
    """Execute SQL queries and return formatted results."""

    name = "database_tool"
    description = "Execute read-only SQL queries and return formatted results"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        db_path = kwargs.get("db_path", "data/db/gennaro.db")
        query = self._extract_query(input_text)
        if not query.strip():
            return "No SQL query provided."

        # Safety check — only allow SELECT
        normalized = query.strip().upper()
        if not normalized.startswith("SELECT"):
            return "Only SELECT queries are allowed for safety."

        try:
            return self._execute_query(db_path, query)
        except Exception as e:
            return f"Query error: {e}"

    def _extract_query(self, text: str) -> str:
        """Extract SQL from markdown code blocks if present."""
        import re
        match = re.search(r'```(?:sql)?\s*\n(.*?)```', text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return text.strip()

    def _execute_query(self, db_path: str, query: str) -> str:
        conn = sqlite3.connect(db_path)
        try:
            cursor = conn.execute(query)
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchmany(100)

            if not columns:
                return "Query executed, no results."

            # Format as markdown table
            lines = ["| " + " | ".join(columns) + " |"]
            lines.append("| " + " | ".join(["---"] * len(columns)) + " |")
            for row in rows:
                lines.append("| " + " | ".join(str(v) for v in row) + " |")

            total = cursor.fetchone()
            if total is not None:
                lines.append(f"\n... (more rows available, showing first 100)")

            return "\n".join(lines)
        finally:
            conn.close()
