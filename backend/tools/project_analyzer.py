"""Project analyzer tool — scan a software project directory and produce a structured report."""

from __future__ import annotations

import asyncio
import json
from collections import Counter
from pathlib import Path
from typing import Any

from tools import BaseTool

# Directories to always skip
IGNORE_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", ".idea", ".vscode",
    ".mypy_cache", ".pytest_cache", ".tox", ".eggs", "*.egg-info",
    "target", "out", "bin", "obj", ".gradle", ".cache",
    "coverage", ".nyc_output", ".turbo",
}

# File extensions to skip in tree
IGNORE_EXTENSIONS = {".pyc", ".pyo", ".class", ".o", ".so", ".dll", ".exe"}

# Key files to read (order matters — first found wins per category)
KEY_FILES: dict[str, list[str]] = {
    "readme": ["README.md", "README.rst", "README.txt", "README"],
    "python_deps": ["requirements.txt", "pyproject.toml", "setup.py", "setup.cfg", "Pipfile"],
    "node_deps": ["package.json"],
    "rust_deps": ["Cargo.toml"],
    "java_deps": ["pom.xml", "build.gradle", "build.gradle.kts"],
    "go_deps": ["go.mod"],
    "docker": ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"],
    "ci": [".github/workflows/ci.yml", ".gitlab-ci.yml", "Jenkinsfile"],
    "config_ts": ["tsconfig.json"],
    "config_vite": ["vite.config.ts", "vite.config.js"],
    "config_env": [".env.example", ".env.sample"],
    "entry_py": ["main.py", "app.py", "manage.py", "src/main.py", "backend/main.py"],
    "entry_js": ["index.js", "index.ts", "src/index.ts", "src/main.ts", "src/App.tsx", "src/app.ts"],
    "architecture": ["CLAUDE.md", "ARCHITECTURE.md", "CONTRIBUTING.md", "HACKING.md"],
}

# Project type detection
PROJECT_MARKERS: dict[str, str] = {
    "package.json": "Node.js / JavaScript",
    "requirements.txt": "Python",
    "pyproject.toml": "Python",
    "setup.py": "Python",
    "Cargo.toml": "Rust",
    "go.mod": "Go",
    "pom.xml": "Java (Maven)",
    "build.gradle": "Java (Gradle)",
    "build.gradle.kts": "Kotlin (Gradle)",
    "composer.json": "PHP",
    "Gemfile": "Ruby",
    "mix.exs": "Elixir",
    "pubspec.yaml": "Dart / Flutter",
    "CMakeLists.txt": "C/C++ (CMake)",
    "Makefile": "Make-based",
    "Dockerfile": "Docker",
}


class ProjectAnalyzerTool(BaseTool):
    """Analyze a software project directory: structure, languages, frameworks, key files."""

    name = "project_analyzer"
    description = (
        "Analyze a software project directory to understand its structure, "
        "technologies, dependencies, and key files. Returns a structured report."
    )

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        project_path = input_text.strip()
        if not project_path:
            return "Error: provide a project directory path as input."

        max_depth = int(kwargs.get("max_depth", 4))
        max_file_size = int(kwargs.get("max_file_size", 50000))
        max_files_read = int(kwargs.get("max_files_read", 20))

        root = Path(project_path)
        if not root.exists():
            return f"Error: directory '{project_path}' does not exist."
        if not root.is_dir():
            return f"Error: '{project_path}' is not a directory."

        return await asyncio.to_thread(
            self._analyze_sync, root, max_depth, max_file_size, max_files_read
        )

    @staticmethod
    def _analyze_sync(
        root: Path,
        max_depth: int,
        max_file_size: int,
        max_files_read: int,
    ) -> str:
        project_name = root.name
        sections: list[str] = []
        sections.append(f"# Project Analysis: {project_name}\n")

        # ── 1. Detect project types ────────────────────────
        detected_types: list[str] = []
        # Check root and immediate subdirectories (monorepo support)
        search_dirs = [root] + [d for d in root.iterdir() if d.is_dir() and not _should_ignore(d.relative_to(root))]
        for search_dir in search_dirs:
            for marker_file, ptype in PROJECT_MARKERS.items():
                if (search_dir / marker_file).exists():
                    loc = search_dir.relative_to(root) if search_dir != root else Path(".")
                    detected_types.append(f"{ptype} (`{loc}/{marker_file}`)")

        if detected_types:
            sections.append("## Project Type\n")
            for pt in dict.fromkeys(detected_types):
                sections.append(f"- {pt}")
            sections.append("")
        else:
            sections.append("## Project Type\n\nCould not detect project type automatically.\n")

        # ── 2. Directory tree ──────────────────────────────
        tree_lines = _build_tree(root, max_depth)
        sections.append("## Directory Structure\n")
        sections.append("```")
        sections.append("\n".join(tree_lines[:500]))  # cap at 500 lines
        if len(tree_lines) > 500:
            sections.append(f"... ({len(tree_lines) - 500} more entries)")
        sections.append("```\n")

        # ── 3. File statistics ─────────────────────────────
        ext_counter: Counter[str] = Counter()
        total_files = 0
        total_dirs = 0

        for p in root.rglob("*"):
            rel = p.relative_to(root)
            if _should_ignore(rel):
                continue
            if p.is_dir():
                total_dirs += 1
            elif p.is_file():
                total_files += 1
                ext = p.suffix.lower() or "(no extension)"
                ext_counter[ext] += 1

        sections.append("## File Statistics\n")
        sections.append(f"- Total files: {total_files}")
        sections.append(f"- Total directories: {total_dirs}\n")

        if ext_counter:
            sections.append("| Extension | Count |")
            sections.append("|-----------|-------|")
            for ext, count in ext_counter.most_common(20):
                sections.append(f"| {ext} | {count} |")
            sections.append("")

        # ── 4. Dependencies ────────────────────────────────
        deps_parts: list[str] = []
        for search_dir in search_dirs:
            dep = _extract_dependencies(search_dir)
            if dep:
                if search_dir != root:
                    prefix = str(search_dir.relative_to(root))
                    deps_parts.append(f"**{prefix}/**\n")
                deps_parts.append(dep)
        if deps_parts:
            sections.append("## Dependencies\n")
            sections.append("\n".join(deps_parts))
            sections.append("")

        # ── 5. Key files content ───────────────────────────
        files_read = 0
        sections.append("## Key Files Content\n")

        for category, candidates in KEY_FILES.items():
            if files_read >= max_files_read:
                break
            found = False
            # Search root first, then subdirectories
            for search_dir in search_dirs:
                if found:
                    break
                for fname in candidates:
                    fpath = search_dir / fname
                    if not fpath.exists() or not fpath.is_file():
                        continue
                    try:
                        size = fpath.stat().st_size
                        if size > max_file_size:
                            content = fpath.read_text(errors="replace")[:max_file_size]
                            content += f"\n\n... (truncated, file is {size} bytes)"
                        else:
                            content = fpath.read_text(errors="replace")

                        rel = fpath.relative_to(root)
                        sections.append(f"### {rel}\n")
                        sections.append(f"```\n{content}\n```\n")
                        files_read += 1
                        found = True
                    except Exception:
                        pass
                    break  # only first match per candidate in this dir

        if files_read == 0:
            sections.append("No key files found.\n")

        return "\n".join(sections)


# ── Helper functions ──────────────────────────────────────


def _should_ignore(rel_path: Path) -> bool:
    """Check if a relative path should be ignored."""
    for part in rel_path.parts:
        if part in IGNORE_DIRS:
            return True
        if part.startswith(".") and part not in (".", ".."):
            # Skip hidden dirs/files except some known ones
            if part not in (".github", ".gitlab", ".env.example", ".env.sample"):
                return True
    if rel_path.suffix.lower() in IGNORE_EXTENSIONS:
        return True
    return False


def _build_tree(root: Path, max_depth: int) -> list[str]:
    """Build an indented directory tree."""
    lines: list[str] = [root.name + "/"]

    def _walk(directory: Path, prefix: str, depth: int) -> None:
        if depth > max_depth:
            return

        try:
            entries = sorted(directory.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
        except PermissionError:
            return

        # Filter out ignored entries
        entries = [e for e in entries if not _should_ignore(e.relative_to(root))]

        for i, entry in enumerate(entries):
            is_last = i == len(entries) - 1
            connector = "└── " if is_last else "├── "
            display = entry.name + ("/" if entry.is_dir() else "")
            lines.append(f"{prefix}{connector}{display}")

            if entry.is_dir() and depth < max_depth:
                extension = "    " if is_last else "│   "
                _walk(entry, prefix + extension, depth + 1)

    _walk(root, "", 1)
    return lines


def _extract_dependencies(root: Path) -> str:
    """Extract dependency info from common config files."""
    parts: list[str] = []

    # Python requirements.txt
    req = root / "requirements.txt"
    if req.exists():
        try:
            lines = req.read_text(errors="replace").strip().splitlines()
            deps = [l.strip() for l in lines if l.strip() and not l.strip().startswith("#")]
            if deps:
                parts.append(f"**Python (requirements.txt):** {len(deps)} packages")
                for d in deps[:30]:
                    parts.append(f"  - {d}")
                if len(deps) > 30:
                    parts.append(f"  - ... ({len(deps) - 30} more)")
                parts.append("")
        except Exception:
            pass

    # Python pyproject.toml
    pyproj = root / "pyproject.toml"
    if pyproj.exists() and not req.exists():
        try:
            content = pyproj.read_text(errors="replace")
            parts.append(f"**Python (pyproject.toml):** see file content below\n")
        except Exception:
            pass

    # Node.js package.json
    pkg = root / "package.json"
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text(errors="replace"))
            deps_dict = data.get("dependencies", {})
            dev_deps = data.get("devDependencies", {})
            parts.append(f"**Node.js (package.json):** {len(deps_dict)} deps + {len(dev_deps)} devDeps")
            if data.get("name"):
                parts.append(f"  - Name: {data['name']}")
            if data.get("description"):
                parts.append(f"  - Description: {data['description']}")
            if data.get("scripts"):
                parts.append(f"  - Scripts: {', '.join(data['scripts'].keys())}")
            parts.append("  - Dependencies:")
            for name, ver in list(deps_dict.items())[:20]:
                parts.append(f"    - {name}: {ver}")
            if len(deps_dict) > 20:
                parts.append(f"    - ... ({len(deps_dict) - 20} more)")
            parts.append("")
        except Exception:
            pass

    # Rust Cargo.toml
    cargo = root / "Cargo.toml"
    if cargo.exists():
        try:
            content = cargo.read_text(errors="replace")
            dep_count = content.count("[dependencies]")
            parts.append(f"**Rust (Cargo.toml):** see file content below\n")
        except Exception:
            pass

    # Go go.mod
    gomod = root / "go.mod"
    if gomod.exists():
        try:
            content = gomod.read_text(errors="replace")
            parts.append(f"**Go (go.mod):** see file content below\n")
        except Exception:
            pass

    return "\n".join(parts)
