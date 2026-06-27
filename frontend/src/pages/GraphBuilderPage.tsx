import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactFlow, {
  Node, Edge, Controls, Background, useNodesState, useEdgesState,
  addEdge, Connection, MarkerType, NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useParams, useNavigate } from 'react-router-dom';
import { graphApi, evaluationsApi } from '@/api/client';

export function GraphBuilderPage() {
  const { evaluationId, versionId } = useParams<{ evaluationId: string; versionId: string }>();
  const qc = useQueryClient();

  // Load graph data
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

  // Initialize React Flow nodes/edges from API data
  const apiNodes: Node[] = ((graphQuery.data?.nodes as any[]) ?? []).map((n: any) => ({
    id: n.id,
    type: 'default',
    position: { x: n.positionX, y: n.positionY },
    data: { label: n.label, nodeType: n.nodeType, config: n.config },
  }));

  const apiEdges: Edge[] = ((graphQuery.data?.edges as any[]) ?? []).map((e: any) => ({
    id: e.id,
    source: e.fromNodeId,
    target: e.toNodeId,
    sourceHandle: e.fromPort,
    targetHandle: e.toPort,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(apiNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(apiEdges);

  // Sync when API data changes
  if (graphQuery.isSuccess && nodes.length === 0 && apiNodes.length > 0) {
    setNodes(apiNodes);
    setEdges(apiEdges);
  }

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      setEdges((eds) => addEdge({
        ...params,
        markerEnd: { type: MarkerType.ArrowClosed },
      }, eds));
    },
    [setEdges],
  );

  const addNodeMutation = useMutation({
    mutationFn: (data: { nodeType: string; label: string; config: Record<string, unknown>; positionX: number; positionY: number }) =>
      graphApi.createNode(versionId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['graph', versionId] });
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) => graphApi.deleteNode(versionId!, nodeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['graph', versionId] }),
  });

  const createEdgeMutation = useMutation({
    mutationFn: (data: { fromNodeId: string; fromPort: string; toNodeId: string; toPort: string }) =>
      graphApi.createEdge(versionId!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['graph', versionId] }),
  });

  const onNodeDelete = (nodeId: string) => {
    if (confirm('Delete this node?')) deleteNodeMutation.mutate(nodeId);
  };

  const currentVersion: any = (versionsQuery.data as any[])?.find((v: any) => v.id === versionId);
  const isDraft = currentVersion?.status === 'DRAFT';

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-gray-900">
            Graph Builder
            {currentVersion && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                currentVersion.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                currentVersion.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                v{currentVersion.versionNumber} — {currentVersion.status}
              </span>
            )}
          </h1>
          {isDraft && (
            <button
              onClick={() => addNodeMutation.mutate({
                nodeType: 'input',
                label: 'New Node',
                config: {},
                positionX: 100,
                positionY: 200,
              })}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              + Add Node
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => validateMutation.mutate()}
            className="text-xs border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
          >
            {validateMutation.isPending ? 'Validating...' : 'Validate Graph'}
          </button>
          {isDraft && (
            <button
              onClick={() => { if (confirm('Publish this version?')) publishMutation.mutate(); }}
              disabled={publishMutation.isPending}
              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {publishMutation.isPending ? 'Publishing...' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      {/* Validation result */}
      {validateMutation.isSuccess && (
        <div className={`px-4 py-2 text-xs ${validateMutation.data.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {validateMutation.data.valid
            ? '✓ Graph is valid'
            : `✕ ${validateMutation.data.errors.length} error(s): ${validateMutation.data.errors.map((e: any) => e.message).join(', ')}`
          }
        </div>
      )}

      {/* React Flow canvas */}
      <div className="flex-1">
        {graphQuery.isLoading && <div className="p-4 text-sm text-gray-500">Loading graph...</div>}
        {graphQuery.isError && <div className="p-4 text-sm text-red-600">Failed to load graph</div>}
        {graphQuery.isSuccess && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
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
            onNodeDoubleClick={(_, node) => onNodeDelete(node.id)}
            fitView
            className="bg-gray-50"
          >
            <Controls />
            <Background />
          </ReactFlow>
        )}
      </div>

      {/* Version switcher */}
      <div className="px-4 py-2 bg-white border-t border-gray-200 flex items-center gap-2">
        <span className="text-xs text-gray-500">Versions:</span>
        {(versionsQuery.data as any[])?.map((v: any) => (
          <button
            key={v.id}
            onClick={() => navigate(`/evaluations/${evaluationId}/versions/${v.id}/graph`)}
            className={`text-xs px-2 py-1 rounded ${
              v.id === versionId
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            v{v.versionNumber} — {v.status}
          </button>
        ))}
      </div>
    </div>
  );
}
