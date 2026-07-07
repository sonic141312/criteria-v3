import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { executionsApi } from '@/api/client';
import { clsx } from 'clsx';
import { ExecutionTraceGraph } from '@/components/ExecutionTraceGraph';
import { StatusBadge } from './ExecutionRunnerPage';

export function ExecutionTracePage() {
  const { executionId } = useParams<{ executionId: string }>();
  const navigate = useNavigate();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const traceQuery = useQuery({
    queryKey: ['executions', executionId, 'trace'],
    queryFn: () => executionsApi.getTrace(executionId!),
    enabled: !!executionId,
  });

  const execQuery = useQuery({
    queryKey: ['executions', executionId],
    queryFn: () => executionsApi.get(executionId!),
    enabled: !!executionId,
  });

  const trace = traceQuery.data as any;
  const exec = execQuery.data as any;

  const executionsQuery = useQuery({
    queryKey: ['executions'],
    queryFn: () => executionsApi.list(),
  });

  const previousExecution = ((executionsQuery.data as any[]) || [])
    .filter((e: any) => e.evaluationVersionId === exec?.evaluationVersionId && e.id !== executionId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];

  const selectedNode = trace?.nodes?.find((n: any) => n.nodeId === selectedNodeId);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/executions')}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Execution Trace</h1>
          {exec && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">{exec.id}</p>
          )}
        </div>
      </div>

      {traceQuery.isLoading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading trace...</p>
        </div>
      )}

      {traceQuery.isError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">Failed to load execution trace</p>
        </div>
      )}

      {trace && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Execution Summary</h2>
              <StatusBadge status={exec?.status || 'UNKNOWN'} />
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Started</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {exec?.startedAt ? new Date(exec.startedAt).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Finished</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {exec?.finishedAt ? new Date(exec.finishedAt).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {exec?.startedAt && exec?.finishedAt
                      ? `${Math.round((new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()))}ms`
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {trace.nodes && trace.nodes.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Graph View</h2>
              </div>
              <div className="p-2">
                <ExecutionTraceGraph
                  trace={trace}
                  selectedNodeId={selectedNodeId}
                  onNodeSelect={(n) => setSelectedNodeId(n?.nodeId ?? null)}
                />
                <div className="flex items-center gap-4 mt-2 px-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>Success</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Error</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400"></span>Skipped</span>
                </div>
              </div>
            </div>
          )}

          {exec?.inputValues && Object.keys(exec.inputValues).length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Input Values</h2>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {Object.entries(exec.inputValues).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400 font-mono">{key}</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {exec?.finalResult && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Final Result</h2>
              </div>
              <div className="p-4">
                <pre className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-auto">
                  {JSON.stringify(exec.finalResult, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {selectedNode && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Selected Node Details</h2>
                <button onClick={() => setSelectedNodeId(null)} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-700 dark:text-gray-300">{(selectedNode as any).nodeId}</span>
                  <StatusBadge status={(selectedNode as any).status} />
                </div>
                {(selectedNode as any).value !== undefined && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Value</p>
                    <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
{typeof (selectedNode as any).value === 'object' ? JSON.stringify((selectedNode as any).value, null, 2) : String((selectedNode as any).value)}
                    </pre>
                  </div>
                )}
                {(selectedNode as any).error && (
                  <div className="text-red-600 dark:text-red-400">Error: {(selectedNode as any).error}</div>
                )}
                {(selectedNode as any).explanation && (
                  <div className="italic text-gray-600 dark:text-gray-400">{(selectedNode as any).explanation}</div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Node Execution Results</h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-gray-500 dark:text-gray-400">Success</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-gray-500 dark:text-gray-400">Error</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  <span className="text-gray-500 dark:text-gray-400">Skipped</span>
                </span>
              </div>
            </div>

            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                {trace.nodes?.filter((n: any) => n.status === 'SUCCESS').length || 0} succeeded
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {trace.nodes?.filter((n: any) => n.status === 'ERROR').length || 0} failed
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {trace.nodes?.filter((n: any) => n.status === 'SKIPPED').length || 0} skipped
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                Total: {trace.nodes?.length || 0} nodes
              </span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {(trace.nodes as any[])?.map((nodeResult, index) => (
                <NodeResultItem key={index} nodeResult={nodeResult} index={index} highlighted={nodeResult.nodeId === selectedNodeId} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link
              to="/executions"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              ← Back to Executions
            </Link>
            {previousExecution && (
              <Link
                to={`/executions/compare?ids=${previousExecution.id},${executionId}`}
                className="text-sm border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                Compare with previous
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NodeResultItem({ nodeResult, index, highlighted }: { nodeResult: any; index: number; highlighted: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    SUCCESS: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-100 dark:border-green-800',
      badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      dot: 'bg-green-500',
    },
    ERROR: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-100 dark:border-red-800',
      badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      dot: 'bg-red-500',
    },
    SKIPPED: {
      bg: 'bg-gray-50 dark:bg-gray-800/50',
      border: 'border-gray-100 dark:border-gray-700',
      badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      dot: 'bg-gray-400',
    },
  };

  const colors = statusColors[nodeResult.status as keyof typeof statusColors] || statusColors.SKIPPED;

  return (
    <div className={clsx('p-4', colors.bg, highlighted && 'ring-2 ring-blue-400 ring-offset-1')}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={clsx('w-2 h-2 rounded-full', colors.dot)} />
            <div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {nodeResult.nodeId}
              </span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">#{index + 1}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {nodeResult.durationMs !== undefined && nodeResult.durationMs !== null && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {nodeResult.durationMs}ms
              </span>
            )}
            <span className={clsx('text-xs px-2 py-0.5 rounded font-medium', colors.badge)}>
              {nodeResult.status}
            </span>
            <span className="text-gray-400 dark:text-gray-500 text-xs">
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pl-5 space-y-3">
          {nodeResult.value !== undefined && nodeResult.value !== null && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Output Value</p>
              <pre className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-auto">
                {typeof nodeResult.value === 'object'
                  ? JSON.stringify(nodeResult.value, null, 2)
                  : String(nodeResult.value)}
              </pre>
            </div>
          )}

          {nodeResult.explanation && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Explanation</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">{nodeResult.explanation}</p>
            </div>
          )}

          {nodeResult.inputsReceived && Object.keys(nodeResult.inputsReceived).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Inputs Received</p>
              <div className="space-y-1">
                {Object.entries(nodeResult.inputsReceived).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 font-mono">{key}:</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {value === null ? 'null' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nodeResult.error && (
            <div>
              <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800">
                {nodeResult.error}
              </p>
            </div>
          )}

          {nodeResult.warnings && nodeResult.warnings.length > 0 && (
            <div>
              <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">Warnings</p>
              <ul className="space-y-1">
                {nodeResult.warnings.map((warning: string, i: number) => (
                  <li key={i} className="text-xs text-yellow-700 dark:text-yellow-300 flex items-start gap-1">
                    <span>⚠</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
