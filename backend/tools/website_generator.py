"""Website generator tool — creates HTML/CSS/JS projects as ZIP."""

from __future__ import annotations

import io
import json
import re
import zipfile
from typing import Any

from tools import BaseTool


class WebsiteGeneratorTool(BaseTool):
    """Generate complete website projects from HTML/CSS/JS content."""

    name = "website_generator"
    description = "Generate a website project (HTML, CSS, JS) packaged as a ZIP file"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        """Parse input for HTML/CSS/JS blocks and generate a website ZIP.

        Input can be:
        - A single HTML string (auto-wrapped)
        - Structured JSON with files: {"index.html": "...", "style.css": "...", "script.js": "..."}
        - Markdown with code blocks labeled ```html, ```css, ```js
        """
        files = self._parse_files(input_text)

        if not files:
            return "No HTML/CSS/JS content found. Provide HTML content, code blocks, or a JSON file map."

        # Ensure index.html exists
        if "index.html" not in files:
            # If there's any HTML, use it as index
            html_files = [k for k in files if k.endswith('.html')]
            if html_files:
                files["index.html"] = files.pop(html_files[0])
            else:
                # Wrap everything into a basic page
                files["index.html"] = self._wrap_html(files)

        # Create ZIP in memory
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for fname, content in files.items():
                zf.writestr(fname, content)

        import base64
        zip_b64 = base64.b64encode(buf.getvalue()).decode()

        # Also save to data/websites/
        from pathlib import Path
        out_dir = Path("data/websites")
        out_dir.mkdir(parents=True, exist_ok=True)

        import hashlib
        site_id = hashlib.md5(input_text[:500].encode()).hexdigest()[:8]
        zip_path = out_dir / f"site_{site_id}.zip"
        zip_path.write_bytes(buf.getvalue())

        # Build preview of files
        file_list = "\n".join(f"  - {name} ({len(content)} bytes)" for name, content in files.items())

        # Build a self-contained HTML for live preview (inline CSS and JS)
        preview_html = self._build_preview(files)

        return (
            f"Website generated with {len(files)} file(s):\n{file_list}\n\n"
            f"Saved to: {zip_path}\n\n"
            "```artifact\n"
            + json.dumps({"type": "html", "name": "website_preview.html", "data": preview_html})
            + "\n```"
        )

    def _parse_files(self, text: str) -> dict[str, str]:
        """Extract files from various input formats."""
        # Try JSON format first
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                return {k: v for k, v in data.items() if isinstance(v, str)}
        except (json.JSONDecodeError, TypeError):
            pass

        files: dict[str, str] = {}

        # Extract from code blocks: ```html ... ```, ```css ... ```, ```js ... ```
        blocks = re.findall(
            r'```(html|css|javascript|js)\s*\n(.*?)```',
            text, re.DOTALL | re.IGNORECASE,
        )

        for lang, content in blocks:
            lang = lang.lower()
            if lang == 'html':
                files["index.html"] = content.strip()
            elif lang == 'css':
                files["style.css"] = content.strip()
            elif lang in ('js', 'javascript'):
                files["script.js"] = content.strip()

        # If no code blocks, treat as raw HTML
        if not files and ('<html' in text.lower() or '<div' in text.lower() or '<body' in text.lower()):
            files["index.html"] = text.strip()

        return files

    @staticmethod
    def _build_preview(files: dict[str, str]) -> str:
        """Build a self-contained HTML page with CSS/JS inlined for iframe preview."""
        html = files.get("index.html", "")
        css = files.get("style.css", "")
        js = files.get("script.js", "")

        if not html:
            return "<html><body><p>No HTML content generated.</p></body></html>"

        # If HTML already has <link> to style.css, replace with inline <style>
        if css:
            import re as _re
            # Remove external CSS link
            html = _re.sub(
                r'<link[^>]*href=["\']style\.css["\'][^>]*/?>',
                f"<style>\n{css}\n</style>",
                html,
                flags=_re.IGNORECASE,
            )
            # If no link was found, inject before </head>
            if "<style>" not in html and "</head>" in html:
                html = html.replace("</head>", f"<style>\n{css}\n</style>\n</head>")

        # If HTML has <script src="script.js">, replace with inline
        if js:
            import re as _re
            html = _re.sub(
                r'<script[^>]*src=["\']script\.js["\'][^>]*>\s*</script>',
                f"<script>\n{js}\n</script>",
                html,
                flags=_re.IGNORECASE,
            )
            # If no script tag was found, inject before </body>
            if f"<script>\n{js}" not in html and "</body>" in html:
                html = html.replace("</body>", f"<script>\n{js}\n</script>\n</body>")

        return html

    def _wrap_html(self, files: dict[str, str]) -> str:
        """Create a basic HTML page linking CSS and JS files."""
        css_link = '<link rel="stylesheet" href="style.css">' if "style.css" in files else ""
        js_link = '<script src="script.js"></script>' if "script.js" in files else ""

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Site</title>
    {css_link}
</head>
<body>
    <div id="app"></div>
    {js_link}
</body>
</html>"""
