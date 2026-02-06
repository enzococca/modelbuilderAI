import { create } from 'zustand';
import type { ChatMessage, ModelInfo } from '@/types';

interface ChatState {
  messages: ChatMessage[];
  currentModel: string;
  isStreaming: boolean;
  streamingContent: string;
  availableModels: ModelInfo[];
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  clearMessages: () => void;
  setCurrentModel: (model: string) => void;
  setIsStreaming: (v: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  setAvailableModels: (models: ModelInfo[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  currentModel: 'claude-sonnet-4-5-20250929',
  isStreaming: false,
  streamingContent: '',
  availableModels: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [], streamingContent: '' }),
  setCurrentModel: (currentModel) => set({ currentModel }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  appendStreamingContent: (chunk) => set((s) => ({ streamingContent: s.streamingContent + chunk })),
  setAvailableModels: (availableModels) => set({ availableModels }),
}));
