import { useState, useCallback } from 'react';
import { Play, Square, Loader2, AlertCircle } from 'lucide-react';
import { ExecutionLog } from './ExecutionLog';
import { ResultsPanel } from './ResultsPanel';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { runWorkflow } from '@/services/api';

export type LogEntry = {
  id: string;
  agent: string;
  status: 'waiting' | 'running' | 'done' | 'error';
  message: string;
  timestamp: string;
  tokens?: number;
  duration?: number;
};

export function PipelineView() {
  const currentWorkflow = useWorkflowStore(s => s.currentWorkflow);
  const setViewMode = useSettingsStore(s => s.setViewMode);

  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    if (!currentWorkflow) return;
    setIsRunning(true);
    setError(null);
    setResult(null);
    setLogs([]);

    // Build initial log entries from workflow nodes
    const nodes = currentWorkflow.definition?.nodes ?? [];
    const initialLogs: LogEntry[] = nodes.map((n, i) => ({
      id: n.id,
      agent: (n.data as Record<string, string>)?.label ?? n.type ?? `Node ${i + 1}`,
      status: 'waiting' as const,
      message: 'In attesa...',
      timestamp: '',
    }));
    setLogs(initialLogs);

    // Simulate progression: mark first as running
    if (initialLogs.length > 0) {
      setLogs(prev => prev.map((l, i) =>
        i === 0 ? { ...l, status: 'running' as const, message: 'In esecuzione...', timestamp: new Date().toLocaleTimeString() } : l
      ));
    }

    try {
      const res = await runWorkflow(currentWorkflow.id);
      // Mark all as done
      setLogs(prev => prev.map(l => ({
        ...l,
        status: 'done' as const,
        message: 'Completato',
        timestamp: l.timestamp || new Date().toLocaleTimeString(),
      })));
      setResult(typeof res === 'string' ? res : JSON.stringify(res, null, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore durante esecuzione';
      setError(msg);
      setLogs(prev => {
        const running = prev.findIndex(l => l.status === 'running');
        return prev.map((l, i) =>
          i === running ? { ...l, status: 'error' as const, message: msg } :
          l.status === 'waiting' ? { ...l, status: 'waiting' as const, message: 'Annullato' } : l
        );
      });
    } finally {
      setIsRunning(false);
    }
  }, [currentWorkflow]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    setLogs(prev => prev.map(l =>
      l.status === 'running' ? { ...l, status: 'error' as const, message: 'Fermato manualmente' } :
      l.status === 'waiting' ? { ...l, message: 'Annullato' } : l
    ));
  }, []);

  if (!currentWorkflow) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
        <AlertCircle className="w-10 h-10 text-gray-600" />
        <p className="text-lg font-medium">Nessun workflow selezionato</p>
        <p className="text-sm text-gray-600">Crea o salva un workflow nel Builder per poterlo eseguire qui.</p>
        <button
          onClick={() => setViewMode('builder')}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white transition-colors"
        >
          Vai al Builder
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold">{currentWorkflow.name}</h2>
          <p className="text-xs text-gray-500">
            {currentWorkflow.definition?.nodes?.length ?? 0} nodi &middot;{' '}
            {currentWorkflow.definition?.edges?.length ?? 0} connessioni
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-sm transition-colors"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button
            onClick={handleStop}
            disabled={!isRunning}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg text-sm transition-colors"
          >
            <Square className="w-4 h-4" /> Stop
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <ExecutionLog logs={logs} />
          {error && (
            <div className="mx-4 mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}
        </div>
        <div className="w-80 border-l border-gray-800 overflow-y-auto">
          <ResultsPanel result={result} />
        </div>
      </div>
    </div>
  );
}
