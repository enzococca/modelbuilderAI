import { MainLayout } from '@/components/layout/MainLayout';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { WorkflowCanvas } from '@/components/builder/WorkflowCanvas';
import { PipelineView } from '@/components/orchestrator/PipelineView';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { TutorialPage } from '@/components/tutorial/TutorialPage';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { useSettingsStore } from '@/stores/settingsStore';

function App() {
  const viewMode = useSettingsStore(s => s.viewMode);

  return (
    <MainLayout>
      {viewMode === 'chat' && <ChatPanel />}
      {viewMode === 'builder' && <WorkflowCanvas />}
      {viewMode === 'orchestrator' && <PipelineView />}
      {viewMode === 'analytics' && <AnalyticsDashboard />}
      {viewMode === 'tutorial' && <TutorialPage />}
      {viewMode === 'settings' && <SettingsPage />}
    </MainLayout>
  );
}

export default App;
