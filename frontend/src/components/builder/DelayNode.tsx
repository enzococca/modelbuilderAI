import { Handle, Position } from '@xyflow/react';
import { Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';

export function DelayNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const status = d._status as string | undefined;
  const seconds = (d.delaySeconds as number) || (d.delay_seconds as number) || 1;
  return (
    <div className="bg-gray-800 border border-amber-500/50 rounded-xl px-4 py-3 min-w-[180px] shadow-lg" style={{ '--pulse-color': 'rgba(245, 158, 11, 0.7)' } as React.CSSProperties}>
      <Handle type="target" position={Position.Top} className="!bg-amber-500" />
      <div className="flex items-center gap-2 mb-1">
        {status === 'running'
          ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          : status === 'done'
          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
          : status === 'error'
          ? <AlertCircle className="w-4 h-4 text-red-400" />
          : <Clock className="w-4 h-4 text-amber-400" />
        }
        <span className="text-sm font-medium text-white">{d.label as string || 'Delay'}</span>
      </div>
      <p className="text-xs text-gray-400">{seconds}s</p>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
    </div>
  );
}
