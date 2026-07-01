const API_BASE = '/api';

/**
 * Reads the orgId from the current session.
 * In MVP, this uses a default dev org UUID. In production, this comes from auth.
 */
function getOrgId(): string {
  return (window as Window & { __orgId?: string }).__orgId ?? '00000000-0000-0000-0000-000000000001';
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Org-Id': getOrgId(),
  };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as T;
}

// ── Schemas ────────────────────────────────────────────────────────────────

export const schemasApi = {
  list: () => request<unknown[]>('GET', '/schemas'),
  get: (id: string) => request<unknown>('GET', `/schemas/${id}`),
  create: (data: { name: string; description?: string }) =>
    request<unknown>('POST', '/schemas', data),
  update: (id: string, data: { name?: string; description?: string }) =>
    request<unknown>('PATCH', `/schemas/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/schemas/${id}`),
  listFields: (schemaId: string) =>
    request<unknown[]>('GET', `/schemas/${schemaId}/fields`),
  createField: (schemaId: string, data: {
    key: string; displayName: string; dataType: string; description?: string;
  }) => request<unknown>('POST', `/schemas/${schemaId}/fields`, data),
  deleteField: (schemaId: string, fieldId: string) =>
    request<void>('DELETE', `/schemas/${schemaId}/fields/${fieldId}`),
};

// ── Evaluations ────────────────────────────────────────────────────────────

export const evaluationsApi = {
  list: () => request<unknown[]>('GET', '/evaluations'),
  get: (id: string) => request<unknown>('GET', `/evaluations/${id}`),
  create: (data: { schemaId: string; name: string; description?: string }) =>
    request<unknown>('POST', '/evaluations', data),
  listVersions: (evaluationId: string) =>
    request<unknown[]>('GET', `/evaluations/${evaluationId}/versions`),
  createVersion: (evaluationId: string) =>
    request<unknown>('POST', `/evaluations/${evaluationId}/versions`),
  publish: (evaluationId: string, versionId: string) =>
    request<unknown>('POST', `/evaluations/${evaluationId}/versions/${versionId}/publish`),
};

// ── Graph ──────────────────────────────────────────────────────────────────

export const graphApi = {
  get: (versionId: string) => request<{ nodes: unknown[]; edges: unknown[] }>('GET', `/versions/${versionId}/graph`),
  createNode: (versionId: string, data: {
    nodeType: string; label: string; config: Record<string, unknown>;
    positionX: number; positionY: number;
  }) => request<unknown>('POST', `/versions/${versionId}/graph/nodes`, data),
  updateNode: (versionId: string, nodeId: string, data: {
    label?: string; config?: Record<string, unknown>;
    positionX?: number; positionY?: number;
  }) => request<unknown>('PUT', `/versions/${versionId}/graph/nodes/${nodeId}`, data),
  deleteNode: (versionId: string, nodeId: string) =>
    request<void>('DELETE', `/versions/${versionId}/graph/nodes/${nodeId}`),
  createEdge: (versionId: string, data: {
    fromNodeId: string; fromPort: string; toNodeId: string; toPort: string;
  }) => request<unknown>('POST', `/versions/${versionId}/graph/edges`, data),
  deleteEdge: (versionId: string, edgeId: string) =>
    request<void>('DELETE', `/versions/${versionId}/graph/edges/${edgeId}`),
  validate: (versionId: string) =>
    request<{ valid: boolean; errors: unknown[] }>('POST', `/versions/${versionId}/graph/validate`),
};

// ── Executions ─────────────────────────────────────────────────────────────

export const executionsApi = {
  run: (data: { evaluationVersionId: string; inputValues: Record<string, unknown> }) =>
    request<unknown>('POST', '/executions', data),
  get: (id: string) => request<unknown>('GET', `/executions/${id}`),
  getTrace: (id: string) => request<unknown>('GET', `/executions/${id}/trace`),
};

// ── Plugins ─────────────────────────────────────────────────────────────────

export const pluginsApi = {
  list: () => request<unknown[]>('GET', '/plugins'),
  get: (type: string) => request<unknown>('GET', `/plugins/${type}`),
};

// ── Health ─────────────────────────────────────────────────────────────────

export const healthApi = {
  check: () => request<{ status: string; timestamp: string }>('GET', '/health'),
};
