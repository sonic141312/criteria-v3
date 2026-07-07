import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { evaluationsApi } from '@/api/client';
import { clsx } from 'clsx';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/context/ToastContext';

export function VersionManagerPage() {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | null
    | { type: 'publish'; versionId: string }
    | { type: 'clone-draft' }
    | { type: 'clone-published' }
  >(null);

  const evaluationQuery = useQuery({
    queryKey: ['evaluations', evaluationId],
    queryFn: () => evaluationsApi.get(evaluationId!),
    enabled: !!evaluationId,
  });

  const versionsQuery = useQuery({
    queryKey: ['evaluations', evaluationId, 'versions'],
    queryFn: () => evaluationsApi.listVersions(evaluationId!),
    enabled: !!evaluationId,
  });

  const publishMutation = useMutation({
    mutationFn: (versionId: string) => evaluationsApi.publish(evaluationId!, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations', evaluationId, 'versions'] });
      toast('Version published', 'success');
    },
    onError: (e: any) => toast(`Publish failed: ${e.message}`, 'error'),
  });

  const createVersionMutation = useMutation({
    mutationFn: () => evaluationsApi.createVersion(evaluationId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations', evaluationId, 'versions'] });
      toast('New draft version created', 'success');
    },
    onError: (e: any) => toast(`Failed: ${e.message}`, 'error'),
  });

  const evaluation = evaluationQuery.data as any;
  const versions = (versionsQuery.data as any[]) || [];
  const selectedVersion = versions.find(v => v.id === selectedVersionId) || versions[0];

  const statusConfig = {
    DRAFT: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', dot: 'bg-yellow-500', label: 'Draft' },
    PUBLISHED: { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800', dot: 'bg-green-500', label: 'Published' },
    ARCHIVED: { color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700', dot: 'bg-gray-400', label: 'Archived' },
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/evaluations')}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Version Manager
          </h1>
          {evaluation && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {evaluation.name}
            </p>
          )}
        </div>
        <button
          onClick={() => createVersionMutation.mutate()}
          disabled={createVersionMutation.isPending}
          className="text-sm bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
        >
          + New Version
        </button>
      </div>

      {/* Loading */}
      {versionsQuery.isLoading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading versions...</p>
        </div>
      )}

      {/* Version Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {versions.map((version) => {
          const config = statusConfig[version.status as keyof typeof statusConfig] || statusConfig.DRAFT;
          const isSelected = selectedVersionId === version.id || (!selectedVersionId && version === versions[0]);

          return (
            <div
              key={version.id}
              onClick={() => setSelectedVersionId(version.id)}
              className={clsx(
                'cursor-pointer rounded-lg border p-4 transition-all',
                isSelected
                  ? 'border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={clsx('w-2 h-2 rounded-full', config.dot)} />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    v{version.versionNumber}
                  </h3>
                </div>
                <span className={clsx('text-xs px-2 py-1 rounded font-medium border', config.color)}>
                  {config.label}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Created</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(version.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {version.publishedAt && (
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Published</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {new Date(version.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Version Details */}
      {selectedVersion && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Version {selectedVersion.versionNumber} Details
            </h2>
          </div>
          <div className="p-4 space-y-4">
            {/* State Machine Visualization */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                State Machine
              </h3>
              <div className="flex items-center gap-2">
                <StateBox label="DRAFT" active={selectedVersion.status === 'DRAFT'} clickable={selectedVersion.status === 'DRAFT'} />
                <Arrow active={selectedVersion.status === 'PUBLISHED' || selectedVersion.status === 'ARCHIVED'} />
                <StateBox label="PUBLISHED" active={selectedVersion.status === 'PUBLISHED'} clickable={selectedVersion.status === 'DRAFT'} />
                <Arrow active={selectedVersion.status === 'ARCHIVED'} />
                <StateBox label="ARCHIVED" active={selectedVersion.status === 'ARCHIVED'} />
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(`/evaluations/${evaluationId}/versions/${selectedVersion.id}/graph`)}
                  className="text-sm bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  Open in Graph Builder
                </button>

                {selectedVersion.status === 'DRAFT' && (
                  <>
                    <button
                      onClick={() => setConfirmAction({ type: 'publish', versionId: selectedVersion.id })}
                      disabled={publishMutation.isPending}
                      className="text-sm bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
                    >
                      Publish
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: 'clone-draft' })}
                      disabled={createVersionMutation.isPending}
                      className="text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Clone to New Version
                    </button>
                  </>
                )}

                {selectedVersion.status === 'PUBLISHED' && (
                  <button
                    onClick={() => setConfirmAction({ type: 'clone-published' })}
                    disabled={createVersionMutation.isPending}
                    className="text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Clone to New Version
                  </button>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Version ID</dt>
                  <dd className="text-gray-900 dark:text-gray-100 font-mono text-xs">{selectedVersion.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Created At</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {new Date(selectedVersion.createdAt).toLocaleString()}
                  </dd>
                </div>
                {selectedVersion.publishedAt && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Published At</dt>
                    <dd className="text-gray-900 dark:text-gray-100">
                      {new Date(selectedVersion.publishedAt).toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {versions.length === 0 && !versionsQuery.isLoading && (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-sm">No versions yet.</p>
          <p className="text-xs mt-1">Versions are created automatically when you create an evaluation.</p>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction?.type === 'publish'}
        title="Publish Version"
        message="Validate and publish this version? It will become immutable."
        confirmLabel="Publish"
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action && action.type === 'publish') {
            publishMutation.mutate(action.versionId);
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction?.type === 'clone-draft'}
        title="Create New Version"
        message="Create a new draft based on this version?"
        confirmLabel="Create"
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action && action.type === 'clone-draft') {
            createVersionMutation.mutate();
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction?.type === 'clone-published'}
        title="Create New Draft"
        message="Create a new draft from this published version?"
        confirmLabel="Create"
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action && action.type === 'clone-published') {
            createVersionMutation.mutate();
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

function StateBox({ label, active, clickable }: { label: string; active: boolean; clickable?: boolean }) {
  return (
    <div
      className={clsx(
        'px-3 py-1.5 rounded text-xs font-medium border',
        active
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700'
          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
        clickable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
      )}
    >
      {label}
    </div>
  );
}

function Arrow({ active }: { active: boolean }) {
  return (
    <div className={clsx('text-gray-300 dark:text-gray-600', active && 'text-blue-400 dark:text-blue-500')}>
      →
    </div>
  );
}
