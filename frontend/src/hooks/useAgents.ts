import { useCallback, useEffect, useState } from 'react';
import { getAgents, getModels } from '@/services/api';
import { useChatStore } from '@/stores/chatStore';
import type { Agent } from '@/types';

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const setAvailableModels = useChatStore((s) => s.setAvailableModels);
  const availableModels = useChatStore((s) => s.availableModels);

  const fetchAgents = useCallback(async () => {
    const data = await getAgents();
    setAgents(data);
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const data = await getModels();
      // getModels returns ModelInfo[] from /api/models
      if (Array.isArray(data)) {
        setAvailableModels(data);
      }
    } catch {
      // Models endpoint may not be available yet
    }
  }, [setAvailableModels]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { agents, availableModels, fetchAgents, fetchModels };
}
