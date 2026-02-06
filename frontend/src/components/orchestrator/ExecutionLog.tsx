import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { LogEntry } from './PipelineView';

const statusIcon = {
  waiting: <Clock className="w-4 h-4 text-gray-500" />,
  running: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  done: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
};

export function ExecutionLog({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Execution Log</h3>
        <p className="text-sm text-gray-600 text-center py-6">
          Premi Run per eseguire il workflow e vedere i log qui.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Execution Log</h3>
      {logs.map(log => (
        <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
          <div className="mt-0.5">{statusIcon[log.status]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{log.agent}</span>
              {log.timestamp && <span className="text-xs text-gray-500">{log.timestamp}</span>}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{log.message}</p>
            {(log.tokens || log.duration) && (
              <div className="flex gap-3 mt-1">
                {log.tokens && <span className="text-xs text-gray-500">{log.tokens} tokens</span>}
                {log.duration && <span className="text-xs text-gray-500">{log.duration}s</span>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
