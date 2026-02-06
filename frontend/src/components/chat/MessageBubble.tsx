import { User, Bot, Workflow } from 'lucide-react';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ChatMessage } from '@/types';

interface Props {
  message: ChatMessage;
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

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const { loadFromDefinition } = useWorkflowStore();
  const { setViewMode } = useSettingsStore();

  const workflowJson = !isUser ? extractWorkflowJson(message.content) : null;

  const handleLoadWorkflow = () => {
    if (!workflowJson) return;
    loadFromDefinition(workflowJson);
    setViewMode('builder');
  };

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
        <div className="prose prose-invert prose-sm max-w-none">
          <MarkdownRenderer content={message.content} />
        </div>
        {workflowJson && (
          <button
            onClick={handleLoadWorkflow}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Workflow className="w-4 h-4" />
            Apri nel Builder
          </button>
        )}
      </div>
    </div>
  );
}
