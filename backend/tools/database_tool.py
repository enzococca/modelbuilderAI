"""Multi-database query execution tool — SQLite, PostgreSQL, MySQL, MongoDB."""

from __future__ import annotations

import asyncio
import re
import sqlite3
from typing import Any

from tools import BaseTool


class DatabaseTool(BaseTool):
    """Execute read-only queries against SQLite, PostgreSQL, MySQL, or MongoDB."""

    name = "database_tool"
    description = "Execute read-only database queries (SQLite, PostgreSQL, MySQL, MongoDB)"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        connection_string = kwargs.get("connection_string", "")
        db_type = kwargs.get("db_type", "") or self._detect_db_type(connection_string)
        # Prefer explicit query from workflow config (queryTemplate), fall back to input_text
        raw_query = kwargs.get("query", "") or input_text
        query = self._extract_query(raw_query)

        if not query.strip():
            return "No query provided."

        try:
            if db_type == "mongodb":
                return await self._execute_mongodb(connection_string, query)

            # SQL safety: only allow SELECT
            normalized = query.strip().upper()
            if not normalized.startswith("SELECT"):
                return "Only SELECT queries are allowed for safety."

            if db_type == "postgresql":
                return await self._execute_postgresql(connection_string, query)
            elif db_type == "mysql":
                return await self._execute_mysql(connection_string, query)
            else:
                # Default: SQLite
                db_path = kwargs.get("db_path", "") or connection_string or "data/db/gennaro.db"
                return await asyncio.get_event_loop().run_in_executor(
                    None, self._execute_sqlite, db_path, query
                )
        except Exception as e:
            return f"Query error: {e}"

    @staticmethod
    def _detect_db_type(conn_str: str) -> str:
        """Auto-detect database type from connection string prefix."""
        c = conn_str.lower()
        if c.startswith("postgresql://") or c.startswith("postgres://"):
            return "postgresql"
        if c.startswith("mysql://") or c.startswith("mysql+"):
            return "mysql"
        if c.startswith("mongodb://") or c.startswith("mongodb+srv://"):
            return "mongodb"
        return "sqlite"

    def _extract_query(self, text: str) -> str:
        """Extract SQL/query from markdown code blocks if present."""
        match = re.search(r'```(?:sql|mongo|js)?\s*\n(.*?)```', text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return text.strip()

    @staticmethod
    def _format_table(columns: list[str], rows: list[tuple]) -> str:
        """Format query results as a markdown table."""
        if not columns:
            return "Query executed, no results."
        lines = ["| " + " | ".join(str(c) for c in columns) + " |"]
        lines.append("| " + " | ".join(["---"] * len(columns)) + " |")
        for row in rows[:100]:
            lines.append("| " + " | ".join(str(v) for v in row) + " |")
        if len(rows) > 100:
            lines.append(f"\n... (showing first 100 of {len(rows)} rows)")
        return "\n".join(lines)

    # ── SQLite ────────────────────────────────────────────────

    def _execute_sqlite(self, db_path: str, query: str) -> str:
        # Strip SQLAlchemy prefix if present
        path = db_path.replace("sqlite:///", "").replace("sqlite://", "")
        conn = sqlite3.connect(path)
        try:
            cursor = conn.execute(query)
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchmany(101)
            return self._format_table(columns, rows)
        finally:
            conn.close()

    # ── PostgreSQL ────────────────────────────────────────────

    async def _execute_postgresql(self, conn_str: str, query: str) -> str:
        try:
            import asyncpg
        except ImportError:
            return "[Error] asyncpg not installed. Run: pip install asyncpg"

        conn = await asyncpg.connect(conn_str)
        try:
            rows = await conn.fetch(query)
            if not rows:
                return "Query executed, no results."
            columns = list(rows[0].keys())
            data = [tuple(r[c] for c in columns) for r in rows[:100]]
            result = self._format_table(columns, data)
            if len(rows) > 100:
                result += f"\n... (showing first 100 of {len(rows)}+ rows)"
            return result
        finally:
            await conn.close()

    # ── MySQL ─────────────────────────────────────────────────

    async def _execute_mysql(self, conn_str: str, query: str) -> str:
        try:
            import aiomysql
        except ImportError:
            return "[Error] aiomysql not installed. Run: pip install aiomysql"

        # Parse mysql://user:pass@host:port/db
        match = re.match(
            r"mysql(?:\+\w+)?://(?P<user>[^:]+):(?P<pass>[^@]+)@(?P<host>[^:/]+)(?::(?P<port>\d+))?/(?P<db>.+)",
            conn_str,
        )
        if not match:
            return "[Error] Invalid MySQL connection string. Format: mysql://user:pass@host:port/db"

        conn = await aiomysql.connect(
            host=match.group("host"),
            port=int(match.group("port") or 3306),
            user=match.group("user"),
            password=match.group("pass"),
            db=match.group("db"),
        )
        try:
            async with conn.cursor() as cur:
                await cur.execute(query)
                columns = [d[0] for d in cur.description] if cur.description else []
                rows = await cur.fetchmany(101)
                return self._format_table(columns, list(rows))
        finally:
            conn.close()

    # ── MongoDB ───────────────────────────────────────────────

    async def _execute_mongodb(self, conn_str: str, query: str) -> str:
        """Execute a MongoDB read query. Format: db.collection.find({...})"""
        try:
            import motor.motor_asyncio
        except ImportError:
            return "[Error] motor not installed. Run: pip install motor"

        if not conn_str:
            return "[Error] MongoDB connection string required."

        # Parse query: db.collection.find({...}) or db.collection.aggregate([...])
        match = re.match(r"db\.(\w+)\.(find|aggregate|count_documents)\((.*)?\)", query.strip(), re.DOTALL)
        if not match:
            return "[Error] MongoDB query format: db.collection.find({...}) or db.collection.aggregate([...])"

        import json
        collection_name = match.group(1)
        operation = match.group(2)
        args_str = (match.group(3) or "").strip()

        client = motor.motor_asyncio.AsyncIOMotorClient(conn_str)
        # Extract database name from connection string
        db_name = conn_str.rsplit("/", 1)[-1].split("?")[0] if "/" in conn_str else "test"
        db = client[db_name]
        collection = db[collection_name]

        try:
            if operation == "count_documents":
                filter_doc = json.loads(args_str) if args_str else {}
                count = await collection.count_documents(filter_doc)
                return f"Count: {count}"

            if operation == "aggregate":
                pipeline = json.loads(args_str) if args_str else []
                docs = await collection.aggregate(pipeline).to_list(100)
            else:
                filter_doc = json.loads(args_str) if args_str else {}
                docs = await collection.find(filter_doc).to_list(100)

            if not docs:
                return "Query executed, no results."

            # Format as markdown table using keys from first document
            all_keys: list[str] = []
            for doc in docs:
                for k in doc:
                    if k not in all_keys:
                        all_keys.append(k)

            rows = [tuple(str(doc.get(k, "")) for k in all_keys) for doc in docs]
            return self._format_table(all_keys, rows)
        finally:
            client.close()
