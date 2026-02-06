import { Bot } from 'lucide-react';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';

interface Props {
  content: string;
  model?: string;
}

export function StreamingMessage({ content, model }: Props) {
  return (
    <div className="flex gap-3 px-4 py-3 bg-gray-900/50">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-600">
        <Bot className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">Assistant</span>
          {model && <span className="text-xs text-gray-500">{model}</span>}
        </div>
        <div className="prose prose-invert prose-sm max-w-none">
          {content ? <MarkdownRenderer content={content} /> : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.15s]" />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
