import { useRef, useEffect, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useProjectStore } from '@/stores/projectStore';
import { streamChat, uploadFile } from '@/services/api';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';
import { ChatInput } from './ChatInput';
import type { AttachedFile } from './ChatInput';
import type { ChatMessage } from '@/types';

export function ChatPanel() {
  const {
    messages, addMessage, currentModel,
    isStreaming, setIsStreaming,
    streamingContent, setStreamingContent, appendStreamingContent,
  } = useChatStore();
  const { currentProject } = useProjectStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async (content: string, attachedFiles: AttachedFile[]) => {
    try {
      // Upload files first if any
      const fileIds: string[] = [];
      const fileNames: string[] = [];

      if (attachedFiles.length > 0) {
        setUploading(true);
        for (const af of attachedFiles) {
          try {
            const result = await uploadFile(af.file, currentProject?.id);
            fileIds.push(result.id);
            fileNames.push(af.file.name);
          } catch (err) {
            console.error('Upload failed:', af.file.name, err);
            // Still track the name for display even if upload fails
            fileNames.push(af.file.name + ' (upload fallito)');
          }
        }
        setUploading(false);
      }

      // Build content with file context
      let msgContent = content;
      if (fileNames.length > 0) {
        const fileList = fileNames.map(n => `- ${n}`).join('\n');
        const prefix = `[File allegati:\n${fileList}\n]\n\n`;
        msgContent = prefix + (content || 'Analizza questi file e suggerisci un workflow builder adeguato.');
      }

      // If somehow still empty, don't send
      if (!msgContent.trim()) {
        return;
      }

      const userMsg: ChatMessage = { role: 'user', content: msgContent, files: fileIds.length > 0 ? fileIds : undefined };
      addMessage(userMsg);
      setIsStreaming(true);
      setStreamingContent('');

      const allMessages = [...messages, userMsg];
      streamChat(
        {
          model: currentModel,
          messages: allMessages,
          project_id: currentProject?.id,
          use_rag: fileIds.length > 0,
        },
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
    } catch (err) {
      console.error('handleSend error:', err);
      setUploading(false);
      setIsStreaming(false);
      addMessage({ role: 'assistant', content: `Errore: ${err}` });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isStreaming && !uploading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-xl font-semibold mb-2">Gennaro</p>
            <p className="text-sm">Start a conversation with any AI model</p>
            <p className="text-xs text-gray-600 mt-2">Trascina file qui o usa la graffetta per allegare</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {uploading && (
          <div className="flex gap-3 px-4 py-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600 animate-pulse" />
            <div className="flex items-center">
              <span className="text-sm text-gray-400">Caricamento file in corso...</span>
            </div>
          </div>
        )}
        {isStreaming && <StreamingMessage content={streamingContent} model={currentModel} />}
      </div>
      <ChatInput onSend={handleSend} disabled={isStreaming || uploading} />
    </div>
  );
}
