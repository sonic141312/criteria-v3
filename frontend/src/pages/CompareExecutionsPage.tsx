import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { executionsApi } from '@/api/client';
import { ExecutionTraceGraphWithProvider as ExecutionTraceGraph } from '@/components/ExecutionTraceGraph';
import { StatusBadge, FinalResultCard } from './ExecutionRunnerPage';
import { clsx } from 'clsx';

interface TraceNode {
  nodeId: string;
  status: string;
  durationMs?: number;
  value?: unknown;
  inputsReceived?: Record<string, unknown>;
  error?: string;
  explanation?: string;
}

export function CompareExecutionsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ids = (params.get('ids') || '').split(',').filter(Boolean);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['executions', id],
      queryFn: () => executionsApi.get(id),
      enabled: !!id,
    })),
  });

  const traceQueries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['executions', id, 'trace'],
      queryFn: () => executionsApi.getTrace(id),
      enabled: !!id,
    })),
  });

  const execData = queries.map((q) => q.data) as any[];
  const traceData = traceQueries.map((q) => q.data) as any[];
  const isLoading = queries.some((q) => q.isLoading) || traceQueries.some((q) => q.isLoading);

  const comparison = useMemo(() => {
    if (traceData.length < 2 || !traceData[0] || !traceData[1]) return null;
    const nodes0 = new Map<string, TraceNode>();
    const nodes1 = new Map<string, TraceNode>();
    (traceData[0].nodes as TraceNode[] | undefined)?.forEach((n) => nodes0.set(n.nodeId, n));
    (traceData[1].nodes as TraceNode[] | undefined)?.forEach((n) => nodes1.set(n.nodeId, n));
    const allKeys = new Set<string>([...nodes0.keys(), ...nodes1.keys()]);
    const rows: Array<{ nodeId: string; left?: TraceNode; right?: TraceNode; diff: 'only-left' | 'only-right' | 'different' | 'same' }> = [];
    allKeys.forEach((k) => {
      const l = nodes0.get(k);
      const r = nodes1.get(k);
      if (l && !r) rows.push({ nodeId: k, left: l, diff: 'only-left' });
      else if (!l && r) rows.push({ nodeId: k, right: r, diff: 'only-right' });
      else if (l && r) {
        const same = JSON.stringify(l.value) === JSON.stringify(r.value) && l.status === r.status;
        rows.push({ nodeId: k, left: l, right: r, diff: same ? 'same' : 'different' });
      }
    });
    return rows;
  }, [traceData]);

  if (ids.length < 2) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Link to="/executions" className="text-sm text-blue-600 dark:text-blue-400">← Back to Executions</Link>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          Provide two execution ids in the URL: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">?ids=id1,id2</code>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/executions')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Compare Executions</h1>
      </div>

      {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading executions...</p>}

      {execData[0] && execData[1] && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Execution A</span>
                <StatusBadge status={execData[0].status} />
              </div>
              <FinalResultCard result={execData[0].finalResult} />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Execution B</span>
                <StatusBadge status={execData[1].status} />
              </div>
              <FinalResultCard result={execData[1].finalResult} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {traceData[0] && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Trace A</p>
                <ExecutionTraceGraph
                  trace={traceData[0]}
                  selectedNodeId={selectedNode}
                  onNodeSelect={(n) => setSelectedNode(n?.nodeId ?? null)}
                />
              </div>
            )}
            {traceData[1] && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Trace B</p>
                <ExecutionTraceGraph
                  trace={traceData[1]}
                  selectedNodeId={selectedNode}
                  onNodeSelect={(n) => setSelectedNode(n?.nodeId ?? null)}
                />
              </div>
            )}
          </div>

          {comparison && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Per-Node Comparison ({comparison.filter((r) => r.diff === 'different' || r.diff === 'only-left' || r.diff === 'only-right').length} differences)
                </h2>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-3 py-2 font-medium">Node</th>
                    <th className="px-3 py-2 font-medium">Execution A</th>
                    <th className="px-3 py-2 font-medium">Execution B</th>
                    <th className="px-3 py-2 font-medium">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((r) => (
                    <tr key={r.nodeId} className={clsx(
                      'border-b border-gray-50 dark:border-gray-700',
                      r.diff === 'different' && 'bg-yellow-50 dark:bg-yellow-900/10',
                      r.diff === 'only-left' && 'bg-blue-50 dark:bg-blue-900/10',
                      r.diff === 'only-right' && 'bg-purple-50 dark:bg-purple-900/10',
                    )}>
                      <td className="px-3 py-2 font-mono">{r.nodeId.split('|')[0]}</td>
                      <td className="px-3 py-2 font-mono">{formatValue(r.left?.value)}</td>
                      <td className="px-3 py-2 font-mono">{formatValue(r.right?.value)}</td>
                      <td className="px-3 py-2">
                        {r.diff === 'same' && <span className="text-green-700 dark:text-green-400">same</span>}
                        {r.diff === 'different' && <span className="text-yellow-700 dark:text-yellow-400">different</span>}
                        {r.diff === 'only-left' && <span className="text-blue-700 dark:text-blue-400">only in A</span>}
                        {r.diff === 'only-right' && <span className="text-purple-700 dark:text-purple-400">only in B</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
