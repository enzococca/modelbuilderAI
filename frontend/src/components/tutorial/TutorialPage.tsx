import { useState } from 'react';
import {
  BookOpen, Bot, Wrench, Cpu, ChevronDown, ChevronRight,
  Lightbulb, AlertTriangle, Rocket, Zap, ArrowRight,
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
                  ['Code Executor', 'Esegue codice Python in sandbox'],
                  ['Database Query', 'Interroga database SQL'],
                  ['Image Analyzer', 'Analizza immagini con vision AI'],
                ]}
              />
            </Card>

            <Card title="Nodi Logica" subtitle="Controllano il flusso della pipeline" icon={Cpu} accent="cyan">
              <MiniTable
                headers={['Nodo', 'Funzione']}
                rows={[
                  ['Input', 'Punto di ingresso: testo, file, variabili'],
                  ['Output', 'Punto di uscita: risultato finale'],
                  ['Condition', 'Branch if/else basato su contenuto'],
                  ['Loop', 'Ripete fino a una condizione'],
                  ['Aggregator', 'Combina risultati da branch paralleli'],
                ]}
              />
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
RAG + Agent:            Cerca nei documenti -> Rispondi con citazioni`}</Diagram>
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
                ['Timeout', 'Aumenta il timeout nelle impostazioni del nodo'],
                ['Errore 404 modello', "Verifica l'ID del modello nelle impostazioni"],
                ['Loop infinito', 'Aggiungi condizione di uscita o max iterazioni'],
                ['Costo alto', 'Sostituisci Opus/Sonnet con Haiku per task semplici'],
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
