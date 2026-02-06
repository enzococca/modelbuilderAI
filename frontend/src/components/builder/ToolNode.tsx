import { Handle, Position } from '@xyflow/react';
import { Wrench, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';

const toolLabels: Record<string, string> = {
  web_search: 'Web Search',
  code_executor: 'Code Executor',
  file_processor: 'File Processor',
  database_tool: 'Database',
  image_tool: 'Image',
};

export function ToolNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const status = d._status as string | undefined;
  const toolName = toolLabels[d.tool as string] ?? '';
  return (
    <div className="bg-gray-800 border border-green-500/50 rounded-xl px-4 py-3 min-w-[180px] shadow-lg" style={{ '--pulse-color': 'rgba(34, 197, 94, 0.7)' } as React.CSSProperties}>
      <Handle type="target" position={Position.Top} className="!bg-green-500" />
      <div className="flex items-center gap-2 mb-1">
        {status === 'running'
          ? <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
          : status === 'done'
          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
          : status === 'error'
          ? <AlertCircle className="w-4 h-4 text-red-400" />
          : <Wrench className="w-4 h-4 text-green-400" />
        }
        <span className="text-sm font-medium text-white">{d.label as string || 'Tool'}</span>
      </div>
      {toolName && <p className="text-xs text-gray-400">{toolName}</p>}
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
}
