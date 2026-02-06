import { useState, useEffect } from 'react';
import { FolderPlus, MessageSquare, Workflow, Zap, BookOpen, Settings, ChevronLeft, Trash2 } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getProjects, createProject, getWorkflows, deleteWorkflow } from '@/services/api';
import type { Workflow as WorkflowType } from '@/types';

export function Sidebar() {
  const { projects, setProjects, currentProject, setCurrentProject } = useProjectStore();
  const { setCurrentWorkflow } = useWorkflowStore();
  const { toggleSidebar, setViewMode } = useSettingsStore();
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);

  useEffect(() => {
    getProjects().then(data => setProjects(data.projects || data || [])).catch(() => {});
    getWorkflows().then(data => setWorkflows(Array.isArray(data) ? data : [])).catch(() => {});
  }, [setProjects]);

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    const project = await createProject({ name: newProjectName.trim(), description: '' });
    setProjects([project, ...projects]);
    setCurrentProject(project);
    setNewProjectName('');
    setShowNewProject(false);
  };

  const handleLoadWorkflow = (wf: WorkflowType) => {
    setCurrentWorkflow(wf);
    setViewMode('builder');
  };

  const handleDeleteWorkflow = async (id: string) => {
    await deleteWorkflow(id);
    setWorkflows(prev => prev.filter(w => w.id !== id));
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">Gennaro</h1>
        <button onClick={toggleSidebar} className="p-1 hover:bg-gray-800 rounded">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <nav className="p-2 space-y-1">
        <button onClick={() => setViewMode('chat')} className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800 text-sm">
          <MessageSquare className="w-4 h-4" /> Chat
        </button>
        <button onClick={() => setViewMode('builder')} className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800 text-sm">
          <Workflow className="w-4 h-4" /> Builder
        </button>
        <button onClick={() => setViewMode('orchestrator')} className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800 text-sm">
          <Zap className="w-4 h-4" /> Orchestrator
        </button>
        <button onClick={() => setViewMode('tutorial')} className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800 text-sm">
          <BookOpen className="w-4 h-4" /> Tutorial
        </button>
        <button onClick={() => setViewMode('settings')} className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800 text-sm">
          <Settings className="w-4 h-4" /> Settings
        </button>
      </nav>

      {/* Projects */}
      <div className="p-2 border-t border-gray-800">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Projects</span>
          <button onClick={() => setShowNewProject(!showNewProject)} className="p-1 hover:bg-gray-800 rounded">
            <FolderPlus className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {showNewProject && (
          <div className="px-2 py-1">
            <input
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Project name..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
        )}

        <div className="mt-1 space-y-0.5 overflow-y-auto max-h-40">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setCurrentProject(p)}
              className={`w-full text-left px-3 py-1.5 rounded text-sm truncate ${
                currentProject?.id === p.id ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Workflows */}
      <div className="p-2 border-t border-gray-800 flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Workflows</span>
          <span className="text-xs text-gray-600">{workflows.length}</span>
        </div>

        <div className="mt-1 space-y-0.5 overflow-y-auto flex-1">
          {workflows.length === 0 ? (
            <p className="text-xs text-gray-600 px-3 py-2">Nessun workflow salvato</p>
          ) : (
            workflows.map(wf => (
              <div
                key={wf.id}
                className="flex items-center group"
              >
                <button
                  onClick={() => handleLoadWorkflow(wf)}
                  className="flex-1 text-left px-3 py-1.5 rounded-l text-sm truncate hover:bg-gray-800 text-gray-300"
                >
                  {wf.name}
                </button>
                <button
                  onClick={() => handleDeleteWorkflow(wf.id)}
                  className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-900/30 rounded-r text-gray-600 hover:text-red-400 transition-all"
                  title="Elimina workflow"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
