import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { Workflow } from '@/types';

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: unknown[]) => void;
  onEdgesChange: (changes: unknown[]) => void;
  setWorkflows: (workflows: Workflow[]) => void;
  setCurrentWorkflow: (wf: Workflow | null) => void;
  loadFromDefinition: (def: { nodes: unknown[]; edges: unknown[] }) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  nodes: [],
  edges: [],
  workflows: [],
  currentWorkflow: null,
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  onNodesChange: () => {},
  onEdgesChange: () => {},
  setWorkflows: (workflows) => set({ workflows }),
  setCurrentWorkflow: (currentWorkflow) => set({ currentWorkflow }),
  loadFromDefinition: (def) => {
    const nodes = (def.nodes as Record<string, unknown>[]).map(n => ({
      id: n.id as string,
      type: n.type as string,
      position: n.position as { x: number; y: number },
      data: n.data as Record<string, unknown>,
    })) as Node[];
    const edges = (def.edges as Record<string, unknown>[]).map(e => ({
      id: e.id as string,
      source: e.source as string,
      target: e.target as string,
      label: (e.label as string) || undefined,
    })) as Edge[];
    set({ nodes, edges, currentWorkflow: null });
  },
}));
