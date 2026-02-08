import { Handle, Position } from '@xyflow/react';
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';

export function ValidatorNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const status = d._status as string | undefined;
  const prompt = d.validationPrompt as string;
  const strictness = d.strictness as number;
  return (
    <div className="bg-gray-800 border border-emerald-500/50 rounded-xl px-4 py-3 min-w-[180px] shadow-lg" style={{ '--pulse-color': 'rgba(16, 185, 129, 0.7)' } as React.CSSProperties}>
      <Handle type="target" position={Position.Top} className="!bg-emerald-500" />
      <div className="flex items-center gap-2 mb-1">
        {status === 'running'
          ? <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
          : status === 'done'
          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
          : status === 'error'
          ? <AlertCircle className="w-4 h-4 text-red-400" />
          : <ShieldCheck className="w-4 h-4 text-emerald-400" />
        }
        <span className="text-sm font-medium text-white">{d.label as string || 'Validator'}</span>
      </div>
      {prompt && (
        <p className="text-xs text-gray-400 truncate">{prompt}</p>
      )}
      {strictness != null && (
        <p className="text-[10px] text-gray-500 mt-0.5">Strictness: {strictness}/10</p>
      )}
      <div className="flex justify-between mt-2 text-[10px] text-gray-500 px-1">
        <span className="text-green-400">Pass</span>
        <span className="text-red-400">Fail</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="pass" className="!bg-green-500 !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="fail" className="!bg-red-500 !left-[70%]" />
    </div>
  );
}
