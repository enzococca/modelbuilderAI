# Gennaro Model Builder — Guida Utente & Tutorial

## Benvenuto nel Model Builder

Il Model Builder è un canvas visuale dove puoi creare **pipeline AI** trascinando nodi e collegandoli tra loro. Ogni nodo rappresenta un'azione: un agente AI, uno strumento, una condizione, o un output. Collegandoli crei workflow potenti che combinano diversi modelli AI.

---

## 🧩 I Nodi Disponibili

### Nodi Agente (🤖)
Sono il cuore del builder. Ogni nodo agente chiama un modello AI.

| Nodo | Modello | Ideale per |
|------|---------|------------|
| **Claude Opus** | claude-opus-4-6 | Ragionamento complesso, analisi profonda, decisioni critiche |
| **Claude Sonnet** | claude-sonnet-4-5-20250929 | Coding, analisi, task bilanciati costo/qualità |
| **Claude Haiku** | claude-haiku-4-5-20251001 | Classificazione rapida, routing, task semplici |
| **GPT-4o** | gpt-4o | Multimodale (immagini+testo), general purpose |
| **GPT-4o Mini** | gpt-4o-mini | Task veloci ed economici |
| **o1** | o1 | Ragionamento matematico e logico avanzato |
| **Ollama (locale)** | llama3.2, mistral, etc. | Privacy, offline, nessun costo API |

**Configurazione nodo agente:**
- **System Prompt**: Le istruzioni che definiscono il comportamento dell'agente
- **Temperature**: 0.0 (preciso) → 1.0 (creativo)
- **Max Tokens**: Lunghezza massima risposta

---

### Nodi Strumento (🔧)
Danno capacità extra agli agenti.

| Nodo | Funzione |
|------|----------|
| **Web Search** | Cerca informazioni aggiornate su internet |
| **File Reader** | Legge PDF, DOCX, CSV, immagini |
| **Code Executor** | Esegue codice Python in sandbox (numpy, pandas, matplotlib, sklearn) |
| **Database Query** | Interroga database SQL |
| **Image Analyzer** | Analizza immagini con vision AI |
| **ML Pipeline** | Allena, predice e valuta modelli ML da dati CSV (Random Forest, SVM, KNN...) |
| **Website Generator** | Genera siti web completi (HTML/CSS/JS) impacchettati come ZIP |

---

### Nodi Logica (⚙️)
Controllano il flusso della pipeline.

| Nodo | Funzione |
|------|----------|
| **Input** | Punto di ingresso: testo, file, o variabili |
| **Output** | Punto di uscita: risultato finale |
| **Condition** | Branch if/else basato su contenuto (contains, score threshold, regex, ecc.) |
| **Loop** | Ripete fino a una condizione (keyword, score) |
| **Aggregator** | Combina risultati da branch paralleli |
| **Meta-Agent** | Esegue un sub-workflow ricorsivamente (profondità max configurabile) |
| **Chunker** | Splitta testi lunghi in chunk, processa ognuno con un agente, poi aggrega |

---

## 📖 Tutorial 1 — La Tua Prima Pipeline (5 minuti)

### "Chiedi a Claude e mostra il risultato"

La pipeline più semplice: Input → Agente → Output.

```
┌─────────┐     ┌──────────────┐     ┌──────────┐
│  INPUT   │────▶│ Claude Sonnet │────▶│  OUTPUT  │
│ "Domanda"│     │              │     │          │
└─────────┘     └──────────────┘     └──────────┘
```

**Come crearla:**

1. **Trascina** un nodo **Input** dalla palette al canvas
2. **Trascina** un nodo **Agent** (Claude Sonnet)
3. **Trascina** un nodo **Output**
4. **Collega** Input → Agent → Output (clicca e trascina tra i pallini)
5. **Configura** l'agente: clicca sul nodo, imposta il system prompt
6. **Esegui** con il pulsante ▶️ Play

**System Prompt consigliato:**
```
Sei un assistente esperto. Rispondi in modo chiaro e conciso.
```

---

## 📖 Tutorial 2 — Traduttore Multi-Lingua

### Traduci un testo in 3 lingue contemporaneamente (Pattern: Parallel)

```
                    ┌──────────────────┐
                 ┌─▶│ Haiku: Inglese   │──┐
                 │  └──────────────────┘  │
┌─────────┐     │  ┌──────────────────┐  │  ┌────────────┐  ┌────────┐
│  INPUT   │────┼─▶│ Haiku: Francese  │──┼─▶│ AGGREGATOR │─▶│ OUTPUT │
│ "Testo"  │     │  └──────────────────┘  │  └────────────┘  └────────┘
└─────────┘     │  ┌──────────────────┐  │
                 └─▶│ Haiku: Spagnolo  │──┘
                    └──────────────────┘
```

**Come crearla:**

1. Trascina 1 **Input**, 3 **Agent** (Haiku — veloce ed economico), 1 **Aggregator**, 1 **Output**
2. Collega l'Input a tutti e 3 gli agenti
3. Collega tutti e 3 all'Aggregator, poi all'Output

**System Prompt per ogni agente:**

Agente 1 (Inglese):
```
Traduci il seguente testo in inglese. Restituisci SOLO la traduzione, nient'altro.
```

Agente 2 (Francese):
```
Traduci il seguente testo in francese. Restituisci SOLO la traduzione, nient'altro.
```

Agente 3 (Spagnolo):
```
Traduci il seguente testo in spagnolo. Restituisci SOLO la traduzione, nient'altro.
```

**Perché Haiku?** Per traduzioni semplici non serve un modello potente. Haiku è 10x più economico e veloce di Sonnet.

---

## 📖 Tutorial 3 — Assistente di Ricerca con Fonti Web

### Cerca sul web, analizza i risultati, scrivi un report (Pattern: Sequential)

```
┌─────────┐   ┌────────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────┐
│  INPUT   │──▶│ Web Search │──▶│ Claude Sonnet │──▶│ Claude Opus  │──▶│ OUTPUT │
│ "Topic"  │   │            │   │ "Analizza"   │   │ "Scrivi report"│  │        │
└─────────┘   └────────────┘   └──────────────┘   └──────────────┘   └────────┘
```

**Configurazione:**

**Nodo Web Search:**
- Query: `{input}` (passa automaticamente il testo dall'input)
- Max risultati: 10

**Nodo Claude Sonnet — Analizzatore:**
```
Analizza i seguenti risultati di ricerca web. Per ogni fonte:
1. Estrai i punti chiave
2. Valuta l'affidabilità (alta/media/bassa)
3. Identifica le informazioni più rilevanti
Organizza tutto in punti sintetici.
```

**Nodo Claude Opus — Scrittore Report:**
```
Basandoti sull'analisi fornita, scrivi un report professionale con:
- Sommario esecutivo (3 righe)
- Sezioni tematiche con i punti principali
- Conclusioni e raccomandazioni
- Lista delle fonti
Scrivi in italiano, tono professionale.
```

**Perché due agenti diversi?** Sonnet è efficiente per estrarre dati, Opus è superiore per scrivere report di qualità. Costo/qualità ottimizzati.

---

## 📖 Tutorial 4 — Code Review Automatico

### Analizza codice da più prospettive e genera un verdetto (Pattern: Parallel + Aggregation)

```
                    ┌──────────────────────┐
                 ┌─▶│ Sonnet: Bug Finder   │──┐
                 │  └──────────────────────┘  │
┌─────────┐     │  ┌──────────────────────┐  │  ┌────────────┐  ┌──────────────┐  ┌────────┐
│  INPUT   │────┼─▶│ Sonnet: Performance  │──┼─▶│ AGGREGATOR │─▶│ Opus: Verdetto│─▶│ OUTPUT │
│ "Codice" │     │  └──────────────────────┘  │  └────────────┘  └──────────────┘  └────────┘
└─────────┘     │  ┌──────────────────────┐  │
                 └─▶│ Sonnet: Security     │──┘
                    └──────────────────────┘
```

**System Prompts:**

**Bug Finder:**
```
Sei un esperto di bug detection. Analizza il codice e trova:
- Bug logici
- Edge case non gestiti
- Errori di tipo
- Race condition
Per ogni bug: descrivi il problema, indica la riga, suggerisci il fix.
Rispondi in formato JSON: [{"line": N, "severity": "high|medium|low", "issue": "...", "fix": "..."}]
```

**Performance Analyzer:**
```
Sei un esperto di performance. Analizza il codice e identifica:
- Complessità algoritmica (Big O)
- Memory leak potenziali
- Operazioni costose in loop
- Opportunità di caching
Rispondi in formato JSON: [{"line": N, "impact": "high|medium|low", "issue": "...", "suggestion": "..."}]
```

**Security Reviewer:**
```
Sei un esperto di sicurezza. Analizza il codice per:
- SQL injection
- XSS vulnerabilities
- Gestione insicura di input utente
- Secrets hardcoded
- Dipendenze con CVE note
Rispondi in formato JSON: [{"line": N, "severity": "critical|high|medium|low", "vulnerability": "...", "remediation": "..."}]
```

**Opus — Verdetto Finale:**
```
Ricevi 3 review di codice (bug, performance, sicurezza) in formato JSON.
Scrivi un report unificato di code review con:

## Sommario
- Score complessivo: A/B/C/D/F
- Problemi critici: N
- Problemi totali: N

## Problemi Critici (da fixare subito)
...

## Miglioramenti Consigliati
...

## Codice Refactored
Mostra il codice corretto con tutti i fix applicati.
```

---

## 📖 Tutorial 5 — Il Dibattito AI

### Due agenti discutono, un giudice decide (Pattern: Debate)

```
┌─────────┐   ┌──────────────────────────────────────┐   ┌──────────────┐   ┌────────┐
│  INPUT   │──▶│          DEBATE LOOP (3 round)       │──▶│ Opus: Giudice│──▶│ OUTPUT │
│ "Topic"  │   │                                      │   └──────────────┘   └────────┘
└─────────┘   │  ┌─────────┐    ┌─────────────────┐  │
               │  │ GPT-4o  │◀──▶│ Claude Sonnet   │  │
               │  │ "Pro"   │    │ "Contro"        │  │
               │  └─────────┘    └─────────────────┘  │
               └──────────────────────────────────────┘
```

**Configurazione:**

**GPT-4o — Avvocato Pro:**
```
Sei un debater esperto che argomenta A FAVORE della posizione data.
Usa dati, statistiche, casi di studio, e logica stringente.
Rispondi agli argomenti del tuo avversario punto per punto.
Sii persuasivo ma onesto. Ammetti i punti deboli quando necessario.
Max 300 parole per round.
```

**Claude Sonnet — Avvocato Contro:**
```
Sei un debater esperto che argomenta CONTRO la posizione data.
Usa dati, statistiche, casi di studio, e logica stringente.
Rispondi agli argomenti del tuo avversario punto per punto.
Sii persuasivo ma onesto. Ammetti i punti deboli quando necessario.
Max 300 parole per round.
```

**Opus — Giudice:**
```
Hai assistito a un dibattito di 3 round. Valuta:

1. **Qualità degli argomenti**: chi ha presentato prove più solide?
2. **Risposta alle obiezioni**: chi ha gestito meglio le critiche?
3. **Coerenza logica**: chi ha mantenuto una linea più coerente?
4. **Punti di forza**: gli argomenti migliori di ciascuno
5. **Verdetto finale**: chi ha vinto e perché
6. **Sintesi**: la posizione più ragionevole considerando entrambi

Sii imparziale e bilancia il giudizio.
```

**Perché modelli diversi?** Usare GPT-4o vs Claude evita il bias di un singolo modello. Il giudice (Opus) è il più potente per sintetizzare.

---

## 📖 Tutorial 6 — Analisi Documenti con RAG

### Carica un PDF, fai domande, ottieni risposte con citazioni (Pattern: RAG)

```
┌──────────┐   ┌─────────────┐   ┌────────────────┐   ┌──────────────┐   ┌────────┐
│  INPUT   │──▶│ File Reader │──▶│ Vector Store   │──▶│ Claude Sonnet│──▶│ OUTPUT │
│ PDF file │   │ (parser)    │   │ (search chunks)│   │ + contesto   │   │ + cite │
└──────────┘   └─────────────┘   └────────────────┘   └──────────────┘   └────────┘
```

**Come funziona:**

1. **File Reader** → Legge il PDF e lo converte in testo
2. **Vector Store** → Divide il testo in chunk, crea embedding, cerca i chunk più rilevanti alla domanda
3. **Claude Sonnet** → Riceve la domanda + i chunk rilevanti e risponde con citazioni

**System Prompt per Sonnet:**
```
Rispondi alla domanda dell'utente basandoti ESCLUSIVAMENTE sui documenti forniti.

Regole:
- Ogni affermazione deve avere una citazione [Fonte: nome_doc, pag. N]
- Se l'informazione non è nei documenti, dì "Non ho trovato questa informazione nei documenti caricati"
- Non inventare mai informazioni
- Usa un tono professionale
- Se la domanda è ambigua, chiedi chiarimenti

Formato risposta:
1. Risposta sintetica (2-3 righe)
2. Dettagli con citazioni
3. Eventuali informazioni correlate trovate nei documenti
```

---

## 📖 Tutorial 7 — Pipeline Archeologica 🏛️

### Classifica reperti, confronta con database, genera scheda (Pattern: Sequential + Parallel)

```
┌───────────┐   ┌──────────────┐   ┌──────────────────────────────────────┐   ┌────────┐
│   INPUT   │──▶│ GPT-4o Vision│──▶│            PARALLEL                   │──▶│ OUTPUT │
│ Foto+Dati │   │ "Classifica" │   │                                      │   │ Scheda │
└───────────┘   └──────────────┘   │  ┌──────────┐  ┌──────────────────┐  │   └────────┘
                                    │  │ DB Query │  │ Claude Sonnet    │  │
                                    │  │ Confronta│  │ Analisi tipologica│ │
                                    │  └────┬─────┘  └────────┬─────────┘  │
                                    │       └────────┬─────────┘           │
                                    │          ┌─────▼──────┐              │
                                    │          │ Opus: Scheda│              │
                                    │          │ RA completa │              │
                                    │          └─────────────┘              │
                                    └──────────────────────────────────────┘
```

**Nodo GPT-4o Vision — Classificatore:**
```
Sei un archeologo esperto di cultura materiale. Analizza questa immagine di un reperto e fornisci:

1. **Tipo**: (ceramica, litica, metallo, osso, vetro, altro)
2. **Classe**: (es. ceramica comune, sigillata, anfora, etc.)
3. **Forma**: descrizione morfologica
4. **Dimensioni stimate**: basandoti sulla scala se presente
5. **Stato di conservazione**: integro, frammentario, lacunoso
6. **Periodo probabile**: con range cronologico
7. **Confronti**: possibili paralleli tipologici

Rispondi in JSON strutturato.
```

**Nodo DB Query — Confronto:**
```sql
SELECT * FROM reperti
WHERE tipo = '{classificazione.tipo}'
AND classe = '{classificazione.classe}'
AND periodo LIKE '%{classificazione.periodo}%'
ORDER BY similarity DESC
LIMIT 10
```

**Nodo Sonnet — Analisi Tipologica:**
```
Sei un archeologo specializzato in analisi tipologica.
Basandoti sulla classificazione iniziale e sui confronti dal database:

1. Conferma o correggi la classificazione
2. Identifica il tipo specifico nella tipologia di riferimento
3. Proponi datazione con livello di confidenza
4. Suggerisci analisi archeometriche utili
5. Note sulla distribuzione geografica del tipo

Sii preciso e cita le tipologie di riferimento (es. Morel, Dragendorff, Dressel).
```

**Nodo Opus — Scheda RA:**
```
Genera una scheda RA (Reperto Archeologico) completa secondo lo standard ministeriale italiano.
Usa tutte le informazioni raccolte dalle analisi precedenti.

Formato:
- Numero inventario: {input.inventario}
- Sito: {input.sito}
- Area/US: {input.area}/{input.us}
- Classe materiale:
- Tipo:
- Descrizione:
- Dimensioni:
- Stato di conservazione:
- Cronologia:
- Confronti:
- Bibliografia:
- Analisi suggerite:
- Note:
```

---

## 📖 Tutorial 8 — Auto-Refine Loop

### L'AI genera, si critica, e migliora iterativamente (Pattern: Loop)

```
┌─────────┐   ┌───────────────────────────────────────┐   ┌────────┐
│  INPUT   │──▶│              LOOP (max 3 iterazioni)  │──▶│ OUTPUT │
│ "Brief"  │   │                                       │   │ Finale │
└─────────┘   │  ┌──────────────┐   ┌──────────────┐  │   └────────┘
               │  │ Sonnet:      │──▶│ Opus:        │  │
               │  │ Generatore   │   │ Critico      │  │
               │  └──────▲───────┘   └──────┬───────┘  │
               │         │                  │          │
               │         └──────────────────┘          │
               │         (feedback se score < 8)       │
               └───────────────────────────────────────┘
```

**Sonnet — Generatore:**
```
Genera/migliora il contenuto richiesto.
Se ricevi feedback dal critico, incorpora TUTTI i suggerimenti.
Non ripetere gli stessi errori.
```

**Opus — Critico:**
```
Valuta il contenuto generato su questi criteri (1-10 per ciascuno):

1. Completezza: copre tutti i requisiti?
2. Accuratezza: informazioni corrette?
3. Chiarezza: ben scritto e organizzato?
4. Originalità: evita luoghi comuni?

Score medio = (1+2+3+4) / 4

SE score >= 8:
  → Rispondi: "APPROVED" + breve commento positivo

SE score < 8:
  → Rispondi con feedback specifico:
    - Cosa manca
    - Cosa è sbagliato
    - Come migliorare
    - Esempi concreti di cosa ti aspetti
```

**Condizione di uscita dal loop:**
- Il critico risponde "APPROVED" **oppure**
- Raggiunte 3 iterazioni (per evitare loop infiniti)

---

## 📖 Tutorial 9 — Pipeline Complessa: Content Factory

### Da un topic genera articolo, social post, newsletter, immagine (Pattern: Misto)

```
                                           ┌──────────────────┐
                                        ┌─▶│ Sonnet: Blog Post│──┐
                                        │  └──────────────────┘  │
┌─────────┐  ┌────────────┐  ┌────────┐│  ┌──────────────────┐  │  ┌────────────┐  ┌────────┐
│  INPUT   │─▶│ Web Search │─▶│ Haiku: ││─▶│ Haiku: Twitter   │──┼─▶│ AGGREGATOR │─▶│ OUTPUT │
│ "Topic"  │  └────────────┘  │ Router ││  └──────────────────┘  │  │ + Formatter│  │  📦   │
└─────────┘                   └────────┘│  ┌──────────────────┐  │  └────────────┘  └────────┘
                                        │─▶│ Haiku: LinkedIn  │──┤
                                        │  └──────────────────┘  │
                                        │  ┌──────────────────┐  │
                                        └─▶│ Sonnet: Newsletter│──┘
                                           └──────────────────┘
```

**Haiku — Router:**
```
Analizza il topic e le informazioni dal web search.
Crea un brief per ogni formato:
1. Blog post (1000 parole, SEO-friendly)
2. Twitter thread (5-7 tweet)
3. LinkedIn post (professionale, 200 parole)
4. Newsletter (email, 500 parole)

Per ogni brief includi: angolo, tono, punti chiave, CTA.
Rispondi in JSON con chiavi: blog, twitter, linkedin, newsletter.
```

**Sonnet — Blog Post Writer:**
```
Scrivi un blog post SEO-friendly basandoti sul brief.
Includi: titolo H1, sottotitoli H2, intro hook, conclusione con CTA.
Tono: professionale ma accessibile.
Formato: Markdown.
```

**Haiku — Twitter Thread:**
```
Crea un thread Twitter dal brief.
- Tweet 1: hook che cattura attenzione
- Tweet 2-5: punti chiave con dati
- Tweet 6: conclusione + CTA
- Usa emoji, mantieni < 280 char per tweet
- Aggiungi hashtag rilevanti nell'ultimo tweet
```

**Haiku — LinkedIn:**
```
Scrivi un post LinkedIn professionale.
- Apri con un hook provocatorio o dato sorprendente
- 3-4 paragrafi brevi con interlinea
- Chiudi con domanda per engagement
- Tono: thought leadership
- NO hashtag nel testo, solo alla fine
```

**Sonnet — Newsletter:**
```
Scrivi una newsletter email coinvolgente.
- Subject line accattivante (A/B: fornisci 2 opzioni)
- Preview text (40 char)
- Saluto personale
- Contenuto in 3 sezioni brevi
- CTA chiaro
- P.S. con bonus tip
```

---

## 📖 Tutorial 10 — Validazione Output

### Genera, valida il formato, correggi se necessario (Pattern: Condition Branch)

```
┌─────────┐   ┌──────────────┐   ┌──────────────┐   ┌───────────────┐
│  INPUT   │──▶│ Generatore   │──▶│ Validatore   │──▶│ Formato OK?   │
│"Richiesta"│  │ (Sonnet)     │   │ (Sonnet)     │   │ (Condition)   │
└─────────┘   └──────────────┘   └──────────────┘   └───────┬───────┘
                                                       true │   │ false
                                                    ┌───────▼┐ ┌▼──────────┐
                                                    │ OUTPUT │ │ Correttore │
                                                    │ Valido │ │ (Sonnet)   │
                                                    └────────┘ └─────┬──────┘
                                                                     │
                                                               ┌─────▼──────┐
                                                               │   OUTPUT   │
                                                               │  Corretto  │
                                                               └────────────┘
```

**Come funziona il Condition Node:**
- Il Validatore risponde "VALIDO" se il formato è corretto, oppure "NON VALIDO" con feedback
- Il nodo Condition controlla se l'output contiene "VALIDO"
- Edge label `true` → Output diretto
- Edge label `false` → Correttore → Output corretto

---

## 📖 Tutorial 11 — Fallback Modello

### Se il modello primario non soddisfa, passa al backup (Pattern: Fallback)

```
┌─────────┐   ┌──────────────┐   ┌──────────────┐   ┌───────────────┐
│  INPUT   │──▶│ Claude       │──▶│ Valutatore   │──▶│ Qualità OK?   │
│  "Task"  │   │ (Primario)   │   │ Qualità      │   │ (Condition)   │
└─────────┘   └──────────────┘   └──────────────┘   └───────┬───────┘
                                                       true │   │ false
                                                    ┌───────▼┐ ┌▼──────────┐
                                                    │ OUTPUT │ │ GPT-4o    │
                                                    │Primario│ │ (Backup)  │
                                                    └────────┘ └─────┬──────┘
                                                                     │
                                                               ┌─────▼──────┐
                                                               │   OUTPUT   │
                                                               │  Fallback  │
                                                               └────────────┘
```

**Perché usare il Fallback?** Diversi modelli eccellono in task diversi. Se Claude non raggiunge la qualità desiderata su un task poetico, GPT-4o potrebbe farlo meglio (o viceversa).

---

## 📖 Tutorial 12 — Quality Gate

### Score >= 7 approva, altrimenti rigenera con feedback (Pattern: Quality Gate)

Il nodo Condition usa `score_threshold` con operatore `gte` (maggiore o uguale) per estrarre il punteggio numerico dal testo dello scorer.

**Configurazione Condition Node:**
- **Condition Type**: Score threshold
- **Value**: 7
- **Operator**: >= (gte)

---

## 📖 Tutorial 13 — ML Pipeline

### Allena due modelli ML e confrontali (Pattern: Parallel + Aggregation)

```
                                  ┌─────────────────────────┐
                               ┌─▶│ Train Random Forest     │──┐
┌─────────┐   ┌────────────┐ │  └─────────────────────────┘  │  ┌────────────┐
│  INPUT   │──▶│  Analisi   │─┤                                ├─▶│ Confronto  │──▶ OUTPUT
│  CSV     │   │  Dati      │ │  ┌─────────────────────────┐  │  │ Modelli    │
└─────────┘   └────────────┘ └─▶│ Train Gradient Boosting  │──┘  └────────────┘
                                  └─────────────────────────┘
```

**Come funziona:**
1. L'Input contiene un dataset CSV (es. Iris)
2. Due nodi **Tool ML Pipeline** in parallelo allenano Random Forest e Gradient Boosting
3. L'**Aggregator** combina i risultati del training
4. Un agente **Sonnet** crea un report comparativo

**Configurazione nodo ML Pipeline:**
- **Tool**: ML Pipeline
- **Operation**: Train
- **Model Type**: Random Forest / Gradient Boosting
- **Target Column**: la colonna da predire (es. "species")
- **Model Name**: nome per salvare il modello

I modelli allenati vengono salvati in `data/models/` e possono essere riutilizzati con l'operazione "Predict".

---

## 📖 Tutorial 14 — Website Generator

### 3 agenti generano HTML, CSS e JS → Tool assembla il sito (Pattern: Parallel → Tool)

```
                    ┌──────────────────┐
                 ┌─▶│ Designer HTML    │──┐
                 │  └──────────────────┘  │
┌─────────┐     │  ┌──────────────────┐  │  ┌────────────┐  ┌──────────────┐  ┌────────┐
│  INPUT   │────┼─▶│ Designer CSS     │──┼─▶│ AGGREGATOR │─▶│ Website Gen  │─▶│ OUTPUT │
│"Richiesta"│   │  └──────────────────┘  │  └────────────┘  │ (Tool ZIP)   │  │  📦   │
└─────────┘     │  ┌──────────────────┐  │                   └──────────────┘  └────────┘
                 └─▶│ Developer JS     │──┘
                    └──────────────────┘
```

**Come funziona:**
1. Descrivi il sito che vuoi (landing page, portfolio, ecc.)
2. Tre agenti specializzati generano in parallelo: HTML, CSS, JavaScript
3. L'Aggregator combina i tre codici
4. Il **Website Generator Tool** rileva i blocchi ```html, ```css e ```js, crea i file e li impacchetta come ZIP
5. Il ZIP viene salvato in `data/websites/` e può essere scaricato

**Tip:** Sii specifico nella richiesta! Include: stile (moderno, minimal, colorato), sezioni (hero, features, CTA), palette colori, e se deve essere responsive.

---

## 📖 Tutorial 15 — Chunker per Documenti Lunghi

### Splitta un documento lungo in chunk, analizza ognuno, sintetizza (Pattern: Chunker → Agent)

```
┌─────────────┐   ┌──────────────────────────┐   ┌──────────────┐   ┌────────┐
│   INPUT      │──▶│ CHUNKER                  │──▶│ Sintetizzatore│──▶│ OUTPUT │
│ Doc lungo    │   │ 800 char/chunk, 100 overlap│  │ (Sonnet)     │   │Summary │
└─────────────┘   │ Haiku processa ogni chunk │   └──────────────┘   └────────┘
                   └──────────────────────────┘
```

**Come funziona il Chunker:**
1. Il testo viene diviso in chunk di dimensione configurabile (es. 800 caratteri) con sovrapposizione (es. 100 char) per non perdere contesto ai bordi
2. Ogni chunk viene processato dall'agente interno del Chunker (configurabile: modello, system prompt)
3. I risultati di tutti i chunk vengono concatenati
4. Un agente successivo sintetizza il tutto in un executive summary

**Configurazione Chunker Node:**
- **Model**: Haiku (veloce ed economico per molti chunk)
- **System Prompt**: "Analizza questo chunk e produci un riassunto..."
- **Chunk Size**: 800 caratteri
- **Overlap**: 100 caratteri

**Quando usarlo:** Documenti che superano il context window di un singolo agente, articoli lunghi, libri, report aziendali.

---

## 📖 Tutorial 16 — Meta-Agent (Sub-Workflow Ricorsivo)

### Un nodo che esegue un intero workflow al suo interno (Pattern: Meta / Ricorsione)

```
┌─────────┐   ┌──────────────┐   ┌────────────────────────────┐   ┌──────────────┐   ┌────────┐
│  INPUT   │──▶│ Orchestratore│──▶│ META-AGENT                 │──▶│ Editor Finale│──▶│ OUTPUT │
│ "Task"   │   │ (Sonnet)     │   │                            │   │ (Sonnet)     │   │ Report │
└─────────┘   └──────────────┘   │  ┌ Sub-Workflow ─────────┐ │   └──────────────┘   └────────┘
                                   │  │ Input → [Agente A]   │ │
                                   │  │          [Agente B]   │ │
                                   │  │       → Aggregator    │ │
                                   │  │       → Output        │ │
                                   │  └───────────────────────┘ │
                                   └────────────────────────────┘
```

**Come funziona il Meta-Agent:**
1. Contiene una **definizione di workflow completa** (nodi + edge) nelle sue configurazioni
2. Quando viene eseguito, lancia il sub-workflow come se fosse un workflow indipendente
3. L'input del Meta-Agent diventa l'input del sub-workflow
4. L'output dei nodi Output del sub-workflow diventa l'output del Meta-Agent
5. **Profondità massima configurabile** (default: 3 livelli) per evitare ricorsione infinita

**Quando usarlo:** Task complessi che possono essere scomposti in sotto-processi indipendenti. Perfetto per orchestrare team di agenti specializzati.

**Configurazione:**
- Incolla il JSON del sub-workflow nel campo "Sub-Workflow (JSON)" del NodeConfig
- Imposta la profondità massima di ricorsione

---

## 🎯 Suggerimenti Pro

### Scegliere il Modello Giusto

| Task | Modello Consigliato | Perché |
|------|-------------------|--------|
| Classificazione, routing | **Haiku** | Veloce, economico, accurato per task semplici |
| Traduzione semplice | **Haiku** | Non serve potenza per tradurre |
| Coding, analisi dati | **Sonnet** | Miglior rapporto qualità/prezzo per coding |
| Scrittura creativa | **Sonnet** o **Opus** | Dipende dalla qualità richiesta |
| Ragionamento complesso | **Opus** o **o1** | Massima capacità di reasoning |
| Analisi immagini | **GPT-4o** | Eccellente vision multimodale |
| Sintesi finale / decisioni | **Opus** | Miglior qualità complessiva |
| Privacy / offline | **Ollama** | Nessun dato esce dal tuo computer |

### Ottimizzare i Costi

1. **Usa Haiku per i task ripetitivi** — 10x più economico di Sonnet
2. **Usa il Router** — Haiku decide quale modello usare, risparmia sui task semplici
3. **Limita Max Tokens** — Non servono 4096 token per una classificazione
4. **Parallel > Sequential** per task indipendenti — stesso tempo, stesso costo
5. **Loop con max iterazioni** — Evita loop infiniti che bruciano credito

### Pattern Combinabili

```
Sequential + Parallel:     Analizza → [3 esperti in parallelo] → Sintesi
Router + Specialists:      Classifica → Indirizza all'esperto giusto
Loop + Condition:          Genera → Critica → Se OK esci, altrimenti ripeti
Debate + Judge:            Pro vs Contro → Giudice decide
RAG + Agent:               Cerca nei tuoi documenti → Rispondi con citazioni
Condition + Fallback:      Primario → Valuta → Se fallisce → Backup
Chunker + Synth:           Documento lungo → Splitta → Analizza → Sintetizza
Meta-Agent + Team:         Orchestratore → Sub-workflow team → Editor finale
ML Pipeline + Report:      CSV → Train modelli paralleli → Confronto → Report
Website Gen + Review:      Genera sito → Valida → Correggi → ZIP
```

### Errori Comuni da Evitare

❌ **Usare Opus per tutto** — Costoso e lento per task semplici
❌ **System prompt vaghi** — "Sei utile" non dice nulla. Sii specifico!
❌ **Loop senza limite** — Metti sempre un max iterazioni
❌ **Tutto sequenziale** — Se i task sono indipendenti, usa Parallel
❌ **Ignorare il formato output** — Specifica JSON quando serve per il nodo successivo
❌ **Un solo agente mega-prompt** — Meglio 3 agenti specializzati che uno tuttofare

---

## 🔧 Troubleshooting

| Problema | Soluzione |
|----------|----------|
| "API Key not found" | Controlla `.env` nella root del progetto |
| Nodo non si collega | Verifica che stai trascinando dal pallino output al pallino input |
| Risposta vuota | Controlla che il system prompt non sia vuoto |
| Timeout | Aumenta il timeout nelle impostazioni del nodo |
| Errore 404 modello | Verifica l'ID del modello nelle impostazioni |
| Loop infinito | Aggiungi condizione di uscita o max iterazioni |
| Costo alto | Sostituisci Opus/Sonnet con Haiku per task semplici |

---

## 🚀 Prossimi Passi

1. **Inizia semplice** — Tutorial 1, poi aggiungi complessità
2. **Sperimenta** — Cambia modelli e confronta i risultati
3. **Salva i tuoi workflow** — Usa Export per riutilizzarli
4. **Condividi** — Import/Export JSON per condividere con il team
5. **Monitora i costi** — Dashboard analytics per ottimizzare la spesa
