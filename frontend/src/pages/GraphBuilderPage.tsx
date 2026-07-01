import { useCallback, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactFlow, {
  Node, Edge, Controls, Background, useNodesState, useEdgesState,
  addEdge, Connection, MarkerType, BackgroundVariant,
} from 'reactflow';
import { clsx } from 'clsx';
import 'reactflow/dist/style.css';
import { useParams, useNavigate } from 'react-router-dom';
import { graphApi, evaluationsApi, pluginsApi, schemasApi } from '@/api/client';
import { useTheme } from '@/context/ThemeContext';

const NODE_PALETTE = [
  { type: 'input', label: 'Input', description: 'Read field value', icon: '📥', color: 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700', nodeColor: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' }, darkNodeColor: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' }, requiresConfig: true },
  { type: 'normalize', label: 'Normalize', description: 'Scale to 0-10', icon: '📊', color: 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700', nodeColor: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' }, darkNodeColor: { bg: '#14532d', border: '#22c55e', text: '#86efac' }, requiresConfig: true },
  { type: 'weighted_average', label: 'Weighted Avg', description: 'Weighted sum', icon: '⚖️', color: 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700', nodeColor: { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8' }, darkNodeColor: { bg: '#581c87', border: '#a855f7', text: '#d8b4fe' }, requiresConfig: true },
  { type: 'threshold', label: 'Threshold', description: 'Decision rule', icon: '🔀', color: 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700', nodeColor: { bg: '#fff7ed', border: '#f97316', text: '#9a3412' }, darkNodeColor: { bg: '#7c2d12', border: '#f97316', text: '#fdba74' }, requiresConfig: true },
  { type: 'output', label: 'Output', description: 'Final result', icon: '📤', color: 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700', nodeColor: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' }, darkNodeColor: { bg: '#7f1d1d', border: '#ef4444', text: '#fca5a5' }, requiresConfig: true },
  { type: 'formula', label: 'Formula', description: 'Math expression', icon: '🔢', color: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700', nodeColor: { bg: '#fefce8', border: '#eab308', text: '#854d0e' }, darkNodeColor: { bg: '#713f12', border: '#eab308', text: '#fde047' }, requiresConfig: true },
];

const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
  normalize: { min: 0, max: 100, targetMin: 0, targetMax: 10 },
  weighted_average: { weights: [0.5, 0.5] },
  threshold: { operator: 'gte', threshold: 5, passValue: 'APPROVE', failValue: 'REJECT' },
  output: { outputKey: 'result' },
  formula: { expression: '' },
};

export function GraphBuilderPage() {
  const { evaluationId, versionId } = useParams<{ evaluationId: string; versionId: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [showAddNode, setShowAddNode] = useState(false);
  const [pendingNodeType, setPendingNodeType] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeConfig, setNodeConfig] = useState<Record<string, string>>({});
  const [nodeLabel, setNodeLabel] = useState('');

  const evaluationQuery = useQuery({
    queryKey: ['evaluations', evaluationId],
    queryFn: () => evaluationsApi.get(evaluationId!),
    enabled: !!evaluationId,
  });

  const schemaFieldsQuery = useQuery({
    queryKey: ['schemas', evaluationQuery.data?.schemaId, 'fields'],
    queryFn: () => schemasApi.listFields(evaluationQuery.data?.schemaId as string),
    enabled: !!evaluationQuery.data?.schemaId,
  });

  const pluginsQuery = useQuery({
    queryKey: ['plugins'],
    queryFn: () => pluginsApi.list(),
  });

  const graphQuery = useQuery({
    queryKey: ['graph', versionId],
    queryFn: () => graphApi.get(versionId!),
    enabled: !!versionId,
  });

  const versionsQuery = useQuery({
    queryKey: ['evaluations', evaluationId, 'versions'],
    queryFn: () => evaluationsApi.listVersions(evaluationId!),
    enabled: !!evaluationId,
  });

  const publishMutation = useMutation({
    mutationFn: () => evaluationsApi.publish(evaluationId!, versionId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations', evaluationId, 'versions'] }),
  });

  const validateMutation = useMutation({
    mutationFn: () => graphApi.validate(versionId!),
  });

  const createVersionMutation = useMutation({
    mutationFn: () => evaluationsApi.createVersion(evaluationId!),
    onSuccess: (data: any) => navigate(`/evaluations/${evaluationId}/${data.id}/graph`),
  });

  const apiNodes: Node[] = ((graphQuery.data?.nodes as any[]) ?? []).map((n: any) => ({
    id: n.id,
    type: 'default',
    position: { x: n.positionX ?? 100, y: n.positionY ?? 100 },
    data: { label: n.label, nodeType: n.nodeType, config: n.config ?? {} },
  }));

  const apiEdges: Edge[] = ((graphQuery.data?.edges as any[]) ?? []).map((e: any) => ({
    id: e.id,
    source: e.fromNodeId,
    target: e.toNodeId,
    sourceHandle: e.fromPort,
    targetHandle: e.toPort,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 2 },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(apiNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(apiEdges);

  useEffect(() => {
    if (graphQuery.data) {
      const newNodes: Node[] = ((graphQuery.data?.nodes as any[]) ?? []).map((n: any) => ({
        id: n.id,
        type: 'default',
        position: { x: n.positionX ?? 100, y: n.positionY ?? 100 },
        data: { label: n.label, nodeType: n.nodeType, config: n.config ?? {} },
      }));
      const newEdges: Edge[] = ((graphQuery.data?.edges as any[]) ?? []).map((e: any) => ({
        id: e.id,
        source: e.fromNodeId,
        target: e.toNodeId,
        sourceHandle: e.fromPort,
        targetHandle: e.toPort,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      }));
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [graphQuery.data, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      const newEdge = {
        ...params,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges],
  );

  const addNodeMutation = useMutation({
    mutationFn: (data: { nodeType: string; label: string; config: Record<string, unknown>; positionX: number; positionY: number }) =>
      graphApi.createNode(versionId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['graph', versionId] });
      setShowAddNode(false);
      setPendingNodeType(null);
    },
    onError: (error: any) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateNodeMutation = useMutation({
    mutationFn: (data: { label?: string; config?: Record<string, unknown>; positionX?: number; positionY?: number }) =>
      graphApi.updateNode(versionId!, selectedNodeId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['graph', versionId] });
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) => graphApi.deleteNode(versionId!, nodeId),
    onMutate: (nodeId) => {
      setNodes((nds) => nds.filter(n => n.id !== nodeId));
      setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['graph', versionId] });
      setSelectedNodeId(null);
    },
    onError: (error: any) => {
      alert(`Error deleting node: ${error.message}`);
    },
  });

  const createEdgeMutation = useMutation({
    mutationFn: (data: { fromNodeId: string; fromPort: string; toNodeId: string; toPort: string }) =>
      graphApi.createEdge(versionId!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['graph', versionId] }),
    onError: (error: any) => {
      alert(`Error creating edge: ${error.message}`);
    },
  });

  const deleteEdgeMutation = useMutation({
    mutationFn: (edgeId: string) => graphApi.deleteEdge(versionId!, edgeId),
    onMutate: (edgeId) => {
      setEdges((eds) => eds.filter(e => e.id !== edgeId));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['graph', versionId] }),
    onError: (error: any) => {
      alert(`Error deleting edge: ${error.message}`);
    },
  });

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    const nodeData = node.data as any;
    setNodeLabel(nodeData.label || '');
    setNodeConfig((nodeData.config || {}) as Record<string, string>);
  }, []);

  const handleSaveNodeConfig = () => {
    updateNodeMutation.mutate({
      label: nodeLabel,
      config: nodeConfig,
    });
  };

  const handleAddNode = (nodeType: string) => {
    const paletteItem = getNodePaletteItem(nodeType);
    if (paletteItem?.requiresConfig) {
      setPendingNodeType(nodeType);
      setShowAddNode(true);
    } else {
      addNodeMutation.mutate({
        nodeType,
        label: paletteItem?.label ?? nodeType,
        config: {},
        positionX: 200 + Math.random() * 200,
        positionY: 200 + Math.random() * 200,
      });
    }
  };

  const handleConfirmAddNode = () => {
    if (!pendingNodeType) return;
    const paletteItem = getNodePaletteItem(pendingNodeType);
    let config: Record<string, unknown> = { ...DEFAULT_CONFIGS[pendingNodeType] };

    if (pendingNodeType === 'input') {
      const fieldKey = (document.getElementById('fieldKey') as HTMLSelectElement)?.value;
      if (!fieldKey) {
        alert('Please select a field');
        return;
      }
      config = { fieldKey };
    }

    addNodeMutation.mutate({
      nodeType: pendingNodeType,
      label: paletteItem?.label ?? pendingNodeType,
      config,
      positionX: 200 + Math.random() * 200,
      positionY: 200 + Math.random() * 200,
    });
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const currentVersion: any = (versionsQuery.data as any[])?.find((v: any) => v.id === versionId);
  const isDraft = currentVersion?.status === 'DRAFT';
  const isDark = theme === 'dark';

  const pluginConfigSchema = (type: string) => {
    const plugin = (pluginsQuery.data as any[])?.find((p: any) => p.type === type);
    return plugin?.configSchema;
  };

  const fields = (schemaFieldsQuery.data as any[]) ?? [];

  const getNodePaletteItem = (nodeType: string) => NODE_PALETTE.find(n => n.type === nodeType);

  const nodeStyle = (node: Node) => {
    const paletteItem = getNodePaletteItem((node.data as any).nodeType);
    const isSelected = node.id === selectedNodeId;
    
    if (paletteItem) {
      const colors = isDark ? paletteItem.darkNodeColor : paletteItem.nodeColor;
      return {
        background: isSelected ? (isDark ? '#1e3a5f' : '#dbeafe') : colors.bg,
        border: isSelected ? '2px solid #3b82f6' : `2px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '10px',
        fontSize: '12px',
        color: colors.text,
        fontWeight: 500,
        minWidth: '120px',
      };
    }
    
    return {
      background: isSelected ? (isDark ? '#1e3a5f' : '#dbeafe') : (isDark ? '#1f2937' : '#fff'),
      border: isSelected ? '2px solid #3b82f6' : (isDark ? '1px solid #374151' : '1px solid #e5e7eb'),
      borderRadius: '8px',
      padding: '10px',
      fontSize: '12px',
    };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Graph Builder
            {currentVersion && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                currentVersion.status === 'DRAFT' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                currentVersion.status === 'PUBLISHED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                v{currentVersion.versionNumber} — {currentVersion.status}
              </span>
            )}
          </h1>
          {isDraft && (
            <button
              onClick={() => setShowAddNode(true)}
              className="text-xs bg-blue-600 dark:bg-blue-700 text-white px-3 py-1.5 rounded hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              + Add Node
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => validateMutation.mutate()}
            className={clsx(
              'text-xs border px-3 py-1.5 rounded',
              validateMutation.isPending ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-400 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            {validateMutation.isPending ? 'Validating...' : '✓ Validate'}
          </button>
          {isDraft && (
            <>
              <button
                onClick={() => createVersionMutation.mutate()}
                className="text-xs border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                + New Version
              </button>
              <button
                onClick={() => { if (confirm('Publish this version? It will become immutable.')) publishMutation.mutate(); }}
                disabled={publishMutation.isPending}
                className="text-xs bg-green-600 dark:bg-green-700 text-white px-3 py-1.5 rounded hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
              >
                {publishMutation.isPending ? 'Publishing...' : '🚀 Publish'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Validation result */}
      {validateMutation.isSuccess && (
        <div className={`px-4 py-2 text-xs ${validateMutation.data.valid 
          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-b border-green-100 dark:border-green-800' 
          : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-b border-red-100 dark:border-red-800'}`}>
          {validateMutation.data.valid
            ? '✓ Graph is valid — ready to publish'
            : `✕ ${validateMutation.data.errors.length} error(s): ${validateMutation.data.errors.map((e: any) => e.message).join(' | ')}`
          }
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Node Palette */}
        {isDraft && (
          <div className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Node Types</h3>
              <div className="space-y-2">
                {NODE_PALETTE.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleAddNode(item.type)}
                    className={clsx(
                      'w-full text-left p-2 rounded border transition-colors hover:shadow-sm',
                      item.color
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{item.icon}</span>
                      <div>
                        <div className="text-xs font-medium text-gray-800 dark:text-gray-200">{item.label}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">{item.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* React Flow canvas */}
        <div className="flex-1 relative">
          {graphQuery.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading graph...</p>
            </div>
          )}
          {graphQuery.isError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <p className="text-sm text-red-600 dark:text-red-400">Failed to load graph</p>
            </div>
          )}
          {graphQuery.isSuccess && (
            <ReactFlow
              nodes={nodes.map(n => ({
                ...n,
                selected: n.id === selectedNodeId,
                style: nodeStyle(n),
              }))}
              edges={edges.map(e => ({
                ...e,
                style: { 
                  stroke: isDark ? '#4b5563' : '#9ca3af', 
                  strokeWidth: 2 
                },
                markerEnd: { 
                  type: MarkerType.ArrowClosed,
                  color: isDark ? '#4b5563' : '#9ca3af',
                },
              }))}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onEdgesDelete={(deletedEdges) => {
                deletedEdges.forEach(edge => {
                  if (edge.id) deleteEdgeMutation.mutate(edge.id);
                });
              }}
              onConnect={(params) => {
                onConnect(params);
                if (params.source && params.target) {
                  createEdgeMutation.mutate({
                    fromNodeId: params.source,
                    fromPort: (params.sourceHandle ?? 'result') as string,
                    toNodeId: params.target,
                    toPort: (params.targetHandle ?? 'value') as string,
                  });
                }
              }}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={(_, node) => {
                if (isDraft && confirm(`Delete node "${node.data.label}"?`)) {
                  deleteNodeMutation.mutate(node.id);
                }
              }}
              onPaneClick={() => setSelectedNodeId(null)}
              fitView
              className={isDark ? 'bg-gray-900' : 'bg-gray-50'}
            >
              <Controls />
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={isDark ? '#374151' : '#e5e7eb'} />
            </ReactFlow>
          )}

          {/* Add Node Modal */}
          {showAddNode && (
            <div className="absolute inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-5 w-80 shadow-xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">Add Node</h3>

                {!pendingNodeType ? (
                  <div className="space-y-2">
                    {NODE_PALETTE.map((item) => (
                      <button
                        key={item.type}
                        onClick={() => handleAddNode(item.type)}
                        className={clsx('w-full text-left p-2 rounded border transition-colors hover:shadow-sm', item.color)}
                      >
                        <div className="flex items-center gap-2">
                          <span>{item.icon}</span>
                          <div>
                            <div className="text-xs font-medium text-gray-800 dark:text-gray-200">{item.label}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">{item.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs text-gray-600 dark:text-gray-400">
                      Adding: <strong className="text-gray-800 dark:text-gray-200">{getNodePaletteItem(pendingNodeType)?.label}</strong>
                    </div>

                    {pendingNodeType === 'input' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Field *</label>
                        <select
                          id="fieldKey"
                          className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="">Select a field...</option>
                          {fields.map((f: any) => (
                            <option key={f.id} value={f.key}>{f.displayName} ({f.key})</option>
                          ))}
                        </select>
                        {fields.length === 0 && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">No fields in schema. Add fields in Schema Editor first.</p>
                        )}
                      </div>
                    )}

                    {pendingNodeType === 'normalize' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Min (input)</label>
                          <input id="min" type="number" defaultValue="0" className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max (input)</label>
                          <input id="max" type="number" defaultValue="100" className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        </div>
                      </>
                    )}

                    {pendingNodeType === 'threshold' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Threshold</label>
                          <input id="threshold" type="number" defaultValue="5" className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pass Value</label>
                          <input id="passValue" type="text" defaultValue="APPROVE" className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fail Value</label>
                          <input id="failValue" type="text" defaultValue="REJECT" className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        </div>
                      </>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleConfirmAddNode}
                        disabled={addNodeMutation.isPending}
                        className="flex-1 text-xs bg-blue-600 dark:bg-blue-700 text-white rounded py-1.5 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                      >
                        {addNodeMutation.isPending ? 'Adding...' : 'Add Node'}
                      </button>
                      <button
                        onClick={() => { setShowAddNode(false); setPendingNodeType(null); }}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {pendingNodeType && (
                  <button
                    onClick={() => setPendingNodeType(null)}
                    className="mt-3 w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ← Back to node types
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Node Config Panel */}
          {selectedNode && isDraft && (
            <div className="absolute right-4 top-4 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-h-[calc(100%-2rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Node Configuration</h3>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Label</label>
                  <input
                    value={nodeLabel}
                    onChange={e => setNodeLabel(e.target.value)}
                    className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                  <div className="text-xs bg-gray-100 dark:bg-gray-900 rounded px-2 py-1.5 text-gray-700 dark:text-gray-300">
                    {(selectedNode.data as any).nodeType}
                  </div>
                </div>

                {pluginConfigSchema((selectedNode.data as any).nodeType)?.properties && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Config</label>
                    {Object.entries((pluginConfigSchema((selectedNode.data as any).nodeType) as any).properties || {}).map(([key, prop]: [string, any]) => (
                      <div key={key} className="mb-2">
                        <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{key}</label>
                        {key === 'fieldKey' ? (
                          <select
                            value={nodeConfig[key] ?? ''}
                            onChange={e => setNodeConfig(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="">Select field...</option>
                            {fields.map((f: any) => (
                              <option key={f.id} value={f.key}>{f.displayName} ({f.key})</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={prop.type === 'number' ? 'number' : 'text'}
                            value={nodeConfig[key] ?? ''}
                            onChange={e => setNodeConfig(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={prop.description || key}
                            className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveNodeConfig}
                    disabled={updateNodeMutation.isPending}
                    className="flex-1 text-xs bg-blue-600 dark:bg-blue-700 text-white rounded py-1.5 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                  >
                    {updateNodeMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this node?')) deleteNodeMutation.mutate(selectedNodeId!);
                    }}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-3 py-1.5 border border-red-200 dark:border-red-800 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Version switcher */}
      <div className="px-4 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Versions:</span>
          {(versionsQuery.data as any[])?.map((v: any) => (
            <button
              key={v.id}
              onClick={() => navigate(`/evaluations/${evaluationId}/versions/${v.id}/graph`)}
              className={clsx(
                'text-xs px-2 py-1 rounded transition-colors',
                v.id === versionId
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
            >
              v{v.versionNumber} — {v.status}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">{nodes.length} nodes · {edges.length} edges</span>
      </div>
    </div>
  );
}
