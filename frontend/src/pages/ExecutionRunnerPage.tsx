import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { executionsApi, evaluationsApi, schemasApi } from '@/api/client';

export function ExecutionRunnerPage() {
  const { executionId } = useParams<{ executionId: string }>();

  if (executionId) {
    return <ExecutionResultPage executionId={executionId} />;
  }

  return <RunExecutionPage />;
}

function RunExecutionPage() {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const versionsQuery = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => evaluationsApi.list(),
  });

  const versionQuery = useQuery({
    queryKey: ['versions', selectedVersionId],
    queryFn: async () => {
      // Load schema + fields for this evaluation's schema
      const evals = await evaluationsApi.list() as any[];
      const eval_ = evals[0];
      if (!eval_) return null;
      const schema = await schemasApi.get(eval_.schemaId) as any;
      const fields = await schemasApi.listFields(eval_.schemaId) as any[];
      const versions = await evaluationsApi.listVersions(eval_.id) as any[];
      return { eval: eval_, schema, fields, versions };
    },
    enabled: !!versionsQuery.data,
  });

  const runMutation = useMutation({
    mutationFn: (data: { evaluationVersionId: string; inputValues: Record<string, unknown> }) =>
      executionsApi.run(data),
  });

  const handleRun = () => {
    if (!selectedVersionId) return;
    const values: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(inputValues)) {
      values[k] = isNaN(Number(v)) ? v : Number(v);
    }
    runMutation.mutate({ evaluationVersionId: selectedVersionId, inputValues: values });
  };

  const fields = (versionQuery.data?.fields as any[]) ?? [];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Run Evaluation</h1>

      {/* Version selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Evaluation Version</label>
        {versionQuery.isLoading && <p className="text-sm text-gray-500">Loading...</p>}
        {(versionQuery.data?.versions as any[])?.length === 0 && (
          <p className="text-sm text-red-500">No PUBLISHED versions. Publish a version in the Graph Builder first.</p>
        )}
        {(versionQuery.data?.versions as any[])?.filter((v: any) => v.status === 'PUBLISHED').map((v: any) => (
          <button
            key={v.id}
            onClick={() => setSelectedVersionId(v.id)}
            className={`mr-2 mb-1 text-xs px-3 py-1.5 rounded border ${
              selectedVersionId === v.id
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            v{v.versionNumber} — PUBLISHED
          </button>
        ))}
      </div>

      {/* Input fields */}
      {selectedVersionId && fields.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700">Input Values</h2>
          {fields.map((f: any) => (
            <div key={f.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {f.displayName}
                <span className="ml-1 text-xs text-gray-400 font-normal">({f.key})</span>
              </label>
              <input
                type={f.dataType === 'number' || f.dataType === 'percentage' ? 'number' : 'text'}
                value={inputValues[f.key] ?? ''}
                onChange={e => setInputValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={`Enter ${f.key}`}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      )}

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={!selectedVersionId || runMutation.isPending}
        className="w-full bg-blue-600 text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {runMutation.isPending ? 'Running...' : 'Run Evaluation'}
      </button>

      {/* Error */}
      {runMutation.isError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {String(runMutation.error)}
        </div>
      )}

      {/* Result */}
      {runMutation.isSuccess && (
        <div className="mt-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-sm font-semibold text-green-800 mb-2">
              Execution Complete — {((runMutation.data as any)?.status as string)}
            </h3>
            <pre className="text-xs text-green-700 overflow-auto">
              {JSON.stringify(runMutation.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function ExecutionResultPage({ executionId }: { executionId: string }) {
  const traceQuery = useQuery({
    queryKey: ['executions', executionId, 'trace'],
    queryFn: () => executionsApi.getTrace(executionId),
  });

  const execQuery = useQuery({
    queryKey: ['executions', executionId],
    queryFn: () => executionsApi.get(executionId),
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Execution Result</h1>

      {execQuery.isLoading && <p className="text-sm text-gray-500">Loading...</p>}

      {execQuery.isSuccess && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              (execQuery.data as any)?.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
              (execQuery.data as any)?.status === 'FAILED' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {(execQuery.data as any)?.status}
            </span>
            <span className="text-xs text-gray-400">
              {(execQuery.data as any)?.id}
            </span>
          </div>

          {(execQuery.data as any)?.finalResult && (
            <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Final Result</h2>
              <pre className="text-sm text-gray-800 overflow-auto">
                {JSON.stringify((execQuery.data as any).finalResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {traceQuery.isSuccess && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Node Results</h2>
          <div className="space-y-2">
            {(traceQuery.data as any).nodes.map((r: any, i: number) => (
              <div
                key={i}
                className={`p-3 rounded-md border text-sm ${
                  r.status === 'SUCCESS' ? 'bg-white border-gray-200' :
                  r.status === 'ERROR' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">{r.nodeId}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    r.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                    r.status === 'ERROR' ? 'bg-red-100 text-red-700' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {r.status}
                  </span>
                </div>
                {r.explanation && (
                  <p className="text-xs text-gray-500 mt-1">{r.explanation}</p>
                )}
                {r.error && (
                  <p className="text-xs text-red-600 mt-1">Error: {r.error}</p>
                )}
                {r.warnings?.length > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">Warnings: {r.warnings.join(', ')}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{r.durationMs}ms</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
