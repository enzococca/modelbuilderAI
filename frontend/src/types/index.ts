// Provider and model types
export type Provider = 'anthropic' | 'openai' | 'google' | 'ollama' | 'lmstudio';

export interface ModelInfo {
  id: string;
  name: string;
  provider: Provider;
  context_window: number;
  supports_streaming: boolean;
  supports_tools: boolean;
  supports_vision: boolean;
}

// Chat types
export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id?: string;
  role: Role;
  content: string;
  model?: string;
  created_at?: string;
  files?: string[];
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  project_id?: string;
  use_rag?: boolean;
}

export interface ChatResponseChunk {
  type: 'content' | 'done' | 'error';
  content: string;
  model: string;
  metadata?: Record<string, unknown>;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Workflow types
export type NodeType = 'agent' | 'tool' | 'condition' | 'input' | 'output' | 'loop' | 'aggregator' | 'meta_agent' | 'chunker' | 'delay' | 'switch' | 'validator';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  definition: WorkflowDefinition;
  created_at: string;
  updated_at: string;
}

// Agent types
export interface AgentConfig {
  id?: string;
  name: string;
  model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  tools: string[];
}

export interface Agent extends AgentConfig {
  id: string;
}

// SSE chunk
export interface SSEChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  model?: string;
}

// View mode
export type ViewMode = 'chat' | 'builder' | 'orchestrator' | 'analytics' | 'tutorial' | 'settings';

// Template types
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  definition: WorkflowDefinition;
}

// Analytics types
export interface UsageSummary {
  period_days: number;
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  by_model: ModelUsage[];
}

export interface ModelUsage {
  model: string;
  provider: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  total_cost: number;
  avg_duration_ms: number;
}

export interface DailyUsage {
  date: string;
  requests: number;
  total_tokens: number;
  total_cost: number;
}

// Tool types
export interface ToolInfo {
  name: string;
  description: string;
}

// Citation
export interface Citation {
  content: string;
  filename: string;
  chunk_index: number;
  file_id: string;
  relevance: number;
}

// File types
export interface FileInfo {
  id: string;
  project_id: string;
  filename: string;
  content_type: string;
  size: number;
  created_at: string;
}

// Pipeline status
export type NodeStatus = 'waiting' | 'running' | 'done' | 'error';

export interface PipelineStatus {
  workflow_id: string;
  status: string;
  node_statuses: Record<string, NodeStatus>;
  results: Record<string, unknown>;
  error?: string;
}
