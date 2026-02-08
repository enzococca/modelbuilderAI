"""PyArchInit tool — query PyArchInit databases (SQLite/PostgreSQL) without QGIS dependency."""

from __future__ import annotations

import csv
import io
import os
import sqlite3
from typing import Any

from tools import BaseTool


# Known PyArchInit table structures
PYARCHINIT_TABLES = {
    "us_table": "Unita Stratigrafiche",
    "inventario_materiali_table": "Inventario Materiali",
    "pottery_table": "Ceramica",
    "sito_table": "Siti",
    "struttura_table": "Strutture",
    "tomba_table": "Tombe",
    "campioni_table": "Campioni",
    "individui_table": "Individui (antropologia)",
}

# Default query templates for each table
QUERY_MAP = {
    "query_us": ("us_table", "SELECT * FROM us_table"),
    "query_inventory": ("inventario_materiali_table", "SELECT * FROM inventario_materiali_table"),
    "query_pottery": ("pottery_table", "SELECT * FROM pottery_table"),
    "query_sites": ("sito_table", "SELECT * FROM sito_table"),
    "query_structures": ("struttura_table", "SELECT * FROM struttura_table"),
    "query_tombs": ("tomba_table", "SELECT * FROM tomba_table"),
    "query_samples": ("campioni_table", "SELECT * FROM campioni_table"),
}

DEFAULT_DB_PATHS = [
    os.path.expanduser("~/.pyarchinit/pyarchinit_DB_folder/pyarchinit_db.sqlite"),
    os.path.expanduser("~/pyarchinit_DB_folder/pyarchinit_db.sqlite"),
]


class PyArchInitTool(BaseTool):
    """Query PyArchInit archaeological databases directly (no QGIS dependency)."""

    name = "pyarchinit_tool"
    description = "Query PyArchInit DB: US, inventario, ceramica, siti, strutture, tombe, campioni"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        operation = kwargs.get("operation", "query_us") or "query_us"
        db_path = kwargs.get("db_path", "") or ""
        db_type = kwargs.get("db_type", "sqlite") or "sqlite"

        # Fallback to env config
        if not db_path:
            try:
                from config import settings
                db_path = settings.pyarchinit_db_path
            except Exception:
                pass

        # Auto-detect default paths
        if not db_path and db_type == "sqlite":
            for p in DEFAULT_DB_PATHS:
                if os.path.isfile(p):
                    db_path = p
                    break

        if not db_path:
            return "[pyarchinit] Database path required. Set in node config or PYARCHINIT_DB_PATH env."

        # Filters
        sito = kwargs.get("sito", "") or ""
        area = kwargs.get("area", "") or ""
        us = kwargs.get("us", "") or ""
        custom_query = kwargs.get("custom_query", "") or input_text.strip()

        if operation == "list_tables":
            return self._list_tables(db_path, db_type)
        if operation == "custom_query":
            return self._run_query(db_path, db_type, custom_query)
        if operation == "export_csv":
            return self._export_csv(db_path, db_type, custom_query, sito, area, us)
        if operation in QUERY_MAP:
            table, base_query = QUERY_MAP[operation]
            query = self._build_filtered_query(base_query, table, sito, area, us)
            return self._run_query(db_path, db_type, query)

        return f"[pyarchinit] Unknown operation: {operation}"

    def _build_filtered_query(self, base_query: str, table: str, sito: str, area: str, us: str) -> str:
        conditions = []
        if sito:
            conditions.append(f"sito = '{sito}'")
        if area:
            conditions.append(f"area = '{area}'")
        if us:
            conditions.append(f"us = '{us}'")

        if conditions:
            where = " AND ".join(conditions)
            return f"{base_query} WHERE {where} LIMIT 500"
        return f"{base_query} LIMIT 500"

    def _list_tables(self, db_path: str, db_type: str) -> str:
        if db_type == "sqlite":
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                tables = [row[0] for row in cursor.fetchall()]
                conn.close()

                lines = [f"**Database: {os.path.basename(db_path)}**", f"**{len(tables)} tables found:**", ""]
                for t in tables:
                    desc = PYARCHINIT_TABLES.get(t, "")
                    suffix = f" — {desc}" if desc else ""
                    lines.append(f"- `{t}`{suffix}")
                return "\n".join(lines)
            except Exception as e:
                return f"[pyarchinit] Error listing tables: {e}"
        elif db_type == "postgresql":
            return self._pg_list_tables(db_path)
        return f"[pyarchinit] Unsupported db_type: {db_type}"

    def _pg_list_tables(self, conn_string: str) -> str:
        try:
            import psycopg2
            conn = psycopg2.connect(conn_string)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' ORDER BY table_name
            """)
            tables = [row[0] for row in cursor.fetchall()]
            conn.close()

            lines = [f"**{len(tables)} tables found:**", ""]
            for t in tables:
                desc = PYARCHINIT_TABLES.get(t, "")
                suffix = f" — {desc}" if desc else ""
                lines.append(f"- `{t}`{suffix}")
            return "\n".join(lines)
        except ImportError:
            return "[pyarchinit] psycopg2 not installed. Install with: pip install psycopg2-binary"
        except Exception as e:
            return f"[pyarchinit] PostgreSQL error: {e}"

    def _run_query(self, db_path: str, db_type: str, query: str) -> str:
        if not query:
            return "[pyarchinit] No query provided."

        # Safety: only allow SELECT
        if not query.strip().upper().startswith("SELECT"):
            return "[pyarchinit] Only SELECT queries are allowed for safety."

        if db_type == "sqlite":
            return self._sqlite_query(db_path, query)
        elif db_type == "postgresql":
            return self._pg_query(db_path, query)
        return f"[pyarchinit] Unsupported db_type: {db_type}"

    def _sqlite_query(self, db_path: str, query: str) -> str:
        try:
            if not os.path.isfile(db_path):
                return f"[pyarchinit] Database file not found: {db_path}"

            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(query)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            conn.close()

            if not rows:
                return f"Query returned 0 rows.\n\nQuery: `{query}`"

            # Format as markdown table
            lines = [f"**{len(rows)} rows** | Columns: {', '.join(columns)}", ""]
            # Header
            lines.append("| " + " | ".join(columns) + " |")
            lines.append("| " + " | ".join(["---"] * len(columns)) + " |")
            # Rows (limit to 50 for display)
            for row in rows[:50]:
                vals = [str(row[c])[:60] if row[c] is not None else "" for c in columns]
                lines.append("| " + " | ".join(vals) + " |")

            if len(rows) > 50:
                lines.append(f"\n... ({len(rows) - 50} more rows)")

            return "\n".join(lines)
        except Exception as e:
            return f"[pyarchinit] SQLite query error: {e}"

    def _pg_query(self, conn_string: str, query: str) -> str:
        try:
            import psycopg2
            conn = psycopg2.connect(conn_string)
            cursor = conn.cursor()
            cursor.execute(query)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            conn.close()

            if not rows:
                return f"Query returned 0 rows.\n\nQuery: `{query}`"

            lines = [f"**{len(rows)} rows** | Columns: {', '.join(columns)}", ""]
            lines.append("| " + " | ".join(columns) + " |")
            lines.append("| " + " | ".join(["---"] * len(columns)) + " |")
            for row in rows[:50]:
                vals = [str(v)[:60] if v is not None else "" for v in row]
                lines.append("| " + " | ".join(vals) + " |")

            if len(rows) > 50:
                lines.append(f"\n... ({len(rows) - 50} more rows)")

            return "\n".join(lines)
        except ImportError:
            return "[pyarchinit] psycopg2 not installed. Install with: pip install psycopg2-binary"
        except Exception as e:
            return f"[pyarchinit] PostgreSQL query error: {e}"

    def _export_csv(self, db_path: str, db_type: str, query: str, sito: str, area: str, us: str) -> str:
        """Export query results as CSV text."""
        if not query or not query.strip().upper().startswith("SELECT"):
            # Default: export us_table
            query = self._build_filtered_query("SELECT * FROM us_table", "us_table", sito, area, us)

        if db_type == "sqlite":
            try:
                if not os.path.isfile(db_path):
                    return f"[pyarchinit] Database file not found: {db_path}"

                conn = sqlite3.connect(db_path)
                cursor = conn.execute(query)
                columns = [desc[0] for desc in cursor.description] if cursor.description else []
                rows = cursor.fetchall()
                conn.close()

                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerow(columns)
                writer.writerows(rows)
                csv_text = output.getvalue()

                return f"```csv\n{csv_text}```\n\n**{len(rows)} rows exported.**"
            except Exception as e:
                return f"[pyarchinit] CSV export error: {e}"

        return "[pyarchinit] CSV export only supports SQLite currently."
