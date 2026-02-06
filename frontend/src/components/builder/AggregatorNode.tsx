import { Handle, Position } from '@xyflow/react';
import { Layers, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';

export function AggregatorNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const status = d._status as string | undefined;
  return (
    <div className="bg-gray-800 border border-pink-500/50 rounded-xl px-4 py-3 min-w-[180px] shadow-lg" style={{ '--pulse-color': 'rgba(236, 72, 153, 0.7)' } as React.CSSProperties}>
      <Handle type="target" position={Position.Top} className="!bg-pink-500" />
      <div className="flex items-center gap-2 mb-1">
        {status === 'running'
          ? <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />
          : status === 'done'
          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
          : status === 'error'
          ? <AlertCircle className="w-4 h-4 text-red-400" />
          : <Layers className="w-4 h-4 text-pink-400" />
        }
        <span className="text-sm font-medium text-white">{d.label as string || 'Aggregator'}</span>
      </div>
      <p className="text-xs text-gray-400">{d.strategy as string || 'concatenate'}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-pink-500" />
    </div>
  );
}
