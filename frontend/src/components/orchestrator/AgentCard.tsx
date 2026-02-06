import { Bot } from 'lucide-react';
import type { NodeStatus } from '@/types';

interface Props {
  name: string;
  model: string;
  status: NodeStatus;
}

const statusColors: Record<NodeStatus, string> = {
  waiting: 'border-gray-600',
  running: 'border-blue-500 ring-1 ring-blue-500/30',
  done: 'border-green-500',
  error: 'border-red-500',
};

export function AgentCard({ name, model, status }: Props) {
  return (
    <div className={`bg-gray-800 border ${statusColors[status]} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Bot className="w-5 h-5 text-purple-400" />
        <span className="font-medium">{name}</span>
      </div>
      <p className="text-xs text-gray-400">{model}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${
          status === 'running' ? 'bg-blue-500 animate-pulse' :
          status === 'done' ? 'bg-green-500' :
          status === 'error' ? 'bg-red-500' : 'bg-gray-500'
        }`} />
        <span className="text-xs text-gray-400 capitalize">{status}</span>
      </div>
    </div>
  );
}
