import { useMemo } from 'react';
import ReactFlow, {
  Node, Edge, Controls, Background, MarkerType, BackgroundVariant,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from '@/context/ThemeContext';

interface TraceNode {
  nodeId: string;
  status: 'SUCCESS' | 'ERROR' | 'SKIPPED' | string;
  durationMs?: number;
  value?: unknown;
  inputsReceived?: Record<string, unknown>;
  error?: string;
  explanation?: string;
  warnings?: string[];
}

interface TraceEdge {
  fromNodeId: string;
  toNodeId: string;
}

interface Trace {
  nodes: TraceNode[];
  edges?: TraceEdge[];
  executionOrder?: string[];
}

interface ExecutionTraceGraphProps {
  trace: Trace;
  onNodeSelect?: (node: TraceNode | null) => void;
  selectedNodeId?: string | null;
}

const STATUS_BG: Record<string, string> = {
  SUCCESS: '#d1fae5',
  ERROR: '#fee2e2',
  SKIPPED: '#f3f4f6',
};

const STATUS_BORDER: Record<string, string> = {
  SUCCESS: '#22c55e',
  ERROR: '#ef4444',
  SKIPPED: '#9ca3af',
};

const STATUS_TEXT: Record<string, string> = {
  SUCCESS: '#065f46',
  ERROR: '#991b1b',
  SKIPPED: '#4b5563',
};

const NODE_WIDTH = 170;
const NODE_HEIGHT = 90;

export function ExecutionTraceGraph({ trace, onNodeSelect, selectedNodeId }: ExecutionTraceGraphProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { nodes, edges } = useMemo(() => {
    const order = trace.executionOrder ?? trace.nodes.map((n) => n.nodeId);
    const positions = new Map<string, { x: number; y: number }>();
    order.forEach((id, i) => {
      positions.set(id, { x: 100 + (i % 3) * (NODE_WIDTH + 60), y: 100 + Math.floor(i / 3) * (NODE_HEIGHT + 80) });
    });

    const nodeResults = new Map<string, TraceNode>();
    trace.nodes.forEach((n) => nodeResults.set(n.nodeId, n));

    const builtNodes: Node[] = order.map((id) => {
      const result = nodeResults.get(id);
      const status = result?.status || 'SKIPPED';
      const label = id.split('|')[0] || id;
      const darkBg: Record<string, string> = {
        SUCCESS: '#14532d',
        ERROR: '#7f1d1d',
        SKIPPED: '#1f2937',
      };
      const darkText: Record<string, string> = {
        SUCCESS: '#86efac',
        ERROR: '#fca5a5',
        SKIPPED: '#9ca3af',
      };
      return {
        id,
        type: 'default',
        position: positions.get(id) || { x: 100, y: 100 },
        data: { label },
        selected: id === selectedNodeId,
        style: {
          background: isDark ? (darkBg[status] || '#1f2937') : (STATUS_BG[status] || '#fff'),
          border: `2px solid ${STATUS_BORDER[status] || '#9ca3af'}`,
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: '12px',
          color: isDark ? (darkText[status] || '#d1d5db') : (STATUS_TEXT[status] || '#1f2937'),
          width: NODE_WIDTH,
          minHeight: NODE_HEIGHT,
        },
        label: `${label}\n${result?.value !== undefined ? String(typeof result.value === 'object' ? JSON.stringify(result.value) : result.value) : status} (${status})`,
      } as any;
    });

    const builtEdges: Edge[] = (trace.edges || []).map((e, i) => ({
      id: `e-${i}-${e.fromNodeId}-${e.toNodeId}`,
      source: e.fromNodeId,
      target: e.toNodeId,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: isDark ? '#4b5563' : '#9ca3af', strokeWidth: 2 },
    }));

    return { nodes: builtNodes, edges: builtEdges };
  }, [trace, selectedNodeId, isDark]);

  return (
    <div className="h-80 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden" data-testid="trace-graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(_, n) => onNodeSelect?.(trace.nodes.find((tn) => tn.nodeId === n.id) ?? null)}
        onPaneClick={() => onNodeSelect?.(null)}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
      >
        <Controls showInteractive={false} />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color={isDark ? '#374151' : '#e5e7eb'} />
      </ReactFlow>
    </div>
  );
}

export function ExecutionTraceGraphWithProvider(props: ExecutionTraceGraphProps) {
  return (
    <ReactFlowProvider>
      <ExecutionTraceGraph {...props} />
    </ReactFlowProvider>
  );
}
