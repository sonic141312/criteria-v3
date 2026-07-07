import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { executionsApi, evaluationsApi, schemasApi } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from '@/components/EmptyState';

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

      <ExecutionsList onRunNew={() => setShowForm(true)} />
    </div>
  );
}

function ExecutionsList({ onRunNew }: { onRunNew: () => void }) {
  const qc = useQueryClient();
  const evaluationsQuery = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => evaluationsApi.list(),
  });
  const executionsQuery = useQuery({
    queryKey: ['executions'],
    queryFn: () => executionsApi.list(),
  });

  const executions = (executionsQuery.data as any[]) || [];

  const publishedEvals = (evaluationsQuery.data as any[]) || [];

  return (
    <div className="space-y-4">
      {/* Available Published Versions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Published Versions</h2>
        </div>
        <div className="p-4">
          {evaluationsQuery.isLoading && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading evaluations...</p>
          )}
          {!evaluationsQuery.isLoading && publishedEvals.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No evaluations yet. Create one to publish and run.
            </p>
          )}
          {publishedEvals.length > 0 && (
            <div className="space-y-2">
              {publishedEvals.map((ev: any) => (
                <PublishedEvalRow key={ev.id} evalItem={ev} onRun={onRunNew} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Execution History */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Executions</h2>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['executions'] })}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Refresh
          </button>
        </div>
        {executionsQuery.isLoading && (
          <div className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        )}
        {!executionsQuery.isLoading && executions.length === 0 && (
          <EmptyState
            icon="▶️"
            title="No executions yet"
            description="Run an evaluation above to see execution history."
          />
        )}
        {executions.length > 0 && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {executions.slice(0, 20).map((exec: any) => (
              <div key={exec.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      exec.status === 'SUCCESS' ? 'bg-green-500' :
                      exec.status === 'FAILED' ? 'bg-red-500' :
                      exec.status === 'PARTIAL' ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">
                        {exec.evaluationVersionId?.substring(0, 8)}...
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {exec.startedAt ? new Date(exec.startedAt).toLocaleString() : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      exec.status === 'SUCCESS' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      exec.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {exec.status}
                    </span>
                    <Link
                      to={`/executions/${exec.id}/trace`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      View Trace
                    </Link>
                  </div>
                </div>
                {exec.finalResult && (
                  <ResultPreview result={exec.finalResult} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PublishedEvalRow({ evalItem, onRun }: { evalItem: any; onRun: () => void }) {
  const versionsQuery = useQuery({
    queryKey: ['evaluations', evalItem.id, 'versions'],
    queryFn: () => evaluationsApi.listVersions(evalItem.id),
  });

  const publishedVersions = ((versionsQuery.data as any[]) || []).filter((v: any) => v.status === 'PUBLISHED');

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-900/40">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{evalItem.name}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{evalItem.id.substring(0, 8)}</span>
      </div>
      {versionsQuery.isLoading && (
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading versions...</p>
      )}
      {!versionsQuery.isLoading && publishedVersions.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">No published version yet</p>
      )}
      {publishedVersions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {publishedVersions.map((v: any) => (
            <button
              key={v.id}
              onClick={onRun}
              className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
            >
              v{v.versionNumber} Run
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultPreview({ result }: { result: any }) {
  if (typeof result === 'number' || typeof result === 'string' || typeof result === 'boolean') {
    return (
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        Result: <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">{String(result)}</code>
      </div>
    );
  }
  if (typeof result === 'object' && result !== null) {
    const entries = Object.entries(result).slice(0, 3);
    return (
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-2">
        {entries.map(([k, v]) => (
          <span key={k}>
            <span className="font-medium">{k}:</span>{' '}
            <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">
              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </code>
          </span>
        ))}
      </div>
    );
  }
  return null;
}

function RunExecutionForm({ onBack }: { onBack: () => void }) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const evaluationsQuery = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => evaluationsApi.list(),
  });

  const versionsQuery = useQuery({
    queryKey: ['evaluations', selectedEvalId, 'versions'],
    queryFn: async () => {
      const evals = (await evaluationsApi.list()) as any[];
      const eval_ = evals.find((e) => e.id === selectedEvalId);
      if (!eval_) return null;
      const schema = (await schemasApi.get(eval_.schemaId)) as any;
      const fields = (await schemasApi.listFields(eval_.schemaId)) as any[];
      const versions = (await evaluationsApi.listVersions(eval_.id)) as any[];
      return { eval: eval_, schema, fields, versions };
    },
    enabled: !!selectedEvalId,
  });

  const runMutation = useMutation({
    mutationFn: (data: { evaluationVersionId: string; inputValues: Record<string, unknown> }) =>
      executionsApi.run(data),
    onSuccess: () => toast('Execution completed', 'success'),
    onError: (err: any) => toast(`Execution failed: ${err?.message || 'Unknown error'}`, 'error'),
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
  const publishedVersions = ((versionsQuery.data?.versions as any[]) || []).filter((v: any) => v.status === 'PUBLISHED');

  if (runMutation.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <ExecutionResult execution={runMutation.data as any} onRunAnother={() => { runMutation.reset(); setInputValues({}); }} onBack={onBack} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button onClick={onBack} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
        ← Back
      </button>

      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Run Evaluation</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Evaluation</label>
        <select
          value={selectedEvalId ?? ''}
          onChange={(e) => {
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
                onChange={(e) => setInputValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={`Enter ${f.key}`}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={!selectedVersionId || runMutation.isPending}
        className="w-full bg-blue-600 dark:bg-blue-700 text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
      >
        {runMutation.isPending ? 'Running...' : 'Run Evaluation'}
      </button>

      {runMutation.isError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
          <p className="font-medium">Failed to run evaluation</p>
          <p className="text-xs mt-1">{(runMutation.error as any)?.message || 'Please check your inputs and try again.'}</p>
        </div>
      )}
    </div>
  );
}

function ExecutionResult({ execution, onRunAnother, onBack }: { execution: any; onRunAnother: () => void; onBack: () => void }) {
  const executionsQuery = useQuery({
    queryKey: ['executions'],
    queryFn: () => executionsApi.list(),
  });

  const previousExecution = ((executionsQuery.data as any[]) || [])
    .filter((e: any) => e.evaluationVersionId === execution.evaluationVersionId && e.id !== execution.id)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Execution Result</h1>
        <StatusBadge status={execution.status} />
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{execution.id}</span>
      </div>

      {execution.finalResult && <FinalResultCard result={execution.finalResult} />}

      <div className="flex gap-3 flex-wrap">
        <Link
          to={`/executions/${execution.id}/trace`}
          className="text-sm bg-blue-600 dark:bg-blue-700 text-white px-3 py-1.5 rounded hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          View full trace
        </Link>
        <button
          onClick={onRunAnother}
          className="text-sm border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          Run Another
        </button>
        {previousExecution && (
          <Link
            to={`/executions/compare?ids=${previousExecution.id},${execution.id}`}
            className="text-sm border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
          >
            Compare with previous
          </Link>
        )}
        <button onClick={onBack} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          ← Back to list
        </button>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'SUCCESS' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
    status === 'PARTIAL' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
    status === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  return (
    <span className={`text-xs px-2 py-1 rounded font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function FinalResultCard({ result }: { result: any }) {
  if (result === null || result === undefined) {
    return null;
  }

  if (typeof result === 'number') {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Result</p>
        <p className="text-5xl font-bold text-blue-600 dark:text-blue-400 mt-2">{result}</p>
      </div>
    );
  }

  if (typeof result === 'string' || typeof result === 'boolean') {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Result</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-2">{String(result)}</p>
      </div>
    );
  }

  if (typeof result === 'object') {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Final Result</h2>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {Object.entries(result).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{k}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-mono">
                {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
