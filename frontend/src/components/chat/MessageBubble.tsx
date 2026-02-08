import { User, Bot, Workflow, Paperclip, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ChatMessage } from '@/types';

interface Props {
  message: ChatMessage;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_NODE_TYPES = new Set([
  'input', 'output', 'agent', 'tool', 'condition', 'loop',
  'aggregator', 'meta_agent', 'chunker', 'delay', 'switch', 'validator',
]);

const VALID_TOOLS = new Set([
  'web_search', 'code_executor', 'file_processor', 'database_tool',
  'image_tool', 'ml_pipeline', 'website_generator', 'gis_tool',
  'file_search', 'email_search', 'project_analyzer', 'email_sender',
  'web_scraper', 'file_manager', 'http_request', 'text_transformer',
  'notifier', 'json_parser', 'telegram_bot', 'whatsapp',
  'pyarchinit_tool', 'qgis_project',
]);

function validateWorkflow(wf: { nodes: unknown[]; edges: unknown[] }): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!wf.nodes.length) {
    errors.push('Nessun nodo nel workflow');
    return { valid: false, errors, warnings };
  }

  const nodeIds = new Set<string>();
  const dupeIds = new Set<string>();

  // Validate nodes
  for (const raw of wf.nodes) {
    const n = raw as Record<string, unknown>;
    if (!n.id || typeof n.id !== 'string') {
      errors.push('Nodo senza id valido');
      continue;
    }
    if (nodeIds.has(n.id)) dupeIds.add(n.id);
    nodeIds.add(n.id);

    if (!n.type || !VALID_NODE_TYPES.has(n.type as string)) {
      errors.push(`Nodo "${n.id}": tipo "${n.type}" non valido`);
    }
    if (!n.position || typeof n.position !== 'object') {
      warnings.push(`Nodo "${n.id}": posizione mancante`);
    }
    if (!n.data || typeof n.data !== 'object') {
      errors.push(`Nodo "${n.id}": data mancante`);
      continue;
    }

    const data = n.data as Record<string, unknown>;
    const type = n.type as string;

    // Type-specific validation
    if (type === 'agent') {
      if (!data.model) warnings.push(`Nodo "${n.id}" (agent): modello non specificato`);
      if (!data.systemPrompt) warnings.push(`Nodo "${n.id}" (agent): system prompt vuoto`);
    }
    if (type === 'tool') {
      const tool = (data.tool || data.tool_name) as string;
      if (!tool) {
        errors.push(`Nodo "${n.id}" (tool): tool name mancante`);
      } else if (!VALID_TOOLS.has(tool)) {
        errors.push(`Nodo "${n.id}": tool "${tool}" non esiste`);
      }
    }
  }

  if (dupeIds.size > 0) {
    errors.push(`ID duplicati: ${[...dupeIds].join(', ')}`);
  }

  // Validate edges
  const connectedNodes = new Set<string>();
  for (const raw of wf.edges) {
    const e = raw as Record<string, unknown>;
    if (!e.source || !e.target) {
      errors.push('Edge senza source/target');
      continue;
    }
    if (!nodeIds.has(e.source as string)) {
      errors.push(`Edge "${e.id}": source "${e.source}" non esiste`);
    }
    if (!nodeIds.has(e.target as string)) {
      errors.push(`Edge "${e.id}": target "${e.target}" non esiste`);
    }
    if (e.source === e.target) {
      errors.push(`Edge "${e.id}": self-loop (source = target)`);
    }
    connectedNodes.add(e.source as string);
    connectedNodes.add(e.target as string);
  }

  // Check for disconnected nodes
  for (const id of nodeIds) {
    if (!connectedNodes.has(id) && wf.nodes.length > 1) {
      warnings.push(`Nodo "${id}" non collegato`);
    }
  }

  // Check for input/output
  const types = wf.nodes.map(n => (n as Record<string, unknown>).type);
  if (!types.includes('input')) warnings.push('Nessun nodo Input');
  if (!types.includes('output')) warnings.push('Nessun nodo Output');

  return { valid: errors.length === 0, errors, warnings };
}

function extractWorkflowJson(content: string): { nodes: unknown[]; edges: unknown[] } | null {
  const match = content.match(/```workflow\s*\n([\s\S]*?)```/);
  if (!match) return null;
  try {
    const json = JSON.parse(match[1]);
    if (Array.isArray(json.nodes) && Array.isArray(json.edges)) {
      return json;
    }
  } catch { /* ignore */ }
  return null;
}

/** Extract file names from the [File allegati:...] prefix. */
function extractFileNames(content: string): string[] {
  const match = content.match(/^\[File allegati:\n([\s\S]*?)\]\n/);
  if (!match) return [];
  return match[1].split('\n').map(l => l.replace(/^- /, '').trim()).filter(Boolean);
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const { loadFromDefinition } = useWorkflowStore();
  const { setViewMode } = useSettingsStore();

  const workflowJson = !isUser ? extractWorkflowJson(message.content) : null;
  const validation = workflowJson ? validateWorkflow(workflowJson) : null;
  const attachedNames = isUser ? extractFileNames(message.content) : [];

  const handleLoadWorkflow = () => {
    if (!workflowJson) return;
    loadFromDefinition(workflowJson);
    setViewMode('builder');
  };

  // Remove the [File allegati:...] prefix from display
  const displayContent = isUser && attachedNames.length > 0
    ? message.content.replace(/^\[File allegati:\n[\s\S]*?\]\n\n/, '')
    : message.content;

  return (
    <div className={`flex gap-3 px-4 py-3 ${isUser ? '' : 'bg-gray-900/50'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-600' : 'bg-purple-600'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{isUser ? 'You' : 'Assistant'}</span>
          {message.model && (
            <span className="text-xs text-gray-500">{message.model}</span>
          )}
        </div>

        {/* Attached files badge */}
        {attachedNames.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {attachedNames.map((name, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-900/30 border border-indigo-700/40 rounded text-xs text-indigo-300">
                <Paperclip className="w-3 h-3" />
                {name}
              </span>
            ))}
          </div>
        )}

        <div className="prose prose-invert prose-sm max-w-none">
          <MarkdownRenderer content={displayContent} />
        </div>
        {workflowJson && validation && (
          <div className="mt-3 space-y-2">
            {/* Validation status */}
            <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-sm ${
              validation.errors.length > 0
                ? 'bg-red-950/30 border-red-800/40 text-red-300'
                : validation.warnings.length > 0
                  ? 'bg-yellow-950/30 border-yellow-800/40 text-yellow-300'
                  : 'bg-green-950/30 border-green-800/40 text-green-300'
            }`}>
              {validation.errors.length > 0 ? (
                <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              ) : validation.warnings.length > 0 ? (
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-400" />
              ) : (
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-400" />
              )}
              <div>
                <div className="font-medium">
                  {validation.errors.length > 0
                    ? `Workflow con ${validation.errors.length} errori`
                    : validation.warnings.length > 0
                      ? `Workflow valido con ${validation.warnings.length} avvisi`
                      : `Workflow valido (${(workflowJson.nodes as unknown[]).length} nodi, ${(workflowJson.edges as unknown[]).length} edge)`
                  }
                </div>
                {validation.errors.map((e, i) => (
                  <div key={`e${i}`} className="text-xs mt-0.5 text-red-400">- {e}</div>
                ))}
                {validation.warnings.map((w, i) => (
                  <div key={`w${i}`} className="text-xs mt-0.5 text-yellow-400/80">- {w}</div>
                ))}
              </div>
            </div>

            {/* Open in builder button */}
            <button
              onClick={handleLoadWorkflow}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                validation.valid
                  ? 'bg-indigo-600 hover:bg-indigo-500'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <Workflow className="w-4 h-4" />
              {validation.valid ? 'Apri nel Builder' : 'Apri comunque nel Builder'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
