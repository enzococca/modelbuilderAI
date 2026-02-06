import { useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { streamChat } from '@/services/api';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';
import { ChatInput } from './ChatInput';
import type { ChatMessage } from '@/types';

export function ChatPanel() {
  const {
    messages, addMessage, currentModel,
    isStreaming, setIsStreaming,
    streamingContent, setStreamingContent, appendStreamingContent,
  } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = (content: string) => {
    const userMsg: ChatMessage = { role: 'user', content };
    addMessage(userMsg);
    setIsStreaming(true);
    setStreamingContent('');

    const allMessages = [...messages, userMsg];
    streamChat(
      { model: currentModel, messages: allMessages },
      (chunk) => appendStreamingContent(chunk.content),
      () => {
        const finalContent = useChatStore.getState().streamingContent;
        addMessage({ role: 'assistant', content: finalContent, model: currentModel });
        setStreamingContent('');
        setIsStreaming(false);
      },
      (err) => {
        addMessage({ role: 'assistant', content: `Error: ${err}` });
        setStreamingContent('');
        setIsStreaming(false);
      },
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-xl font-semibold mb-2">Gennaro</p>
            <p className="text-sm">Start a conversation with any AI model</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {isStreaming && <StreamingMessage content={streamingContent} model={currentModel} />}
      </div>
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
