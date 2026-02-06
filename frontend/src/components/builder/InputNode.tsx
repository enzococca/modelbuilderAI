import { Handle, Position } from '@xyflow/react';
import { FileInput, Loader2, CheckCircle2, AlertCircle, File } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';

export function InputNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const status = d._status as string | undefined;
  const fileName = d.fileName as string | undefined;
  return (
    <div className="bg-gray-800 border border-cyan-500/50 rounded-xl px-4 py-3 min-w-[180px] shadow-lg" style={{ '--pulse-color': 'rgba(6, 182, 212, 0.7)' } as React.CSSProperties}>
      <div className="flex items-center gap-2 mb-1">
        {status === 'running'
          ? <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          : status === 'done'
          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
          : status === 'error'
          ? <AlertCircle className="w-4 h-4 text-red-400" />
          : <FileInput className="w-4 h-4 text-cyan-400" />
        }
        <span className="text-sm font-medium text-white">{d.label as string || 'Input'}</span>
      </div>
      {fileName ? (
        <div className="flex items-center gap-1.5">
          <File className="w-3 h-3 text-cyan-400 shrink-0" />
          <p className="text-xs text-cyan-300 truncate">{fileName}</p>
        </div>
      ) : (
        <p className="text-xs text-gray-400">{d.inputType as string || 'text'}{d.source ? ` — ${d.source}` : ''}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500" />
    </div>
  );
}
