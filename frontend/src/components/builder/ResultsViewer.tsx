import { useState, useMemo } from 'react';
import { Map, Globe, Image, Maximize2, Minimize2, Code } from 'lucide-react';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';

interface Props {
  nodeId: string;
  label: string;
  content: string;
}

type ContentBlock =
  | { type: 'text'; value: string }
  | { type: 'image'; name: string; data: string }
  | { type: 'geojson'; name: string; data: string }
  | { type: 'html'; name: string; data: string }
  | { type: 'zip_website'; name: string; data: string };

/**
 * Parse result text and extract artifact blocks.
 *
 * Artifact format (embedded by tools):
 *   ```artifact
 *   {"type": "image"|"geojson"|"html", "name": "...", "data": "..."}
 *   ```
 *
 * Also detects inline patterns:
 *   - Full HTML pages (<!DOCTYPE or <html)
 *   - GeoJSON objects ({"type": "FeatureCollection" ...})
 */
function parseContent(raw: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // 1. Extract ```artifact blocks
  const artifactRe = /```artifact\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = artifactRe.exec(raw)) !== null) {
    // Text before this artifact
    if (match.index > lastIndex) {
      const text = raw.slice(lastIndex, match.index).trim();
      if (text) blocks.push({ type: 'text', value: text });
    }

    try {
      const json = JSON.parse(match[1].trim());
      const artType = json.type as string;
      const data = json.data as string || '';
      const name = json.name as string || 'artifact';

      if (artType === 'image') {
        blocks.push({ type: 'image', name, data });
      } else if (artType === 'geojson') {
        blocks.push({ type: 'geojson', name, data });
      } else if (artType === 'html') {
        blocks.push({ type: 'html', name, data });
      } else if (artType === 'zip') {
        blocks.push({ type: 'zip_website', name, data });
      } else {
        blocks.push({ type: 'text', value: match[0] });
      }
    } catch {
      blocks.push({ type: 'text', value: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  const remaining = raw.slice(lastIndex).trim();
  if (remaining) {
    // Check if the remaining is a full HTML page
    if (/^\s*<!doctype\s+html|^\s*<html/i.test(remaining)) {
      blocks.push({ type: 'html', name: 'page.html', data: remaining });
    }
    // Check for GeoJSON
    else if (/^\s*\{\s*"type"\s*:\s*"FeatureCollection"/i.test(remaining)) {
      blocks.push({ type: 'geojson', name: 'data.geojson', data: remaining });
    } else {
      blocks.push({ type: 'text', value: remaining });
    }
  }

  return blocks;
}

/** Build a self-contained Leaflet HTML page for GeoJSON data */
function buildLeafletPage(geojsonStr: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    #map { background: #1a1a2e; }
    .info-popup { font-size: 12px; max-width: 300px; max-height: 200px; overflow-y: auto; }
    .info-popup table { border-collapse: collapse; width: 100%; }
    .info-popup td, .info-popup th { padding: 2px 6px; border-bottom: 1px solid #eee; text-align: left; font-size: 11px; }
    .info-popup th { font-weight: 600; background: #f5f5f5; }
    .leaflet-control-zoom a { background: #2d2d4e !important; color: #fff !important; border-color: #444 !important; }
    .leaflet-control-attribution { background: rgba(30,30,50,0.8) !important; color: #888 !important; }
    .leaflet-control-attribution a { color: #aaa !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const geojsonData = ${geojsonStr};

    const map = L.map('map', { zoomControl: true });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    }).addTo(map);

    function getColor(i) {
      const colors = ['#ff6b6b','#4ecdc4','#45b7d1','#f9ca24','#6c5ce7','#a8e6cf','#ff8a5c','#ea8685','#78e08f','#e056fd'];
      return colors[i % colors.length];
    }

    function propsToHtml(props) {
      if (!props || Object.keys(props).length === 0) return '<em>No properties</em>';
      let html = '<table>';
      for (const [k, v] of Object.entries(props)) {
        if (k.startsWith('_')) continue;
        html += '<tr><th>' + k + '</th><td>' + (v ?? '') + '</td></tr>';
      }
      html += '</table>';
      return html;
    }

    let colorIdx = 0;
    const layer = L.geoJSON(geojsonData, {
      style: function(feature) {
        const c = getColor(colorIdx++);
        return { color: c, weight: 2, opacity: 0.8, fillColor: c, fillOpacity: 0.35 };
      },
      pointToLayer: function(feature, latlng) {
        const c = getColor(colorIdx++);
        return L.circleMarker(latlng, { radius: 6, fillColor: c, color: '#fff', weight: 1, opacity: 1, fillOpacity: 0.8 });
      },
      onEachFeature: function(feature, layer) {
        if (feature.properties) {
          layer.bindPopup('<div class="info-popup">' + propsToHtml(feature.properties) + '</div>');
        }
      }
    }).addTo(map);

    if (layer.getBounds().isValid()) {
      map.fitBounds(layer.getBounds().pad(0.1));
    } else {
      map.setView([0, 0], 2);
    }
  </script>
</body>
</html>`;
}

/* ── Sub-components ────────────────────────────────── */

function ImageViewer({ data, name }: { data: string; name: string }) {
  const [expanded, setExpanded] = useState(false);
  // data might be truncated with "..." at the end from the tool
  const src = data.endsWith('...')
    ? '' // truncated, can't display
    : `data:image/png;base64,${data}`;

  if (!src) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-xs p-2 bg-gray-800/50 rounded">
        <Image className="w-4 h-4" />
        <span>{name} (immagine salvata su disco — vedi path nel testo)</span>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={() => setExpanded(v => !v)}
        className="absolute top-2 right-2 z-10 p-1 bg-gray-900/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      </button>
      <img
        src={src}
        alt={name}
        className={`rounded-lg border border-gray-700 ${expanded ? 'max-h-[80vh]' : 'max-h-64'} w-auto object-contain transition-all`}
      />
    </div>
  );
}

function MapViewer({ data, name }: { data: string; name: string }) {
  const [expanded, setExpanded] = useState(false);
  const html = useMemo(() => buildLeafletPage(data), [data]);

  return (
    <div className={`relative ${expanded ? 'fixed inset-4 z-50 bg-gray-950' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <Map className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs text-gray-400">{name}</span>
        <button
          onClick={() => setExpanded(v => !v)}
          className="ml-auto p-1 hover:bg-gray-700 rounded transition-colors"
        >
          {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
      <iframe
        srcDoc={html}
        sandbox="allow-scripts"
        className={`w-full rounded-lg border border-gray-700 ${expanded ? 'h-[calc(100%-2rem)]' : 'h-80'}`}
        title={name}
      />
    </div>
  );
}

function HtmlViewer({ data, name }: { data: string; name: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`relative ${expanded ? 'fixed inset-4 z-50 bg-gray-950' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <Globe className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs text-gray-400">{name}</span>
        <button
          onClick={() => setExpanded(v => !v)}
          className="ml-auto p-1 hover:bg-gray-700 rounded transition-colors"
        >
          {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
      <iframe
        srcDoc={data}
        sandbox="allow-scripts allow-same-origin"
        className={`w-full bg-white rounded-lg border border-gray-700 ${expanded ? 'h-[calc(100%-2rem)]' : 'h-80'}`}
        title={name}
      />
    </div>
  );
}

/* ── Main Component ────────────────────────────────── */

export function ResultsViewer({ nodeId, label, content }: Props) {
  const blocks = useMemo(() => parseContent(content), [content]);
  const [viewMode, setViewMode] = useState<'rich' | 'raw'>('rich');

  const hasRichContent = blocks.some(b => b.type !== 'text');

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-400">{label}</p>
        {hasRichContent && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('rich')}
              className={`p-1 rounded text-xs ${viewMode === 'rich' ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Vista ricca"
            >
              <Globe className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`p-1 rounded text-xs ${viewMode === 'raw' ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Testo grezzo"
            >
              <Code className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {viewMode === 'raw' ? (
        <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono text-xs max-h-96 overflow-y-auto">{content}</pre>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, i) => {
            switch (block.type) {
              case 'text':
                return (
                  <div key={`${nodeId}-text-${i}`} className="text-sm text-gray-200 prose prose-invert prose-sm max-w-none">
                    <MarkdownRenderer content={block.value} />
                  </div>
                );
              case 'image':
                return <ImageViewer key={`${nodeId}-img-${i}`} data={block.data} name={block.name} />;
              case 'geojson':
                return <MapViewer key={`${nodeId}-map-${i}`} data={block.data} name={block.name} />;
              case 'html':
              case 'zip_website':
                return <HtmlViewer key={`${nodeId}-html-${i}`} data={block.data} name={block.name} />;
              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
}
