import { useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { streamChat } from '@/services/api';

export function useChat() {
  const {
    messages, isStreaming, currentModel,
    addMessage, setIsStreaming, setStreamingContent, appendStreamingContent, clearMessages,
  } = useChatStore();

  const sendMessage = useCallback(async (content: string) => {
    addMessage({ role: 'user', content });
    setStreamingContent('');
    setIsStreaming(true);

    const allMessages = [...messages, { role: 'user' as const, content }];
    const body = {
      model: currentModel,
      messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
    };

    streamChat(
      body,
      (chunk) => {
        if (chunk.content) appendStreamingContent(chunk.content);
      },
      () => {
        const finalContent = useChatStore.getState().streamingContent;
        addMessage({ role: 'assistant', content: finalContent, model: currentModel });
        setStreamingContent('');
        setIsStreaming(false);
      },
      (err) => {
        addMessage({ role: 'assistant', content: `Error: ${err}`, model: currentModel });
        setStreamingContent('');
        setIsStreaming(false);
      },
    );
  }, [messages, currentModel, addMessage, setIsStreaming, setStreamingContent, appendStreamingContent]);

  return { messages, isStreaming, currentModel, sendMessage, clearMessages };
}
