import { useCallback } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { getWorkflows, createWorkflow, updateWorkflow, deleteWorkflow } from '@/services/api';
import type { NodeType, WorkflowDefinition } from '@/types';

export function useWorkflow() {
  const { workflows, nodes, edges, setWorkflows, setNodes, setEdges, currentWorkflow } = useWorkflowStore();

  const fetchWorkflows = useCallback(async () => {
    const data = await getWorkflows();
    setWorkflows(data);
  }, [setWorkflows]);

  const saveWorkflow = useCallback(async (name: string, description: string) => {
    const definition: WorkflowDefinition = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: ((n.data as Record<string, unknown>).nodeType ?? n.type ?? 'agent') as NodeType,
        position: n.position,
        data: n.data as Record<string, unknown>,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: (e.label as string) ?? '',
      })),
    };
    if (currentWorkflow) {
      await updateWorkflow(currentWorkflow.id, { name, description, definition });
    } else {
      await createWorkflow({ name, description, definition });
    }
    await fetchWorkflows();
  }, [nodes, edges, currentWorkflow, fetchWorkflows]);

  const removeWorkflow = useCallback(async (id: string) => {
    await deleteWorkflow(id);
    await fetchWorkflows();
  }, [fetchWorkflows]);

  return { workflows, nodes, edges, setNodes, setEdges, fetchWorkflows, saveWorkflow, removeWorkflow };
}
