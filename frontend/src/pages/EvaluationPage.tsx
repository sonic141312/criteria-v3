import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { evaluationsApi, schemasApi } from '@/api/client';

export function EvaluationPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedSchemaId, setSelectedSchemaId] = useState('');

  const evaluationsQuery = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => evaluationsApi.list(),
  });

  const schemasQuery = useQuery({
    queryKey: ['schemas'],
    queryFn: () => schemasApi.list(),
  });

  const createEvalMutation = useMutation({
    mutationFn: () => evaluationsApi.create({
      schemaId: selectedSchemaId,
      name: newName,
      description: newDesc,
    }),
    onSuccess: async (data: any) => {
      const versions = await evaluationsApi.listVersions(data.id);
      const firstVersion = (versions as any[])[0];
      if (firstVersion) {
        qc.invalidateQueries({ queryKey: ['evaluations'] });
        setShowCreate(false);
        setNewName('');
        setNewDesc('');
        navigate(`/evaluations/${data.id}/versions/${firstVersion.id}/graph`);
      }
    },
  });

  const getSchemaName = (schemaId: string) => {
    const schema = schemasQuery.data?.find((s: any) => s.id === schemaId);
    return schema?.name ?? schemaId;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Evaluations</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="text-sm bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          + New Evaluation
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Create Evaluation</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Schema</label>
                <select
                  value={selectedSchemaId}
                  onChange={e => setSelectedSchemaId(e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a schema...</option>
                  {(schemasQuery.data as any[])?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Creator Quality Score"
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Optional description"
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => createEvalMutation.mutate()}
                disabled={!selectedSchemaId || !newName || createEvalMutation.isPending}
                className="flex-1 text-sm bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
              >
                {createEvalMutation.isPending ? 'Creating...' : 'Create & Open Graph'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="text-sm text-gray-500 dark:text-gray-400 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {evaluationsQuery.isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>}
      <div className="space-y-3">
        {(evaluationsQuery.data as any[])?.map((eval_: any) => (
          <EvaluationCard key={eval_.id} evaluation={eval_} onSchemaName={getSchemaName} />
        ))}
        {evaluationsQuery.data?.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <p className="text-sm">No evaluations yet.</p>
            <p className="text-xs mt-1">Create one to start building your rule graph.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EvaluationCard({ evaluation, onSchemaName }: { evaluation: any; onSchemaName: (id: string) => string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const versionsQuery = useQuery({
    queryKey: ['evaluations', evaluation.id, 'versions'],
    queryFn: () => evaluationsApi.listVersions(evaluation.id),
  });

  const createVersionMutation = useMutation({
    mutationFn: () => evaluationsApi.createVersion(evaluation.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations', evaluation.id, 'versions'] }),
  });

  const publishedVersion = (versionsQuery.data as any[])?.find((v: any) => v.status === 'PUBLISHED');
  const draftVersion = (versionsQuery.data as any[])?.find((v: any) => v.status === 'DRAFT');

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{evaluation.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Schema: {onSchemaName(evaluation.schemaId)} · Created: {new Date(evaluation.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {publishedVersion && (
            <span
              onClick={(e) => { e.stopPropagation(); navigate(`/evaluations/${evaluation.id}/versions/${publishedVersion.id}/graph`); }}
              className="text-xs bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-700 dark:text-green-400 px-2 py-1 rounded cursor-pointer hover:bg-green-200 dark:hover:bg-green-800"
            >
              v{publishedVersion.versionNumber} PUBLISHED
            </span>
          )}
          {draftVersion && (
            <span
              onClick={(e) => { e.stopPropagation(); navigate(`/evaluations/${evaluation.id}/versions/${draftVersion.id}/graph`); }}
              className="text-xs bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-800"
            >
              v{draftVersion.versionNumber} DRAFT
            </span>
          )}
          <span className="text-gray-400 dark:text-gray-500">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
          <div className="space-y-2">
            {(versionsQuery.data as any[])?.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    v.status === 'PUBLISHED' ? 'bg-green-500' :
                    v.status === 'ARCHIVED' ? 'bg-gray-400' : 'bg-yellow-500'
                  }`} />
                  <span className="text-gray-700 dark:text-gray-300">v{v.versionNumber}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{v.status}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate(`/evaluations/${evaluation.id}/versions/${v.id}/graph`)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => createVersionMutation.mutate()}
            className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            + New Draft Version
          </button>
        </div>
      )}
    </div>
  );
}
