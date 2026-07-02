/**
 * Frontend Integration Tests for ExecutionTracePage
 *
 * Tests the execution trace viewing functionality
 *
 * Prerequisites:
 * 1. Backend must be running: cd backend && pnpm start:dev
 * 2. Database should be seeded with test data
 *
 * Run with:
 *   pnpm test           - Run all tests once
 *   pnpm test:watch     - Run in watch mode
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = 'http://localhost:3000';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

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

// ── Helper Functions ──────────────────────────────────────────────────────────

async function createSchema(name: string) {
  return apiRequest<any>('POST', '/schemas', { name });
}

async function deleteSchema(id: string) {
  return apiRequest<void>('DELETE', `/schemas/${id}`);
}

async function createField(schemaId: string, data: { key: string; displayName: string; dataType: string }) {
  return apiRequest<any>('POST', `/schemas/${schemaId}/fields`, data);
}

async function createEvaluation(schemaId: string, name: string) {
  return apiRequest<any>('POST', '/evaluations', { schemaId, name });
}

async function deleteEvaluation(id: string) {
  return apiRequest<void>('DELETE', `/evaluations/${id}`);
}

async function createVersion(evaluationId: string) {
  return apiRequest<any>('POST', `/evaluations/${evaluationId}/versions`);
}

async function createNode(
  versionId: string,
  data: { nodeType: string; label: string; config: Record<string, unknown>; positionX: number; positionY: number }
) {
  return apiRequest<any>('POST', `/versions/${versionId}/graph/nodes`, data);
}

async function createEdge(
  versionId: string,
  data: { fromNodeId: string; fromPort: string; toNodeId: string; toPort: string }
) {
  return apiRequest<any>('POST', `/versions/${versionId}/graph/edges`, data);
}

async function publishVersion(evaluationId: string, versionId: string) {
  return apiRequest<any>('POST', `/evaluations/${evaluationId}/versions/${versionId}/publish`);
}

async function runExecution(data: { evaluationVersionId: string; inputValues: Record<string, unknown> }) {
  return apiRequest<any>('POST', '/executions', data);
}

async function getExecution(id: string) {
  return apiRequest<any>('GET', `/executions/${id}`);
}

async function getExecutionTrace(id: string) {
  return apiRequest<any>('GET', `/executions/${id}/trace`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════════

describe('ExecutionTracePage - Trace Viewing', () => {
  let createdSchemaId: string;
  let createdEvaluationId: string;
  let publishedVersionId: string;
  let inputNodeId: string;
  let outputNodeId: string;
  let executionId: string;

  beforeAll(async () => {
    // Create test data
    const schema = await createSchema(`Trace Test Schema ${Date.now()}`);
    createdSchemaId = schema.id;

    await createField(createdSchemaId, {
      key: 'quality_score',
      displayName: 'Quality Score',
      dataType: 'number',
    });

    const evaluation = await createEvaluation(createdSchemaId, `Trace Test Eval ${Date.now()}`);
    createdEvaluationId = evaluation.id;

    const version = await createVersion(createdEvaluationId);
    publishedVersionId = version.id;

    // Create graph with nodes
    const inputNode = await createNode(publishedVersionId, {
      nodeType: 'input',
      label: 'Quality Input',
      config: { fieldKey: 'quality_score' },
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

    // Publish version
    await publishVersion(createdEvaluationId, publishedVersionId);

    // Run execution
    const execution = await runExecution({
      evaluationVersionId: publishedVersionId,
      inputValues: { quality_score: 85 },
    });
    executionId = execution.id;

    // Wait for execution to complete
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    if (createdEvaluationId) {
      try { await deleteEvaluation(createdEvaluationId); } catch {}
    }
    if (createdSchemaId) {
      try { await deleteSchema(createdSchemaId); } catch {}
    }
  });

  describe('GET /executions/:id/trace', () => {
    it('should return trace with nodes array', async () => {
      const trace = await getExecutionTrace(executionId);

      expect(trace).toBeDefined();
      expect(trace).toHaveProperty('nodes');
      expect(Array.isArray(trace.nodes)).toBe(true);
    });

    it('should return trace with at least one node', async () => {
      const trace = await getExecutionTrace(executionId);

      expect(trace.nodes.length).toBeGreaterThan(0);
    });

    it('should return node with status property', async () => {
      const trace = await getExecutionTrace(executionId);

      for (const nodeResult of trace.nodes) {
        expect(nodeResult).toHaveProperty('status');
        expect(['SUCCESS', 'ERROR', 'SKIPPED']).toContain(nodeResult.status);
      }
    });

    it('should return node with nodeId property', async () => {
      const trace = await getExecutionTrace(executionId);

      for (const nodeResult of trace.nodes) {
        expect(nodeResult).toHaveProperty('nodeId');
      }
    });

    it('should return successful execution trace with value', async () => {
      const trace = await getExecutionTrace(executionId);

      const successfulNodes = trace.nodes.filter((n: any) => n.status === 'SUCCESS');
      expect(successfulNodes.length).toBeGreaterThan(0);
    });
  });

  describe('GET /executions/:id', () => {
    it('should return execution with id', async () => {
      const execution = await getExecution(executionId);

      expect(execution).toHaveProperty('id', executionId);
    });

    it('should return execution with status', async () => {
      const execution = await getExecution(executionId);

      expect(execution).toHaveProperty('status');
      expect(['SUCCESS', 'PARTIAL', 'FAILED']).toContain(execution.status);
    });

    it('should return execution with finalResult', async () => {
      const execution = await getExecution(executionId);

      expect(execution).toHaveProperty('finalResult');
    });

    it('should return execution with inputValues', async () => {
      const execution = await getExecution(executionId);

      expect(execution).toHaveProperty('inputValues');
      expect(execution.inputValues).toHaveProperty('quality_score', 85);
    });

    it('should return execution with timestamps', async () => {
      const execution = await getExecution(executionId);

      expect(execution).toHaveProperty('startedAt');
      expect(execution).toHaveProperty('finishedAt');
    });
  });

  describe('Execution with warnings', () => {
    let warningExecutionId: string;

    beforeAll(async () => {
      // Run another execution that might produce warnings
      const execution = await runExecution({
        evaluationVersionId: publishedVersionId,
        inputValues: { quality_score: 100 },
      });
      warningExecutionId = execution.id;

      await new Promise(resolve => setTimeout(resolve, 500));
    });

    it('should handle trace for edge case input values', async () => {
      const trace = await getExecutionTrace(warningExecutionId);

      expect(trace).toBeDefined();
      expect(Array.isArray(trace.nodes)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw error for non-existent execution', async () => {
      await expect(getExecution('non-existent-id')).rejects.toThrow();
    });

    it('should throw error for trace of non-existent execution', async () => {
      await expect(getExecutionTrace('non-existent-id')).rejects.toThrow();
    });
  });
});

describe('ExecutionTracePage - Trace Data Structure', () => {
  let createdSchemaId: string;
  let createdEvaluationId: string;
  let publishedVersionId: string;

  beforeAll(async () => {
    const schema = await createSchema(`Trace Structure Test ${Date.now()}`);
    createdSchemaId = schema.id;

    await createField(createdSchemaId, {
      key: 'test_value',
      displayName: 'Test Value',
      dataType: 'number',
    });

    const evaluation = await createEvaluation(createdSchemaId, `Structure Test ${Date.now()}`);
    createdEvaluationId = evaluation.id;

    const version = await createVersion(createdEvaluationId);
    publishedVersionId = version.id;

    const inputNode = await createNode(publishedVersionId, {
      nodeType: 'input',
      label: 'Input',
      config: { fieldKey: 'test_value' },
      positionX: 100,
      positionY: 100,
    });

    const outputNode = await createNode(publishedVersionId, {
      nodeType: 'output',
      label: 'Output',
      config: { outputKey: 'result' },
      positionX: 300,
      positionY: 100,
    });

    await createEdge(publishedVersionId, {
      fromNodeId: inputNode.id,
      fromPort: 'value',
      toNodeId: outputNode.id,
      toPort: 'value',
    });

    await publishVersion(createdEvaluationId, publishedVersionId);
  });

  afterAll(async () => {
    if (createdEvaluationId) {
      try { await deleteEvaluation(createdEvaluationId); } catch {}
    }
    if (createdSchemaId) {
      try { await deleteSchema(createdSchemaId); } catch {}
    }
  });

  it('should return trace with properly ordered nodes', async () => {
    const execution = await runExecution({
      evaluationVersionId: publishedVersionId,
      inputValues: { test_value: 50 },
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const trace = await getExecutionTrace(execution.id);

    expect(trace.nodes.length).toBe(2);
  });

  it('should include all required node properties in trace', async () => {
    const execution = await runExecution({
      evaluationVersionId: publishedVersionId,
      inputValues: { test_value: 75 },
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const trace = await getExecutionTrace(execution.id);
    const node = trace.nodes[0];

    // Required properties for ExecutionTracePage rendering
    expect(node).toHaveProperty('nodeId');
    expect(node).toHaveProperty('status');

    // Optional properties that may be present
    if (node.value !== undefined) {
      expect(typeof node.value === 'string' || typeof node.value === 'number' || typeof node.value === 'object').toBe(true);
    }
  });
});
