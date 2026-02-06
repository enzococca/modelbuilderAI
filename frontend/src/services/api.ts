import axios from 'axios';
import type { ChatRequest, WorkflowDefinition, AgentConfig, ModelInfo, WorkflowTemplate, UsageSummary, DailyUsage, ToolInfo } from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Models
export const getModels = (): Promise<ModelInfo[]> => api.get('/agents/models').then(r => {
  const grouped = r.data as Record<string, ModelInfo[]>;
  return Object.values(grouped).flat();
});

// Chat
export const sendChat = (req: ChatRequest) => api.post('/chat', req).then(r => r.data);

export function streamChat(req: ChatRequest, onChunk: (chunk: { type: string; content: string }) => void, onDone: () => void, onError: (err: string) => void) {
  const body = JSON.stringify({ ...req, stream: true });
  fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).then(async (response) => {
    if (!response.ok) {
      onError(`HTTP ${response.status}`);
      return;
    }
    const reader = response.body?.getReader();
    if (!reader) { onError('No reader'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'done') { onDone(); }
            else if (parsed.type === 'error') { onError(parsed.content); }
            else { onChunk(parsed); }
          } catch { /* skip unparseable */ }
        }
      }
    }
    onDone();
  }).catch(e => onError(String(e)));
}

export const getChatHistory = (projectId: string) => api.get(`/chat/history/${projectId}`).then(r => r.data);
export const getConversation = (id: string) => api.get(`/chat/${id}/messages`).then(r => r.data);

// Projects
export const getProjects = () => api.get('/projects').then(r => r.data);
export const createProject = (data: { name: string; description: string }) => api.post('/projects', data).then(r => r.data);
export const deleteProject = (id: string) => api.delete(`/projects/${id}`);

// Workflows
export const getWorkflows = () => api.get('/workflows').then(r => r.data);
export const createWorkflow = (data: { name: string; description: string; definition: WorkflowDefinition }) => api.post('/workflows', data).then(r => r.data);
export const updateWorkflow = (id: string, data: { name: string; description: string; definition: WorkflowDefinition }) => api.put(`/workflows/${id}`, data).then(r => r.data);
export const deleteWorkflow = (id: string) => api.delete(`/workflows/${id}`);

// Agents
export const getAgents = () => api.get('/agents').then(r => r.data);
export const createAgent = (config: AgentConfig) => api.post('/agents', config).then(r => r.data);
export const updateAgent = (id: string, config: AgentConfig) => api.put(`/agents/${id}`, config).then(r => r.data);
export const deleteAgent = (id: string) => api.delete(`/agents/${id}`);

// Files
export const getFiles = (projectId?: string) => api.get('/files', { params: { project_id: projectId } }).then(r => r.data);
export const uploadFile = (file: File, projectId?: string) => {
  const form = new FormData();
  form.append('file', file);
  if (projectId) form.append('project_id', projectId);
  return api.post('/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const deleteFile = (id: string) => api.delete(`/files/${id}`);
export const searchDocuments = (query: string, projectId?: string): Promise<{ query: string; results: unknown[] }> =>
  api.get('/files/search', { params: { q: query, project_id: projectId } }).then(r => r.data);

// Templates
export const getTemplates = (): Promise<WorkflowTemplate[]> => api.get('/templates').then(r => r.data);
export const getTemplate = (id: string): Promise<WorkflowTemplate> => api.get(`/templates/${id}`).then(r => r.data);
export const instantiateTemplate = (id: string) => api.post(`/templates/${id}/instantiate`).then(r => r.data);

// Workflow execution
export const runWorkflow = (id: string) => api.post(`/workflows/${id}/run`).then(r => r.data);
export const validateWorkflow = (id: string) => api.post(`/workflows/${id}/validate`).then(r => r.data);

// Export workflow results
export const exportWorkflowResults = async (id: string, format: 'zip' | 'markdown' = 'zip') => {
  const resp = await fetch(`/api/workflows/${id}/export?format=${format}`, { method: 'POST' });
  if (!resp.ok) throw new Error(`Export failed: ${resp.status}`);
  const blob = await resp.blob();
  const ext = format === 'zip' ? 'zip' : 'md';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `results.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
};

// Node registry
export const getNodeRegistry = () => api.get('/node-registry').then(r => r.data);

// Analytics
export const getUsageSummary = (days?: number, projectId?: string): Promise<UsageSummary> =>
  api.get('/analytics/summary', { params: { days, project_id: projectId } }).then(r => r.data);
export const getDailyUsage = (days?: number): Promise<DailyUsage[]> =>
  api.get('/analytics/daily', { params: { days } }).then(r => r.data);
export const getCostRates = () => api.get('/analytics/cost-rates').then(r => r.data);

// Local models (Ollama / LM Studio)
export const getLocalModels = (): Promise<ModelInfo[]> => api.get('/agents/local-models').then(r => r.data);

// Settings
export const getSettings = () => api.get('/settings').then(r => r.data);
export const updateSettings = (data: Record<string, unknown>) => api.put('/settings', data).then(r => r.data);

// Tools
export const getTools = (): Promise<ToolInfo[]> => api.get('/agents/tools').then(r => r.data);

export default api;
