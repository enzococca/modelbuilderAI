import { useState } from 'react';
import { Bot, Wrench, GitBranch, FileOutput, FileInput, RefreshCw, Layers, BookOpen, ChevronDown, ChevronRight, Boxes, Scissors, Clock, GitFork, ShieldCheck } from 'lucide-react';
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
  { type: 'delay', label: 'Delay', icon: Clock, color: 'amber' },
  { type: 'switch', label: 'Switch', icon: GitFork, color: 'rose' },
  { type: 'validator', label: 'Validator', icon: ShieldCheck, color: 'emerald' },
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
  { id: '18', file: '18-document-task-extraction.json', label: '18. Doc Task Extract', desc: 'Cerca nei file → Estrai task' },
  { id: '19', file: '19-project-analyzer.json', label: '19. Project Analyzer', desc: 'Leggi progetto → Riassunto' },
  { id: '20', file: '20-parallel-analysis.json', label: '20. Parallel Analysis', desc: '3 analisti in parallelo → Sintesi' },
  { id: '21', file: '21-web-scraper.json', label: '21. Web Scraper', desc: 'Testo+Link+Tabelle → Report' },
  { id: '22', file: '22-file-manager.json', label: '22. File Manager', desc: 'Ricerca → Scrivi file locale' },
  { id: '23', file: '23-http-api.json', label: '23. HTTP API', desc: 'Chiama API → Parse JSON → Report' },
  { id: '24', file: '24-text-transform.json', label: '24. Text Transform', desc: 'Regex + Template + Count' },
  { id: '25', file: '25-notifier.json', label: '25. Notifier', desc: 'Analisi → Notifica Slack/Webhook' },
  { id: '26', file: '26-delay-rate-limit.json', label: '26. Delay API', desc: 'HTTP → Delay → HTTP → Analisi' },
  { id: '27', file: '27-switch-routing.json', label: '27. Switch Routing', desc: 'Keyword → 3 specialisti' },
  { id: '28', file: '28-switch-delay-combo.json', label: '28. Switch+Delay', desc: 'Ticket → Priorità → SLA' },
  { id: '29', file: '29-triple-pipeline.json', label: '29. Triple Pipeline', desc: '3 input → incrocio → report C-level' },
  { id: '30', file: '30-archeologia-stratigrafia.json', label: '30. Stratigrafia', desc: 'DB PyArchInit → Analisi US' },
  { id: '31', file: '31-archeologia-ceramica.json', label: '31. Ceramica', desc: 'DB pottery → Classificazione' },
  { id: '32', file: '32-archeologia-inventario.json', label: '32. Inventario', desc: 'DB materiali → Report + salva' },
  { id: '33', file: '33-archeologia-multi-sito.json', label: '33. Multi-Sito', desc: '3 siti paralleli → Confronto' },
  { id: '34', file: '34-archeologia-pipeline-scavo.json', label: '34. Pipeline Scavo', desc: 'US+Ceramica+Inv → Switch → Report' },
  { id: '35', file: '35-archeologia-statistiche.json', label: '35. Statistiche', desc: 'DB → Grafico → Notifica' },
  { id: '36', file: '36-archeologia-mappa-us.json', label: '36. Mappa US', desc: 'GIS SpatiaLite → Mappa interattiva' },
  { id: '37', file: '37-archeologia-buffer-siti.json', label: '37. Buffer + CRS', desc: 'Buffer 5m + Riproiezione WGS84' },
  { id: '38', file: '38-email-report.json', label: '38. Email Report', desc: 'Report → Email SMTP/Gmail' },
  { id: '39', file: '39-plotly-dashboard.json', label: '39. Plotly Dashboard', desc: 'Dati → Grafici interattivi Plotly' },
  { id: '40', file: '40-input-text.json', label: '40. Input Text', desc: 'Testo → Analisi Sentiment' },
  { id: '41', file: '41-input-file.json', label: '41. Input File', desc: 'Upload PDF → Riassunto' },
  { id: '42', file: '42-input-url.json', label: '42. Input URL', desc: 'Scraping pagina → Analisi' },
  { id: '43', file: '43-input-email.json', label: '43. Input Email', desc: 'Email → Estrazione task' },
  { id: '44', file: '44-input-api.json', label: '44. Input API', desc: 'API REST → Parse → Report' },
  { id: '45', file: '45-input-variable.json', label: '45. Input Variable', desc: 'Variabili cross-nodo → Confronto' },
  { id: '46', file: '46-input-database.json', label: '46. Input Database', desc: 'Query SQLite → Report' },
  { id: '47', file: '47-telegram-bot.json', label: '47. Telegram Bot', desc: 'Report → Invio Telegram + Salva' },
  { id: '48', file: '48-whatsapp-notifica.json', label: '48. WhatsApp Notifica', desc: 'Ordine → Msg Cliente + Magazzino' },
  { id: '49', file: '49-pyarchinit-analisi.json', label: '49. PyArchInit', desc: 'US + Inventario → Report Sito' },
  { id: '50', file: '50-qgis-project-info.json', label: '50. QGIS Project', desc: 'Info + Layer → Analisi Progetto' },
  { id: '51', file: '51-validator-quality.json', label: '51. Validator Gate', desc: 'Genera → Valida → Pass/Fail' },
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
