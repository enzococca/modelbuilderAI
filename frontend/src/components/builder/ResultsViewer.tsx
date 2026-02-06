import { useState, useMemo } from 'react';
import { Map, Globe, Image, Maximize2, Minimize2, Code } from 'lucide-react';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';

interface Props {
  nodeId: string;
  label: string;
  content: string;
  outputFormat?: string;
}

type ContentBlock =
  | { type: 'text'; value: string }
  | { type: 'image'; name: string; data: string }
  | { type: 'geojson'; name: string; data: string }
  | { type: 'html'; name: string; data: string };

/**
 * Parse result text and extract artifact blocks + inline rich content.
 *
 * Detects:
 *  1. ```artifact\n{json}\n```  (explicit artifact blocks)
 *  2. Inline JSON: {"type": "geojson", "name": "...", "data": "..."}
 *  3. Full HTML pages: <!DOCTYPE html>...
 *  4. Raw GeoJSON: {"type": "FeatureCollection", ...}
 */
function parseContent(raw: string, outputFormat?: string): ContentBlock[] {
  // 0. If outputFormat is explicitly 'map' or 'html', try artifact parse first, then force the type
  if (outputFormat === 'map') {
    const parsed = parseRaw(raw);
    if (parsed.some(b => b.type === 'geojson')) return parsed;
    return [{ type: 'geojson', name: 'map', data: raw }];
  }
  if (outputFormat === 'html') {
    const parsed = parseRaw(raw);
    if (parsed.some(b => b.type === 'html')) return parsed;
    return [{ type: 'html', name: 'page.html', data: raw }];
  }
  return parseRaw(raw);
}

function parseRaw(raw: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Strategy: try multiple detection methods

  // 1. Try explicit ```artifact blocks
  const artifactRe = /```artifact\s*\n([\s\S]*?)```/g;
  let hasArtifacts = false;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = artifactRe.exec(raw)) !== null) {
    hasArtifacts = true;
    if (match.index > lastIndex) {
      const text = raw.slice(lastIndex, match.index).trim();
      if (text) blocks.push({ type: 'text', value: text });
    }
    try {
      const json = JSON.parse(match[1].trim());
      pushArtifact(blocks, json);
    } catch {
      blocks.push({ type: 'text', value: match[1] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (hasArtifacts) {
    const remaining = raw.slice(lastIndex).trim();
    if (remaining) parseRemainder(blocks, remaining);
    return blocks;
  }

  // 2. No ```artifact found — try to detect inline artifact JSON objects
  //    Pattern: {"type": "geojson"|"html"|"image", "name": "...", "data": "..."}
  const inlineArtifactRe = /\{"type"\s*:\s*"(geojson|html|image)"[^}]*"data"\s*:\s*"[\s\S]*?(?:"\s*\})/g;
  lastIndex = 0;
  let hasInline = false;

  while ((match = inlineArtifactRe.exec(raw)) !== null) {
    try {
      const json = JSON.parse(match[0]);
      if (json.type && json.data) {
        hasInline = true;
        if (match.index > lastIndex) {
          const text = raw.slice(lastIndex, match.index).trim();
          if (text) blocks.push({ type: 'text', value: text });
        }
        pushArtifact(blocks, json);
        lastIndex = match.index + match[0].length;
      }
    } catch {
      // JSON parse failed, try extending the match to find the complete JSON
      // The inline regex might not capture nested escaped quotes correctly
      // Try to find the full JSON by counting braces
      const fullJson = extractJsonObject(raw, match.index);
      if (fullJson) {
        try {
          const json = JSON.parse(fullJson);
          if (json.type && json.data) {
            hasInline = true;
            if (match.index > lastIndex) {
              const text = raw.slice(lastIndex, match.index).trim();
              if (text) blocks.push({ type: 'text', value: text });
            }
            pushArtifact(blocks, json);
            lastIndex = match.index + fullJson.length;
            // Update regex lastIndex
            inlineArtifactRe.lastIndex = lastIndex;
          }
        } catch {
          // Give up on this match
        }
      }
    }
  }

  if (hasInline) {
    const remaining = raw.slice(lastIndex).trim();
    if (remaining) parseRemainder(blocks, remaining);
    return blocks;
  }

  // 3. No artifacts at all — treat as plain text but check for HTML/GeoJSON
  parseRemainder(blocks, raw);
  return blocks;
}

function pushArtifact(blocks: ContentBlock[], json: Record<string, unknown>) {
  const artType = json.type as string;
  const data = (json.data as string) || '';
  const name = (json.name as string) || 'artifact';

  if (artType === 'geojson') {
    blocks.push({ type: 'geojson', name, data });
  } else if (artType === 'html') {
    blocks.push({ type: 'html', name, data });
  } else if (artType === 'image') {
    blocks.push({ type: 'image', name, data });
  } else if (artType === 'zip') {
    blocks.push({ type: 'html', name, data });
  } else {
    blocks.push({ type: 'text', value: JSON.stringify(json) });
  }
}

function parseRemainder(blocks: ContentBlock[], text: string) {
  if (/^\s*<!doctype\s+html|^\s*<html/i.test(text)) {
    blocks.push({ type: 'html', name: 'page.html', data: text });
  } else if (/^\s*\{\s*"type"\s*:\s*"FeatureCollection"/i.test(text)) {
    blocks.push({ type: 'geojson', name: 'data.geojson', data: text });
  } else {
    blocks.push({ type: 'text', value: text });
  }
}

/** Try to extract a full JSON object starting at position `start` in `text` */
function extractJsonObject(text: string, start: number): string | null {
  if (text[start] !== '{') return null;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/** Build a self-contained Leaflet HTML page for GeoJSON data */
function buildLeafletPage(geojsonStr: string): string {
  // geojsonStr could be a JSON string or already a parsed-and-stringified object
  // Ensure it's valid for injection into JS
  let jsData: string;
  try {
    // If it's a JSON string (from the backend), parse it to verify then use as-is
    JSON.parse(geojsonStr);
    jsData = geojsonStr;
  } catch {
    // If parsing fails, it might already be a JS-compatible format
    jsData = geojsonStr;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
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
    try {
      const geojsonData = ${jsData};
      const map = L.map('map', { zoomControl: true });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '\\u00a9 OpenStreetMap \\u00a9 CARTO',
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
        style: function() {
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
    } catch(e) {
      document.body.innerHTML = '<div style="color:red;padding:20px;font-family:monospace">Map error: ' + e.message + '</div>';
    }
  <\/script>
</body>
</html>`;
}

/* ── Sub-components ────────────────────────────────── */

function ImageViewer({ data, name }: { data: string; name: string }) {
  const [expanded, setExpanded] = useState(false);
  const src = data.endsWith('...')
    ? ''
    : `data:image/png;base64,${data}`;

  if (!src) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-xs p-2 bg-gray-800/50 rounded">
        <Image className="w-4 h-4" />
        <span>{name} (immagine salvata su disco)</span>
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
    <div className={`relative ${expanded ? 'fixed inset-4 z-50 bg-gray-950 rounded-xl' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <Map className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs text-gray-400">{name}</span>
        <button
          onClick={() => setExpanded(v => !v)}
          className="ml-auto p-1 hover:bg-gray-700 rounded transition-colors"
          title={expanded ? 'Riduci' : 'Espandi mappa'}
        >
          {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
      <iframe
        srcDoc={html}
        sandbox="allow-scripts"
        className={`w-full rounded-lg border border-gray-700 ${expanded ? 'h-[calc(100%-2rem)]' : 'h-96'}`}
        title={name}
      />
    </div>
  );
}

function HtmlViewer({ data, name }: { data: string; name: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`relative ${expanded ? 'fixed inset-4 z-50 bg-gray-950 rounded-xl' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <Globe className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs text-gray-400">{name}</span>
        <button
          onClick={() => setExpanded(v => !v)}
          className="ml-auto p-1 hover:bg-gray-700 rounded transition-colors"
          title={expanded ? 'Riduci' : 'Espandi'}
        >
          {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
      <iframe
        srcDoc={data}
        sandbox="allow-scripts allow-same-origin"
        className={`w-full bg-white rounded-lg border border-gray-700 ${expanded ? 'h-[calc(100%-2rem)]' : 'h-96'}`}
        title={name}
      />
    </div>
  );
}

/* ── Main Component ────────────────────────────────── */

export function ResultsViewer({ nodeId, label, content, outputFormat }: Props) {
  const blocks = useMemo(() => parseContent(content, outputFormat), [content, outputFormat]);
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
