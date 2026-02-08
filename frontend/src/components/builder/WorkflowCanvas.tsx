import { useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import type { Connection, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Play, Loader2, CheckCircle2, FileDown, FileUp, RotateCcw, Square, X, Maximize2, Minimize2, ChevronUp } from 'lucide-react';
import { AgentNode } from './AgentNode';
import { ToolNode } from './ToolNode';
import { ConditionNode } from './ConditionNode';
import { OutputNode } from './OutputNode';
import { InputNode } from './InputNode';
import { LoopNode } from './LoopNode';
import { AggregatorNode } from './AggregatorNode';
import { MetaAgentNode } from './MetaAgentNode';
import { ChunkerNode } from './ChunkerNode';
import { DelayNode } from './DelayNode';
import { SwitchNode } from './SwitchNode';
import { ValidatorNode } from './ValidatorNode';
import { DeletableEdge } from './DeletableEdge';
import { NodePalette } from './NodePalette';
import { NodeConfig } from './NodeConfig';
import { ResultsViewer } from './ResultsViewer';
import { useWorkflowStore } from '@/stores/workflowStore';
import { createWorkflow, updateWorkflow, runWorkflow, exportWorkflowResults } from '@/services/api';
import { wsClient } from '@/services/websocket';
import type { DragEvent } from 'react';
import type { NodeType, NodeStatus, WorkflowDefinition } from '@/types';

const nodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  condition: ConditionNode,
  output: OutputNode,
  input: InputNode,
  loop: LoopNode,
  aggregator: AggregatorNode,
  meta_agent: MetaAgentNode,
  chunker: ChunkerNode,
  delay: DelayNode,
  switch: SwitchNode,
  validator: ValidatorNode,
};

const edgeTypes = {
  default: DeletableEdge,
};

let nodeId = 0;
const getId = () => `node_${++nodeId}`;

export function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [running, setRunning] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>({});
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState<Record<string, string> | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [resultsMinimized, setResultsMinimized] = useState(false);
  const [resultsExpanded, setResultsExpanded] = useState(false);

  const { currentWorkflow, setCurrentWorkflow, loadVersion } = useWorkflowStore();
  const importInputRef = useRef<HTMLInputElement>(null);

  // Listen for WebSocket workflow_status and node_streaming events
  useEffect(() => {
    wsClient.connect();

    const unsub = wsClient.on('workflow_status', (data: Record<string, unknown>) => {
      const wfId = data.workflow_id as string;
      if (currentWorkflow && wfId !== currentWorkflow.id) return;

      const statuses = data.node_statuses as Record<string, NodeStatus>;
      const status = data.status as string;
      const results = data.results as Record<string, string> | undefined;
      const error = data.error as string | null;

      setNodeStatuses(statuses ?? {});
      setExecutionStatus(status);

      if (error) {
        setExecutionError(error);
      }

      if (status === 'completed' || status === 'error') {
        setRunning(false);
        if (results) {
          setExecutionResults(results);
          setResultsVisible(true);
          setResultsMinimized(false);
        }
      }
    });

    // Real-time per-node token streaming
    const unsubStream = wsClient.on('node_streaming', (data: Record<string, unknown>) => {
      const wfId = data.workflow_id as string;
      if (currentWorkflow && wfId !== currentWorkflow.id) return;
      const nodeId = data.node_id as string;
      const partial = data.partial as string;

      setExecutionResults(prev => ({
        ...(prev || {}),
        [nodeId]: partial,
      }));
      setResultsVisible(true);
      setResultsMinimized(false);
    });

    return () => { unsub(); unsubStream(); };
  }, [currentWorkflow]);

  // Apply execution status to node classNames reactively
  useEffect(() => {
    if (Object.keys(nodeStatuses).length === 0) return;

    setNodes(nds => nds.map(n => {
      const status = nodeStatuses[n.id];
      if (!status) return n;

      const statusClass =
        status === 'running' ? 'node-running'
        : status === 'done' ? 'node-done'
        : status === 'error' ? 'node-error'
        : '';

      // Inject status into data so node components can read it
      const newData = { ...(n.data as Record<string, unknown>), _status: status };

      return { ...n, className: statusClass, data: newData };
    }));
  }, [nodeStatuses, setNodes]);

  // Animate edges during execution
  useEffect(() => {
    if (!running) {
      setEdges(eds => eds.map(e => ({ ...e, animated: false })));
      return;
    }
    setEdges(eds => eds.map(e => {
      const sourceStatus = nodeStatuses[e.source];
      const targetStatus = nodeStatuses[e.target];
      const isActive = sourceStatus === 'done' && (targetStatus === 'running' || targetStatus === 'done');
      return { ...e, animated: isActive };
    }));
  }, [nodeStatuses, running, setEdges]);

  // Load saved workflow into canvas when currentWorkflow changes
  useEffect(() => {
    if (!currentWorkflow?.definition) return;
    const def = currentWorkflow.definition;
    const loaded: Node[] = (def.nodes ?? []).map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    }));
    const loadedEdges: Edge[] = (def.edges ?? []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || undefined,
    }));
    setNodes(loaded);
    setEdges(loadedEdges);
    const maxId = loaded.reduce((max, n) => {
      const num = parseInt(n.id.replace(/\D/g, ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    nodeId = maxId;
    // Reset execution state when loading a new workflow
    setNodeStatuses({});
    setExecutionStatus(null);
    setExecutionResults(null);
    setExecutionError(null);
    setResultsVisible(false);
    setResultsMinimized(false);
  }, [currentWorkflow, setNodes, setEdges]);

  // Sync from store when loadFromDefinition is called externally (e.g. from chat)
  useEffect(() => {
    if (loadVersion === 0) return;
    const state = useWorkflowStore.getState();
    if (state.nodes.length === 0 && state.edges.length === 0) return;
    setNodes(state.nodes);
    setEdges(state.edges);
    // Update nodeId counter to avoid collisions
    const maxId = state.nodes.reduce((max, n) => {
      const num = parseInt(n.id.replace(/\D/g, ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    nodeId = maxId;
    // Reset execution state
    setNodeStatuses({});
    setExecutionStatus(null);
    setExecutionResults(null);
    setExecutionError(null);
    setResultsVisible(false);
    setResultsMinimized(false);
  }, [loadVersion, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const bounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
      if (!bounds) return;
      const position = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: { label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${nodeId}` },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onNodeUpdate = useCallback((id: string, data: Record<string, unknown>) => {
    setNodes((nds) => nds.map(n => n.id === id ? { ...n, data } : n));
    setSaved(false);
  }, [setNodes]);

  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setCurrentWorkflow(null);
    setSelectedNode(null);
    setSaved(false);
    setNodeStatuses({});
    setExecutionStatus(null);
    setExecutionResults(null);
    setExecutionError(null);
    setResultsVisible(false);
    setResultsMinimized(false);
  }, [setNodes, setEdges, setCurrentWorkflow]);

  const buildDefinition = useCallback((): WorkflowDefinition => ({
    nodes: nodes.map(n => ({
      id: n.id,
      type: (n.type ?? 'agent') as NodeType,
      position: n.position,
      data: n.data as Record<string, unknown>,
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: (e.label as string) ?? '',
    })),
  }), [nodes, edges]);

  const handleSave = useCallback(async () => {
    if (nodes.length === 0) return;
    if (!currentWorkflow && !workflowName.trim()) {
      setShowNameInput(true);
      return;
    }

    setSaving(true);
    try {
      const definition = buildDefinition();
      const name = currentWorkflow?.name ?? workflowName.trim();
      if (currentWorkflow) {
        const updated = await updateWorkflow(currentWorkflow.id, {
          name,
          description: currentWorkflow.description,
          definition,
        });
        setCurrentWorkflow(updated);
      } else {
        const created = await createWorkflow({ name, description: '', definition });
        setCurrentWorkflow(created);
        setShowNameInput(false);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [nodes, currentWorkflow, workflowName, buildDefinition, setCurrentWorkflow]);

  const handleRun = useCallback(async () => {
    if (!currentWorkflow) {
      await handleSave();
      return;
    }
    // Reset previous execution state
    setNodeStatuses({});
    setExecutionStatus(null);
    setExecutionResults(null);
    setExecutionError(null);
    setResultsVisible(false);
    setResultsMinimized(false);
    setRunning(true);

    try {
      await runWorkflow(currentWorkflow.id);
      // Execution runs in background, updates come via WebSocket
    } catch (err) {
      console.error('Run failed:', err);
      setRunning(false);
    }
  }, [currentWorkflow, handleSave]);

  const handleStop = useCallback(() => {
    setRunning(false);
    setNodeStatuses({});
    setExecutionStatus('stopped');
    // Clear node classes
    setNodes(nds => nds.map(n => ({ ...n, className: undefined, data: { ...(n.data as Record<string, unknown>), _status: undefined } })));
    setEdges(eds => eds.map(e => ({ ...e, animated: false })));
  }, [setNodes, setEdges]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(json.nodes) || !Array.isArray(json.edges)) {
          console.error('Invalid workflow JSON: missing nodes or edges');
          return;
        }
        const loaded: Node[] = json.nodes.map((n: Record<string, unknown>) => ({
          id: n.id as string,
          type: n.type as string,
          position: n.position as { x: number; y: number },
          data: n.data as Record<string, unknown>,
        }));
        const loadedEdges: Edge[] = json.edges.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          source: e.source as string,
          target: e.target as string,
          label: (e.label as string) || undefined,
        }));
        setNodes(loaded);
        setEdges(loadedEdges);
        setCurrentWorkflow(null);
        setSelectedNode(null);
        setNodeStatuses({});
        setExecutionStatus(null);
        setExecutionResults(null);
        setExecutionError(null);
        setResultsVisible(false);
    setResultsMinimized(false);
        // Update nodeId counter
        const maxId = loaded.reduce((max, n) => {
          const num = parseInt(n.id.replace(/\D/g, ''), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        nodeId = maxId;
      } catch (err) {
        console.error('Failed to parse workflow JSON:', err);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = '';
  }, [setNodes, setEdges, setCurrentWorkflow]);

  const handleLoadWorkflow = useCallback((definition: { nodes: unknown[]; edges: unknown[] }) => {
    const loaded: Node[] = (definition.nodes as Record<string, unknown>[]).map(n => ({
      id: n.id as string,
      type: n.type as string,
      position: n.position as { x: number; y: number },
      data: n.data as Record<string, unknown>,
    }));
    const loadedEdges: Edge[] = (definition.edges as Record<string, unknown>[]).map(e => ({
      id: e.id as string,
      source: e.source as string,
      target: e.target as string,
      label: (e.label as string) || undefined,
    }));
    setNodes(loaded);
    setEdges(loadedEdges);
    setCurrentWorkflow(null);
    setSelectedNode(null);
    setNodeStatuses({});
    setExecutionStatus(null);
    setExecutionResults(null);
    setExecutionError(null);
    setResultsVisible(false);
    setResultsMinimized(false);
    const maxId = loaded.reduce((max, n) => {
      const num = parseInt(n.id.replace(/\D/g, ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    nodeId = maxId;
  }, [setNodes, setEdges, setCurrentWorkflow]);

  // Count status distribution
  const statusCounts = Object.values(nodeStatuses).reduce((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="h-11 border-b border-gray-800 bg-gray-900/80 flex items-center px-4 gap-3 shrink-0">
        <span className="text-sm text-gray-400 mr-auto">
          {currentWorkflow
            ? <span className="text-white font-medium">{currentWorkflow.name}</span>
            : <span className="text-gray-500 italic">Nuovo workflow</span>}
          {nodes.length > 0 && !running && (
            <span className="text-gray-600 ml-2">{nodes.length} nodi &middot; {edges.length} conn.</span>
          )}
          {running && (
            <span className="text-yellow-400 ml-2 flex items-center gap-1.5 inline-flex">
              <Loader2 className="w-3 h-3 animate-spin" />
              {statusCounts.done ?? 0}/{nodes.length} completati
            </span>
          )}
          {executionStatus === 'completed' && !running && (
            <span className="text-green-400 ml-2">Completato</span>
          )}
          {executionStatus === 'error' && !running && (
            <span className="text-red-400 ml-2">Errore</span>
          )}
        </span>

        {showNameInput && (
          <input
            value={workflowName}
            onChange={e => setWorkflowName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            placeholder="Nome workflow..."
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-48 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        )}

        <button onClick={handleClear} title="Pulisci canvas" disabled={running}
          className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors disabled:opacity-40">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button onClick={handleSave} disabled={saving || nodes.length === 0 || running}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg text-sm transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : saved ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Salvato' : 'Save'}
        </button>

        {!running ? (
          <button onClick={handleRun} disabled={nodes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded-lg text-sm transition-colors">
            <Play className="w-3.5 h-3.5" />
            Run
          </button>
        ) : (
          <button onClick={handleStop}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-sm transition-colors">
            <Square className="w-3.5 h-3.5" />
            Stop
          </button>
        )}

        <button title="Importa JSON" onClick={() => importInputRef.current?.click()} disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg text-sm transition-colors">
          <FileUp className="w-3.5 h-3.5" />
        </button>
        <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

        {currentWorkflow && (
          <button title="Esporta JSON" onClick={() => {
            const json = JSON.stringify(buildDefinition(), null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${currentWorkflow.name}.json`; a.click();
            URL.revokeObjectURL(url);
          }} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
            <FileDown className="w-3.5 h-3.5" />
          </button>
        )}

        {executionResults && !resultsVisible && !resultsMinimized && (
          <button onClick={() => { setResultsVisible(true); setResultsMinimized(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Risultati
          </button>
        )}
      </div>

      {/* Canvas + panels */}
      <div className="flex flex-1 overflow-hidden">
        <NodePalette onLoadWorkflow={handleLoadWorkflow} />
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            deleteKeyCode="Delete"
            fitView
            className="bg-gray-950"
          >
            <Background color="#374151" gap={20} />
            <Controls className="!bg-gray-800 !border-gray-700 !text-white [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-white [&>button:hover]:!bg-gray-700" />
            <MiniMap nodeColor="#6366f1" maskColor="rgba(0,0,0,0.7)" className="!bg-gray-900 !border-gray-700" />
          </ReactFlow>

          {/* Minimized Results Bar */}
          {resultsMinimized && executionResults && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <button
                onClick={() => { setResultsVisible(true); setResultsMinimized(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-sm hover:border-indigo-500/50 transition-colors"
              >
                <span className={`w-2 h-2 rounded-full ${executionError ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-sm font-medium">Risultati ({Object.keys(executionResults).length} nodi)</span>
                <ChevronUp className="w-4 h-4 ml-auto text-gray-400" />
              </button>
            </div>
          )}

          {/* Execution Results Overlay */}
          {resultsVisible && executionResults && (
            <div className={`absolute bg-gray-900/95 border border-gray-700 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm z-10 transition-all ${
              resultsExpanded
                ? 'inset-2'
                : 'bottom-4 left-4 right-4 max-h-[50vh]'
            }`}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 shrink-0">
                <span className="text-sm font-medium flex items-center gap-2">
                  {executionError
                    ? <><span className="w-2 h-2 rounded-full bg-red-500" /> Errore</>
                    : <><span className="w-2 h-2 rounded-full bg-green-500" /> Risultati</>
                  }
                </span>
                <div className="flex items-center gap-2">
                  {currentWorkflow && (
                    <div className="flex items-center gap-0.5">
                      {([
                        ['markdown', '.md', 'Markdown', false],
                        ['pdf', '.pdf', 'PDF (smart)', true],
                        ['docx', '.docx', 'Word (smart)', true],
                        ['csv', '.csv', 'CSV', false],
                        ['xlsx', '.xlsx', 'Excel', false],
                        ['png', '.png', 'Immagine PNG', false],
                        ['geojson', '.geojson', 'GeoJSON', false],
                        ['shapefile', '.shp', 'Shapefile', false],
                        ['zip', 'ZIP', 'ZIP risultati', false],
                        ['zip_all', 'ZIP All', 'ZIP tutti i formati', false],
                      ] as const).map(([fmt, label, title, smart]) => (
                        <button
                          key={fmt}
                          onClick={() => exportWorkflowResults(currentWorkflow.id, fmt, smart).catch(console.error)}
                          className="text-[10px] text-gray-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-gray-700"
                          title={`Scarica ${title}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setResultsExpanded(v => !v)}
                    className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
                    title={resultsExpanded ? 'Riduci' : 'Espandi'}
                  >
                    {resultsExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => { setResultsVisible(false); setResultsMinimized(true); setResultsExpanded(false); }}
                    className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
                    title="Minimizza"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setResultsVisible(false); setResultsMinimized(false); setResultsExpanded(false); }}
                    className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
                    title="Chiudi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className={`p-4 overflow-y-auto space-y-2 ${resultsExpanded ? 'h-[calc(100%-2.5rem)]' : 'max-h-[calc(50vh-3rem)]'}`}>
                {executionError && (
                  <p className="text-sm text-red-400">{executionError}</p>
                )}
                {Object.entries(executionResults).map(([nid, result]) => {
                  const nodeDef = nodes.find(n => n.id === nid);
                  const nodeData = nodeDef?.data as Record<string, unknown> | undefined;
                  const nodeLabel = (nodeData?.label as string) ?? nid;
                  const outputFormat = (nodeData?.outputFormat as string) ?? undefined;
                  return (
                    <ResultsViewer
                      key={nid}
                      nodeId={nid}
                      label={nodeLabel}
                      content={result}
                      outputFormat={outputFormat}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {selectedNode && (
          <NodeConfig
            key={selectedNode.id}
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={onNodeUpdate}
          />
        )}
      </div>
    </div>
  );
}
