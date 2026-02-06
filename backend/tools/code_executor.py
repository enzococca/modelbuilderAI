"""Sandboxed Python code execution tool with artifact support."""

from __future__ import annotations

import asyncio
import base64
import io
import json
import os
import sys
import tempfile
import traceback
from pathlib import Path
from typing import Any

from tools import BaseTool


class CodeExecutorTool(BaseTool):
    """Execute Python code in a restricted sandbox with artifact output."""

    name = "code_executor"
    description = "Execute Python code in a sandboxed environment with support for data science libraries and artifact generation"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        timeout = kwargs.get("timeout", 60)
        code = self._extract_code(input_text)
        if not code.strip():
            return "No code to execute."

        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(self._run_sandboxed, code),
                timeout=timeout,
            )
            return result
        except asyncio.TimeoutError:
            return f"Execution timed out after {timeout}s"
        except Exception as e:
            return f"Execution error: {e}"

    def _extract_code(self, text: str) -> str:
        """Extract code from markdown code blocks if present."""
        import re
        match = re.search(r'```(?:python)?\s*\n(.*?)```', text, re.DOTALL)
        if match:
            return match.group(1)
        return text

    def _run_sandboxed(self, code: str) -> str:
        """Execute code with captured stdout/stderr and artifact detection."""
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        # Create temp dir for artifacts
        tmpdir = tempfile.mkdtemp(prefix="gennaro_exec_")

        # Restricted built-ins (allow open for file writes to tmpdir)
        raw_builtins = __builtins__.__dict__ if isinstance(__builtins__, type(sys)) else __builtins__
        safe_builtins = {
            k: v for k, v in raw_builtins.items()
            if k not in ('exec', 'eval', 'compile', '__import__',
                         'breakpoint', 'exit', 'quit')
        }

        # Restricted open: only allow writing inside tmpdir
        original_open = raw_builtins.get('open', open)

        def safe_open(file, mode='r', *args, **kwargs):
            path = os.path.abspath(str(file))
            if 'w' in mode or 'a' in mode or 'x' in mode:
                if not path.startswith(tmpdir):
                    raise PermissionError(f"Writing outside sandbox is not allowed")
            return original_open(file, mode, *args, **kwargs)

        safe_builtins['open'] = safe_open

        # Expanded allowed modules
        allowed_modules = {
            'math', 'json', 'datetime', 'collections', 'itertools',
            'functools', 'string', 're', 'random', 'statistics',
            'decimal', 'fractions', 'operator', 'textwrap',
            # Data science / ML
            'numpy', 'pandas', 'matplotlib', 'matplotlib.pyplot',
            'sklearn', 'scipy', 'PIL', 'csv', 'io', 'base64',
            'hashlib', 'struct', 'copy', 'dataclasses',
            'pathlib', 'tempfile', 'os.path',
        }

        # Allow submodule imports (e.g. sklearn.linear_model)
        allowed_prefixes = {
            'numpy', 'pandas', 'matplotlib', 'sklearn',
            'scipy', 'PIL', 'collections', 'datetime',
        }

        original_import = raw_builtins.get('__import__', __import__)

        def safe_import(name, *args, **kwargs):
            top = name.split('.')[0]
            if name in allowed_modules or top in allowed_prefixes:
                return original_import(name, *args, **kwargs)
            raise ImportError(f"Import of '{name}' is not allowed in sandbox")

        safe_builtins['__import__'] = safe_import

        namespace = {"__builtins__": safe_builtins, "__artifact_dir__": tmpdir}

        # Set matplotlib to non-interactive backend
        try:
            import matplotlib
            matplotlib.use('Agg')
        except ImportError:
            pass

        old_stdout, old_stderr = sys.stdout, sys.stderr
        sys.stdout, sys.stderr = stdout_capture, stderr_capture

        try:
            exec(code, namespace)
        except Exception:
            traceback.print_exc(file=stderr_capture)
        finally:
            sys.stdout, sys.stderr = old_stdout, old_stderr

        output = stdout_capture.getvalue()
        errors = stderr_capture.getvalue()

        # Scan tmpdir for generated artifacts
        artifacts = self._scan_artifacts(tmpdir)

        parts = []
        if output:
            parts.append(f"Output:\n{output}")
        if errors:
            parts.append(f"Errors:\n{errors}")
        if artifacts:
            parts.append(f"Artifacts:\n{json.dumps(artifacts, indent=2)}")

        return "\n".join(parts) or "Code executed successfully (no output)."

    def _scan_artifacts(self, tmpdir: str) -> list[dict[str, str]]:
        """Scan temp directory for generated files and encode as base64."""
        artifacts = []
        for entry in Path(tmpdir).iterdir():
            if entry.is_file() and entry.stat().st_size > 0:
                suffix = entry.suffix.lower()
                if suffix in ('.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'):
                    mime = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
                            'gif': 'image/gif', 'svg': 'image/svg+xml', 'webp': 'image/webp'}
                    data = base64.b64encode(entry.read_bytes()).decode()
                    artifacts.append({
                        "name": entry.name,
                        "type": mime.get(suffix.lstrip('.'), 'application/octet-stream'),
                        "encoding": "base64",
                        "data": data[:100000],  # cap at ~75KB
                    })
                elif suffix in ('.csv', '.json', '.txt', '.md', '.html'):
                    text = entry.read_text(errors='replace')[:50000]
                    artifacts.append({
                        "name": entry.name,
                        "type": "text",
                        "data": text,
                    })
        return artifacts
