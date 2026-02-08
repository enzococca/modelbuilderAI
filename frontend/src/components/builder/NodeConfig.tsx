import { useState, useCallback } from 'react';
import { X, Bot, Wrench, GitBranch, FileInput, FileOutput, RefreshCw, Layers, Upload, File, Boxes, Scissors, Clock, GitFork, ShieldCheck } from 'lucide-react';
import type { Node } from '@xyflow/react';
import { uploadFile } from '@/services/api';

interface Props {
  node: Node;
  onClose: () => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}

const inputStyles = 'w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500';
const labelStyles = 'block text-xs text-gray-400 mb-1';
const selectStyles = 'w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500';

const nodeIcons: Record<string, { icon: typeof Bot; color: string; label: string }> = {
  agent: { icon: Bot, color: 'purple', label: 'Agent' },
  tool: { icon: Wrench, color: 'green', label: 'Tool' },
  condition: { icon: GitBranch, color: 'yellow', label: 'Condition' },
  input: { icon: FileInput, color: 'cyan', label: 'Input' },
  output: { icon: FileOutput, color: 'blue', label: 'Output' },
  loop: { icon: RefreshCw, color: 'orange', label: 'Loop' },
  aggregator: { icon: Layers, color: 'pink', label: 'Aggregator' },
  meta_agent: { icon: Boxes, color: 'indigo', label: 'Meta-Agent' },
  chunker: { icon: Scissors, color: 'teal', label: 'Chunker' },
  delay: { icon: Clock, color: 'amber', label: 'Delay' },
  switch: { icon: GitFork, color: 'rose', label: 'Switch' },
  validator: { icon: ShieldCheck, color: 'emerald', label: 'Validator' },
};

export function NodeConfig({ node, onClose, onUpdate }: Props) {
  const [data, setData] = useState<Record<string, unknown>>(
    () => (node.data as Record<string, unknown>) ?? {},
  );
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileDrop = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setData(prev => ({
        ...prev,
        fileName: file.name,
        fileId: result.id,
        source: file.name,
      }));
    } catch {
      // If upload fails, still store the filename locally
      setData(prev => ({
        ...prev,
        fileName: file.name,
        source: file.name,
      }));
    } finally {
      setUploading(false);
    }
  }, []);

  const update = (key: string, value: unknown) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onUpdate(node.id, data);
    onClose();
  };

  const nodeType = node.type ?? 'agent';
  const meta = nodeIcons[nodeType] ?? nodeIcons.agent;
  const Icon = meta.icon;

  return (
    <div className="w-80 border-l border-gray-800 bg-gray-900 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 text-${meta.color}-400`} />
          <h3 className="text-sm font-medium">{meta.label} Config</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Label — shared by all node types */}
        <div>
          <label className={labelStyles}>Label</label>
          <input
            value={(data.label as string) ?? ''}
            onChange={e => update('label', e.target.value)}
            className={inputStyles}
          />
        </div>

        {/* === AGENT === */}
        {nodeType === 'agent' && (
          <>
            <div>
              <label className={labelStyles}>Model</label>
              <select
                value={(data.model as string) ?? 'claude-sonnet-4-5-20250929'}
                onChange={e => update('model', e.target.value)}
                className={selectStyles}
              >
                <optgroup label="Anthropic">
                  <option value="claude-opus-4-6">Claude Opus 4.6</option>
                  <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                </optgroup>
                <optgroup label="OpenAI">
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o mini</option>
                  <option value="o1">o1</option>
                  <option value="o3-mini">o3-mini</option>
                </optgroup>
                <optgroup label="Local (Ollama)">
                  <option value="ollama:llama3.3">Llama 3.3</option>
                  <option value="ollama:mistral">Mistral</option>
                  <option value="ollama:codellama">CodeLlama</option>
                  <option value="ollama:gemma2">Gemma 2</option>
                  <option value="ollama:phi3">Phi-3</option>
                  <option value="ollama:qwen2.5">Qwen 2.5</option>
                </optgroup>
                <optgroup label="LM Studio">
                  <option value="lmstudio:default">LM Studio (default)</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className={labelStyles}>System Prompt</label>
              <textarea
                value={(data.systemPrompt as string) ?? ''}
                onChange={e => update('systemPrompt', e.target.value)}
                rows={4}
                placeholder="Descrivi il ruolo dell'agente..."
                className={`${inputStyles} resize-none`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelStyles}>Temperature</label>
                <input
                  type="number"
                  min={0} max={2} step={0.1}
                  value={(data.temperature as number) ?? 0.7}
                  onChange={e => update('temperature', parseFloat(e.target.value))}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className={labelStyles}>Max Tokens</label>
                <input
                  type="number"
                  min={1} max={128000} step={100}
                  value={(data.maxTokens as number) ?? 4096}
                  onChange={e => update('maxTokens', parseInt(e.target.value, 10))}
                  className={inputStyles}
                />
              </div>
            </div>
            <div>
              <label className={labelStyles}>Tools</label>
              <div className="space-y-1">
                {['web_search', 'code_executor', 'file_processor', 'database_tool', 'image_tool', 'ml_pipeline', 'gis_tool', 'file_search', 'email_search', 'project_analyzer', 'email_sender', 'web_scraper', 'file_manager', 'http_request', 'text_transformer', 'notifier', 'json_parser', 'telegram_bot', 'whatsapp', 'pyarchinit_tool', 'qgis_project'].map(tool => {
                  const tools = (data.tools as string[]) ?? [];
                  return (
                    <label key={tool} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tools.includes(tool)}
                        onChange={e => {
                          const next = e.target.checked
                            ? [...tools, tool]
                            : tools.filter(t => t !== tool);
                          update('tools', next);
                        }}
                        className="rounded bg-gray-800 border-gray-600"
                      />
                      {tool.replace(/_/g, ' ')}
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={labelStyles}>Fallback Model</label>
              <select
                value={(data.fallbackModel as string) ?? ''}
                onChange={e => update('fallbackModel', e.target.value)}
                className={selectStyles}
              >
                <option value="">Nessuno</option>
                <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="ollama:llama3.3">Ollama: Llama 3.3</option>
                <option value="ollama:mistral">Ollama: Mistral</option>
                <option value="lmstudio:default">LM Studio</option>
              </select>
              <p className="text-[10px] text-gray-600 mt-1">Usato se il modello principale fallisce.</p>
            </div>
          </>
        )}

        {/* === INPUT === */}
        {nodeType === 'input' && (
          <>
            <div>
              <label className={labelStyles}>Input Type</label>
              <select
                value={(data.inputType as string) ?? 'text'}
                onChange={e => update('inputType', e.target.value)}
                className={selectStyles}
              >
                <option value="text">Text</option>
                <option value="file">File (PDF, DOCX, CSV, ...)</option>
                <option value="url">URL</option>
                <option value="email">Email</option>
                <option value="api">API Endpoint</option>
                <option value="variable">Variable</option>
                <option value="database">Database Query</option>
              </select>
            </div>

            {/* Database config — shown when inputType is 'database' */}
            {(data.inputType as string) === 'database' && (
              <>
                <div>
                  <label className={labelStyles}>Database Type</label>
                  <select
                    value={(data.dbType as string) ?? 'sqlite'}
                    onChange={e => update('dbType', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="sqlite">SQLite</option>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="mongodb">MongoDB</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Connection String</label>
                  <input
                    value={(data.connectionString as string) ?? ''}
                    onChange={e => update('connectionString', e.target.value)}
                    placeholder={
                      (data.dbType as string) === 'postgresql' ? 'postgresql://user:pass@localhost:5432/mydb'
                      : (data.dbType as string) === 'mysql' ? 'mysql://user:pass@localhost:3306/mydb'
                      : (data.dbType as string) === 'mongodb' ? 'mongodb://localhost:27017/mydb'
                      : 'data/db/gennaro.db'
                    }
                    className={inputStyles}
                  />
                </div>
                <div>
                  <label className={labelStyles}>
                    {(data.dbType as string) === 'mongodb' ? 'Query (MongoDB)' : 'Query SQL'}
                  </label>
                  <textarea
                    value={(data.query as string) ?? ''}
                    onChange={e => update('query', e.target.value)}
                    rows={3}
                    placeholder={
                      (data.dbType as string) === 'mongodb'
                        ? 'db.collection.find({"field": "value"})'
                        : 'SELECT * FROM table_name LIMIT 10'
                    }
                    className={`${inputStyles} resize-none font-mono text-xs`}
                  />
                </div>
              </>
            )}

            {/* File drop zone — shown when inputType is 'file' */}
            {(data.inputType as string) === 'file' && (
              <div>
                <label className={labelStyles}>File</label>
                {(data.fileName as string) ? (
                  <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-3 py-2">
                    <File className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-sm text-gray-200 truncate flex-1">{data.fileName as string}</span>
                    <button
                      onClick={() => setData(prev => ({ ...prev, fileName: undefined, fileId: undefined, source: '' }))}
                      className="text-gray-500 hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragOver(false);
                      handleFileDrop(e.dataTransfer.files);
                    }}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 transition ${
                      dragOver ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {uploading
                      ? <span className="text-xs text-cyan-400 animate-pulse">Uploading...</span>
                      : <>
                          <Upload className="h-5 w-5 text-gray-500" />
                          <span className="text-xs text-gray-500">Trascina un file o clicca</span>
                        </>
                    }
                    <input
                      type="file"
                      className="hidden"
                      onChange={e => { if (e.target.files) handleFileDrop(e.target.files); }}
                    />
                  </label>
                )}
              </div>
            )}

            {(data.inputType as string) !== 'file' && (
            <div>
              <label className={labelStyles}>Source / Path</label>
              <input
                value={(data.source as string) ?? ''}
                onChange={e => update('source', e.target.value)}
                placeholder="es. /path/file.pdf, https://..., inbox@..."
                className={inputStyles}
              />
            </div>
            )}
            <div>
              <label className={labelStyles}>Accepted Formats</label>
              <input
                value={(data.acceptedFormats as string) ?? ''}
                onChange={e => update('acceptedFormats', e.target.value)}
                placeholder="es. .pdf,.docx,.csv (vuoto = tutti)"
                className={inputStyles}
              />
            </div>
            <div>
              <label className={labelStyles}>Default Value</label>
              <textarea
                value={(data.defaultValue as string) ?? ''}
                onChange={e => update('defaultValue', e.target.value)}
                rows={2}
                placeholder="Valore di default se non fornito..."
                className={`${inputStyles} resize-none`}
              />
            </div>
          </>
        )}

        {/* === OUTPUT === */}
        {nodeType === 'output' && (
          <>
            <div>
              <label className={labelStyles}>Output Format</label>
              <select
                value={(data.outputFormat as string) ?? 'text'}
                onChange={e => update('outputFormat', e.target.value)}
                className={selectStyles}
              >
                <option value="text">Text</option>
                <option value="markdown">Markdown</option>
                <option value="json">JSON</option>
                <option value="map">Mappa (GeoJSON)</option>
                <option value="html">HTML / Web Preview</option>
                <option value="file">File</option>
                <option value="email">Email</option>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div>
              <label className={labelStyles}>Destination</label>
              <input
                value={(data.destination as string) ?? ''}
                onChange={e => update('destination', e.target.value)}
                placeholder="es. /exports/result.pdf, user@email.com"
                className={inputStyles}
              />
            </div>
            <div>
              <label className={labelStyles}>Filename Template</label>
              <input
                value={(data.filenameTemplate as string) ?? ''}
                onChange={e => update('filenameTemplate', e.target.value)}
                placeholder="es. report_{date}.pdf"
                className={inputStyles}
              />
            </div>
          </>
        )}

        {/* === TOOL === */}
        {nodeType === 'tool' && (
          <>
            <div>
              <label className={labelStyles}>Tool</label>
              <select
                value={(data.tool as string) ?? 'web_search'}
                onChange={e => update('tool', e.target.value)}
                className={selectStyles}
              >
                <option value="web_search">Web Search</option>
                <option value="code_executor">Code Executor</option>
                <option value="file_processor">File Processor</option>
                <option value="database_tool">Database Query</option>
                <option value="image_tool">Image Analysis</option>
                <option value="ml_pipeline">ML Pipeline</option>
                <option value="website_generator">Website Generator</option>
                <option value="gis_tool">GIS Analysis</option>
                <option value="file_search">File Search</option>
                <option value="email_search">Email Search</option>
                <option value="project_analyzer">Project Analyzer</option>
                <option value="email_sender">Email Sender</option>
                <option value="web_scraper">Web Scraper</option>
                <option value="file_manager">File Manager</option>
                <option value="http_request">HTTP Request</option>
                <option value="text_transformer">Text Transformer</option>
                <option value="notifier">Notifier</option>
                <option value="json_parser">JSON Parser</option>
                <option value="telegram_bot">Telegram Bot</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="pyarchinit_tool">PyArchInit</option>
                <option value="qgis_project">QGIS Project</option>
              </select>
            </div>

            {/* Tool-specific params */}
            {(data.tool as string) === 'web_search' && (
              <div>
                <label className={labelStyles}>Search Query Template</label>
                <input
                  value={(data.queryTemplate as string) ?? ''}
                  onChange={e => update('queryTemplate', e.target.value)}
                  placeholder="es. {input} site:docs.python.org"
                  className={inputStyles}
                />
              </div>
            )}

            {(data.tool as string) === 'code_executor' && (
              <>
                <div>
                  <label className={labelStyles}>Language</label>
                  <select
                    value={(data.language as string) ?? 'python'}
                    onChange={e => update('language', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="bash">Bash</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Timeout (sec)</label>
                  <input
                    type="number"
                    min={1} max={300}
                    value={(data.timeout as number) ?? 30}
                    onChange={e => update('timeout', parseInt(e.target.value, 10))}
                    className={inputStyles}
                  />
                </div>
                <div>
                  <label className={labelStyles}>Code Template</label>
                  <textarea
                    value={(data.codeTemplate as string) ?? ''}
                    onChange={e => update('codeTemplate', e.target.value)}
                    rows={4}
                    placeholder={'Codice Python con {input} come placeholder per i dati.\nEs: import plotly...\\ndata = \"\"\"{input}\"\"\"'}
                    className={`${inputStyles} resize-none font-mono text-xs`}
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">Usa {'{input}'} per iniettare i dati dal nodo precedente. Supporta: matplotlib, plotly, pandas, numpy, sklearn.</p>
                </div>
              </>
            )}

            {(data.tool as string) === 'database_tool' && (
              <>
                <div>
                  <label className={labelStyles}>Database Type</label>
                  <select
                    value={(data.dbType as string) ?? 'sqlite'}
                    onChange={e => update('dbType', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="sqlite">SQLite</option>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="mongodb">MongoDB</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Connection String</label>
                  <input
                    value={(data.connectionString as string) ?? ''}
                    onChange={e => update('connectionString', e.target.value)}
                    placeholder={
                      (data.dbType as string) === 'postgresql' ? 'postgresql://user:pass@localhost:5432/mydb'
                      : (data.dbType as string) === 'mysql' ? 'mysql://user:pass@localhost:3306/mydb'
                      : (data.dbType as string) === 'mongodb' ? 'mongodb://localhost:27017/mydb'
                      : 'data/db/gennaro.db (o sqlite:///path.db)'
                    }
                    className={inputStyles}
                  />
                </div>
                <div>
                  <label className={labelStyles}>
                    {(data.dbType as string) === 'mongodb' ? 'Query (MongoDB)' : 'Query Template (SQL)'}
                  </label>
                  <textarea
                    value={(data.queryTemplate as string) ?? ''}
                    onChange={e => update('queryTemplate', e.target.value)}
                    rows={3}
                    placeholder={
                      (data.dbType as string) === 'mongodb'
                        ? 'db.collection.find({"field": "value"})'
                        : 'SELECT * FROM ... WHERE ...'
                    }
                    className={`${inputStyles} resize-none font-mono text-xs`}
                  />
                </div>
              </>
            )}

            {(data.tool as string) === 'file_processor' && (
              <div>
                <label className={labelStyles}>Operation</label>
                <select
                  value={(data.operation as string) ?? 'read'}
                  onChange={e => update('operation', e.target.value)}
                  className={selectStyles}
                >
                  <option value="read">Read / Parse</option>
                  <option value="write">Write / Export</option>
                  <option value="convert">Convert Format</option>
                </select>
              </div>
            )}

            {(data.tool as string) === 'image_tool' && (
              <div>
                <label className={labelStyles}>Operation</label>
                <select
                  value={(data.operation as string) ?? 'analyze'}
                  onChange={e => update('operation', e.target.value)}
                  className={selectStyles}
                >
                  <option value="analyze">Analyze (Vision)</option>
                  <option value="generate">Generate</option>
                  <option value="edit">Edit</option>
                </select>
              </div>
            )}

            {(data.tool as string) === 'ml_pipeline' && (
              <>
                <div>
                  <label className={labelStyles}>Operation</label>
                  <select
                    value={(data.operation as string) ?? 'train'}
                    onChange={e => update('operation', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="train">Train Model</option>
                    <option value="predict">Predict</option>
                    <option value="evaluate">Evaluate</option>
                    <option value="list_models">List Models</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Model Type</label>
                  <select
                    value={(data.modelType as string) ?? 'random_forest'}
                    onChange={e => update('modelType', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="random_forest">Random Forest</option>
                    <option value="gradient_boosting">Gradient Boosting</option>
                    <option value="linear">Linear / Logistic</option>
                    <option value="svm">SVM</option>
                    <option value="knn">K-Nearest Neighbors</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Target Column</label>
                  <input
                    value={(data.targetColumn as string) ?? ''}
                    onChange={e => update('targetColumn', e.target.value)}
                    placeholder="es. price (default: ultima colonna)"
                    className={inputStyles}
                  />
                </div>
                <div>
                  <label className={labelStyles}>Model Name</label>
                  <input
                    value={(data.modelName as string) ?? ''}
                    onChange={e => update('modelName', e.target.value)}
                    placeholder="es. my_model"
                    className={inputStyles}
                  />
                </div>
              </>
            )}

            {(data.tool as string) === 'website_generator' && (
              <p className="text-xs text-gray-500">
                Genera un sito web (HTML/CSS/JS) da code blocks o JSON. Output: file ZIP scaricabile.
              </p>
            )}

            {(data.tool as string) === 'gis_tool' && (
              <>
                <div>
                  <label className={labelStyles}>Operation</label>
                  <select
                    value={(data.operation as string) ?? 'info'}
                    onChange={e => update('operation', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="info">Info (metadata)</option>
                    <option value="vector_analysis">Vector Analysis</option>
                    <option value="raster_analysis">Raster Analysis</option>
                    <option value="dem_analysis">DEM Analysis (slope/aspect)</option>
                    <option value="buffer">Buffer</option>
                    <option value="map">Render Map</option>
                    <option value="reproject">Reproject</option>
                    <option value="overlay">Overlay</option>
                  </select>
                </div>
                {(data.operation as string) === 'buffer' && (
                  <div>
                    <label className={labelStyles}>Buffer Distance (m)</label>
                    <input
                      type="number"
                      min={1} max={100000} step={10}
                      value={(data.distance as number) ?? 100}
                      onChange={e => update('distance', parseFloat(e.target.value))}
                      className={inputStyles}
                    />
                  </div>
                )}
                {(data.operation as string) === 'reproject' && (
                  <div>
                    <label className={labelStyles}>Target CRS</label>
                    <input
                      value={(data.target_crs as string) ?? 'EPSG:4326'}
                      onChange={e => update('target_crs', e.target.value)}
                      placeholder="es. EPSG:4326, EPSG:32633"
                      className={inputStyles}
                    />
                  </div>
                )}
                {(data.operation as string) === 'map' && (
                  <>
                    <div>
                      <label className={labelStyles}>Title</label>
                      <input
                        value={(data.title as string) ?? ''}
                        onChange={e => update('title', e.target.value)}
                        placeholder="Titolo della mappa"
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <label className={labelStyles}>Colormap</label>
                      <select
                        value={(data.colormap as string) ?? 'viridis'}
                        onChange={e => update('colormap', e.target.value)}
                        className={selectStyles}
                      >
                        <option value="viridis">Viridis</option>
                        <option value="terrain">Terrain</option>
                        <option value="RdYlGn">Red-Yellow-Green</option>
                        <option value="Blues">Blues</option>
                        <option value="Reds">Reds</option>
                        <option value="YlOrRd">Yellow-Orange-Red</option>
                        <option value="Spectral">Spectral</option>
                        <option value="coolwarm">Cool-Warm</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelStyles}>Color Column</label>
                      <input
                        value={(data.column as string) ?? ''}
                        onChange={e => update('column', e.target.value)}
                        placeholder="es. population, elevation (vuoto = default)"
                        className={inputStyles}
                      />
                    </div>
                  </>
                )}
                {(data.operation as string) === 'overlay' && (
                  <div>
                    <label className={labelStyles}>Overlay Type</label>
                    <select
                      value={(data.how as string) ?? 'intersection'}
                      onChange={e => update('how', e.target.value)}
                      className={selectStyles}
                    >
                      <option value="intersection">Intersection</option>
                      <option value="union">Union</option>
                      <option value="difference">Difference</option>
                      <option value="symmetric_difference">Symmetric Difference</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className={labelStyles}>Layer Name</label>
                  <input
                    value={(data.layer as string) ?? ''}
                    onChange={e => update('layer', e.target.value)}
                    placeholder="es. pyunitastratigrafiche (vuoto = primo layer)"
                    className={inputStyles}
                  />
                  <p className="text-[10px] text-gray-600 mt-1">Per GeoPackage/SQLite con piu layer.</p>
                </div>
              </>
            )}

            {/* File Search config */}
            {(data.tool as string) === 'file_search' && (
              <>
                <div>
                  <label className={labelStyles}>Source</label>
                  <select
                    value={(data.source as string) ?? 'local'}
                    onChange={e => update('source', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="local">Local PC</option>
                    <option value="dropbox">Dropbox</option>
                    <option value="gdrive">Google Drive</option>
                    <option value="onedrive">OneDrive / Teams</option>
                  </select>
                </div>
                {(data.source as string || 'local') === 'local' && (
                  <div>
                    <label className={labelStyles}>Search Mode</label>
                    <select
                      value={(data.mode as string) ?? 'filename'}
                      onChange={e => update('mode', e.target.value)}
                      className={selectStyles}
                    >
                      <option value="filename">Filename match</option>
                      <option value="content">Content search (inside files)</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className={labelStyles}>Max Results</label>
                  <input
                    type="number"
                    min={1} max={100}
                    value={(data.max_results as number) ?? 20}
                    onChange={e => update('max_results', parseInt(e.target.value, 10))}
                    className={inputStyles}
                  />
                </div>
                {(data.source as string || 'local') === 'local' && (
                  <div>
                    <label className={labelStyles}>Root Directories</label>
                    <input
                      value={(data.roots as string) ?? ''}
                      onChange={e => update('roots', e.target.value)}
                      placeholder="es. /Users/enzo/Documents, /tmp"
                      className={inputStyles}
                    />
                    <p className="text-[10px] text-gray-600 mt-1">Separate paths with commas. Empty = home dir.</p>
                  </div>
                )}
                {(data.mode as string) === 'content' && (
                  <div>
                    <label className={labelStyles}>File Extensions</label>
                    <input
                      value={(data.extensions as string) ?? 'pdf,docx,pptx,txt,md,csv'}
                      onChange={e => update('extensions', e.target.value)}
                      placeholder="pdf,docx,pptx,txt,md,csv"
                      className={inputStyles}
                    />
                    <p className="text-[10px] text-gray-600 mt-1">Comma-separated. Searches inside these file types.</p>
                  </div>
                )}
                {(data.source as string) !== 'local' && (data.source as string) !== undefined && (
                  <p className="text-xs text-gray-500">Credenziali configurabili in Settings.</p>
                )}
              </>
            )}

            {/* Email Search config */}
            {(data.tool as string) === 'email_search' && (
              <>
                <div>
                  <label className={labelStyles}>Source</label>
                  <select
                    value={(data.source as string) ?? 'gmail'}
                    onChange={e => update('source', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook (Microsoft Graph)</option>
                    <option value="imap">IMAP (generico)</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Max Results</label>
                  <input
                    type="number"
                    min={1} max={100}
                    value={(data.max_results as number) ?? 20}
                    onChange={e => update('max_results', parseInt(e.target.value, 10))}
                    className={inputStyles}
                  />
                </div>
                {(data.source as string) === 'imap' && (
                  <>
                    <div>
                      <label className={labelStyles}>IMAP Server</label>
                      <input
                        value={(data.imap_server as string) ?? ''}
                        onChange={e => update('imap_server', e.target.value)}
                        placeholder="es. imap.gmail.com"
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <label className={labelStyles}>Port</label>
                      <input
                        type="number"
                        value={(data.imap_port as number) ?? 993}
                        onChange={e => update('imap_port', parseInt(e.target.value, 10))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <label className={labelStyles}>Username</label>
                      <input
                        value={(data.imap_username as string) ?? ''}
                        onChange={e => update('imap_username', e.target.value)}
                        placeholder="user@example.com"
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <label className={labelStyles}>Password</label>
                      <input
                        type="password"
                        value={(data.imap_password as string) ?? ''}
                        onChange={e => update('imap_password', e.target.value)}
                        placeholder="App password"
                        className={inputStyles}
                      />
                    </div>
                  </>
                )}
                {(data.source as string) !== 'imap' && (
                  <p className="text-xs text-gray-500">Credenziali configurabili in Settings.</p>
                )}
              </>
            )}

            {/* Project Analyzer config */}
            {(data.tool as string) === 'project_analyzer' && (
              <>
                <div>
                  <label className={labelStyles}>Max Depth</label>
                  <input
                    type="number"
                    min={1} max={10}
                    value={(data.max_depth as number) ?? 4}
                    onChange={e => update('max_depth', parseInt(e.target.value, 10))}
                    className={inputStyles}
                  />
                  <p className="text-[10px] text-gray-600 mt-1">How deep to scan the directory tree.</p>
                </div>
                <div>
                  <label className={labelStyles}>Max Files to Read</label>
                  <input
                    type="number"
                    min={5} max={50}
                    value={(data.max_files_read as number) ?? 20}
                    onChange={e => update('max_files_read', parseInt(e.target.value, 10))}
                    className={inputStyles}
                  />
                  <p className="text-[10px] text-gray-600 mt-1">Max key files to read (README, configs, entry points).</p>
                </div>
                <p className="text-xs text-gray-500">Input: percorso della cartella del progetto.</p>
              </>
            )}

            {/* Email Sender config */}
            {(data.tool as string) === 'email_sender' && (
              <>
                <div>
                  <label className={labelStyles}>Send via</label>
                  <select
                    value={(data.emailSource as string) ?? 'resend'}
                    onChange={e => update('emailSource', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="resend">Resend (consigliato, gratis)</option>
                    <option value="smtp">SMTP (generico)</option>
                    <option value="gmail">Gmail (API)</option>
                    <option value="outlook">Outlook (Microsoft Graph)</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>To (destinatario)</label>
                  <input
                    value={(data.emailTo as string) ?? ''}
                    onChange={e => update('emailTo', e.target.value)}
                    placeholder="user@example.com"
                    className={inputStyles}
                  />
                </div>
                <div>
                  <label className={labelStyles}>Subject</label>
                  <input
                    value={(data.emailSubject as string) ?? ''}
                    onChange={e => update('emailSubject', e.target.value)}
                    placeholder="Gennaro Workflow Result"
                    className={inputStyles}
                  />
                </div>
                {(data.emailSource as string) === 'smtp' && (
                  <>
                    <div>
                      <label className={labelStyles}>SMTP Host</label>
                      <input
                        value={(data.smtpHost as string) ?? ''}
                        onChange={e => update('smtpHost', e.target.value)}
                        placeholder="smtp.gmail.com"
                        className={inputStyles}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelStyles}>Port</label>
                        <input
                          type="number"
                          value={(data.smtpPort as number) ?? 587}
                          onChange={e => update('smtpPort', parseInt(e.target.value, 10))}
                          className={inputStyles}
                        />
                      </div>
                      <div>
                        <label className={labelStyles}>TLS</label>
                        <select
                          value={(data.smtpTls as string) ?? 'true'}
                          onChange={e => update('smtpTls', e.target.value)}
                          className={selectStyles}
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelStyles}>Username</label>
                      <input
                        value={(data.smtpUsername as string) ?? ''}
                        onChange={e => update('smtpUsername', e.target.value)}
                        placeholder="user@example.com"
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <label className={labelStyles}>Password</label>
                      <input
                        type="password"
                        value={(data.smtpPassword as string) ?? ''}
                        onChange={e => update('smtpPassword', e.target.value)}
                        placeholder="App password"
                        className={inputStyles}
                      />
                    </div>
                  </>
                )}
                {(data.emailSource as string) === 'resend' && (
                  <p className="text-xs text-gray-500">Configura RESEND_API_KEY nel .env. Gratis: 100 email/giorno su resend.com</p>
                )}
                {(data.emailSource as string) !== 'smtp' && (data.emailSource as string) !== 'resend' && (
                  <p className="text-xs text-gray-500">Credenziali configurabili in Settings (.env).</p>
                )}
              </>
            )}

            {/* HTTP Request config */}
            {(data.tool as string) === 'http_request' && (
              <>
                <div>
                  <label className={labelStyles}>Method</label>
                  <select
                    value={(data.method as string) ?? 'GET'}
                    onChange={e => update('method', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>URL Template</label>
                  <input
                    value={(data.urlTemplate as string) ?? '{input}'}
                    onChange={e => update('urlTemplate', e.target.value)}
                    placeholder="https://api.example.com/data o {input}"
                    className={inputStyles}
                  />
                  <p className="text-[10px] text-gray-600 mt-1">Usa {'{input}'} per inserire il dato dal nodo precedente.</p>
                </div>
                <div>
                  <label className={labelStyles}>Headers (JSON)</label>
                  <input
                    value={(data.headers as string) ?? ''}
                    onChange={e => update('headers', e.target.value)}
                    placeholder='{"Authorization": "Bearer xxx"}'
                    className={inputStyles}
                  />
                </div>
                {['POST', 'PUT', 'PATCH'].includes((data.method as string) ?? '') && (
                  <div>
                    <label className={labelStyles}>Body (JSON)</label>
                    <textarea
                      value={(data.body as string) ?? ''}
                      onChange={e => update('body', e.target.value)}
                      placeholder='{"key": "{input}"}'
                      rows={3}
                      className={inputStyles}
                    />
                  </div>
                )}
                <div>
                  <label className={labelStyles}>Auth Type</label>
                  <select
                    value={(data.authType as string) ?? 'none'}
                    onChange={e => update('authType', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="none">None</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>
                {(data.authType as string) !== 'none' && (data.authType as string) && (
                  <div>
                    <label className={labelStyles}>
                      {(data.authType as string) === 'basic' ? 'Credentials (user:pass)' : 'Token'}
                    </label>
                    <input
                      type="password"
                      value={(data.authToken as string) ?? ''}
                      onChange={e => update('authToken', e.target.value)}
                      className={inputStyles}
                    />
                  </div>
                )}
                <div>
                  <label className={labelStyles}>Timeout (sec)</label>
                  <input
                    type="number" min={1} max={120}
                    value={(data.timeout as number) ?? 15}
                    onChange={e => update('timeout', parseInt(e.target.value, 10))}
                    className={inputStyles}
                  />
                </div>
              </>
            )}

            {/* Text Transformer config */}
            {(data.tool as string) === 'text_transformer' && (
              <>
                <div>
                  <label className={labelStyles}>Operation</label>
                  <select
                    value={(data.operation as string) ?? 'trim'}
                    onChange={e => update('operation', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="trim">Trim</option>
                    <option value="upper">Uppercase</option>
                    <option value="lower">Lowercase</option>
                    <option value="regex_replace">Regex Replace</option>
                    <option value="regex_extract">Regex Extract</option>
                    <option value="split">Split</option>
                    <option value="join">Join</option>
                    <option value="template">Template</option>
                    <option value="truncate">Truncate</option>
                    <option value="count">Count</option>
                    <option value="remove_html">Remove HTML</option>
                    <option value="sort_lines">Sort Lines</option>
                    <option value="unique_lines">Unique Lines</option>
                    <option value="number_lines">Number Lines</option>
                  </select>
                </div>
                {((data.operation as string) === 'regex_replace' || (data.operation as string) === 'regex_extract') && (
                  <div>
                    <label className={labelStyles}>Pattern (regex)</label>
                    <input
                      value={(data.pattern as string) ?? ''}
                      onChange={e => update('pattern', e.target.value)}
                      placeholder="es. \b\w+@\w+\.\w+\b"
                      className={inputStyles}
                    />
                  </div>
                )}
                {(data.operation as string) === 'regex_replace' && (
                  <div>
                    <label className={labelStyles}>Replacement</label>
                    <input
                      value={(data.replacement as string) ?? ''}
                      onChange={e => update('replacement', e.target.value)}
                      placeholder="testo sostitutivo"
                      className={inputStyles}
                    />
                  </div>
                )}
                {((data.operation as string) === 'split' || (data.operation as string) === 'join') && (
                  <div>
                    <label className={labelStyles}>Separator</label>
                    <input
                      value={(data.separator as string) ?? '\\n'}
                      onChange={e => update('separator', e.target.value)}
                      placeholder="\n, \t, ;, ,"
                      className={inputStyles}
                    />
                  </div>
                )}
                {(data.operation as string) === 'template' && (
                  <div>
                    <label className={labelStyles}>Template</label>
                    <textarea
                      value={(data.template as string) ?? ''}
                      onChange={e => update('template', e.target.value)}
                      placeholder="Risultato: {input} ({word_count} parole)"
                      rows={3}
                      className={inputStyles}
                    />
                    <p className="text-[10px] text-gray-600 mt-1">Variabili: {'{input}'}, {'{line_1}'}, {'{word_count}'}, {'{char_count}'}</p>
                  </div>
                )}
                {(data.operation as string) === 'truncate' && (
                  <div>
                    <label className={labelStyles}>Max Length</label>
                    <input
                      type="number" min={10}
                      value={(data.maxLength as number) ?? 500}
                      onChange={e => update('maxLength', parseInt(e.target.value, 10))}
                      className={inputStyles}
                    />
                  </div>
                )}
              </>
            )}

            {/* Notifier config */}
            {(data.tool as string) === 'notifier' && (
              <>
                <div>
                  <label className={labelStyles}>Channel</label>
                  <select
                    value={(data.channel as string) ?? 'webhook'}
                    onChange={e => update('channel', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="webhook">Generic Webhook</option>
                    <option value="slack">Slack</option>
                    <option value="discord">Discord</option>
                    <option value="telegram">Telegram</option>
                  </select>
                </div>
                {((data.channel as string) === 'webhook' || (data.channel as string) === 'slack' || (data.channel as string) === 'discord') && (
                  <div>
                    <label className={labelStyles}>Webhook URL</label>
                    <input
                      value={(data.webhookUrl as string) ?? ''}
                      onChange={e => update('webhookUrl', e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className={inputStyles}
                    />
                  </div>
                )}
                {(data.channel as string) === 'telegram' && (
                  <>
                    <div>
                      <label className={labelStyles}>Bot Token</label>
                      <input
                        type="password"
                        value={(data.botToken as string) ?? ''}
                        onChange={e => update('botToken', e.target.value)}
                        placeholder="123456:ABC-DEF..."
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <label className={labelStyles}>Chat ID</label>
                      <input
                        value={(data.chatId as string) ?? ''}
                        onChange={e => update('chatId', e.target.value)}
                        placeholder="-100123456789"
                        className={inputStyles}
                      />
                    </div>
                  </>
                )}
                <p className="text-xs text-gray-500">Input: il messaggio da inviare.</p>
              </>
            )}

            {/* JSON Parser config */}
            {(data.tool as string) === 'json_parser' && (
              <>
                <div>
                  <label className={labelStyles}>Operation</label>
                  <select
                    value={(data.operation as string) ?? 'extract'}
                    onChange={e => update('operation', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="extract">Extract (dot path)</option>
                    <option value="keys">List Keys</option>
                    <option value="filter">Filter Array</option>
                    <option value="flatten">Flatten</option>
                    <option value="to_csv">Convert to CSV</option>
                    <option value="validate">Validate</option>
                    <option value="pretty">Pretty Print</option>
                    <option value="minify">Minify</option>
                    <option value="count">Count</option>
                  </select>
                </div>
                {(data.operation as string) === 'extract' && (
                  <div>
                    <label className={labelStyles}>Path (dot notation)</label>
                    <input
                      value={(data.path as string) ?? ''}
                      onChange={e => update('path', e.target.value)}
                      placeholder="es. data.items[0].name"
                      className={inputStyles}
                    />
                  </div>
                )}
                {(data.operation as string) === 'filter' && (
                  <>
                    <div>
                      <label className={labelStyles}>Filter Field</label>
                      <input
                        value={(data.filterField as string) ?? ''}
                        onChange={e => update('filterField', e.target.value)}
                        placeholder="es. status"
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <label className={labelStyles}>Filter Value</label>
                      <input
                        value={(data.filterValue as string) ?? ''}
                        onChange={e => update('filterValue', e.target.value)}
                        placeholder="es. active"
                        className={inputStyles}
                      />
                    </div>
                  </>
                )}
                <p className="text-xs text-gray-500">Input: stringa JSON dal nodo precedente.</p>
              </>
            )}

            {/* Web Scraper config */}
            {(data.tool as string) === 'web_scraper' && (
              <>
                <div>
                  <label className={labelStyles}>Operation</label>
                  <select
                    value={(data.operation as string) ?? 'extract_text'}
                    onChange={e => update('operation', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="extract_text">Extract Text</option>
                    <option value="extract_links">Extract Links</option>
                    <option value="extract_tables">Extract Tables</option>
                    <option value="extract_structured">CSS Selector</option>
                  </select>
                </div>
                {(data.operation as string) === 'extract_structured' && (
                  <div>
                    <label className={labelStyles}>CSS Selector</label>
                    <input
                      value={(data.cssSelector as string) ?? ''}
                      onChange={e => update('cssSelector', e.target.value)}
                      placeholder="es. h2.title, div.content p, #main a"
                      className={inputStyles}
                    />
                  </div>
                )}
                <div>
                  <label className={labelStyles}>Timeout (sec)</label>
                  <input
                    type="number"
                    min={1} max={60}
                    value={(data.timeout as number) ?? 15}
                    onChange={e => update('timeout', parseInt(e.target.value, 10))}
                    className={inputStyles}
                  />
                </div>
                <p className="text-xs text-gray-500">Input: URL della pagina da scrappare.</p>
              </>
            )}

            {/* File Manager config */}
            {(data.tool as string) === 'file_manager' && (
              <>
                <div>
                  <label className={labelStyles}>Operation</label>
                  <select
                    value={(data.operation as string) ?? 'list'}
                    onChange={e => update('operation', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="list">List Directory</option>
                    <option value="create_folder">Create Folder</option>
                    <option value="write_file">Write File</option>
                    <option value="read_file">Read File</option>
                    <option value="copy">Copy</option>
                    <option value="move">Move / Rename</option>
                    <option value="delete">Delete</option>
                    <option value="info">File Info</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Base Directory (sandbox)</label>
                  <input
                    value={(data.baseDir as string) ?? ''}
                    onChange={e => update('baseDir', e.target.value)}
                    placeholder="es. /Users/enzo/Documents (vuoto = nessun limite)"
                    className={inputStyles}
                  />
                  <p className="text-[10px] text-gray-600 mt-1">Se impostato, limita le operazioni a questa cartella.</p>
                </div>
                {((data.operation as string) === 'copy' || (data.operation as string) === 'move' || (data.operation as string) === 'write_file') && (
                  <div>
                    <label className={labelStyles}>Destination</label>
                    <input
                      value={(data.destination as string) ?? ''}
                      onChange={e => update('destination', e.target.value)}
                      placeholder={
                        (data.operation as string) === 'write_file'
                          ? 'es. /path/to/output.txt'
                          : 'es. /path/to/destination'
                      }
                      className={inputStyles}
                    />
                  </div>
                )}
                {(data.operation as string) === 'delete' && (
                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(data.confirm as boolean) ?? false}
                        onChange={e => update('confirm', e.target.checked)}
                        className="rounded bg-gray-800 border-gray-600"
                      />
                      Conferma eliminazione
                    </label>
                    <p className="text-[10px] text-red-400 mt-1">Obbligatorio per eseguire il delete.</p>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Input: percorso file/cartella. Per write_file il contenuto arriva dal nodo precedente.
                </p>
              </>
            )}

            {/* Telegram Bot config */}
            {(data.tool as string) === 'telegram_bot' && (
              <>
                <div>
                  <label className={labelStyles}>Operation</label>
                  <select
                    value={(data.operation as string) ?? 'send_message'}
                    onChange={e => update('operation', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="send_message">Send Message</option>
                    <option value="send_document">Send Document</option>
                    <option value="send_photo">Send Photo</option>
                    <option value="get_updates">Get Updates</option>
                    <option value="get_chat_info">Get Chat Info</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Bot Token</label>
                  <input
                    type="password"
                    value={(data.botToken as string) ?? ''}
                    onChange={e => update('botToken', e.target.value)}
                    placeholder="123456:ABC-DEF... (o da .env)"
                    className={inputStyles}
                  />
                  <p className="text-[10px] text-gray-600 mt-1">Fallback: TELEGRAM_BOT_TOKEN nel .env</p>
                </div>
                <div>
                  <label className={labelStyles}>Chat ID</label>
                  <input
                    value={(data.chatId as string) ?? ''}
                    onChange={e => update('chatId', e.target.value)}
                    placeholder="-100123456789"
                    className={inputStyles}
                  />
                </div>
                <div>
                  <label className={labelStyles}>Parse Mode</label>
                  <select
                    value={(data.parseMode as string) ?? 'Markdown'}
                    onChange={e => update('parseMode', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="Markdown">Markdown</option>
                    <option value="HTML">HTML</option>
                    <option value="plain">Plain text</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500">
                  Input: testo del messaggio (send_message), path file (send_document/photo).
                </p>
              </>
            )}

            {/* WhatsApp config */}
            {(data.tool as string) === 'whatsapp' && (
              <>
                <div>
                  <label className={labelStyles}>Operation</label>
                  <select
                    value={(data.operation as string) ?? 'send_message'}
                    onChange={e => update('operation', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="send_message">Send Message</option>
                    <option value="send_template">Send Template</option>
                    <option value="send_document">Send Document (URL)</option>
                    <option value="send_image">Send Image (URL)</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Recipient Number</label>
                  <input
                    value={(data.recipient as string) ?? ''}
                    onChange={e => update('recipient', e.target.value)}
                    placeholder="39xxxxxxxxxx (con prefisso)"
                    className={inputStyles}
                  />
                </div>
                {(data.operation as string) === 'send_template' && (
                  <div>
                    <label className={labelStyles}>Template Name</label>
                    <input
                      value={(data.templateName as string) ?? ''}
                      onChange={e => update('templateName', e.target.value)}
                      placeholder="es. hello_world"
                      className={inputStyles}
                    />
                  </div>
                )}
                <div>
                  <label className={labelStyles}>Access Token</label>
                  <input
                    type="password"
                    value={(data.waToken as string) ?? ''}
                    onChange={e => update('waToken', e.target.value)}
                    placeholder="Meta access token (o da .env)"
                    className={inputStyles}
                  />
                </div>
                <div>
                  <label className={labelStyles}>Phone Number ID</label>
                  <input
                    value={(data.phoneNumberId as string) ?? ''}
                    onChange={e => update('phoneNumberId', e.target.value)}
                    placeholder="ID numero (da Meta Business)"
                    className={inputStyles}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Fallback: WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID nel .env
                </p>
              </>
            )}

            {/* PyArchInit config */}
            {(data.tool as string) === 'pyarchinit_tool' && (
              <>
                <div>
                  <label className={labelStyles}>Operation</label>
                  <select
                    value={(data.operation as string) ?? 'query_us'}
                    onChange={e => update('operation', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="query_us">Query US (Unita Stratigrafiche)</option>
                    <option value="query_inventory">Query Inventario Materiali</option>
                    <option value="query_pottery">Query Ceramica</option>
                    <option value="query_sites">Query Siti</option>
                    <option value="query_structures">Query Strutture</option>
                    <option value="query_tombs">Query Tombe</option>
                    <option value="query_samples">Query Campioni</option>
                    <option value="custom_query">Custom Query</option>
                    <option value="list_tables">List Tables</option>
                    <option value="export_csv">Export CSV</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Database Path</label>
                  <input
                    value={(data.dbPath as string) ?? ''}
                    onChange={e => update('dbPath', e.target.value)}
                    placeholder="~/.pyarchinit/pyarchinit_DB_folder/pyarchinit_db.sqlite"
                    className={inputStyles}
                  />
                  <p className="text-[10px] text-gray-600 mt-1">Auto-detect se vuoto. Fallback: PYARCHINIT_DB_PATH</p>
                </div>
                <div>
                  <label className={labelStyles}>DB Type</label>
                  <select
                    value={(data.dbType as string) ?? 'sqlite'}
                    onChange={e => update('dbType', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="sqlite">SQLite</option>
                    <option value="postgresql">PostgreSQL</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Sito (filtro)</label>
                  <input
                    value={(data.sito as string) ?? ''}
                    onChange={e => update('sito', e.target.value)}
                    placeholder="es. Pompeii (vuoto = tutti)"
                    className={inputStyles}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelStyles}>Area</label>
                    <input
                      value={(data.area as string) ?? ''}
                      onChange={e => update('area', e.target.value)}
                      placeholder="es. A"
                      className={inputStyles}
                    />
                  </div>
                  <div>
                    <label className={labelStyles}>US</label>
                    <input
                      value={(data.us as string) ?? ''}
                      onChange={e => update('us', e.target.value)}
                      placeholder="es. 101"
                      className={inputStyles}
                    />
                  </div>
                </div>
                {(data.operation as string) === 'custom_query' && (
                  <div>
                    <label className={labelStyles}>Custom Query (SQL)</label>
                    <textarea
                      value={(data.customQuery as string) ?? ''}
                      onChange={e => update('customQuery', e.target.value)}
                      rows={3}
                      placeholder="SELECT * FROM us_table WHERE ..."
                      className={`${inputStyles} resize-none font-mono text-xs`}
                    />
                    <p className="text-[10px] text-red-400 mt-1">Solo query SELECT (read-only).</p>
                  </div>
                )}
              </>
            )}

            {/* QGIS Project config */}
            {(data.tool as string) === 'qgis_project' && (
              <>
                <div>
                  <label className={labelStyles}>Operation</label>
                  <select
                    value={(data.operation as string) ?? 'list_layers'}
                    onChange={e => update('operation', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="list_layers">List Layers</option>
                    <option value="project_info">Project Info</option>
                    <option value="list_plugins">List Plugins</option>
                    <option value="read_style">Read Style</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Project Path (.qgs / .qgz)</label>
                  <input
                    value={(data.projectPath as string) ?? ''}
                    onChange={e => update('projectPath', e.target.value)}
                    placeholder="/path/to/project.qgz"
                    className={inputStyles}
                  />
                  <p className="text-[10px] text-gray-600 mt-1">Oppure passa il path dal nodo Input.</p>
                </div>
                {(data.operation as string) === 'read_style' && (
                  <div>
                    <label className={labelStyles}>Layer Name</label>
                    <input
                      value={(data.layerName as string) ?? ''}
                      onChange={e => update('layerName', e.target.value)}
                      placeholder="Nome del layer (vuoto = tutti)"
                      className={inputStyles}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Parsing XML/ZIP senza dipendenza QGIS.
                </p>
              </>
            )}

            <div>
              <label className={labelStyles}>Custom Parameters (JSON)</label>
              <textarea
                value={(data.customParams as string) ?? ''}
                onChange={e => update('customParams', e.target.value)}
                rows={2}
                placeholder='{"key": "value"}'
                className={`${inputStyles} resize-none font-mono text-xs`}
              />
            </div>
          </>
        )}

        {/* === CONDITION === */}
        {nodeType === 'condition' && (
          <>
            <div>
              <label className={labelStyles}>Condition Type</label>
              <select
                value={(data.conditionType as string) ?? 'contains'}
                onChange={e => update('conditionType', e.target.value)}
                className={selectStyles}
              >
                <option value="contains">Contains keyword</option>
                <option value="not_contains">Does not contain</option>
                <option value="score_threshold">Score threshold</option>
                <option value="keyword">Keyword (primi 500 char)</option>
                <option value="regex">Regex match</option>
                <option value="length_above">Lunghezza &gt; N</option>
                <option value="length_below">Lunghezza &lt; N</option>
              </select>
            </div>
            <div>
              <label className={labelStyles}>Value</label>
              <input
                value={(data.conditionValue as string) ?? ''}
                onChange={e => update('conditionValue', e.target.value)}
                placeholder={
                  (data.conditionType as string) === 'contains' ? 'es. APPROVED, VALIDO'
                  : (data.conditionType as string) === 'score_threshold' ? 'es. 7'
                  : (data.conditionType as string) === 'regex' ? 'es. ^(yes|ok)$'
                  : (data.conditionType as string) === 'length_above' ? 'es. 100'
                  : (data.conditionType as string) === 'length_below' ? 'es. 1000'
                  : 'Valore...'
                }
                className={inputStyles}
              />
            </div>
            {(data.conditionType as string) === 'score_threshold' && (
              <div>
                <label className={labelStyles}>Operator</label>
                <select
                  value={(data.operator as string) ?? 'gte'}
                  onChange={e => update('operator', e.target.value)}
                  className={selectStyles}
                >
                  <option value="gte">&ge; (maggiore o uguale)</option>
                  <option value="gt">&gt; (maggiore)</option>
                  <option value="lte">&le; (minore o uguale)</option>
                  <option value="lt">&lt; (minore)</option>
                  <option value="eq">= (uguale)</option>
                </select>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Collega le edge uscenti con label &quot;true&quot; e &quot;false&quot; per il branching condizionale.
            </p>
          </>
        )}

        {/* === LOOP === */}
        {nodeType === 'loop' && (
          <>
            <div>
              <label className={labelStyles}>Max Iterations</label>
              <input
                type="number"
                min={1} max={50}
                value={(data.maxIterations as number) ?? 3}
                onChange={e => update('maxIterations', parseInt(e.target.value, 10))}
                className={inputStyles}
              />
            </div>
            <div>
              <label className={labelStyles}>Exit Condition Type</label>
              <select
                value={(data.exitConditionType as string) ?? 'keyword'}
                onChange={e => update('exitConditionType', e.target.value)}
                className={selectStyles}
              >
                <option value="keyword">Contains keyword</option>
                <option value="score">Quality score threshold</option>
                <option value="no_change">No significant change</option>
                <option value="llm_eval">LLM decides to stop</option>
              </select>
            </div>
            <div>
              <label className={labelStyles}>Exit Value</label>
              <input
                value={(data.exitValue as string) ?? ''}
                onChange={e => update('exitValue', e.target.value)}
                placeholder={
                  (data.exitConditionType as string) === 'keyword' ? 'es. APPROVED, DONE'
                  : (data.exitConditionType as string) === 'score' ? 'es. 0.8'
                  : 'Condizione...'
                }
                className={inputStyles}
              />
            </div>
            <div>
              <label className={labelStyles}>Refinement Prompt</label>
              <textarea
                value={(data.refinementPrompt as string) ?? ''}
                onChange={e => update('refinementPrompt', e.target.value)}
                rows={3}
                placeholder="Prompt per guidare il miglioramento ad ogni iterazione..."
                className={`${inputStyles} resize-none`}
              />
            </div>
          </>
        )}

        {/* === AGGREGATOR === */}
        {nodeType === 'aggregator' && (
          <>
            <div>
              <label className={labelStyles}>Strategy</label>
              <select
                value={(data.strategy as string) ?? 'concatenate'}
                onChange={e => update('strategy', e.target.value)}
                className={selectStyles}
              >
                <option value="concatenate">Concatenate</option>
                <option value="merge">Merge (rimuovi duplicati)</option>
                <option value="summarize">Summarize (usa LLM)</option>
                <option value="vote">Majority Vote</option>
                <option value="best">Select Best (usa LLM)</option>
                <option value="custom">Custom Template</option>
              </select>
            </div>
            {((data.strategy as string) === 'concatenate' || !(data.strategy as string)) && (
              <div>
                <label className={labelStyles}>Separator</label>
                <input
                  value={(data.separator as string) ?? '\n---\n'}
                  onChange={e => update('separator', e.target.value)}
                  placeholder="\n---\n"
                  className={inputStyles}
                />
              </div>
            )}
            {(data.strategy as string) === 'summarize' && (
              <div>
                <label className={labelStyles}>Summary Prompt</label>
                <textarea
                  value={(data.summaryPrompt as string) ?? ''}
                  onChange={e => update('summaryPrompt', e.target.value)}
                  rows={3}
                  placeholder="Sintetizza i seguenti risultati..."
                  className={`${inputStyles} resize-none`}
                />
              </div>
            )}
            {(data.strategy as string) === 'custom' && (
              <div>
                <label className={labelStyles}>Custom Template</label>
                <textarea
                  value={(data.customTemplate as string) ?? ''}
                  onChange={e => update('customTemplate', e.target.value)}
                  rows={3}
                  placeholder="Usa {result_1}, {result_2}, ... come variabili"
                  className={`${inputStyles} resize-none`}
                />
              </div>
            )}
          </>
        )}

        {/* === META-AGENT === */}
        {nodeType === 'meta_agent' && (
          <>
            <div>
              <label className={labelStyles}>Max Recursion Depth</label>
              <input
                type="number"
                min={1} max={5}
                value={(data.maxDepth as number) ?? 3}
                onChange={e => update('maxDepth', parseInt(e.target.value, 10))}
                className={inputStyles}
              />
            </div>
            <div>
              <label className={labelStyles}>Sub-Workflow (JSON)</label>
              <textarea
                value={typeof data.workflowDefinition === 'string'
                  ? data.workflowDefinition as string
                  : data.workflowDefinition ? JSON.stringify(data.workflowDefinition, null, 2) : ''}
                onChange={e => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    update('workflowDefinition', parsed);
                  } catch {
                    update('workflowDefinition', e.target.value);
                  }
                }}
                rows={8}
                placeholder='{"nodes": [...], "edges": [...]}'
                className={`${inputStyles} resize-none font-mono text-xs`}
              />
            </div>
            <p className="text-xs text-gray-500">
              Incolla la definizione di un sub-workflow. Il meta-agent lo eseguira ricorsivamente fino alla profondita massima.
            </p>
          </>
        )}

        {/* === CHUNKER === */}
        {nodeType === 'chunker' && (
          <>
            <div>
              <label className={labelStyles}>Model</label>
              <select
                value={(data.model as string) ?? 'claude-sonnet-4-5-20250929'}
                onChange={e => update('model', e.target.value)}
                className={selectStyles}
              >
                <optgroup label="Anthropic">
                  <option value="claude-opus-4-6">Claude Opus 4.6</option>
                  <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                </optgroup>
                <optgroup label="OpenAI">
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o mini</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className={labelStyles}>System Prompt</label>
              <textarea
                value={(data.systemPrompt as string) ?? ''}
                onChange={e => update('systemPrompt', e.target.value)}
                rows={3}
                placeholder="Prompt applicato a ogni chunk..."
                className={`${inputStyles} resize-none`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelStyles}>Chunk Size (chars)</label>
                <input
                  type="number"
                  min={100} max={50000} step={100}
                  value={(data.chunkSize as number) ?? 2000}
                  onChange={e => update('chunkSize', parseInt(e.target.value, 10))}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className={labelStyles}>Overlap</label>
                <input
                  type="number"
                  min={0} max={5000} step={50}
                  value={(data.overlap as number) ?? 200}
                  onChange={e => update('overlap', parseInt(e.target.value, 10))}
                  className={inputStyles}
                />
              </div>
            </div>
          </>
        )}

        {/* === DELAY === */}
        {nodeType === 'delay' && (
          <>
            <div>
              <label className={labelStyles}>Delay (seconds)</label>
              <input
                type="number"
                min={0.1} max={300} step={0.5}
                value={(data.delaySeconds as number) ?? 1}
                onChange={e => update('delaySeconds', parseFloat(e.target.value))}
                className={inputStyles}
              />
            </div>
            <p className="text-xs text-gray-500">
              Pausa tra nodi. Utile per rate limiting API o attese.
            </p>
          </>
        )}

        {/* === SWITCH === */}
        {nodeType === 'switch' && (
          <>
            <div>
              <label className={labelStyles}>Switch Type</label>
              <select
                value={(data.switchType as string) ?? 'keyword'}
                onChange={e => update('switchType', e.target.value)}
                className={selectStyles}
              >
                <option value="keyword">Keyword Match</option>
                <option value="regex">Regex Match</option>
                <option value="score">Score Threshold</option>
              </select>
            </div>
            <p className="text-xs text-gray-500">
              Collega piu edge in uscita. Ogni edge label = condizione.
              L'input viene confrontato con le label. Edge "default" usato se nessun match.
            </p>
            <p className="text-[10px] text-gray-600">
              Keyword: label presente nel testo. Regex: label come pattern. Score: label come soglia numerica.
            </p>
          </>
        )}

        {/* === VALIDATOR === */}
        {nodeType === 'validator' && (
          <>
            <div>
              <label className={labelStyles}>Model</label>
              <select
                value={(data.model as string) ?? 'claude-haiku-4-5-20251001'}
                onChange={e => update('model', e.target.value)}
                className={selectStyles}
              >
                <optgroup label="Anthropic">
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (fast)</option>
                  <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
                  <option value="claude-opus-4-6">Claude Opus 4.6</option>
                </optgroup>
                <optgroup label="OpenAI">
                  <option value="gpt-4o-mini">GPT-4o mini (fast)</option>
                  <option value="gpt-4o">GPT-4o</option>
                </optgroup>
                <optgroup label="Local (Ollama)">
                  <option value="ollama:llama3.3">Llama 3.3</option>
                  <option value="ollama:mistral">Mistral</option>
                </optgroup>
              </select>
              <p className="text-[10px] text-gray-600 mt-0.5">Modello AI per la validazione. Haiku consigliato per velocita.</p>
            </div>
            <div>
              <label className={labelStyles}>Validation Prompt</label>
              <textarea
                value={(data.validationPrompt as string) ?? ''}
                onChange={e => update('validationPrompt', e.target.value)}
                rows={4}
                placeholder="Descrivi i criteri di validazione, es: il testo deve essere in italiano, almeno 200 parole, senza errori grammaticali..."
                className={`${inputStyles} resize-none`}
              />
            </div>
            <div>
              <label className={labelStyles}>Strictness ({(data.strictness as number) ?? 7}/10)</label>
              <input
                type="range"
                min={1} max={10} step={1}
                value={(data.strictness as number) ?? 7}
                onChange={e => update('strictness', parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>Lenient</span>
                <span>Strict</span>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(data.includeContext as boolean) ?? false}
                  onChange={e => update('includeContext', e.target.checked)}
                  className="rounded bg-gray-800 border-gray-600"
                />
                Include Workflow Context
              </label>
              <p className="text-[10px] text-gray-600 mt-0.5">Se attivo, l'agente vede anche i nodi del workflow.</p>
            </div>
            <p className="text-xs text-gray-500">
              Collega 2 edge: label "pass" e "fail". L'agente valida l'input e instrada il flusso.
            </p>
          </>
        )}

        {/* === RETRY / ERROR HANDLING (universal for agent + tool) === */}
        {(nodeType === 'agent' || nodeType === 'tool') && (
          <>
            <div className="border-t border-gray-700 pt-3 mt-2">
              <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-2">Error Handling</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelStyles}>Retry Count</label>
                <input
                  type="number" min={0} max={5}
                  value={(data.retryCount as number) ?? 0}
                  onChange={e => update('retryCount', parseInt(e.target.value, 10))}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className={labelStyles}>Retry Delay (sec)</label>
                <input
                  type="number" min={1} max={60}
                  value={(data.retryDelay as number) ?? 2}
                  onChange={e => update('retryDelay', parseInt(e.target.value, 10))}
                  className={inputStyles}
                />
              </div>
            </div>
            <div>
              <label className={labelStyles}>On Error</label>
              <select
                value={(data.onError as string) ?? 'stop'}
                onChange={e => update('onError', e.target.value)}
                className={selectStyles}
              >
                <option value="stop">Stop Workflow</option>
                <option value="skip">Skip Node</option>
                <option value="fallback">Use Fallback Value</option>
              </select>
            </div>
            {(data.onError as string) === 'fallback' && (
              <div>
                <label className={labelStyles}>Fallback Value</label>
                <input
                  value={(data.fallbackValue as string) ?? ''}
                  onChange={e => update('fallbackValue', e.target.value)}
                  placeholder="Valore di default se il nodo fallisce"
                  className={inputStyles}
                />
              </div>
            )}
          </>
        )}

        {/* === VARIABLE STORE (universal) === */}
        {(nodeType === 'agent' || nodeType === 'tool' || nodeType === 'input') && (
          <div className="border-t border-gray-700 pt-3 mt-2">
            <label className={labelStyles}>Save Output as Variable</label>
            <input
              value={(data.setVariable as string) ?? ''}
              onChange={e => update('setVariable', e.target.value)}
              placeholder="es. risultato_ricerca (accedi con {var:nome})"
              className={inputStyles}
            />
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-500 rounded py-2 text-sm font-medium transition-colors"
        >
          Applica
        </button>
      </div>
    </div>
  );
}
