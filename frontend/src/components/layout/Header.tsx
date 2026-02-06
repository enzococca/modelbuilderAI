import { MessageSquare, Workflow, Zap, BarChart3, BookOpen, Menu } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { ModelSelector } from '@/components/chat/ModelSelector';

type ViewMode = 'chat' | 'builder' | 'orchestrator' | 'analytics' | 'tutorial';

const modes: { key: ViewMode; label: string; icon: typeof MessageSquare }[] = [
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'builder', label: 'Builder', icon: Workflow },
  { key: 'orchestrator', label: 'Orchestrator', icon: Zap },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'tutorial', label: 'Tutorial', icon: BookOpen },
];

export function Header() {
  const { viewMode, setViewMode, sidebarOpen, toggleSidebar } = useSettingsStore();

  return (
    <header className="h-12 border-b border-gray-800 bg-gray-900 flex items-center px-4 gap-4">
      {!sidebarOpen && (
        <button onClick={toggleSidebar} className="p-1 hover:bg-gray-800 rounded">
          <Menu className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
        {modes.map(m => (
          <button
            key={m.key}
            onClick={() => setViewMode(m.key)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm transition-colors ${
              viewMode === m.key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <m.icon className="w-4 h-4" />
            {m.label}
          </button>
        ))}
      </div>

      <div className="ml-auto">
        <ModelSelector />
      </div>
    </header>
  );
}
