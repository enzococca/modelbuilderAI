"""GIS / Geospatial analysis tool.

Supports: shapefiles, geopackages, GeoTIFF, DEM rasters, vector analysis
(points, lines, polygons), raster analysis (elevation, slope, aspect),
and map output as PNG images.

Required: geopandas, rasterio, matplotlib, shapely, fiona
Optional: numpy, scipy (for DEM analysis)
"""

from __future__ import annotations

import base64
import io
import json
import os
import tempfile
from pathlib import Path
from typing import Any

from tools import BaseTool

OUTPUT_DIR = Path("data/gis_output")


class GISTool(BaseTool):
    """Geospatial analysis and map generation tool."""

    name = "gis_tool"
    description = (
        "GIS analysis: read shapefiles/geopackages/GeoTIFF, "
        "vector & raster analysis, DEM slope/aspect, generate map images"
    )

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        operation = kwargs.get("operation", "info")

        dispatch = {
            "info": self._info,
            "vector_analysis": self._vector_analysis,
            "raster_analysis": self._raster_analysis,
            "dem_analysis": self._dem_analysis,
            "buffer": self._buffer,
            "map": self._render_map,
            "reproject": self._reproject,
            "overlay": self._overlay,
        }

        handler = dispatch.get(operation)
        if handler is None:
            ops = ", ".join(sorted(dispatch.keys()))
            return f"Unknown operation: {operation}. Available: {ops}"

        try:
            return handler(input_text, **kwargs)
        except ImportError as e:
            return (
                f"Missing dependency: {e}. "
                "Install with: pip install geopandas rasterio matplotlib fiona shapely"
            )
        except Exception as e:
            return f"GIS error: {e}"

    # ── helpers ──────────────────────────────────────────────────

    @staticmethod
    def _resolve_path(text: str) -> Path:
        """Resolve a file path from input text (first line or trimmed).

        Handles:
        - Absolute paths directly
        - Relative paths in CWD
        - Filenames that might be in data/uploads/ directories
        """
        line = text.strip().splitlines()[0].strip()
        p = Path(line)

        # If it's an absolute path that exists, use it
        if p.is_absolute() and p.exists():
            return p

        # If relative path exists in CWD
        if p.exists():
            return p

        # Search in uploads directory (files saved by the upload system)
        uploads_dir = Path("data/uploads")
        if uploads_dir.exists():
            for match in uploads_dir.rglob(f"*{p.suffix}"):
                # Match by original filename stored in the path
                if match.exists():
                    return match

        return p

    @staticmethod
    def _save_figure(fig, name: str = "map") -> tuple[str, str]:
        """Save a matplotlib figure to PNG and return (path, base64)."""
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        import hashlib
        h = hashlib.md5(name.encode()).hexdigest()[:8]
        out_path = OUTPUT_DIR / f"{name}_{h}.png"

        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=150, bbox_inches="tight",
                    facecolor="#1a1a2e", edgecolor="none")
        buf.seek(0)
        out_path.write_bytes(buf.getvalue())

        b64 = base64.b64encode(buf.getvalue()).decode()
        return str(out_path), b64

    @staticmethod
    def _gdf_to_geojson(gdf) -> str:
        """Convert a GeoDataFrame to GeoJSON string for frontend rendering."""
        # Reproject to WGS84 for Leaflet
        if gdf.crs and not gdf.crs.is_geographic:
            gdf = gdf.to_crs(epsg=4326)
        return gdf.to_json()

    # ── operations ───────────────────────────────────────────────

    def _info(self, input_text: str, **kwargs: Any) -> str:
        """Get info about a geospatial file."""
        path = self._resolve_path(input_text)

        if not path.exists():
            return f"File not found: {path}"

        ext = path.suffix.lower()
        layer = kwargs.get("layer")

        if ext in (".tif", ".tiff", ".geotiff"):
            return self._raster_info(path)
        else:
            return self._vector_info(path, layer=layer)

    def _vector_info(self, path: Path, layer: str | None = None) -> str:
        """Get info about a vector file."""
        import geopandas as gpd

        gdf = gpd.read_file(path, layer=layer)
        geom_types = gdf.geometry.geom_type.value_counts().to_dict()
        bounds = gdf.total_bounds  # [minx, miny, maxx, maxy]

        geojson_str = self._gdf_to_geojson(gdf)

        lines = [
            f"**Vector file**: {path.name}",
            f"- CRS: {gdf.crs}",
            f"- Features: {len(gdf)}",
            f"- Geometry types: {geom_types}",
            f"- Bounds: [{bounds[0]:.6f}, {bounds[1]:.6f}, {bounds[2]:.6f}, {bounds[3]:.6f}]",
            f"- Columns: {list(gdf.columns)}",
            "",
            "Sample data (first 5 rows):",
            gdf.head().to_string(),
            "",
            "```artifact",
            json.dumps({"type": "geojson", "name": path.name, "data": geojson_str}),
            "```",
        ]
        return "\n".join(lines)

    def _raster_info(self, path: Path) -> str:
        """Get info about a raster file."""
        import rasterio

        with rasterio.open(path) as src:
            lines = [
                f"**Raster file**: {path.name}",
                f"- CRS: {src.crs}",
                f"- Size: {src.width} x {src.height} pixels",
                f"- Bands: {src.count}",
                f"- Dtype: {src.dtypes[0]}",
                f"- Bounds: {src.bounds}",
                f"- Resolution: {src.res}",
                f"- NoData: {src.nodata}",
            ]

            # Basic stats for first band
            import numpy as np
            data = src.read(1)
            valid = data[data != src.nodata] if src.nodata is not None else data
            if valid.size > 0:
                lines.extend([
                    "",
                    "Band 1 statistics:",
                    f"- Min: {np.nanmin(valid):.4f}",
                    f"- Max: {np.nanmax(valid):.4f}",
                    f"- Mean: {np.nanmean(valid):.4f}",
                    f"- Std: {np.nanstd(valid):.4f}",
                ])

        return "\n".join(lines)

    def _vector_analysis(self, input_text: str, **kwargs: Any) -> str:
        """Analyze vector geometries: area, length, centroid, etc."""
        import geopandas as gpd
        import numpy as np

        path = self._resolve_path(input_text)
        layer = kwargs.get("layer")
        gdf = gpd.read_file(path, layer=layer)

        analysis_type = kwargs.get("analysis_type", "summary")

        # Reproject to metric CRS for accurate measurements if geographic
        gdf_m = gdf.to_crs(epsg=3857) if gdf.crs and gdf.crs.is_geographic else gdf

        lines = [f"**Vector Analysis**: {path.name}", ""]

        if analysis_type in ("summary", "all"):
            geom_types = gdf.geometry.geom_type.value_counts()
            lines.append("Geometry types:")
            for gt, count in geom_types.items():
                lines.append(f"  - {gt}: {count}")
            lines.append("")

        has_polygons = any(gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"]))
        has_lines = any(gdf.geometry.geom_type.isin(["LineString", "MultiLineString"]))

        if has_polygons and analysis_type in ("area", "summary", "all"):
            areas = gdf_m.geometry.area
            lines.extend([
                "Area statistics (m^2):",
                f"  - Total: {areas.sum():,.2f}",
                f"  - Mean: {areas.mean():,.2f}",
                f"  - Min: {areas.min():,.2f}",
                f"  - Max: {areas.max():,.2f}",
                "",
            ])

        if has_lines and analysis_type in ("length", "summary", "all"):
            lengths = gdf_m.geometry.length
            lines.extend([
                "Length statistics (m):",
                f"  - Total: {lengths.sum():,.2f}",
                f"  - Mean: {lengths.mean():,.2f}",
                f"  - Min: {lengths.min():,.2f}",
                f"  - Max: {lengths.max():,.2f}",
                "",
            ])

        # Centroids
        centroids = gdf.geometry.centroid
        lines.extend([
            "Centroid of dataset:",
            f"  - X: {centroids.x.mean():.6f}",
            f"  - Y: {centroids.y.mean():.6f}",
        ])

        # Include interactive GeoJSON map
        geojson_str = self._gdf_to_geojson(gdf)
        lines.extend([
            "",
            "```artifact",
            json.dumps({"type": "geojson", "name": f"{path.stem}_analysis", "data": geojson_str}),
            "```",
        ])

        return "\n".join(lines)

    def _raster_analysis(self, input_text: str, **kwargs: Any) -> str:
        """Analyze raster data: statistics, histogram."""
        import rasterio
        import numpy as np
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        path = self._resolve_path(input_text)
        band = int(kwargs.get("band", 1))

        with rasterio.open(path) as src:
            data = src.read(band).astype(float)
            if src.nodata is not None:
                data[data == src.nodata] = np.nan

            valid = data[~np.isnan(data)]

            lines = [
                f"**Raster Analysis**: {path.name} (band {band})",
                f"- Size: {src.width} x {src.height}",
                f"- Valid pixels: {valid.size} / {data.size}",
                f"- Min: {np.nanmin(valid):.4f}",
                f"- Max: {np.nanmax(valid):.4f}",
                f"- Mean: {np.nanmean(valid):.4f}",
                f"- Median: {np.nanmedian(valid):.4f}",
                f"- Std: {np.nanstd(valid):.4f}",
            ]

            # Percentiles
            for p in [5, 25, 50, 75, 95]:
                val = np.nanpercentile(valid, p)
                lines.append(f"- P{p}: {val:.4f}")

            # Generate raster visualization
            fig, axes = plt.subplots(1, 2, figsize=(14, 6))

            im = axes[0].imshow(data, cmap="terrain")
            axes[0].set_title(f"{path.name} (band {band})", color="white", fontsize=10)
            plt.colorbar(im, ax=axes[0], shrink=0.8)

            axes[1].hist(valid.flatten(), bins=50, color="#4f9dda", alpha=0.8, edgecolor="none")
            axes[1].set_title("Value Distribution", color="white", fontsize=10)
            axes[1].set_xlabel("Value", color="white")
            axes[1].set_ylabel("Count", color="white")

            for ax in axes:
                ax.set_facecolor("#1a1a2e")
                ax.tick_params(colors="white")
                for spine in ax.spines.values():
                    spine.set_color("#333")

            fig.set_facecolor("#1a1a2e")
            plt.tight_layout()

            out_path, b64 = self._save_figure(fig, f"raster_{path.stem}")
            plt.close(fig)

            lines.extend([
                "",
                f"Saved to: {out_path}",
                "```artifact",
                json.dumps({"type": "image", "name": "raster_analysis.png", "data": b64}),
                "```",
            ])

        return "\n".join(lines)

    def _dem_analysis(self, input_text: str, **kwargs: Any) -> str:
        """DEM analysis: elevation, slope, aspect maps."""
        import rasterio
        import numpy as np
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        path = self._resolve_path(input_text)

        with rasterio.open(path) as src:
            elevation = src.read(1).astype(float)
            if src.nodata is not None:
                elevation[elevation == src.nodata] = np.nan

            res_x, res_y = src.res
            transform = src.transform
            crs = src.crs

        # Calculate slope and aspect
        dy, dx = np.gradient(elevation, res_y, res_x)
        slope_rad = np.arctan(np.sqrt(dx**2 + dy**2))
        slope_deg = np.degrees(slope_rad)
        aspect_rad = np.arctan2(-dx, dy)
        aspect_deg = np.degrees(aspect_rad)
        aspect_deg = (aspect_deg + 360) % 360

        valid_elev = elevation[~np.isnan(elevation)]
        valid_slope = slope_deg[~np.isnan(slope_deg)]

        lines = [
            f"**DEM Analysis**: {path.name}",
            "",
            "Elevation:",
            f"  - Min: {np.nanmin(valid_elev):.2f} m",
            f"  - Max: {np.nanmax(valid_elev):.2f} m",
            f"  - Mean: {np.nanmean(valid_elev):.2f} m",
            f"  - Range: {np.nanmax(valid_elev) - np.nanmin(valid_elev):.2f} m",
            "",
            "Slope:",
            f"  - Min: {np.nanmin(valid_slope):.2f} deg",
            f"  - Max: {np.nanmax(valid_slope):.2f} deg",
            f"  - Mean: {np.nanmean(valid_slope):.2f} deg",
            "",
            "Slope classes:",
        ]

        # Slope classification
        classes = [
            ("Flat (0-2)", 0, 2),
            ("Gentle (2-5)", 2, 5),
            ("Moderate (5-15)", 5, 15),
            ("Steep (15-30)", 15, 30),
            ("Very steep (>30)", 30, 90),
        ]
        total = valid_slope.size
        for name, lo, hi in classes:
            count = np.sum((valid_slope >= lo) & (valid_slope < hi))
            pct = count / total * 100 if total > 0 else 0
            lines.append(f"  - {name}: {pct:.1f}%")

        # Generate 4-panel figure
        fig, axes = plt.subplots(2, 2, figsize=(14, 12))

        im0 = axes[0, 0].imshow(elevation, cmap="terrain")
        axes[0, 0].set_title("Elevation (m)", color="white", fontsize=10)
        plt.colorbar(im0, ax=axes[0, 0], shrink=0.8)

        im1 = axes[0, 1].imshow(slope_deg, cmap="YlOrRd", vmin=0, vmax=45)
        axes[0, 1].set_title("Slope (degrees)", color="white", fontsize=10)
        plt.colorbar(im1, ax=axes[0, 1], shrink=0.8)

        im2 = axes[1, 0].imshow(aspect_deg, cmap="hsv", vmin=0, vmax=360)
        axes[1, 0].set_title("Aspect (degrees)", color="white", fontsize=10)
        plt.colorbar(im2, ax=axes[1, 0], shrink=0.8)

        # Hillshade
        azimuth = 315
        altitude = 45
        az_rad = np.radians(azimuth)
        alt_rad = np.radians(altitude)
        hillshade = (
            np.cos(alt_rad) * np.cos(slope_rad) +
            np.sin(alt_rad) * np.sin(slope_rad) * np.cos(az_rad - aspect_rad)
        )
        hillshade = np.clip(hillshade, 0, 1)

        axes[1, 1].imshow(hillshade, cmap="gray")
        axes[1, 1].set_title("Hillshade", color="white", fontsize=10)

        for ax in axes.flat:
            ax.set_facecolor("#1a1a2e")
            ax.tick_params(colors="white", labelsize=7)
            for spine in ax.spines.values():
                spine.set_color("#333")

        fig.set_facecolor("#1a1a2e")
        plt.tight_layout()

        out_path, b64 = self._save_figure(fig, f"dem_{path.stem}")
        plt.close(fig)

        # Save slope/aspect as GeoTIFF
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        slope_path = OUTPUT_DIR / f"slope_{path.stem}.tif"
        aspect_path = OUTPUT_DIR / f"aspect_{path.stem}.tif"

        with rasterio.open(path) as src:
            profile = src.profile.copy()
            profile.update(dtype="float32", count=1)

            with rasterio.open(slope_path, "w", **profile) as dst:
                dst.write(slope_deg.astype("float32"), 1)
            with rasterio.open(aspect_path, "w", **profile) as dst:
                dst.write(aspect_deg.astype("float32"), 1)

        lines.extend([
            "",
            f"Slope raster saved: {slope_path}",
            f"Aspect raster saved: {aspect_path}",
            f"Map saved: {out_path}",
            "```artifact",
            json.dumps({"type": "image", "name": "dem_analysis.png", "data": b64}),
            "```",
        ])

        return "\n".join(lines)

    def _buffer(self, input_text: str, **kwargs: Any) -> str:
        """Create buffer zones around geometries."""
        import geopandas as gpd

        path = self._resolve_path(input_text)
        distance = float(kwargs.get("distance", 100))
        layer = kwargs.get("layer")

        gdf = gpd.read_file(path, layer=layer)
        gdf_m = gdf.to_crs(epsg=3857) if gdf.crs and gdf.crs.is_geographic else gdf

        buffered = gdf_m.copy()
        buffered.geometry = gdf_m.geometry.buffer(distance)

        # Reproject back
        if gdf.crs and gdf.crs.is_geographic:
            buffered = buffered.to_crs(gdf.crs)

        # Save output
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        out_path = OUTPUT_DIR / f"buffer_{distance}m_{path.stem}.gpkg"
        buffered.to_file(out_path, driver="GPKG")

        return (
            f"Buffer ({distance}m) created for {len(gdf)} features.\n"
            f"Saved to: {out_path}\n"
            f"Total buffered area: {buffered.to_crs(epsg=3857).geometry.area.sum():,.2f} m^2"
        )

    def _render_map(self, input_text: str, **kwargs: Any) -> str:
        """Render a map from vector or raster data."""
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np

        path = self._resolve_path(input_text)
        ext = path.suffix.lower()

        title = kwargs.get("title", path.stem)
        cmap = kwargs.get("colormap", "viridis")
        column = kwargs.get("column", "")

        if ext in (".tif", ".tiff", ".geotiff"):
            return self._render_raster_map(path, title, cmap)
        else:
            layer = kwargs.get("layer")
            return self._render_vector_map(path, title, cmap, column, layer=layer)

    def _render_vector_map(self, path: Path, title: str, cmap: str, column: str, layer: str | None = None) -> str:
        """Render an interactive map from vector data using GeoJSON."""
        import geopandas as gpd

        gdf = gpd.read_file(path, layer=layer)
        geojson_str = self._gdf_to_geojson(gdf)

        geom_types = gdf.geometry.geom_type.value_counts().to_dict()

        return (
            f"**Map**: {title}\n"
            f"- Features: {len(gdf)}\n"
            f"- CRS: {gdf.crs}\n"
            f"- Geometry: {geom_types}\n\n"
            f"```artifact\n"
            + json.dumps({"type": "geojson", "name": title, "data": geojson_str})
            + "\n```"
        )

    def _render_raster_map(self, path: Path, title: str, cmap: str) -> str:
        """Render a map from raster data."""
        import rasterio
        from rasterio.plot import show
        import numpy as np
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        with rasterio.open(path) as src:
            data = src.read(1).astype(float)
            if src.nodata is not None:
                data[data == src.nodata] = np.nan

            fig, ax = plt.subplots(1, 1, figsize=(12, 10))
            ax.set_facecolor("#1a1a2e")
            fig.set_facecolor("#1a1a2e")

            show(src, ax=ax, cmap=cmap, title=title)
            ax.set_title(title, color="white", fontsize=14, pad=10)
            ax.tick_params(colors="white", labelsize=8)
            for spine in ax.spines.values():
                spine.set_color("#333")

        plt.tight_layout()
        out_path, b64 = self._save_figure(fig, f"map_{path.stem}")
        plt.close(fig)

        return (
            f"Raster map rendered: {title}\n"
            f"Saved to: {out_path}\n"
            "```artifact\n"
            + json.dumps({"type": "image", "name": "raster_map.png", "data": b64})
            + "\n```"
        )

    def _reproject(self, input_text: str, **kwargs: Any) -> str:
        """Reproject vector or raster data to a new CRS."""
        path = self._resolve_path(input_text)
        target_crs = kwargs.get("target_crs", "EPSG:4326")
        layer = kwargs.get("layer")
        ext = path.suffix.lower()

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        if ext in (".tif", ".tiff", ".geotiff"):
            import rasterio
            from rasterio.warp import calculate_default_transform, reproject, Resampling

            with rasterio.open(path) as src:
                transform, width, height = calculate_default_transform(
                    src.crs, target_crs, src.width, src.height, *src.bounds
                )
                profile = src.profile.copy()
                profile.update(crs=target_crs, transform=transform, width=width, height=height)

                out_path = OUTPUT_DIR / f"reproj_{path.stem}.tif"
                with rasterio.open(out_path, "w", **profile) as dst:
                    for i in range(1, src.count + 1):
                        reproject(
                            source=rasterio.band(src, i),
                            destination=rasterio.band(dst, i),
                            src_transform=src.transform,
                            src_crs=src.crs,
                            dst_transform=transform,
                            dst_crs=target_crs,
                            resampling=Resampling.bilinear,
                        )

            return f"Raster reprojected to {target_crs}.\nSaved to: {out_path}"

        else:
            import geopandas as gpd

            gdf = gpd.read_file(path, layer=layer)
            gdf_reproj = gdf.to_crs(target_crs)

            out_path = OUTPUT_DIR / f"reproj_{path.stem}.gpkg"
            gdf_reproj.to_file(out_path, driver="GPKG")

            return f"Vector reprojected from {gdf.crs} to {target_crs}.\nSaved to: {out_path}"

    def _overlay(self, input_text: str, **kwargs: Any) -> str:
        """Overlay two vector datasets (intersection, union, difference)."""
        import geopandas as gpd

        lines = input_text.strip().splitlines()
        if len(lines) < 2:
            return "Provide two file paths (one per line) for overlay."

        path1 = Path(lines[0].strip())
        path2 = Path(lines[1].strip())

        if not path1.exists():
            return f"File not found: {path1}"
        if not path2.exists():
            return f"File not found: {path2}"

        how = kwargs.get("how", "intersection")

        gdf1 = gpd.read_file(path1)
        gdf2 = gpd.read_file(path2)

        # Ensure same CRS
        if gdf1.crs != gdf2.crs:
            gdf2 = gdf2.to_crs(gdf1.crs)

        result = gpd.overlay(gdf1, gdf2, how=how)

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        out_path = OUTPUT_DIR / f"overlay_{how}_{path1.stem}_{path2.stem}.gpkg"
        result.to_file(out_path, driver="GPKG")

        return (
            f"Overlay ({how}) complete.\n"
            f"- Input 1: {len(gdf1)} features ({path1.name})\n"
            f"- Input 2: {len(gdf2)} features ({path2.name})\n"
            f"- Result: {len(result)} features\n"
            f"Saved to: {out_path}"
        )
