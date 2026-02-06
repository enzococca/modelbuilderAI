import { Handle, Position } from '@xyflow/react';
import { GitBranch, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';

export function ConditionNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const status = d._status as string | undefined;
  const condType = d.conditionType as string;
  const expr = d.expression as string;
  return (
    <div className="bg-gray-800 border border-yellow-500/50 rounded-xl px-4 py-3 min-w-[180px] shadow-lg" style={{ '--pulse-color': 'rgba(234, 179, 8, 0.7)' } as React.CSSProperties}>
      <Handle type="target" position={Position.Top} className="!bg-yellow-500" />
      <div className="flex items-center gap-2 mb-1">
        {status === 'running'
          ? <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
          : status === 'done'
          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
          : status === 'error'
          ? <AlertCircle className="w-4 h-4 text-red-400" />
          : <GitBranch className="w-4 h-4 text-yellow-400" />
        }
        <span className="text-sm font-medium text-white">{d.label as string || 'Condition'}</span>
      </div>
      {(condType || expr) && (
        <p className="text-xs text-gray-400 truncate">
          {condType ? condType.replace(/_/g, ' ') : ''}{expr ? `: ${expr}` : ''}
        </p>
      )}
      <div className="flex justify-between mt-2 text-[10px] text-gray-500 px-1">
        <span className="text-green-400">{d.trueBranch as string || 'Yes'}</span>
        <span className="text-red-400">{d.falseBranch as string || 'No'}</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-green-500 !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="no" className="!bg-red-500 !left-[70%]" />
    </div>
  );
}
