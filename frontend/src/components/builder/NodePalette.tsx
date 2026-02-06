import { useState } from 'react';
import { Bot, Wrench, GitBranch, FileOutput, FileInput, RefreshCw, Layers, BookOpen, ChevronDown, ChevronRight, Boxes, Scissors } from 'lucide-react';
import type { DragEvent } from 'react';

const nodeTypes = [
  { type: 'agent', label: 'Agent', icon: Bot, color: 'purple' },
  { type: 'tool', label: 'Tool', icon: Wrench, color: 'green' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'yellow' },
  { type: 'input', label: 'Input', icon: FileInput, color: 'cyan' },
  { type: 'output', label: 'Output', icon: FileOutput, color: 'blue' },
  { type: 'loop', label: 'Loop', icon: RefreshCw, color: 'orange' },
  { type: 'aggregator', label: 'Aggregator', icon: Layers, color: 'pink' },
  { type: 'meta_agent', label: 'Meta-Agent', icon: Boxes, color: 'indigo' },
  { type: 'chunker', label: 'Chunker', icon: Scissors, color: 'teal' },
];

const tutorials = [
  { id: '01', file: '01-prima-pipeline.json', label: '1. Prima Pipeline', desc: 'Input → Sonnet → Output' },
  { id: '02', file: '02-traduttore-multilingua.json', label: '2. Traduttore', desc: '3 lingue in parallelo' },
  { id: '03', file: '03-ricerca-web.json', label: '3. Ricerca Web', desc: 'Search → Analisi → Report' },
  { id: '04', file: '04-code-review.json', label: '4. Code Review', desc: '3 reviewer + verdetto' },
  { id: '05', file: '05-dibattito-ai.json', label: '5. Dibattito AI', desc: 'Pro vs Contro + Giudice' },
  { id: '06', file: '06-analisi-documenti.json', label: '6. Analisi Doc', desc: 'File → RAG → Citazioni' },
  { id: '07', file: '07-pipeline-archeologica.json', label: '7. Archeologia', desc: 'Classifica → Scheda RA' },
  { id: '08', file: '08-auto-refine.json', label: '8. Auto-Refine', desc: 'Genera → Critica → Loop' },
  { id: '09', file: '09-content-factory.json', label: '9. Content Factory', desc: 'Blog+Twitter+LinkedIn+Newsletter' },
  { id: '10', file: '10-validazione-output.json', label: '10. Validazione', desc: 'Genera → Valida → Correggi' },
  { id: '11', file: '11-fallback-modello.json', label: '11. Fallback', desc: 'Claude → Backup GPT-4o' },
  { id: '12', file: '12-quality-gate.json', label: '12. Quality Gate', desc: 'Score ≥ 7 o rigenera' },
  { id: '13', file: '13-ml-pipeline.json', label: '13. ML Pipeline', desc: 'Train RF + GB su CSV' },
  { id: '14', file: '14-website-generator.json', label: '14. Website Gen', desc: 'HTML+CSS+JS → ZIP' },
  { id: '15', file: '15-chunker-documento.json', label: '15. Chunker Doc', desc: 'Splitta → Analizza → Sintesi' },
  { id: '16', file: '16-meta-agent.json', label: '16. Meta-Agent', desc: 'Sub-workflow ricorsivo' },
  { id: '17', file: '17-gis-analysis.json', label: '17. GIS Analysis', desc: 'Vettori + Raster → Mappa' },
];

interface Props {
  onLoadWorkflow?: (definition: { nodes: unknown[]; edges: unknown[] }) => void;
}

export function NodePalette({ onLoadWorkflow }: Props) {
  const [showTutorials, setShowTutorials] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);

  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const loadTutorial = async (file: string, id: string) => {
    if (!onLoadWorkflow) return;
    setLoading(id);
    try {
      const resp = await fetch(`/workflows/${file}`);
      const json = await resp.json();
      onLoadWorkflow(json);
    } catch (err) {
      console.error('Failed to load tutorial:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="w-52 bg-gray-900 border-r border-gray-800 p-3 overflow-y-auto">
      <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-3">Nodes</h3>
      <div className="space-y-2">
        {nodeTypes.map(n => (
          <div
            key={n.type}
            draggable
            onDragStart={(e) => onDragStart(e, n.type)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-750 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <n.icon className={`w-4 h-4 text-${n.color}-400`} />
            <span className="text-sm text-gray-200">{n.label}</span>
          </div>
        ))}
      </div>

      {/* Tutorial templates */}
      <button
        onClick={() => setShowTutorials(v => !v)}
        className="flex items-center gap-2 w-full mt-5 mb-2"
      >
        {showTutorials ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
        <h3 className="text-xs text-gray-400 uppercase tracking-wide">Tutorials</h3>
      </button>

      {showTutorials && (
        <div className="space-y-1.5">
          {tutorials.map(t => (
            <button
              key={t.id}
              onClick={() => loadTutorial(t.file, t.id)}
              disabled={loading === t.id}
              className="w-full text-left px-3 py-2 bg-gray-800/60 rounded-lg border border-gray-700/50 hover:border-indigo-500/40 hover:bg-gray-800 transition-colors group"
            >
              <span className="text-xs font-medium text-gray-200 group-hover:text-indigo-300 block">
                {loading === t.id ? 'Caricamento...' : t.label}
              </span>
              <span className="text-[10px] text-gray-500">{t.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
