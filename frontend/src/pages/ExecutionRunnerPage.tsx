import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { executionsApi, evaluationsApi, schemasApi } from '@/api/client';

export function ExecutionRunnerPage() {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return <RunExecutionForm onBack={() => setShowForm(false)} />;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Run Evaluation</h1>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          + New Execution
        </button>
      </div>

      <ExecutionsList />
    </div>
  );
}

function ExecutionsList() {
  const evaluationsQuery = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => evaluationsApi.list(),
  });

  if (evaluationsQuery.isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Available Published Versions</h2>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Select an evaluation version below to run. You need to publish a graph first in the Graph Builder.
        </p>
        <Link
          to="/evaluations"
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          → Go to Evaluations to manage versions
        </Link>
      </div>
    </div>
  );
}

function RunExecutionForm({ onBack }: { onBack: () => void }) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const evaluationsQuery = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => evaluationsApi.list(),
  });

  const versionsQuery = useQuery({
    queryKey: ['evaluations', selectedEvalId, 'versions'],
    queryFn: async () => {
      const evals = await evaluationsApi.list() as any[];
      const eval_ = evals.find(e => e.id === selectedEvalId);
      if (!eval_) return null;
      const schema = await schemasApi.get(eval_.schemaId) as any;
      const fields = await schemasApi.listFields(eval_.schemaId) as any[];
      const versions = await evaluationsApi.listVersions(eval_.id) as any[];
      return { eval: eval_, schema, fields, versions };
    },
    enabled: !!selectedEvalId,
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

  const fields = (versionsQuery.data?.fields as any[]) ?? [];
  const publishedVersions = (versionsQuery.data?.versions as any[])?.filter((v: any) => v.status === 'PUBLISHED') ?? [];

  if (runMutation.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <ExecutionResult execution={runMutation.data as any} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button onClick={onBack} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
        ← Back
      </button>

      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Run Evaluation</h1>

      {/* Evaluation selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Evaluation</label>
        <select
          value={selectedEvalId ?? ''}
          onChange={e => {
            setSelectedEvalId(e.target.value || null);
            setSelectedVersionId(null);
          }}
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">Select an evaluation...</option>
          {(evaluationsQuery.data as any[])?.map((ev: any) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
      </div>

      {/* Version selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Version</label>
        {versionsQuery.isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading versions...</p>}
        {versionsQuery.isSuccess && publishedVersions.length === 0 && (
          <p className="text-sm text-red-500 dark:text-red-400">No PUBLISHED versions. Publish a version in the Graph Builder first.</p>
        )}
        {publishedVersions.map((v: any) => (
          <button
            key={v.id}
            onClick={() => setSelectedVersionId(v.id)}
            className={`mr-2 mb-1 text-xs px-3 py-1.5 rounded border ${
              selectedVersionId === v.id
                ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            v{v.versionNumber}
          </button>
        ))}
      </div>

      {/* Input fields */}
      {selectedVersionId && fields.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Input Values</h2>
          {fields.map((f: any) => (
            <div key={f.id}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {f.displayName}
                <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 font-normal">({f.key})</span>
              </label>
              <input
                type={f.dataType === 'number' || f.dataType === 'percentage' ? 'number' : 'text'}
                value={inputValues[f.key] ?? ''}
                onChange={e => setInputValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={`Enter ${f.key}`}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          ))}
        </div>
      )}

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={!selectedVersionId || runMutation.isPending}
        className="w-full bg-blue-600 dark:bg-blue-700 text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
      >
        {runMutation.isPending ? 'Running...' : 'Run Evaluation'}
      </button>

      {/* Error */}
      {runMutation.isError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
          {String(runMutation.error)}
        </div>
      )}
    </div>
  );
}

function ExecutionResult({ execution }: { execution: any }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Execution Result</h1>
        <span className={`text-xs px-2 py-1 rounded font-medium ${
          execution.status === 'SUCCESS' ? 'bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-700 dark:text-green-400' :
          execution.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-700 dark:text-red-400' :
          'bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-30 text-yellow-700 dark:text-yellow-400'
        }`}>
          {execution.status}
        </span>
      </div>

      {execution.finalResult && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Final Result</h2>
          <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-auto bg-gray-50 dark:bg-gray-900 p-3 rounded">
            {JSON.stringify(execution.finalResult, null, 2)}
          </pre>
        </div>
      )}

      <div className="flex gap-3">
        <a
          href={`/executions/${execution.id}`}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          View full trace →
        </a>
      </div>
    </div>
  );
}

export function ExecutionRunnerPageResult({ executionId }: { executionId: string }) {
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
      <div className="flex items-center gap-3 mb-6">
        <a href="/executions" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">←</a>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Execution Result</h1>
      </div>

      {execQuery.isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>}

      {execQuery.isSuccess && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              (execQuery.data as any)?.status === 'SUCCESS' ? 'bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-700 dark:text-green-400' :
              (execQuery.data as any)?.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-700 dark:text-red-400' :
              'bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-30 text-yellow-700 dark:text-yellow-400'
            }`}>
              {(execQuery.data as any)?.status}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {(execQuery.data as any)?.id}
            </span>
          </div>

          {(execQuery.data as any)?.finalResult && (
            <div className="mb-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Final Result</h2>
              <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-auto">
                {JSON.stringify((execQuery.data as any).finalResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {traceQuery.isSuccess && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Node Results (Trace)</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {(traceQuery.data as any).nodes.map((r: any, i: number) => (
              <div
                key={i}
                className={`p-4 ${
                  r.status === 'SUCCESS' ? 'bg-white dark:bg-gray-800' :
                  r.status === 'ERROR' ? 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20' :
                  'bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      r.status === 'SUCCESS' ? 'bg-green-500' :
                      r.status === 'ERROR' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`} />
                    <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{r.nodeId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.durationMs !== undefined && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">{r.durationMs}ms</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      r.status === 'SUCCESS' ? 'bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-700 dark:text-green-400' :
                      r.status === 'ERROR' ? 'bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-700 dark:text-red-400' :
                      'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                </div>

                {r.value && (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Value: </span>
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-gray-700 dark:text-gray-300">
                      {typeof r.value === 'object' ? JSON.stringify(r.value) : String(r.value)}
                    </code>
                  </div>
                )}

                {r.explanation && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{r.explanation}</p>
                )}
                {r.error && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">Error: {r.error}</p>
                )}
                {r.warnings?.length > 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Warnings: {r.warnings.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
