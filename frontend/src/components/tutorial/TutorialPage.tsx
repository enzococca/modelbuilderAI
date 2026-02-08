import { useState } from 'react';
import {
  BookOpen, Bot, Wrench, Cpu, ChevronDown, ChevronRight,
  Lightbulb, AlertTriangle, Rocket, Zap, ArrowRight,
  Clock, GitFork, Shield, ShieldCheck,
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';

/* ── Collapsible Card ────────────────────────────────────────── */

function Card({ title, subtitle, icon: Icon, accent, defaultOpen, children }: {
  title: string;
  subtitle?: string;
  icon: typeof Bot;
  accent: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className={`rounded-xl border bg-gray-900/60 overflow-hidden transition-all ${open ? `border-${accent}-500/40` : 'border-gray-800 hover:border-gray-700'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left group"
      >
        <div className={`p-2 rounded-lg bg-${accent}-500/10`}>
          <Icon className={`w-5 h-5 text-${accent}-400`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-gray-800/50 pt-4">{children}</div>}
    </div>
  );
}

/* ── Small sub-components ────────────────────────────────────── */

function Diagram({ children }: { children: string }) {
  return (
    <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-xs text-emerald-400 overflow-x-auto leading-relaxed font-mono">
      {children}
    </pre>
  );
}

function Prompt({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-blue-400 mb-1 block">{label}</span>
      <MarkdownRenderer content={'```\n' + children.trim() + '\n```'} />
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((s, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
          <span className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold shrink-0">{i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-blue-950/30 border border-blue-900/40 rounded-lg p-3 text-sm text-blue-200">
      <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function MiniTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 text-xs text-gray-400 font-medium border-b border-gray-800">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-800/50">
              {row.map((c, ci) => (
                <td key={ci} className="px-3 py-2 text-gray-300">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Quick-start hero badges ─────────────────────────────────── */

function Badge({ icon: Icon, label, desc, accent }: {
  icon: typeof Bot; label: string; desc: string; accent: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg bg-${accent}-500/5 border border-${accent}-500/20`}>
      <Icon className={`w-5 h-5 text-${accent}-400 shrink-0`} />
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-gray-500">{desc}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* ══ MAIN PAGE ════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════ */

export function TutorialPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* ── Hero ── */}
        <div>
          <h1 className="text-2xl font-bold text-white">Guida al Model Builder</h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">
            Crea pipeline AI trascinando nodi sul canvas e collegandoli. Ogni nodo e un'azione —
            un agente AI, uno strumento, una condizione — e insieme formano workflow potenti.
          </p>
        </div>

        {/* ── Quick start flow ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge icon={Cpu} label="1. Trascina" desc="nodi sul canvas" accent="purple" />
          <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
          <Badge icon={Zap} label="2. Collega" desc="i pallini tra nodi" accent="blue" />
          <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
          <Badge icon={Bot} label="3. Configura" desc="click sul nodo" accent="green" />
          <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
          <Badge icon={Rocket} label="4. Esegui" desc="premi Run" accent="orange" />
        </div>

        {/* ═══════ NODI DISPONIBILI ═══════ */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" /> Nodi Disponibili
          </h2>
          <div className="space-y-2">

            <Card title="Nodi Agente" subtitle="Il cuore del builder — chiamano un modello AI" icon={Bot} accent="purple" defaultOpen>
              <MiniTable
                headers={['Nodo', 'Modello', 'Ideale per']}
                rows={[
                  ['Claude Opus', 'claude-opus-4-6', 'Ragionamento complesso, decisioni critiche'],
                  ['Claude Sonnet', 'claude-sonnet-4-5-20250929', 'Coding, analisi, bilanciato'],
                  ['Claude Haiku', 'claude-haiku-4-5-20251001', 'Classificazione, routing, task veloci'],
                  ['GPT-4o', 'gpt-4o', 'Multimodale (immagini+testo)'],
                  ['GPT-4o Mini', 'gpt-4o-mini', 'Task veloci ed economici'],
                  ['o1', 'o1', 'Ragionamento matematico avanzato'],
                  ['Ollama', 'llama3.2, mistral...', 'Privacy, offline, costo zero'],
                ]}
              />
              <Tip>
                <strong>Configura ogni agente:</strong> System Prompt (comportamento), Temperature (0 = preciso, 1 = creativo), Max Tokens.
              </Tip>
            </Card>

            <Card title="Nodi Strumento" subtitle="Capacita extra per gli agenti" icon={Wrench} accent="green">
              <MiniTable
                headers={['Nodo', 'Funzione']}
                rows={[
                  ['Web Search', 'Cerca informazioni aggiornate su internet'],
                  ['File Reader', 'Legge PDF, DOCX, CSV, immagini'],
                  ['Code Executor', 'Esegue codice Python in sandbox (numpy, pandas, matplotlib, sklearn)'],
                  ['Database Query', 'Interroga database SQL (SQLite, PostgreSQL, MySQL)'],
                  ['Image Analyzer', 'Analizza immagini con vision AI'],
                  ['ML Pipeline', 'Addestra, predici, valuta modelli ML da CSV (scikit-learn)'],
                  ['Website Generator', 'Genera siti web (HTML/CSS/JS) come file ZIP'],
                  ['GIS Analysis', 'Analisi geospaziale: shapefile, geopackage, GeoTIFF, DEM, mappe'],
                  ['Web Scraper', 'Scraping pagine web: testo, link, tabelle, selettori CSS'],
                  ['File Manager', 'Gestione file: crea cartelle, scrivi/leggi file, copia, sposta, elimina'],
                  ['HTTP Request', 'Chiama API REST: GET, POST, PUT, DELETE, PATCH con auth e headers'],
                  ['Text Transformer', 'Trasformazioni testo senza AI: regex, split, join, template, conteggio'],
                  ['Notifier', 'Notifiche: Slack, Discord, Telegram, webhook generici'],
                  ['JSON Parser', 'Parsing JSON: estrai campi, filtra, flatten, converti in CSV'],
                  ['Email Sender', 'Invio email via SMTP, Gmail, Outlook'],
                  ['File Search', 'Cerca file in locale, Dropbox, Google Drive, OneDrive'],
                  ['Email Search', 'Cerca email in Gmail, Outlook, IMAP'],
                  ['Project Analyzer', 'Analizza struttura e dipendenze di un progetto software'],
                  ['Telegram Bot', 'Telegram Bot API: messaggi, documenti, foto, aggiornamenti'],
                  ['WhatsApp', 'WhatsApp Business API: messaggi, template, documenti, immagini'],
                  ['PyArchInit', 'Query database PyArchInit: US, inventario, ceramica, siti, strutture'],
                  ['QGIS Project', 'Parsing progetti QGIS (.qgs/.qgz): layer, info, plugin, stili'],
                ]}
              />
            </Card>

            <Card title="Nodi Logica" subtitle="Controllano il flusso della pipeline" icon={Cpu} accent="cyan">
              <MiniTable
                headers={['Nodo', 'Funzione']}
                rows={[
                  ['Input', 'Punto di ingresso: testo, file, variabili'],
                  ['Output', 'Punto di uscita: risultato finale'],
                  ['Condition', 'Branch if/else (contains, score, regex, length)'],
                  ['Loop', 'Ripete fino a una condizione (keyword, score, LLM eval)'],
                  ['Aggregator', 'Combina risultati da branch paralleli'],
                  ['Meta-Agent', 'Esegue un sub-workflow ricorsivamente (max 3 livelli)'],
                  ['Chunker', 'Splitta testo lungo in chunk, processa ciascuno con un agente'],
                  ['Delay', 'Pausa N secondi tra nodi (rate limiting API, attese)'],
                  ['Switch', 'Branching multiplo N vie (keyword, regex, score match)'],
                  ['Validator', 'Quality gate AI: valida input con pass/fail (agente + criteri + strictness)'],
                ]}
              />
            </Card>

            <Card title="Robustezza" subtitle="Affidabilita e resilienza dei workflow" icon={Shield} accent="red">
              <MiniTable
                headers={['Funzione', 'Descrizione']}
                rows={[
                  ['Retry automatico', 'Ogni nodo puo ritentare N volte con backoff esponenziale (retryCount, retryDelay)'],
                  ['Gestione errori', 'onError: stop (blocca), skip (salta), fallback (valore di default)'],
                  ['Model Fallback', 'Se il modello AI primario fallisce, usa un modello di backup (fallbackModel)'],
                  ['Timeout globale', 'Limite di tempo per l\'intero workflow (default 300s)'],
                  ['Variable Store', 'Salva e condividi valori tra nodi con setVariable e {var:nome}'],
                ]}
              />
              <Tip>Aggiungi retry e fallback ai nodi critici cliccandoci sopra: trovi i campi nella sezione "Error Handling" della configurazione.</Tip>
            </Card>
          </div>
        </div>

        {/* ═══════ TUTORIAL ═══════ */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" /> Tutorial Passo-Passo
          </h2>
          <div className="space-y-2">

            {/* Tutorial 1 */}
            <Card title="Tutorial 1 — La Tua Prima Pipeline" subtitle="Input -> Agente -> Output in 5 minuti" icon={BookOpen} accent="blue">
              <Diagram>{`┌─────────┐     ┌───────────────┐     ┌──────────┐
│  INPUT   │────>│ Claude Sonnet  │────>│  OUTPUT  │
└─────────┘     └───────────────┘     └──────────┘`}</Diagram>
              <Steps items={[
                'Trascina un nodo Input dalla palette al canvas',
                'Trascina un nodo Agent (Claude Sonnet)',
                'Trascina un nodo Output',
                'Collega Input \u2192 Agent \u2192 Output trascinando tra i pallini',
                'Clicca sul nodo Agent per configurare il system prompt',
                'Premi Save, poi Run nella toolbar',
              ]} />
              <Prompt label="System Prompt consigliato:">{`Sei un assistente esperto. Rispondi in modo chiaro e conciso.`}</Prompt>
            </Card>

            {/* Tutorial 2 */}
            <Card title="Tutorial 2 — Traduttore Multi-Lingua" subtitle="Pattern Parallel — 3 lingue in contemporanea" icon={BookOpen} accent="blue">
              <Diagram>{`                 ┌──────────────────┐
              ┌─>│ Haiku: Inglese   │──┐
              │  └──────────────────┘  │
┌────────┐    │  ┌──────────────────┐  │  ┌────────────┐  ┌────────┐
│ INPUT  │───┼─>│ Haiku: Francese  │──┼─>│ AGGREGATOR │─>│ OUTPUT │
└────────┘    │  └──────────────────┘  │  └────────────┘  └────────┘
              │  ┌──────────────────┐  │
              └─>│ Haiku: Spagnolo  │──┘
                 └──────────────────┘`}</Diagram>
              <Steps items={[
                'Trascina 1 Input, 3 Agent (Haiku), 1 Aggregator, 1 Output',
                "Collega l'Input a tutti e 3 gli agenti",
                "Collega tutti e 3 all'Aggregator, poi all'Output",
              ]} />
              <Prompt label="Agente Inglese:">{`Traduci il seguente testo in inglese. Restituisci SOLO la traduzione.`}</Prompt>
              <Prompt label="Agente Francese:">{`Traduci il seguente testo in francese. Restituisci SOLO la traduzione.`}</Prompt>
              <Prompt label="Agente Spagnolo:">{`Traduci il seguente testo in spagnolo. Restituisci SOLO la traduzione.`}</Prompt>
              <Tip>Haiku e 10x piu economico e veloce di Sonnet — perfetto per traduzioni semplici.</Tip>
            </Card>

            {/* Tutorial 3 */}
            <Card title="Tutorial 3 — Ricerca Web + Report" subtitle="Pattern Sequential — cerca, analizza, scrivi" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────┐
│ INPUT  │─>│ Web Search │─>│   Sonnet    │─>│   Opus   │─>│ OUTPUT │
│ Topic  │  │            │  │  Analizza   │  │  Report  │  │        │
└────────┘  └────────────┘  └────────────┘  └──────────┘  └────────┘`}</Diagram>
              <Prompt label="Sonnet — Analizzatore:">{`Analizza i risultati di ricerca web. Per ogni fonte:
1. Estrai i punti chiave
2. Valuta l'affidabilita (alta/media/bassa)
3. Identifica le informazioni piu rilevanti`}</Prompt>
              <Prompt label="Opus — Report Writer:">{`Scrivi un report professionale con:
- Sommario esecutivo (3 righe)
- Sezioni tematiche
- Conclusioni e raccomandazioni
- Lista delle fonti`}</Prompt>
              <Tip>Sonnet estrae i dati, Opus scrive il report. Costo/qualita ottimizzati.</Tip>
            </Card>

            {/* Tutorial 4 */}
            <Card title="Tutorial 4 — Code Review Automatico" subtitle="Pattern Parallel + Aggregation — 3 reviewer specializzati" icon={BookOpen} accent="blue">
              <Diagram>{`              ┌──────────────────────┐
           ┌─>│ Sonnet: Bug Finder   │──┐
           │  └──────────────────────┘  │
┌────────┐ │  ┌──────────────────────┐  │  ┌────────────┐  ┌────────────┐  ┌────────┐
│ INPUT  │─┼─>│ Sonnet: Performance  │──┼─>│ AGGREGATOR │─>│   Opus:    │─>│ OUTPUT │
│ Codice │ │  └──────────────────────┘  │  └────────────┘  │  Verdetto  │  └────────┘
└────────┘ │  ┌──────────────────────┐  │                  └────────────┘
           └─>│ Sonnet: Security     │──┘
              └──────────────────────┘`}</Diagram>
              <Prompt label="Bug Finder:">{`Analizza il codice e trova: bug logici, edge case non gestiti, errori di tipo, race condition.
Rispondi in JSON: [{"line": N, "severity": "high|medium|low", "issue": "...", "fix": "..."}]`}</Prompt>
              <Prompt label="Performance:">{`Identifica: complessita algoritmica, memory leak, operazioni costose in loop, opportunita di caching.
Rispondi in JSON: [{"line": N, "impact": "high|medium|low", "issue": "...", "suggestion": "..."}]`}</Prompt>
              <Prompt label="Security:">{`Cerca: SQL injection, XSS, input insicuro, secrets hardcoded.
Rispondi in JSON: [{"line": N, "severity": "critical|high|medium|low", "vulnerability": "...", "remediation": "..."}]`}</Prompt>
            </Card>

            {/* Tutorial 5 */}
            <Card title="Tutorial 5 — Dibattito AI" subtitle="Pattern Debate — Pro vs Contro + Giudice" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌────────────────────────────────┐  ┌──────────────┐  ┌────────┐
│ INPUT  │─>│     DEBATE LOOP (3 round)      │─>│ Opus: Giudice│─>│ OUTPUT │
│ Topic  │  │  GPT-4o "Pro" <-> Sonnet "Contro"│  └──────────────┘  └────────┘
└────────┘  └────────────────────────────────┘`}</Diagram>
              <Prompt label="Avvocato Pro (GPT-4o):">{`Argomenta A FAVORE della posizione data.
Usa dati, statistiche, logica stringente.
Rispondi punto per punto. Max 300 parole per round.`}</Prompt>
              <Prompt label="Avvocato Contro (Sonnet):">{`Argomenta CONTRO la posizione data.
Usa dati, statistiche, logica stringente.
Rispondi punto per punto. Max 300 parole per round.`}</Prompt>
              <Tip>Usare GPT-4o vs Claude evita il bias di un singolo modello. Il giudice (Opus) sintetizza.</Tip>
            </Card>

            {/* Tutorial 6 */}
            <Card title="Tutorial 6 — Documenti con RAG" subtitle="Pattern RAG — carica PDF, ottieni risposte con citazioni" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌─────────────┐  ┌────────────────┐  ┌────────────┐  ┌────────┐
│ INPUT  │─>│ File Reader │─>│ Vector Store   │─>│   Sonnet   │─>│ OUTPUT │
│  PDF   │  │  (parser)   │  │ (search chunks)│  │ + contesto │  │ + cite │
└────────┘  └─────────────┘  └────────────────┘  └────────────┘  └────────┘`}</Diagram>
              <Prompt label="Sonnet con RAG:">{`Rispondi basandoti ESCLUSIVAMENTE sui documenti forniti.
- Ogni affermazione con citazione [Fonte: nome_doc, pag. N]
- Se non trovi l'info, dillo
- Non inventare mai`}</Prompt>
            </Card>

            {/* Tutorial 7 */}
            <Card title="Tutorial 7 — Pipeline Archeologica" subtitle="Sequential + Parallel — classifica, confronta, genera scheda RA" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌──────────────┐  ┌─────────────────────────┐  ┌────────┐
│ INPUT  │─>│ GPT-4o Vision│─>│       PARALLEL          │─>│ OUTPUT │
│Foto+Dati│  │ Classifica   │  │ DB Query + Sonnet Analisi│  │ Scheda │
└────────┘  └──────────────┘  │     -> Opus: Scheda RA   │  └────────┘
                               └─────────────────────────┘`}</Diagram>
              <Prompt label="GPT-4o Vision — Classificatore:">{`Analizza l'immagine del reperto:
1. Tipo (ceramica, litica, metallo...)
2. Classe, Forma, Dimensioni stimate
3. Stato di conservazione
4. Periodo probabile
Rispondi in JSON strutturato.`}</Prompt>
              <Prompt label="Opus — Scheda RA:">{`Genera scheda RA (Reperto Archeologico) secondo lo standard ministeriale italiano.
Campi: inventario, sito, area/US, classe, tipo, descrizione,
dimensioni, conservazione, cronologia, confronti, bibliografia.`}</Prompt>
            </Card>

            {/* Tutorial 8 */}
            <Card title="Tutorial 8 — Auto-Refine Loop" subtitle="Pattern Loop — genera, critica, migliora iterativamente" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌─────────────────────────────────┐  ┌────────┐
│ INPUT  │─>│        LOOP (max 3 iter)        │─>│ OUTPUT │
│ Brief  │  │  Sonnet: Genera -> Opus: Critica │  │ Finale │
└────────┘  │        <── feedback se < 8 ──    │  └────────┘
             └─────────────────────────────────┘`}</Diagram>
              <Prompt label="Generatore (Sonnet):">{`Genera/migliora il contenuto richiesto.
Se ricevi feedback dal critico, incorpora TUTTI i suggerimenti.`}</Prompt>
              <Prompt label="Critico (Opus):">{`Valuta su 4 criteri (1-10): Completezza, Accuratezza, Chiarezza, Originalita.
SE score >= 8: rispondi "APPROVED"
SE score < 8: feedback specifico con cosa manca e come migliorare`}</Prompt>
            </Card>

            {/* Tutorial 9 */}
            <Card title="Tutorial 9 — Content Factory" subtitle="Pattern Misto — da un topic genera blog, social, newsletter" icon={BookOpen} accent="blue">
              <Diagram>{`             ┌─────────────────┐
          ┌─>│ Sonnet: Blog    │──┐
          │  ├─────────────────┤  │
┌────────┐│  │ Haiku: Twitter  │  │  ┌────────────┐  ┌────────┐
│ INPUT  │┤  ├─────────────────┤  ├─>│ AGGREGATOR │─>│ OUTPUT │
│ Topic  ││  │ Haiku: LinkedIn │  │  └────────────┘  └────────┘
└────────┘│  ├─────────────────┤  │
          └─>│ Sonnet: Newsletter──┘
             └─────────────────┘`}</Diagram>
              <Prompt label="Blog Post (Sonnet):">{`Scrivi un blog post SEO-friendly: titolo H1, sottotitoli H2, intro hook, CTA finale. Markdown.`}</Prompt>
              <Prompt label="Twitter Thread (Haiku):">{`Thread 5-7 tweet: hook, punti chiave con dati, CTA, hashtag. Max 280 char/tweet.`}</Prompt>
            </Card>

            {/* Tutorial 10 */}
            <Card title="Tutorial 10 — Validazione Output" subtitle="Pattern Validate + Retry — genera, valida, correggi" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌─────────────────────────────────────────┐  ┌────────┐
│ INPUT  │─>│          LOOP (max 3 iter)               │─>│ OUTPUT │
│ Brief  │  │ Sonnet: Genera -> Haiku: Valida formato  │  │Validato│
└────────┘  │    <── se invalido, feedback + retry ──  │  └────────┘
             └─────────────────────────────────────────┘`}</Diagram>
              <Steps items={[
                'Input fornisce il brief (es. "Scrivi un JSON con nome, eta, email")',
                'Sonnet genera il contenuto nel formato richiesto',
                'Haiku valida: controlla formato, completezza, correttezza',
                'Se invalido: feedback specifico e rigenera (max 3 tentativi)',
              ]} />
              <Prompt label="Validatore (Haiku):">{`Valida se l'output rispetta il formato richiesto.
Se VALIDO: rispondi solo "APPROVED"
Se INVALIDO: spiega cosa manca e come correggerlo.`}</Prompt>
            </Card>

            {/* Tutorial 11 */}
            <Card title="Tutorial 11 — Fallback Modello" subtitle="Pattern Fallback — Claude primario, GPT-4o di backup" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐  ┌────────┐
│ INPUT  │─>│  Sonnet  │─>│ Condition │─>│ GPT-4o       │─>│ OUTPUT │
│  Task  │  │ Primario │  │ Qualita?  │  │ Backup       │  │        │
└────────┘  └──────────┘  └───────────┘  └──────────────┘  └────────┘
                                │ true ──────────────────────>│`}</Diagram>
              <Steps items={[
                'Sonnet prova per primo a completare il task',
                'Il nodo Condition valuta la qualita della risposta (score >= 7)',
                'Se OK (true): output diretto',
                'Se scarso (false): GPT-4o rigenera da zero come backup',
              ]} />
              <Tip>Usa questo pattern per task critici dove serve un fallback. Costo extra solo quando il primario fallisce.</Tip>
            </Card>

            {/* Tutorial 12 */}
            <Card title="Tutorial 12 — Quality Gate" subtitle="Pattern Quality Gate — score >= 7 o rigenera con feedback" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌─────────────────────────────────────────┐  ┌────────┐
│ INPUT  │─>│          LOOP (max 3 iter)               │─>│ OUTPUT │
│  Task  │  │ Sonnet: Genera -> Opus: Score 1-10       │  │  Best  │
└────────┘  │   <── se score < 7, feedback + retry ──  │  └────────┘
             └─────────────────────────────────────────┘`}</Diagram>
              <Prompt label="Quality Scorer (Opus):">{`Valuta la qualita del testo (1-10) su: Completezza, Accuratezza, Chiarezza, Stile.
SE score >= 7: rispondi "SCORE: N - APPROVED"
SE score < 7: rispondi "SCORE: N - REJECTED" + feedback dettagliato per migliorare`}</Prompt>
              <Tip>Il quality gate garantisce un livello minimo di qualita. Opus come giudice e la scelta migliore per valutazioni affidabili.</Tip>
            </Card>

            {/* Tutorial 13 */}
            <Card title="Tutorial 13 — ML Pipeline" subtitle="Pattern ML — addestra e confronta modelli su CSV" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐    ┌──────────────────┐
│ INPUT  │ ┌─>│ ML: Random Forest│──┐
│  CSV   │─┤  └──────────────────┘  │  ┌────────────┐  ┌──────────┐  ┌────────┐
└────────┘ │  ┌──────────────────┐  ├─>│ AGGREGATOR │─>│  Sonnet  │─>│ OUTPUT │
           └─>│ ML: Grad.Boost.  │──┘  └────────────┘  │ Confronto│  └────────┘
              └──────────────────┘                      └──────────┘`}</Diagram>
              <Steps items={[
                'Input: dati CSV (incolla o path al file)',
                'Due nodi ML Pipeline in parallelo: Random Forest e Gradient Boosting',
                'Aggregator unisce i risultati dei due training',
                'Sonnet analizza e confronta le metriche dei due modelli',
              ]} />
              <Prompt label="Confronto Modelli (Sonnet):">{`Confronta i risultati dei due modelli ML.
Indica quale performa meglio e perche, suggerendo il modello da usare in produzione.`}</Prompt>
              <Tip>Supporta 5 tipi di modello: Random Forest, Gradient Boosting, Linear, SVM, KNN. Auto-detect classificazione vs regressione.</Tip>
            </Card>

            {/* Tutorial 14 */}
            <Card title="Tutorial 14 — Website Generator" subtitle="Pattern Parallel — 3 specialisti generano un sito web completo" icon={BookOpen} accent="blue">
              <Diagram>{`              ┌──────────────────┐
           ┌─>│ Sonnet: HTML     │──┐
           │  └──────────────────┘  │
┌────────┐ │  ┌──────────────────┐  │  ┌────────────┐  ┌──────────┐  ┌────────┐
│ INPUT  │─┼─>│ Sonnet: CSS      │──┼─>│ AGGREGATOR │─>│ Website  │─>│ OUTPUT │
│ Brief  │ │  └──────────────────┘  │  └────────────┘  │  Gen ZIP │  │  Sito  │
└────────┘ │  ┌──────────────────┐  │                  └──────────┘  └────────┘
           └─>│ Sonnet: JS       │──┘
              └──────────────────┘`}</Diagram>
              <Steps items={[
                'Input descrive il sito desiderato (es. "landing page per app di meditazione")',
                '3 agenti in parallelo: HTML designer, CSS designer, JS developer',
                'Aggregator combina i 3 output',
                'Website Generator impacchetta tutto come ZIP scaricabile',
              ]} />
              <Tip>Ogni agente si concentra sul suo linguaggio. Il risultato e un file ZIP con index.html, style.css e script.js pronti.</Tip>
            </Card>

            {/* Tutorial 15 */}
            <Card title="Tutorial 15 — Chunker Documento" subtitle="Pattern Chunker — splitta, analizza ogni chunk, sintetizza" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────────┐  ┌────────────────────────────┐  ┌─────────────┐  ┌────────┐
│   INPUT    │─>│   CHUNKER (800 chars)      │─>│   Sonnet    │─>│ OUTPUT │
│ Doc Lungo  │  │ Haiku analizza ogni chunk   │  │ Sintetizza  │  │Summary │
└────────────┘  └────────────────────────────┘  └─────────────┘  └────────┘`}</Diagram>
              <Steps items={[
                'Input: documento lungo (testo, articolo, capitoli)',
                'Chunker splitta in pezzi da 800 caratteri con 100 di overlap',
                'Per ogni chunk, Haiku estrae riassunto + concetti chiave',
                'Sonnet sintetizza tutti i riassunti in un executive summary finale',
              ]} />
              <Prompt label="Chunker (Haiku per chunk):">{`Per ogni chunk del documento, produci:
1. Riassunto di 2-3 frasi
2. Concetti chiave (lista puntata)
3. Parole chiave principali`}</Prompt>
              <Tip>Il Chunker e ideale per documenti troppo lunghi per un singolo contesto. L'overlap evita di perdere info ai confini dei chunk.</Tip>
            </Card>

            {/* Tutorial 16 */}
            <Card title="Tutorial 16 — Meta-Agent" subtitle="Pattern Meta-Agent — sub-workflow ricorsivo" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌──────────────┐  ┌─────────────────────────┐  ┌──────────┐  ┌────────┐
│ INPUT  │─>│ Orchestratore│─>│    META-AGENT           │─>│  Editor  │─>│ OUTPUT │
│ Task   │  │   Sonnet     │  │ ┌─────────────────────┐ │  │  Sonnet  │  │ Report │
└────────┘  └──────────────┘  │ │ Sub: Ricercatore A  │ │  └──────────┘  └────────┘
                               │ │ Sub: Ricercatore B  │ │
                               │ │ Sub: Aggregator     │ │
                               │ └─────────────────────┘ │
                               └─────────────────────────┘`}</Diagram>
              <Steps items={[
                "L'Orchestratore scompone il task complesso in sotto-task",
                'Il Meta-Agent esegue un sub-workflow interno (2 ricercatori + aggregator)',
                "L'Editor finale compone il report usando tutto il materiale raccolto",
                'Profondita massima configurabile (default: 3 livelli)',
              ]} />
              <Tip>Il Meta-Agent permette workflow ricorsivi: un workflow dentro un workflow. Utile per task molto complessi che richiedono sotto-pipeline dedicate.</Tip>
            </Card>

            {/* Tutorial 17 */}
            <Card title="Tutorial 17 — GIS Analysis" subtitle="Pattern Parallel — analisi geospaziale con mappa interattiva" icon={BookOpen} accent="blue">
              <Diagram>{`              ┌────────────────┐
           ┌─>│  GIS: Info     │──┐
           │  └────────────────┘  │  ┌────────────┐  ┌──────────┐
┌────────┐ │  ┌────────────────┐  ├─>│ Aggregator │─>│  Sonnet  │──┐
│ INPUT  │─┤  │ GIS: Analisi V.│──┘  │  (dati)    │  │  Report  │  │  ┌──────────┐  ┌────────┐
│ .gpkg  │ │  └────────────────┘     └────────────┘  └──────────┘  ├─>│Aggregator│─>│ OUTPUT │
└────────┘ │                                                       │  │(report+  │  │  GIS   │
           │  ┌────────────────┐                                   │  │ mappa)   │  └────────┘
           └─>│  GIS: Mappa    │───────────────────────────────────┘  └──────────┘
              └────────────────┘`}</Diagram>
              <Steps items={[
                'Input: carica file GIS (shapefile, geopackage, GeoTIFF)',
                'Info + Analisi Vettoriale → Aggregator → Sonnet scrive il report',
                'Genera Mappa → produce GeoJSON con mappa interattiva Leaflet',
                'Aggregator finale unisce report testuale + mappa interattiva',
                'Output contiene sia il report che la mappa navigabile',
              ]} />
              <Prompt label="Report GIS (Sonnet):">{`Sei un esperto GIS. Crea un report che descriva:
1. Il dataset (CRS, features, estensione)
2. Statistiche geometriche (aree, lunghezze, centroidi)
3. Pattern spaziali identificati
4. Suggerimenti per ulteriori analisi`}</Prompt>
              <Tip>La mappa bypassa l'agente AI e arriva direttamente all'output come mappa interattiva Leaflet. Supporta: .shp, .gpkg, .tif. Operazioni: info, vector/raster/DEM analysis, buffer, overlay, reproject.</Tip>
            </Card>

            {/* Tutorial 18 */}
            <Card title="Tutorial 18 — Web Scraper + Analisi" subtitle="Scraping parallelo: testo, link, tabelle da qualsiasi pagina" icon={BookOpen} accent="blue">
              <Diagram>{`                 ┌──────────────────┐
              ┌─>│ Scraper: Testo   │──┐
              │  └──────────────────┘  │
┌────────┐    │  ┌──────────────────┐  │  ┌────────────┐  ┌──────────┐  ┌────────┐
│ INPUT  │───┼─>│ Scraper: Link    │──┼─>│ AGGREGATOR │─>│  Sonnet  │─>│ OUTPUT │
│  URL   │    │  └──────────────────┘  │  └────────────┘  │ Analista │  └────────┘
└────────┘    │  ┌──────────────────┐  │
              └─>│ Scraper: Tabelle │──┘
                 └──────────────────┘`}</Diagram>
              <Steps items={[
                'Input: URL della pagina da analizzare',
                '3 nodi Web Scraper in parallelo: extract_text, extract_links, extract_tables',
                'Aggregator unisce i 3 risultati',
                'Sonnet analizza tutto e produce un report strutturato',
              ]} />
              <Tip>Usa il Web Scraper per pagine pubbliche. Per API protette da autenticazione, usa HTTP Request con header Authorization.</Tip>
            </Card>

            {/* Tutorial 19 */}
            <Card title="Tutorial 19 — HTTP API Chain" subtitle="Chiama API, parsa JSON, analizza con AI" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────┐
│ INPUT  │─>│ HTTP GET   │─>│ JSON Parse │─>│  Sonnet  │─>│ OUTPUT │
│API URL │  │  (retry:2) │  │  flatten   │  │ Analista │  │ Report │
└────────┘  └────────────┘  └────────────┘  └──────────┘  └────────┘`}</Diagram>
              <Steps items={[
                'Input: URL dell\'API (es. https://api.example.com/data)',
                'HTTP Request (GET) chiama l\'API con retry automatico',
                'JSON Parser appiattisce la risposta in tabella leggibile',
                'Sonnet analizza i dati e scrive un report',
              ]} />
              <Prompt label="Config HTTP Request:">{`method: GET
urlTemplate: {input}
retryCount: 2
retryDelay: 3`}</Prompt>
              <Prompt label="Config JSON Parser:">{`operation: flatten`}</Prompt>
              <Tip>Aggiungi authType: "bearer" e authToken per API autenticate. Usa urlTemplate con {'{'}{'{'}input{'}'}{'{}'} per URL dinamici.</Tip>
            </Card>

            {/* Tutorial 20 */}
            <Card title="Tutorial 20 — Text Transformer" subtitle="Regex, template e manipolazione testo senza AI" icon={BookOpen} accent="blue">
              <Diagram>{`                 ┌───────────────────┐
              ┌─>│ Regex: Email      │──┐
              │  └───────────────────┘  │
┌────────┐    │  ┌───────────────────┐  │  ┌────────────┐  ┌────────┐
│ INPUT  │───┼─>│ Count: Statistiche│──┼─>│ AGGREGATOR │─>│ OUTPUT │
│ Testo  │    │  └───────────────────┘  │  └────────────┘  └────────┘
└────────┘    │  ┌───────────────────┐  │
              └─>│ Template: Report  │──┘
                 └───────────────────┘`}</Diagram>
              <Steps items={[
                'Input: testo con dati (nomi, email, numeri)',
                'regex_extract: trova tutti gli indirizzi email con pattern',
                'count: calcola parole, caratteri, righe',
                'template: formatta il tutto in un report strutturato',
              ]} />
              <Prompt label="Pattern regex per email:">{`[\\w.+-]+@[\\w-]+\\.[\\w.]+`}</Prompt>
              <Tip>Il Text Transformer non usa AI — e istantaneo e gratuito. Ideale per pre-processare dati prima di passarli a un agente.</Tip>
            </Card>

            {/* Tutorial 21 */}
            <Card title="Tutorial 21 — Notifiche Multi-Canale" subtitle="Genera report e notifica Slack + salva su file" icon={BookOpen} accent="blue">
              <Diagram>{`                                ┌────────────────┐
                             ┌─>│ Notifier:      │──┐
                             │  │ Slack/Webhook   │  │
┌────────┐  ┌──────────┐    │  └────────────────┘  │  ┌────────────┐  ┌────────┐
│ INPUT  │─>│  Haiku   │───┼                       ├─>│ AGGREGATOR │─>│ OUTPUT │
│Argomento│  │  Report  │    │  ┌────────────────┐  │  └────────────┘  └────────┘
└────────┘  └──────────┘    └─>│ File Manager:  │──┘
                                │ Salva .md      │
                                └────────────────┘`}</Diagram>
              <Steps items={[
                'Input: argomento del report',
                'Haiku genera un breve report (con setVariable per salvarlo)',
                'In parallelo: Notifier invia a Slack/webhook + File Manager salva su disco',
                'Aggregator raccoglie i risultati delle due operazioni',
              ]} />
              <Tip>Il Notifier supporta anche Discord (embed) e Telegram (bot API). Configura webhookUrl nel pannello del nodo.</Tip>
            </Card>

            {/* Tutorial 22 */}
            <Card title="Tutorial 22 — Delay + Rate Limiting" subtitle="Pattern Delay — pausa tra chiamate API per rispettare i limiti" icon={Clock} accent="blue">
              <Diagram>{`┌────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌────────┐
│ INPUT  │─>│ HTTP GET │─>│ DELAY   │─>│ HTTP GET │─>│ DELAY   │─>│  Sonnet  │─>│ OUTPUT │
│ API 1  │  │ Endpoint1│  │   3s    │  │ Endpoint2│  │   3s    │  │ Confronta│  │ Report │
└────────┘  └──────────┘  └─────────┘  └──────────┘  └─────────┘  └──────────┘  └────────┘`}</Diagram>
              <Steps items={[
                'Input: base URL dell\'API',
                'HTTP GET chiama il primo endpoint',
                'Delay 3 secondi — rispetta il rate limit dell\'API',
                'HTTP GET chiama il secondo endpoint',
                'Delay 3 secondi',
                'Sonnet confronta e analizza i due risultati',
              ]} />
              <Prompt label="Config Delay:">{`delaySeconds: 3`}</Prompt>
              <Tip>Il nodo Delay passa l'input invariato all'output. Usalo tra chiamate API per evitare errori 429 (Too Many Requests).</Tip>
            </Card>

            {/* Tutorial 23 */}
            <Card title="Tutorial 23 — Switch: Routing Intelligente" subtitle="Pattern Switch — indirizza input a specialisti diversi" icon={GitFork} accent="blue">
              <Diagram>{`              ┌──────────────────┐
           ┌─>│ Sonnet: Tecnico  │──┐
           │  └──────────────────┘  │
┌────────┐ │  ┌──────────────────┐  │  ┌────────────┐  ┌────────┐
│ INPUT  │─┤─>│ Haiku: Commerc.  │──┼─>│ AGGREGATOR │─>│ OUTPUT │
│Domanda │ │  └──────────────────┘  │  └────────────┘  └────────┘
└────────┘ │  ┌──────────────────┐  │
           └─>│ GPT-4o: Creativo │──┘
              └──────────────────┘

              ▲ SWITCH (keyword) ▲
    "codice"=Tecnico  "vendita"=Commerciale  default=Creativo`}</Diagram>
              <Steps items={[
                'Input: domanda dell\'utente (testo libero)',
                'Switch (keyword): analizza parole chiave nell\'input',
                'Se contiene "codice", "bug", "API" → Sonnet Tecnico',
                'Se contiene "vendita", "prezzo", "cliente" → Haiku Commerciale',
                'Default → GPT-4o Creativo (per tutto il resto)',
              ]} />
              <Prompt label="Config Switch:">{`switchType: keyword
Collega 3 edge con label:
- "codice" → nodo Tecnico
- "vendita" → nodo Commerciale
- "default" → nodo Creativo`}</Prompt>
              <Tip>Lo Switch e piu potente del Condition: supporta N uscite (non solo true/false). Usa "regex" per pattern complessi o "score" per valutazioni numeriche.</Tip>
            </Card>

            {/* Tutorial 24 */}
            <Card title="Tutorial 24 — Switch + Delay Combo" subtitle="Classifica, attendi, poi processa con lo specialista giusto" icon={GitFork} accent="blue">
              <Diagram>{`                                         ┌─────────┐  ┌──────────────┐
                                      ┌─>│ DELAY 2s│─>│Sonnet: Analisi│──┐
                                      │  └─────────┘  └──────────────┘  │
┌────────┐  ┌──────────────┐  ┌──────┐│  ┌─────────┐  ┌──────────────┐  │  ┌────────┐
│ INPUT  │─>│ Haiku:       │─>│SWITCH│┤  │ DELAY 1s│─>│Haiku: Risposta│──┼─>│ OUTPUT │
│ Ticket │  │ Classificatore│  │      ││  └─────────┘  └──────────────┘  │  └────────┘
└────────┘  └──────────────┘  └──────┘│  ┌─────────┐  ┌──────────────┐  │
                                      └─>│ DELAY 5s│─>│Opus: Escalation│─┘
                                         └─────────┘  └──────────────┘`}</Diagram>
              <Steps items={[
                'Input: ticket di supporto',
                'Haiku classifica il ticket (urgenza: alta/media/bassa)',
                'Switch (keyword) indirizza per priorita',
                'Alta: Delay 2s + Sonnet analisi approfondita',
                'Media: Delay 1s + Haiku risposta rapida',
                'Bassa: Delay 5s (batch) + Opus escalation review',
              ]} />
              <Prompt label="Classificatore (Haiku):">{`Classifica il ticket in: "alta", "media", "bassa" urgenza.
Rispondi con UNA sola parola.`}</Prompt>
              <Tip>Combina Switch + Delay per creare code di priorita. Delay diversi simulano SLA differenti per ogni livello.</Tip>
            </Card>

            {/* Tutorial 25 */}
            <Card title="Tutorial 25 — Variable Store + File Manager" subtitle="Salva variabili tra nodi e scrivi risultati su file" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐
│ INPUT  │─>│    Sonnet    │─>│    Haiku     │─>│ File Manager │─>│ OUTPUT │
│  Brief │  │  setVar:     │  │  usa {var:   │  │  write_file  │  │Risultato│
└────────┘  │  "ricerca"   │  │   ricerca}   │  │  output.md   │  └────────┘
            └──────────────┘  └──────────────┘  └──────────────┘`}</Diagram>
              <Steps items={[
                'Input: brief del progetto',
                'Sonnet fa ricerca e salva output come variabile "ricerca" (setVariable)',
                'Haiku legge la variabile {var:ricerca} nel suo prompt e produce un sommario',
                'File Manager scrive il risultato finale su disco',
              ]} />
              <Prompt label="Config Sonnet:">{`setVariable: ricerca`}</Prompt>
              <Prompt label="System Prompt Haiku:">{`Usa i dati di ricerca seguenti per creare un sommario esecutivo:
{var:ricerca}`}</Prompt>
              <Tip>Le variabili {'{'}var:nome{'}'} funzionano in qualsiasi campo testo dei nodi successivi. Usale per passare dati specifici senza concatenare tutto l'output.</Tip>
            </Card>

            {/* Tutorial 26 */}
            <Card title="Tutorial 26 — Delay: Rate Limiting API" subtitle="Pausa tra chiamate HTTP per rispettare i limiti" icon={Clock} accent="blue">
              <Diagram>{`┌────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌────────┐
│ INPUT  │─>│ HTTP GET │─>│ DELAY   │─>│ HTTP GET │─>│ DELAY   │─>│  Haiku   │─>│ OUTPUT │
│API URL │  │ /get     │  │   3s    │  │ /headers │  │   2s    │  │ Confronta│  │ Report │
└────────┘  └──────────┘  └─────────┘  └──────────┘  └─────────┘  └──────────┘  └────────┘`}</Diagram>
              <Steps items={[
                'Input: base URL (es. https://httpbin.org)',
                'HTTP GET chiama il primo endpoint con retry automatico',
                'Delay 3s — rispetta il rate limit',
                'HTTP GET chiama il secondo endpoint',
                'Delay 2s — altra pausa',
                'Haiku confronta e analizza le due risposte',
              ]} />
              <Tip>Il nodo Delay passa l'input invariato. Usalo tra API per evitare 429 (Too Many Requests). Configura delaySeconds nel pannello.</Tip>
            </Card>

            {/* Tutorial 27 */}
            <Card title="Tutorial 27 — Switch: Routing Intelligente" subtitle="Indirizza input a specialisti diversi per keyword" icon={GitFork} accent="blue">
              <Diagram>{`              ┌──────────────────┐
           ┌─>│ Sonnet: Tecnico  │──┐      edge label: "bug"
           │  └──────────────────┘  │
┌────────┐ │  ┌──────────────────┐  │  ┌────────────┐  ┌────────┐
│ INPUT  │─┤─>│ Haiku: Commerc.  │──┼─>│ AGGREGATOR │─>│ OUTPUT │
│Domanda │ │  └──────────────────┘  │  └────────────┘  └────────┘
└────────┘ │  ┌──────────────────┐  │      edge label: "prezzo"
     │     └─>│ Haiku: Generale  │──┘
  SWITCH      └──────────────────┘
 (keyword)        edge label: "default"`}</Diagram>
              <Steps items={[
                'Input: domanda dell\'utente (testo libero)',
                'Switch (keyword): cerca parole chiave nell\'input',
                'Edge "bug" → Sonnet esperto tecnico se contiene "bug", "codice", "errore"',
                'Edge "prezzo" → Haiku commerciale se contiene "prezzo", "costo"',
                'Edge "default" → Haiku generale per tutto il resto',
                'Solo il branch che matcha viene eseguito, gli altri sono skippati',
              ]} />
              <Tip>Le label degli edge devono corrispondere alle keyword cercate dallo Switch. Usa "default" come catch-all. Supporta anche regex e score.</Tip>
            </Card>

            {/* Tutorial 28 */}
            <Card title="Tutorial 28 — Switch + Delay: Ticket con SLA" subtitle="Classifica urgenza, assegna delay diversi per priorità" icon={GitFork} accent="blue">
              <Diagram>{`                                              ┌───────────────────┐
                                           ┌─>│ Sonnet: Emergenza │──┐   "critico"
                                           │  └───────────────────┘  │
┌────────┐  ┌──────────────┐  ┌──────────┐│  ┌─────┐ ┌───────────┐  │  ┌─────┐  ┌────────┐
│ INPUT  │─>│ Haiku:       │─>│  SWITCH  │┤  │DEL 2│>│Haiku:Alta │  ├─>│ AGG │─>│ OUTPUT │
│ Ticket │  │ Classificato │  │ (keyword)││  └─────┘ └───────────┘  │  └─────┘  └────────┘
└────────┘  └──────────────┘  └──────────┘│  ┌─────┐ ┌───────────┐  │   "alto"
                                           └─>│DEL 5│>│Haiku:Norm.│──┘
                                              └─────┘ └───────────┘   "default"`}</Diagram>
              <Steps items={[
                'Input: ticket di supporto con descrizione del problema',
                'Haiku classifica in: "critico", "alto", o "normale"',
                'Switch indirizza per parola chiave classificata',
                'Critico: risposta immediata da Sonnet (nessun delay)',
                'Alto: Delay 2s + Haiku risposta dettagliata',
                'Normale: Delay 5s + Haiku risposta standard',
              ]} />
              <Tip>Combina Switch + Delay per simulare code di priorità con SLA differenti. I Delay rappresentano i tempi di attesa per priorità.</Tip>
            </Card>

            {/* Tutorial 29 */}
            <Card title="Tutorial 29 — Triple Pipeline: AI SaaS Report" subtitle="3 input paralleli → incrocio → validazione → executive report" icon={Rocket} accent="blue">
              <Diagram>{`┌──────────┐  ┌──────────┐  ┌──────────┐
│ Mercato  │  │  Tech    │  │ Business │   3 INPUT PARALLELI
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐
│ Analista │  │Architetto│  │Strategist│   3 AGENTI SPECIALISTI
│ Mercato  │  │ Software │  │ Business │   (con setVariable)
└────┬─────┘  └────┬─────┘  └────┬─────┘
     └─────────────┼─────────────┘
              ┌────▼─────┐
              │ AGGREGAT │  INCROCIO ANALISI
              └────┬─────┘
        ┌──────────┼──────────┐
   ┌────▼────┐┌────▼────┐┌────▼────┐
   │Validatore││  Risk   ││  KPI   │   VALIDAZIONE INCROCIATA
   │Coerenza ││Analyzer ││ Synth  │
   └────┬────┘└────┬────┘└────┬────┘
        └──────────┼──────────┘
              ┌────▼─────┐
              │ DELAY 2s │  PAUSA REVIEW
              └────┬─────┘
              ┌────▼─────┐
              │ AGGREGAT │+ output originali
              └────┬─────┘
              ┌────▼─────┐
              │  Sonnet  │  EXECUTIVE REPORT WRITER
              │ C-Level  │  (con fallback gpt-4o)
              └────┬─────┘
         ┌─────────┼─────────┐
    ┌────▼────┐         ┌────▼────┐
    │  SAVE   │         │ OUTPUT  │
    │  .md    │         │ Report  │
    └─────────┘         └─────────┘`}</Diagram>
              <Steps items={[
                '3 Input paralleli: dati mercato, stack tecnico, obiettivi business',
                '3 Agenti specialisti analizzano in parallelo (setVariable per salvare)',
                'Aggregator incrocia le 3 analisi',
                '3 Agenti di validazione in parallelo: coerenza, rischi, KPI',
                'Delay 2s per review',
                'Aggregator finale assembla tutto (analisi + validazioni)',
                'Sonnet C-level scrive l\'executive report (con fallback su GPT-4o)',
                'Output doppio: salva su file + mostra a schermo',
              ]} />
              <Tip>Questo workflow usa: 3 input paralleli, 6 agenti, aggregation multipla, setVariable per condivisione dati, delay, model fallback, retry, e file save. E il pattern piu complesso disponibile.</Tip>
            </Card>
            {/* Tutorial 30 */}
            <Card title="Tutorial 30 — Telegram Bot: Report Automatico" subtitle="Genera report con AI e invia su Telegram" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌──────────┐  ┌──────────────────┐  ┌────────┐
│ INPUT  │─>│  Sonnet  │─>│  Telegram Bot    │─>│ OUTPUT │
│ Topic  │  │  Report  │  │  send_message    │  │Conferma│
└────────┘  └──────────┘  └──────────────────┘  └────────┘`}</Diagram>
              <Steps items={[
                'Input: argomento del report',
                'Sonnet genera un report in Markdown',
                'Telegram Bot invia il report al canale/chat configurato',
                'Output conferma l\'invio',
              ]} />
              <MiniTable
                headers={['Operazione', 'Descrizione']}
                rows={[
                  ['send_message', 'Invia messaggio testuale (Markdown/HTML)'],
                  ['send_document', 'Invia file (PDF, CSV, ZIP...)'],
                  ['send_photo', 'Invia foto (path locale o URL)'],
                  ['get_updates', 'Leggi gli ultimi messaggi ricevuti'],
                  ['get_chat_info', 'Info su una chat/gruppo/canale'],
                ]}
              />
              <Prompt label="Config Telegram Bot:">{`operation: send_message
botToken: (da .env TELEGRAM_BOT_TOKEN)
chatId: -100123456789
parseMode: Markdown`}</Prompt>
              <Tip>Crea il bot con @BotFather su Telegram. Il chat_id lo trovi inviando un messaggio al bot e chiamando get_updates.</Tip>
            </Card>

            {/* Tutorial 31 */}
            <Card title="Tutorial 31 — WhatsApp: Notifica Clienti" subtitle="Genera contenuto e invia via WhatsApp Business" icon={BookOpen} accent="blue">
              <Diagram>{`┌────────┐  ┌──────────┐  ┌──────────────────┐  ┌────────┐
│ INPUT  │─>│  Haiku   │─>│    WhatsApp      │─>│ OUTPUT │
│ Evento │  │ Messaggio│  │  send_message    │  │Conferma│
└────────┘  └──────────┘  └──────────────────┘  └────────┘`}</Diagram>
              <Steps items={[
                'Input: descrizione dell\'evento/notifica',
                'Haiku genera un messaggio breve e professionale',
                'WhatsApp invia al numero del cliente',
                'Output conferma l\'invio con message ID',
              ]} />
              <MiniTable
                headers={['Operazione', 'Descrizione']}
                rows={[
                  ['send_message', 'Invia messaggio di testo (max 4096 chars)'],
                  ['send_template', 'Invia template pre-approvato da Meta'],
                  ['send_document', 'Invia documento via URL pubblico'],
                  ['send_image', 'Invia immagine via URL pubblico'],
                ]}
              />
              <Prompt label="Config WhatsApp:">{`operation: send_message
recipient: 39xxxxxxxxxx (con prefisso internazionale)
Credenziali: WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID nel .env`}</Prompt>
              <Tip>Per usare WhatsApp Business API serve un account Meta Business verificato. I template devono essere pre-approvati da Meta prima dell'invio.</Tip>
            </Card>

            {/* Tutorial 32 */}
            <Card title="Tutorial 32 — PyArchInit: Analisi Stratigrafica" subtitle="Query database archeologico + analisi AI" icon={BookOpen} accent="blue">
              <Diagram>{`              ┌──────────────────┐
           ┌─>│ PyArchInit:      │──┐
           │  │ query_us         │  │
┌────────┐ │  └──────────────────┘  │  ┌────────────┐  ┌──────────┐  ┌────────┐
│ INPUT  │─┤                        ├─>│ AGGREGATOR │─>│  Sonnet  │─>│ OUTPUT │
│  Sito  │ │  ┌──────────────────┐  │  └────────────┘  │ Analisi  │  │ Report │
└────────┘ └─>│ PyArchInit:      │──┘                  └──────────┘  └────────┘
              │ query_inventory  │
              └──────────────────┘`}</Diagram>
              <Steps items={[
                'Input: nome del sito (es. "Pompeii")',
                'Due query in parallelo: US (stratigrafia) e Inventario materiali',
                'Aggregator unisce i risultati',
                'Sonnet analizza i dati e produce un report stratigrafico',
              ]} />
              <MiniTable
                headers={['Operazione', 'Descrizione']}
                rows={[
                  ['query_us', 'Unita Stratigrafiche'],
                  ['query_inventory', 'Inventario Materiali'],
                  ['query_pottery', 'Ceramica'],
                  ['query_sites', 'Siti'],
                  ['query_structures', 'Strutture'],
                  ['query_tombs', 'Tombe'],
                  ['query_samples', 'Campioni'],
                  ['custom_query', 'Query SQL personalizzata (solo SELECT)'],
                  ['list_tables', 'Lista tutte le tabelle del DB'],
                  ['export_csv', 'Esporta risultati in formato CSV'],
                ]}
              />
              <Prompt label="Config PyArchInit:">{`operation: query_us
dbPath: ~/.pyarchinit/pyarchinit_DB_folder/pyarchinit_db.sqlite
dbType: sqlite
sito: Pompeii (filtro opzionale)
area: A (filtro opzionale)`}</Prompt>
              <Prompt label="Sonnet — Analisi Stratigrafica:">{`Sei un archeologo esperto. Analizza i dati stratigrafici e l'inventario:
1. Identifica la sequenza stratigrafica
2. Correla US e materiali
3. Proponi una datazione relativa
4. Segnala anomalie o lacune nei dati`}</Prompt>
              <Tip>PyArchInit accede direttamente al database SQLite senza richiedere QGIS. Auto-detect del path default ~/.pyarchinit/. Supporta anche PostgreSQL.</Tip>
            </Card>

            {/* Tutorial 33 */}
            <Card title="Tutorial 33 — QGIS Project: Analisi Progetto" subtitle="Parsing progetto QGIS senza QGIS installato" icon={BookOpen} accent="blue">
              <Diagram>{`              ┌──────────────────┐
           ┌─>│ QGIS: list_layers│──┐
           │  └──────────────────┘  │
┌────────┐ │  ┌──────────────────┐  │  ┌────────────┐  ┌──────────┐  ┌────────┐
│ INPUT  │─┤  │ QGIS: project_   │  ├─>│ AGGREGATOR │─>│  Sonnet  │─>│ OUTPUT │
│ .qgz   │ ├─>│ info             │──┘  └────────────┘  │ Analisi  │  │ Report │
└────────┘ │  └──────────────────┘                      └──────────┘  └────────┘
           │  ┌──────────────────┐
           └─>│ QGIS: read_style │──────────────────────────────────────>│
              └──────────────────┘`}</Diagram>
              <Steps items={[
                'Input: percorso del file .qgs o .qgz',
                'list_layers: elenca tutti i layer con tipo, geometria, sorgente',
                'project_info: metadati (CRS, versione QGIS, estensione, conteggio layer)',
                'read_style: dettagli su renderer e simbologia di ogni layer',
                'Sonnet analizza la struttura del progetto e suggerisce miglioramenti',
              ]} />
              <MiniTable
                headers={['Operazione', 'Descrizione']}
                rows={[
                  ['list_layers', 'Lista tutti i layer con tipo, geometria, sorgente dati'],
                  ['project_info', 'Metadati: CRS, versione QGIS, estensione, n. layer'],
                  ['list_plugins', 'Plugin e provider custom usati nel progetto'],
                  ['read_style', 'Renderer, simboli, proprietà di stile per layer'],
                ]}
              />
              <Prompt label="Config QGIS Project:">{`operation: list_layers
projectPath: /path/to/progetto.qgz`}</Prompt>
              <Prompt label="Sonnet — Analisi Progetto GIS:">{`Analizza la struttura del progetto QGIS:
1. Identifica i layer principali e il loro ruolo
2. Valuta il sistema di riferimento (CRS)
3. Suggerisci ottimizzazioni (layer ridondanti, stili migliorabili)
4. Verifica la coerenza delle sorgenti dati`}</Prompt>
              <Tip>Il parsing avviene via XML/ZIP senza alcuna dipendenza QGIS. Supporta sia .qgs (XML puro) che .qgz (archivio compresso). Ideale per audit automatici di progetti GIS.</Tip>
            </Card>

            {/* Tutorial 34 */}
            <Card title="Tutorial 34 — Validator: Quality Gate AI" subtitle="Pattern Validator — genera, valida con AI, correggi se fallisce" icon={ShieldCheck} accent="emerald">
              <Diagram>{`┌────────┐  ┌──────────┐  ┌─────────────┐  pass  ┌──────────┐
│ INPUT  │─>│  Sonnet  │─>│  VALIDATOR   │──────>│  OUTPUT  │
│  Brief │  │ Scrittore│  │ Quality Gate │       │Approvato │
└────────┘  └──────────┘  └──────┬──────┘       └──────────┘
                                 │ fail
                           ┌─────▼──────┐  ┌─────────────┐  ┌──────────┐
                           │   Sonnet   │─>│  VALIDATOR   │─>│  OUTPUT  │
                           │ Correttore │  │ Re-Validazione│  │ Corretto │
                           └────────────┘  └─────────────┘  └──────────┘`}</Diagram>
              <Steps items={[
                'Input: brief del contenuto da generare',
                'Sonnet Scrittore genera il contenuto (articolo, email, codice...)',
                'Validator analizza con AI: il contenuto soddisfa i criteri?',
                'Se PASS (score >= strictness): output diretto — contenuto approvato',
                'Se FAIL: il Correttore riscrive usando il feedback di validazione',
                'Secondo Validator (opzionale) ri-verifica la correzione',
              ]} />
              <MiniTable
                headers={['Parametro', 'Descrizione', 'Default']}
                rows={[
                  ['Model', 'Modello AI per la validazione', 'Haiku (veloce)'],
                  ['Validation Prompt', 'Criteri di validazione (testo libero)', '(vuoto)'],
                  ['Strictness', 'Soglia 1-10 (10 = severissimo)', '7'],
                  ['Include Context', 'Mostra al validatore i nodi del workflow', 'No'],
                ]}
              />
              <Prompt label="Criteri di validazione esempio:">{`Verifica che il testo:
1. Sia in italiano corretto senza errori grammaticali
2. Abbia almeno 300 parole
3. Contenga titolo, introduzione e conclusione
4. Sia coerente e ben argomentato
5. Non contenga informazioni palesemente false`}</Prompt>
              <Prompt label="Risposta del Validator (JSON automatico):">{`{"valid": true, "reason": "Articolo completo e ben strutturato", "score": 8}
oppure
{"valid": false, "reason": "Manca la conclusione, solo 150 parole", "score": 4}`}</Prompt>
              <Tip>
                Il Validator usa Haiku di default per velocita e costo. L'output passa al branch successivo con il report di validazione appeso.
                I branch "pass" e "fail" funzionano come i nodi Condition — collega gli edge con label <strong>"pass"</strong> e <strong>"fail"</strong>.
              </Tip>
              <div className="space-y-2">
                <span className="text-xs font-medium text-emerald-400">Casi d'uso tipici:</span>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>- Verificare qualita di articoli, email, traduzioni</li>
                  <li>- Validare formato JSON/XML prima di invio API</li>
                  <li>- Controllare che codice generato compili / segua convenzioni</li>
                  <li>- Gate di approvazione prima di invio Telegram/WhatsApp/Email</li>
                  <li>- Filtrare output indesiderati (off-topic, contenuto inappropriato)</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>

        {/* ═══════ SUGGERIMENTI PRO ═══════ */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" /> Suggerimenti Pro
          </h2>
          <div className="space-y-2">

            <Card title="Scegliere il Modello Giusto" icon={Bot} accent="yellow">
              <MiniTable
                headers={['Task', 'Modello', 'Perche']}
                rows={[
                  ['Classificazione, routing', 'Haiku', 'Veloce, economico'],
                  ['Coding, analisi dati', 'Sonnet', 'Miglior rapporto qualita/prezzo'],
                  ['Ragionamento complesso', 'Opus / o1', 'Massima potenza'],
                  ['Analisi immagini', 'GPT-4o', 'Eccellente vision'],
                  ['Privacy / offline', 'Ollama', 'Nessun dato esce dal PC'],
                ]}
              />
            </Card>

            <Card title="Ottimizzare i Costi" icon={Zap} accent="yellow">
              <Steps items={[
                'Usa Haiku per task ripetitivi — 10x piu economico di Sonnet',
                'Usa il Router — Haiku decide quale modello usare',
                'Limita Max Tokens — non servono 4096 token per classificare',
                'Parallel > Sequential per task indipendenti',
                'Loop con max iterazioni — evita loop infiniti',
              ]} />
            </Card>

            <Card title="Pattern Combinabili" icon={Cpu} accent="yellow">
              <Diagram>{`Sequential + Parallel:  Analizza -> [3 esperti parallelo] -> Sintesi
Router + Specialists:   Classifica -> Esperto giusto
Loop + Condition:       Genera -> Critica -> Se OK esci, altrimenti ripeti
Debate + Judge:         Pro vs Contro -> Giudice decide
RAG + Agent:            Cerca nei documenti -> Rispondi con citazioni
Validate + Retry:       Genera -> Valida formato -> Loop se invalido
Quality Gate:           Genera -> Score qualita -> Rigenera se < soglia
Chunker + Sintesi:      Splitta doc -> Analizza chunk -> Sintesi finale
Meta-Agent + Pipeline:  Orchestratore -> Sub-workflow -> Editor finale
GIS + Report:           Analisi vettori/raster -> Mappa -> Report AI
Switch + Specialists:   Classifica -> N esperti diversi per tipo
Delay + API Chain:      HTTP GET -> Delay 3s -> HTTP GET -> Analisi
Scraper + Analisi:      Scraping web -> Text Transform -> AI Report
API + JSON + Report:    HTTP Request -> JSON Parser -> AI Analista
Notifier + File:        AI Report -> [Slack + File Manager] parallelo
Variables + Template:   setVariable -> {var:nome} in nodi successivi
Telegram Bot + AI:      AI genera -> Telegram invia a chat/canale
WhatsApp + Template:    Evento -> AI messaggio -> WhatsApp al cliente
PyArchInit + AI:        Query US/materiali -> AI analisi stratigrafica
QGIS Project + Report:  Parsing .qgz -> AI audit progetto GIS
Validator + Correttore: Genera -> Validator pass/fail -> Correggi se fail
Validator + Loop:       Genera -> Valida -> Fail: correggi -> Re-valida`}</Diagram>
            </Card>

            <Card title="Errori Comuni da Evitare" icon={AlertTriangle} accent="red">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><span className="text-red-400 font-bold shrink-0">x</span><span className="text-gray-300"><strong className="text-white">Opus per tutto</strong> — costoso e lento per task semplici</span></li>
                <li className="flex items-start gap-2"><span className="text-red-400 font-bold shrink-0">x</span><span className="text-gray-300"><strong className="text-white">System prompt vaghi</strong> — &ldquo;Sei utile&rdquo; non dice nulla</span></li>
                <li className="flex items-start gap-2"><span className="text-red-400 font-bold shrink-0">x</span><span className="text-gray-300"><strong className="text-white">Loop senza limite</strong> — metti sempre max iterazioni</span></li>
                <li className="flex items-start gap-2"><span className="text-red-400 font-bold shrink-0">x</span><span className="text-gray-300"><strong className="text-white">Tutto sequenziale</strong> — se indipendenti, usa Parallel</span></li>
                <li className="flex items-start gap-2"><span className="text-red-400 font-bold shrink-0">x</span><span className="text-gray-300"><strong className="text-white">Un mega-prompt</strong> — meglio 3 agenti specializzati</span></li>
              </ul>
            </Card>
          </div>
        </div>

        {/* ═══════ TROUBLESHOOTING ═══════ */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" /> Troubleshooting
          </h2>
          <Card title="Problemi Comuni" icon={AlertTriangle} accent="orange" defaultOpen>
            <MiniTable
              headers={['Problema', 'Soluzione']}
              rows={[
                ['API Key not found', 'Controlla .env nella root del progetto'],
                ['Nodo non si collega', 'Trascina dal pallino output al pallino input'],
                ['Risposta vuota', 'Verifica che il system prompt non sia vuoto'],
                ['Timeout', 'Aumenta il timeout nelle impostazioni del nodo o il timeout globale'],
                ['Errore 404 modello', "Verifica l'ID del modello nelle impostazioni"],
                ['Loop infinito', 'Aggiungi condizione di uscita o max iterazioni'],
                ['Costo alto', 'Sostituisci Opus/Sonnet con Haiku per task semplici'],
                ['Tool not found', 'Riavvia il backend — i tool sono caricati al primo avvio'],
                ['HTTP 429 Too Many Requests', 'Aggiungi nodi Delay tra le chiamate API'],
                ['Modello AI down', 'Configura fallbackModel nel nodo agent (es. gpt-4o come backup)'],
                ['File Manager path error', 'Usa il campo "destination" per il path, non l\'input'],
                ['Switch non instrada', 'Verifica che le label degli edge corrispondano ai case dello Switch'],
                ['Validator sempre pass/fail', 'Rendi il Validation Prompt piu specifico e regola Strictness (1-10)'],
              ]}
            />
          </Card>
        </div>

        {/* ═══════ PROSSIMI PASSI ═══════ */}
        <div className="pb-8">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Rocket className="w-5 h-5 text-green-400" /> Prossimi Passi
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { n: '1', t: 'Inizia semplice', d: 'Tutorial 1, poi aggiungi complessita' },
              { n: '2', t: 'Sperimenta', d: 'Cambia modelli e confronta i risultati' },
              { n: '3', t: 'Salva i workflow', d: 'Usa Save per non perdere il lavoro' },
              { n: '4', t: 'Monitora i costi', d: 'Dashboard Analytics per ottimizzare' },
            ].map(s => (
              <div key={s.n} className="p-3 rounded-lg bg-gray-900/60 border border-gray-800">
                <div className="text-sm font-medium text-white">{s.t}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
