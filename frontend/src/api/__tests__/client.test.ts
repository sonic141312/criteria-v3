/**
 * Frontend API Integration Tests
 * 
 * These tests make actual HTTP calls to the backend API at http://localhost:3000
 * 
 * Prerequisites:
 * 1. Backend must be running: cd backend && pnpm start:dev
 * 2. Database must be seeded with test data
 * 
 * Run with: 
 *   pnpm test           - Run all tests once
 *   pnpm test:watch     - Run in watch mode
 *   pnpm test:coverage  - With coverage report
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

const BASE_URL = 'http://localhost:3000';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

// Helper function to make API calls (replicating the client logic)
async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Org-Id': ORG_ID,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? 'Request failed');
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ── Health API ──────────────────────────────────────────────────────────────

async function healthCheck() {
  return apiRequest<{ status: string; timestamp: string }>('GET', '/health');
}

// ── Schemas API ────────────────────────────────────────────────────────────

async function listSchemas() {
  return apiRequest<any[]>('GET', '/schemas');
}

async function getSchema(id: string) {
  return apiRequest<any>('GET', `/schemas/${id}`);
}

async function createSchema(data: { name: string; description?: string }) {
  return apiRequest<any>('POST', '/schemas', data);
}

async function updateSchema(id: string, data: { name?: string; description?: string }) {
  return apiRequest<any>('PATCH', `/schemas/${id}`, data);
}

async function deleteSchema(id: string) {
  return apiRequest<void>('DELETE', `/schemas/${id}`);
}

async function listFields(schemaId: string) {
  return apiRequest<any[]>('GET', `/schemas/${schemaId}/fields`);
}

async function createField(
  schemaId: string,
  data: { key: string; displayName: string; dataType: string; description?: string }
) {
  return apiRequest<any>('POST', `/schemas/${schemaId}/fields`, data);
}

async function deleteField(schemaId: string, fieldId: string) {
  return apiRequest<void>('DELETE', `/schemas/${schemaId}/fields/${fieldId}`);
}

// ── Evaluations API ────────────────────────────────────────────────────────

async function listEvaluations() {
  return apiRequest<any[]>('GET', '/evaluations');
}

async function getEvaluation(id: string) {
  return apiRequest<any>('GET', `/evaluations/${id}`);
}

async function createEvaluation(data: { schemaId: string; name: string; description?: string }) {
  return apiRequest<any>('POST', '/evaluations', data);
}

async function updateEvaluation(id: string, data: { name?: string; description?: string }) {
  return apiRequest<any>('PATCH', `/evaluations/${id}`, data);
}

async function deleteEvaluation(id: string) {
  return apiRequest<void>('DELETE', `/evaluations/${id}`);
}

async function listVersions(evaluationId: string) {
  return apiRequest<any[]>('GET', `/evaluations/${evaluationId}/versions`);
}

async function createVersion(evaluationId: string) {
  return apiRequest<any>('POST', `/evaluations/${evaluationId}/versions`);
}

async function publishVersion(evaluationId: string, versionId: string) {
  return apiRequest<any>('POST', `/evaluations/${evaluationId}/versions/${versionId}/publish`);
}

// ── Graph API ──────────────────────────────────────────────────────────────

async function getGraph(versionId: string) {
  return apiRequest<{ nodes: any[]; edges: any[] }>('GET', `/versions/${versionId}/graph`);
}

async function createNode(
  versionId: string,
  data: {
    nodeType: string;
    label: string;
    config: Record<string, unknown>;
    positionX: number;
    positionY: number;
  }
) {
  return apiRequest<any>('POST', `/versions/${versionId}/graph/nodes`, data);
}

async function updateNode(
  versionId: string,
  nodeId: string,
  data: { label?: string; config?: Record<string, unknown>; positionX?: number; positionY?: number }
) {
  return apiRequest<any>('PUT', `/versions/${versionId}/graph/nodes/${nodeId}`, data);
}

async function deleteNode(versionId: string, nodeId: string) {
  return apiRequest<void>('DELETE', `/versions/${versionId}/graph/nodes/${nodeId}`);
}

async function createEdge(
  versionId: string,
  data: { fromNodeId: string; fromPort: string; toNodeId: string; toPort: string }
) {
  return apiRequest<any>('POST', `/versions/${versionId}/graph/edges`, data);
}

async function deleteEdge(versionId: string, edgeId: string) {
  return apiRequest<void>('DELETE', `/versions/${versionId}/graph/edges/${edgeId}`);
}

async function validateGraph(versionId: string) {
  return apiRequest<{ valid: boolean; errors: any[] }>('POST', `/versions/${versionId}/graph/validate`);
}

// ── Executions API ─────────────────────────────────────────────────────────

async function runExecution(data: { evaluationVersionId: string; inputValues: Record<string, unknown> }) {
  return apiRequest<any>('POST', '/executions', data);
}

async function getExecution(id: string) {
  return apiRequest<any>('GET', `/executions/${id}`);
}

async function getExecutionTrace(id: string) {
  return apiRequest<any>('GET', `/executions/${id}/trace`);
}

// ── Plugins API ────────────────────────────────────────────────────────────

async function listPlugins() {
  return apiRequest<any[]>('GET', '/plugins');
}

async function getPlugin(type: string) {
  return apiRequest<any>('GET', `/plugins/${type}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Health API', () => {
  it('GET /health - should return ok status', async () => {
    const result = await healthCheck();
    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
  });
});

describe('Schemas API', () => {
  let createdSchemaId: string;
  let createdFieldId: string;

  it('GET /schemas - should return list of schemas', async () => {
    const schemas = await listSchemas();
    expect(Array.isArray(schemas)).toBe(true);
    expect(schemas.length).toBeGreaterThan(0);
  });

  it('POST /schemas - should create a new schema', async () => {
    const newSchema = await createSchema({
      name: `Test Schema ${Date.now()}`,
      description: 'Test description',
    });
    expect(newSchema).toHaveProperty('id');
    expect(newSchema).toHaveProperty('name');
    createdSchemaId = newSchema.id;
  });

  it('GET /schemas/:id - should return specific schema', async () => {
    const schema = await getSchema(createdSchemaId);
    expect(schema).toHaveProperty('id', createdSchemaId);
  });

  it('PATCH /schemas/:id - should update schema', async () => {
    await updateSchema(createdSchemaId, {
      name: 'Updated Schema Name',
    });
    // Verify update by fetching
    const updated = await getSchema(createdSchemaId);
    expect(updated).toHaveProperty('name', 'Updated Schema Name');
  });

  it('POST /schemas/:id/fields - should create a field', async () => {
    const field = await createField(createdSchemaId, {
      key: `field_${Date.now()}`,
      displayName: 'Test Field',
      dataType: 'number',
      description: 'Test field description',
    });
    expect(field).toHaveProperty('id');
    createdFieldId = field.id;
  });

  it('GET /schemas/:id/fields - should list fields', async () => {
    const fields = await listFields(createdSchemaId);
    expect(Array.isArray(fields)).toBe(true);
    expect(fields.length).toBeGreaterThan(0);
  });

  it('DELETE /schemas/:id/fields/:fieldId - should delete field', async () => {
    await deleteField(createdSchemaId, createdFieldId);
    const fields = await listFields(createdSchemaId);
    const deleted = fields.find(f => f.id === createdFieldId);
    expect(deleted).toBeUndefined();
  });

  it('DELETE /schemas/:id - should delete schema', async () => {
    await deleteSchema(createdSchemaId);
  });
});

describe('Evaluations API', () => {
  let createdSchemaId: string;
  let createdEvaluationId: string;
  let createdVersionId: string;

  beforeAll(async () => {
    const schema = await createSchema({
      name: `Test Eval Schema ${Date.now()}`,
    });
    createdSchemaId = schema.id;
  });

  it('GET /evaluations - should return list of evaluations', async () => {
    const evaluations = await listEvaluations();
    expect(Array.isArray(evaluations)).toBe(true);
  });

  it('POST /evaluations - should create a new evaluation', async () => {
    const evaluation = await createEvaluation({
      schemaId: createdSchemaId,
      name: `Test Evaluation ${Date.now()}`,
      description: 'Test evaluation',
    });
    expect(evaluation).toHaveProperty('id');
    createdEvaluationId = evaluation.id;
  });

  it('GET /evaluations/:id - should return specific evaluation', async () => {
    const evaluation = await getEvaluation(createdEvaluationId);
    expect(evaluation).toHaveProperty('id', createdEvaluationId);
  });

  it('PATCH /evaluations/:id - should update evaluation', async () => {
    await updateEvaluation(createdEvaluationId, {
      name: 'Updated Evaluation Name',
    });
    // Verify update by fetching
    const updated = await getEvaluation(createdEvaluationId);
    expect(updated).toHaveProperty('name', 'Updated Evaluation Name');
  });

  it('GET /evaluations/:id/versions - should list versions', async () => {
    const versions = await listVersions(createdEvaluationId);
    expect(Array.isArray(versions)).toBe(true);
  });

  it('POST /evaluations/:id/versions - should create new version', async () => {
    const version = await createVersion(createdEvaluationId);
    expect(version).toHaveProperty('id');
    createdVersionId = version.id;
  });

  it('POST /evaluations/:id/versions/:vId/publish - should publish version with output node', async () => {
    // Add output node before publishing
    await createNode(createdVersionId, {
      nodeType: 'output',
      label: 'Test Output',
      config: { outputKey: 'result' },
      positionX: 300,
      positionY: 100,
    });
    const published = await publishVersion(createdEvaluationId, createdVersionId);
    expect(published).toHaveProperty('status', 'PUBLISHED');
  });

  afterAll(async () => {
    if (createdEvaluationId) {
      try { await deleteEvaluation(createdEvaluationId); } catch {}
    }
    if (createdSchemaId) {
      try { await deleteSchema(createdSchemaId); } catch {}
    }
  });
});

describe('Graph API', () => {
  let createdSchemaId: string;
  let createdEvaluationId: string;
  let createdVersionId: string;
  let createdNodeId: string;

  beforeAll(async () => {
    const schema = await createSchema({
      name: `Graph Test Schema ${Date.now()}`,
    });
    createdSchemaId = schema.id;

    await createField(createdSchemaId, {
      key: 'test_score',
      displayName: 'Test Score',
      dataType: 'number',
    });

    const evaluation = await createEvaluation({
      schemaId: createdSchemaId,
      name: `Graph Test Eval ${Date.now()}`,
    });
    createdEvaluationId = evaluation.id;

    const version = await createVersion(createdEvaluationId);
    createdVersionId = version.id;
  });

  it('GET /versions/:vId/graph - should return empty graph', async () => {
    const graph = await getGraph(createdVersionId);
    expect(graph).toHaveProperty('nodes');
    expect(graph).toHaveProperty('edges');
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);
    expect(graph.nodes.length).toBe(0);
  });

  it('POST /versions/:vId/graph/nodes - should create input node with fieldKey', async () => {
    const node = await createNode(createdVersionId, {
      nodeType: 'input',
      label: 'Test Input',
      config: { fieldKey: 'test_score' },
      positionX: 100,
      positionY: 100,
    });
    expect(node).toHaveProperty('id');
    expect(node).toHaveProperty('nodeType', 'input');
    expect(node).toHaveProperty('config');
    expect(node.config.fieldKey).toBe('test_score');
    createdNodeId = node.id;
  });

  it('POST /versions/:vId/graph/nodes - should create normalize node', async () => {
    const node = await createNode(createdVersionId, {
      nodeType: 'normalize',
      label: 'Test Normalize',
      config: { min: 0, max: 100 },
      positionX: 250,
      positionY: 100,
    });
    expect(node).toHaveProperty('id');
    expect(node).toHaveProperty('nodeType', 'normalize');
  });

  it('POST /versions/:vId/graph/nodes - should create output node', async () => {
    const node = await createNode(createdVersionId, {
      nodeType: 'output',
      label: 'Test Output',
      config: { outputKey: 'final_score' },
      positionX: 400,
      positionY: 100,
    });
    expect(node).toHaveProperty('id');
    expect(node).toHaveProperty('nodeType', 'output');
  });

  it('PUT /versions/:vId/graph/nodes/:nodeId - should update node', async () => {
    await updateNode(createdVersionId, createdNodeId, {
      label: 'Updated Node Label',
      config: { fieldKey: 'updated_score' },
    });
    // Verify update by fetching graph
    const graph = await getGraph(createdVersionId);
    const updatedNode = graph.nodes.find(n => n.id === createdNodeId);
    expect(updatedNode).toHaveProperty('label', 'Updated Node Label');
    expect(updatedNode?.config.fieldKey).toBe('updated_score');
  });

  it('POST /versions/:vId/graph/edges - should create edge', async () => {
    const graph = await getGraph(createdVersionId);
    const inputNode = graph.nodes.find(n => n.nodeType === 'input');
    const normalizeNode = graph.nodes.find(n => n.nodeType === 'normalize');

    const edge = await createEdge(createdVersionId, {
      fromNodeId: inputNode.id,
      fromPort: 'value',
      toNodeId: normalizeNode.id,
      toPort: 'value',
    });
    expect(edge).toHaveProperty('id');
  });

  it('POST /versions/:vId/graph/validate - should validate graph', async () => {
    const result = await validateGraph(createdVersionId);
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('DELETE /versions/:vId/graph/edges/:edgeId - should delete edge', async () => {
    const graph = await getGraph(createdVersionId);
    const edgeToDelete = graph.edges[0];
    await deleteEdge(createdVersionId, edgeToDelete.id);
  });

  it('DELETE /versions/:vId/graph/nodes/:nodeId - should delete node', async () => {
    await deleteNode(createdVersionId, createdNodeId);
    const graph = await getGraph(createdVersionId);
    const node = graph.nodes.find(n => n.id === createdNodeId);
    expect(node).toBeUndefined();
  });

  afterAll(async () => {
    if (createdEvaluationId) {
      try { await deleteEvaluation(createdEvaluationId); } catch {}
    }
    if (createdSchemaId) {
      try { await deleteSchema(createdSchemaId); } catch {}
    }
  });
});

describe('Executions API', () => {
  let createdSchemaId: string;
  let createdEvaluationId: string;
  let publishedVersionId: string;
  let inputNodeId: string;
  let outputNodeId: string;

  beforeAll(async () => {
    const schema = await createSchema({
      name: `Exec Test Schema ${Date.now()}`,
    });
    createdSchemaId = schema.id;

    await createField(createdSchemaId, {
      key: 'score',
      displayName: 'Score',
      dataType: 'number',
    });

    const evaluation = await createEvaluation({
      schemaId: createdSchemaId,
      name: `Exec Test Eval ${Date.now()}`,
    });
    createdEvaluationId = evaluation.id;

    const version = await createVersion(createdEvaluationId);
    publishedVersionId = version.id;

    const inputNode = await createNode(publishedVersionId, {
      nodeType: 'input',
      label: 'Score Input',
      config: { fieldKey: 'score' },
      positionX: 100,
      positionY: 100,
    });
    inputNodeId = inputNode.id;

    const outputNode = await createNode(publishedVersionId, {
      nodeType: 'output',
      label: 'Final Result',
      config: { outputKey: 'result' },
      positionX: 300,
      positionY: 100,
    });
    outputNodeId = outputNode.id;

    await createEdge(publishedVersionId, {
      fromNodeId: inputNodeId,
      fromPort: 'value',
      toNodeId: outputNodeId,
      toPort: 'value',
    });

    await publishVersion(createdEvaluationId, publishedVersionId);
  });

  it('POST /executions - should run execution', async () => {
    const execution = await runExecution({
      evaluationVersionId: publishedVersionId,
      inputValues: { score: 85 },
    });
    expect(execution).toHaveProperty('id');
    expect(execution).toHaveProperty('status');
  });

  it('GET /executions/:id - should get execution result', async () => {
    const execution = await runExecution({
      evaluationVersionId: publishedVersionId,
      inputValues: { score: 75 },
    });

    // Wait for execution to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await getExecution(execution.id);
    expect(result).toHaveProperty('id', execution.id);
  });

  it('GET /executions/:id/trace - should get execution trace', async () => {
    const execution = await runExecution({
      evaluationVersionId: publishedVersionId,
      inputValues: { score: 90 },
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const trace = await getExecutionTrace(execution.id);
    expect(trace).toBeDefined();
  });

  afterAll(async () => {
    if (createdEvaluationId) {
      try { await deleteEvaluation(createdEvaluationId); } catch {}
    }
    if (createdSchemaId) {
      try { await deleteSchema(createdSchemaId); } catch {}
    }
  });
});

describe('Plugins API', () => {
  it('GET /plugins - should return list of plugins', async () => {
    const plugins = await listPlugins();
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins.length).toBeGreaterThan(0);
  });

  it('GET /plugins/:type - should return input plugin with config schema', async () => {
    const plugin = await getPlugin('input');
    expect(plugin).toHaveProperty('type', 'input');
    expect(plugin).toHaveProperty('configSchema');
  });

  it('GET /plugins/:type - should return normalize plugin', async () => {
    const plugin = await getPlugin('normalize');
    expect(plugin).toHaveProperty('type', 'normalize');
  });

  it('GET /plugins/:type - should return threshold plugin', async () => {
    const plugin = await getPlugin('threshold');
    expect(plugin).toHaveProperty('type', 'threshold');
  });

  it('GET /plugins/:type - should return weighted_average plugin', async () => {
    const plugin = await getPlugin('weighted_average');
    expect(plugin).toHaveProperty('type', 'weighted_average');
  });

  it('GET /plugins/:type - should return formula plugin', async () => {
    const plugin = await getPlugin('formula');
    expect(plugin).toHaveProperty('type', 'formula');
  });

  it('GET /plugins/:type - should return output plugin', async () => {
    const plugin = await getPlugin('output');
    expect(plugin).toHaveProperty('type', 'output');
  });
});

describe('Error Handling', () => {
  it('should throw error for non-existent schema', async () => {
    await expect(getSchema('non-existent-id')).rejects.toThrow();
  });

  it('should throw error for non-existent evaluation', async () => {
    await expect(getEvaluation('non-existent-id')).rejects.toThrow();
  });

  it('should throw error for non-existent graph', async () => {
    await expect(getGraph('non-existent-id')).rejects.toThrow();
  });

  it('should throw error for non-existent execution', async () => {
    await expect(getExecution('non-existent-id')).rejects.toThrow();
  });

  it('should throw error for non-existent plugin', async () => {
    await expect(getPlugin('non-existent-plugin')).rejects.toThrow();
  });
});

describe('X-Org-Id Header Validation', () => {
  it('should require valid X-Org-Id header', async () => {
    const schemas = await listSchemas();
    expect(Array.isArray(schemas)).toBe(true);
  });

  it('schemas should belong to correct organization', async () => {
    const schemas = await listSchemas();
    const schema = schemas[0];
    expect(schema.organizationId).toBe(ORG_ID);
  });
});
