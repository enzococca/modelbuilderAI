import { useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { getModels, getLocalModels } from '@/services/api';
import type { ModelInfo } from '@/types';

export function ModelSelector() {
  const { currentModel, setCurrentModel, availableModels, setAvailableModels } = useChatStore();

  useEffect(() => {
    Promise.all([
      getModels().catch(() => [] as ModelInfo[]),
      getLocalModels().catch(() => [] as ModelInfo[]),
    ]).then(([cloud, local]) => {
      // Deduplicate by id
      const seen = new Set<string>();
      const all: ModelInfo[] = [];
      for (const m of [...cloud, ...local]) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          all.push(m);
        }
      }
      setAvailableModels(all);
    });
  }, [setAvailableModels]);

  // Group models by provider
  const groups = availableModels.reduce<Record<string, ModelInfo[]>>((acc, m) => {
    const key = m.provider;
    (acc[key] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="relative">
      <select
        value={currentModel}
        onChange={e => setCurrentModel(e.target.value)}
        className="appearance-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 pr-8 text-sm text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer"
      >
        {availableModels.length === 0 && <option value={currentModel}>{currentModel}</option>}
        {Object.entries(groups).map(([provider, models]) => (
          <optgroup key={provider} label={provider.toUpperCase()}>
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}
