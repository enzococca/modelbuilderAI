"""QGIS Project tool — parse .qgs/.qgz project files without QGIS dependency."""

from __future__ import annotations

import json
import os
import zipfile
import xml.etree.ElementTree as ET
from typing import Any

from tools import BaseTool


class QGISProjectTool(BaseTool):
    """Parse QGIS project files (.qgs/.qgz) to extract layers, metadata, plugins, styles."""

    name = "qgis_project"
    description = "Parse QGIS projects: list layers, project info, plugins, styles (no QGIS needed)"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        operation = kwargs.get("operation", "list_layers") or "list_layers"
        project_path = kwargs.get("project_path", "") or input_text.strip()

        if not project_path:
            return "[qgis_project] Project path required (input text or project_path config)."

        if not os.path.isfile(project_path):
            return f"[qgis_project] File not found: {project_path}"

        ext = os.path.splitext(project_path)[1].lower()
        if ext not in (".qgs", ".qgz"):
            return f"[qgis_project] Unsupported format: {ext}. Expected .qgs or .qgz"

        try:
            root = self._parse_project(project_path, ext)
        except Exception as e:
            return f"[qgis_project] Error parsing project: {e}"

        if operation == "list_layers":
            return self._list_layers(root, project_path)
        if operation == "project_info":
            return self._project_info(root, project_path)
        if operation == "list_plugins":
            return self._list_plugins(root)
        if operation == "read_style":
            layer_name = kwargs.get("layer_name", "") or ""
            return self._read_style(root, layer_name)

        return f"[qgis_project] Unknown operation: {operation}"

    def _parse_project(self, path: str, ext: str) -> ET.Element:
        """Parse .qgs (XML) or .qgz (ZIP containing .qgs) and return root element."""
        if ext == ".qgz":
            with zipfile.ZipFile(path, "r") as zf:
                qgs_names = [n for n in zf.namelist() if n.endswith(".qgs")]
                if not qgs_names:
                    raise ValueError("No .qgs file found inside .qgz archive")
                with zf.open(qgs_names[0]) as f:
                    tree = ET.parse(f)
        else:
            tree = ET.parse(path)
        return tree.getroot()

    def _list_layers(self, root: ET.Element, project_path: str) -> str:
        """List all layers in the project."""
        layers = root.findall(".//maplayer")
        if not layers:
            # Try alternative path
            layers = root.findall(".//projectlayers/maplayer")

        if not layers:
            return f"No layers found in {os.path.basename(project_path)}"

        lines = [f"**{os.path.basename(project_path)}** — {len(layers)} layers:", ""]
        lines.append("| # | Name | Type | Geometry | Source |")
        lines.append("| --- | --- | --- | --- | --- |")

        for i, layer in enumerate(layers, 1):
            name = self._get_text(layer, "layername", f"layer_{i}")
            layer_type = layer.get("type", "?")
            geom = layer.get("geometry", "")
            # Get datasource (truncated)
            ds_elem = layer.find("datasource")
            source = ds_elem.text[:80] if ds_elem is not None and ds_elem.text else "?"
            lines.append(f"| {i} | {name} | {layer_type} | {geom} | {source} |")

        return "\n".join(lines)

    def _project_info(self, root: ET.Element, project_path: str) -> str:
        """Extract project metadata."""
        info: dict[str, Any] = {
            "file": os.path.basename(project_path),
            "size": f"{os.path.getsize(project_path) / 1024:.1f} KB",
        }

        # QGIS version
        info["qgis_version"] = root.get("version", "?")
        info["project_version"] = root.get("projectVersion", root.get("version", "?"))

        # Title
        title_elem = root.find(".//title")
        if title_elem is not None and title_elem.text:
            info["title"] = title_elem.text

        # CRS
        crs_elem = root.find(".//projectCrs/spatialrefsys/authid")
        if crs_elem is not None and crs_elem.text:
            info["crs"] = crs_elem.text

        # Layer count
        layers = root.findall(".//maplayer")
        info["layer_count"] = len(layers)

        # Layer types breakdown
        type_counts: dict[str, int] = {}
        for layer in layers:
            lt = layer.get("type", "unknown")
            type_counts[lt] = type_counts.get(lt, 0) + 1
        info["layer_types"] = type_counts

        # Canvas extent
        extent_elem = root.find(".//mapcanvas/extent")
        if extent_elem is not None:
            xmin = self._get_text(extent_elem, "xmin", "?")
            ymin = self._get_text(extent_elem, "ymin", "?")
            xmax = self._get_text(extent_elem, "xmax", "?")
            ymax = self._get_text(extent_elem, "ymax", "?")
            info["extent"] = f"({xmin}, {ymin}) - ({xmax}, {ymax})"

        return json.dumps(info, indent=2, ensure_ascii=False)

    def _list_plugins(self, root: ET.Element) -> str:
        """List plugins referenced in the project."""
        # QGIS stores plugin info in different ways
        plugins = set()

        # Check for plugin layers
        for layer in root.findall(".//maplayer"):
            provider = self._get_text(layer, "provider", "")
            if provider and provider not in ("ogr", "gdal", "postgres", "spatialite", "wms", "wfs", "delimitedtext"):
                plugins.add(provider)

        # Check for plugin macros
        macros = root.find(".//projectlayers/../Macros")
        if macros is not None:
            for macro in macros:
                if macro.text and "import" in (macro.text or ""):
                    plugins.add(f"macro:{macro.tag}")

        # Check for plugins in properties
        props = root.find(".//properties/Plugins")
        if props is not None:
            for child in props:
                if child.text and child.text.lower() == "true":
                    plugins.add(child.tag)

        if not plugins:
            return "No plugins detected in this project."

        lines = [f"**{len(plugins)} plugins/providers detected:**", ""]
        for p in sorted(plugins):
            lines.append(f"- {p}")
        return "\n".join(lines)

    def _read_style(self, root: ET.Element, layer_name: str) -> str:
        """Read the style/renderer for a specific layer."""
        layers = root.findall(".//maplayer")

        if layer_name:
            # Find specific layer
            target = None
            for layer in layers:
                name = self._get_text(layer, "layername", "")
                if name.lower() == layer_name.lower():
                    target = layer
                    break
            if target is None:
                return f"[qgis_project] Layer '{layer_name}' not found."
            return self._extract_style(target, layer_name)
        else:
            # Return style summary for all layers
            if not layers:
                return "No layers found."

            lines = ["**Layer styles:**", ""]
            for layer in layers[:20]:
                name = self._get_text(layer, "layername", "?")
                renderer = layer.find(".//renderer-v2")
                if renderer is not None:
                    rtype = renderer.get("type", "?")
                    symbol_count = len(renderer.findall(".//symbol"))
                    lines.append(f"- **{name}**: renderer={rtype}, symbols={symbol_count}")
                else:
                    lines.append(f"- **{name}**: no renderer info")
            return "\n".join(lines)

    def _extract_style(self, layer: ET.Element, name: str) -> str:
        """Extract detailed style info from a layer element."""
        renderer = layer.find(".//renderer-v2")
        if renderer is None:
            return f"No style/renderer found for layer '{name}'."

        info: dict[str, Any] = {
            "layer": name,
            "renderer_type": renderer.get("type", "?"),
            "attribute": renderer.get("attr", ""),
        }

        # Extract symbols
        symbols = []
        for sym in renderer.findall(".//symbol"):
            sym_info: dict[str, Any] = {
                "name": sym.get("name", ""),
                "type": sym.get("type", ""),
            }
            # Get first layer's properties
            sl = sym.find("layer")
            if sl is not None:
                props = {}
                for prop in sl.findall("prop"):
                    props[prop.get("k", "")] = prop.get("v", "")
                sym_info["properties"] = props
            symbols.append(sym_info)
        info["symbols"] = symbols

        return json.dumps(info, indent=2, ensure_ascii=False)

    @staticmethod
    def _get_text(element: ET.Element, tag: str, default: str = "") -> str:
        """Get text content of a child element."""
        child = element.find(tag)
        if child is not None and child.text:
            return child.text
        return default
