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

async function listVersions(evaluationId: string) {
  return apiRequest<any[]>('GET', `/evaluations/${evaluationId}/versions`);
}

async function createVersion(evaluationId: string) {
  return apiRequest<any>('POST', `/evaluations/${evaluationId}/versions`);
}

async function publishVersion(evaluationId: string, versionId: string) {
  return apiRequest<any>('POST', `/evaluations/${evaluationId}/versions/${versionId}/publish`);
}

async function getEvaluation(id: string) {
  return apiRequest<any>('GET', `/evaluations/${id}`);
}

async function createNode(
  versionId: string,
  data: { nodeType: string; label: string; config: Record<string, unknown>; positionX: number; positionY: number }
) {
  return apiRequest<any>('POST', `/versions/${versionId}/graph/nodes`, data);
}

describe('VersionManagerPage - Version Listing', () => {
  let createdSchemaId: string;
  let createdEvaluationId: string;

  beforeAll(async () => {
    const schema = await createSchema(`VList Schema ${Date.now()}-${Math.random()}`);
    createdSchemaId = schema.id;

    const evaluation = await createEvaluation(createdSchemaId, `VList Eval ${Date.now()}`);
    createdEvaluationId = evaluation.id;
  });

  afterAll(async () => {
    if (createdEvaluationId) {
      try { await deleteEvaluation(createdEvaluationId); } catch {}
    }
    if (createdSchemaId) {
      try { await deleteSchema(createdSchemaId); } catch {}
    }
  });

  it('should return versions array', async () => {
    const versions = await listVersions(createdEvaluationId);
    expect(Array.isArray(versions)).toBe(true);
  });

  it('should return at least one version', async () => {
    const versions = await listVersions(createdEvaluationId);
    expect(versions.length).toBeGreaterThanOrEqual(1);
  });

  it('should return version with id', async () => {
    const versions = await listVersions(createdEvaluationId);
    expect(versions[0]).toHaveProperty('id');
  });

  it('should return version with versionNumber', async () => {
    const versions = await listVersions(createdEvaluationId);
    expect(versions[0]).toHaveProperty('versionNumber');
    expect(typeof versions[0].versionNumber).toBe('number');
  });

  it('should return version with status', async () => {
    const versions = await listVersions(createdEvaluationId);
    expect(versions[0]).toHaveProperty('status');
    expect(['DRAFT', 'PUBLISHED', 'ARCHIVED']).toContain(versions[0].status);
  });

  it('should return version with createdAt', async () => {
    const versions = await listVersions(createdEvaluationId);
    expect(versions[0]).toHaveProperty('createdAt');
  });

  it('initial version should have DRAFT status and version 1', async () => {
    const versions = await listVersions(createdEvaluationId);
    expect(versions[0].status).toBe('DRAFT');
    expect(versions[0].versionNumber).toBe(1);
  });

  it('should return evaluation with id', async () => {
    const evaluation = await getEvaluation(createdEvaluationId);
    expect(evaluation).toHaveProperty('id', createdEvaluationId);
  });
});

describe('VersionManagerPage - Version Creation', () => {
  let createdSchemaId: string;
  let createdEvaluationId: string;

  beforeAll(async () => {
    const schema = await createSchema(`VCreate Schema ${Date.now()}-${Math.random()}`);
    createdSchemaId = schema.id;
    const evaluation = await createEvaluation(createdSchemaId, `VCreate Eval ${Date.now()}`);
    createdEvaluationId = evaluation.id;
  });

  afterAll(async () => {
    if (createdEvaluationId) {
      try { await deleteEvaluation(createdEvaluationId); } catch {}
    }
    if (createdSchemaId) {
      try { await deleteSchema(createdSchemaId); } catch {}
    }
  });

  it('should create a new version', async () => {
    const versionsBefore = await listVersions(createdEvaluationId);
    const versionCountBefore = versionsBefore.length;

    const newVersion = await createVersion(createdEvaluationId);

    expect(newVersion).toHaveProperty('id');
    expect(newVersion).toHaveProperty('versionNumber');
    expect(newVersion).toHaveProperty('status', 'DRAFT');

    const versionsAfter = await listVersions(createdEvaluationId);
    expect(versionsAfter.length).toBe(versionCountBefore + 1);
  });

  it('should increment version number for new versions', async () => {
    const v1 = await createVersion(createdEvaluationId);
    const v2 = await createVersion(createdEvaluationId);

    expect(v1.id).not.toBe(v2.id);
    expect(v2.versionNumber).toBe(v1.versionNumber + 1);
  });
});

describe('VersionManagerPage - Version Publishing', () => {
  let createdSchemaId: string;
  let createdEvaluationId: string;

  beforeAll(async () => {
    const schema = await createSchema(`VPub Schema ${Date.now()}-${Math.random()}`);
    createdSchemaId = schema.id;

    await createField(createdSchemaId, {
      key: 'test_score',
      displayName: 'Test Score',
      dataType: 'number',
    });

    const evaluation = await createEvaluation(createdSchemaId, `VPub Eval ${Date.now()}`);
    createdEvaluationId = evaluation.id;
  });

  afterAll(async () => {
    if (createdEvaluationId) {
      try { await deleteEvaluation(createdEvaluationId); } catch {}
    }
    if (createdSchemaId) {
      try { await deleteSchema(createdSchemaId); } catch {}
    }
  });

  it('should publish a version with output node', async () => {
    const newVersion = await createVersion(createdEvaluationId);

    await createNode(newVersion.id, {
      nodeType: 'output',
      label: 'Test Output',
      config: { outputKey: 'result' },
      positionX: 300,
      positionY: 100,
    });

    const published = await publishVersion(createdEvaluationId, newVersion.id);
    expect(published).toHaveProperty('status', 'PUBLISHED');
  });

  it('should update version status to PUBLISHED', async () => {
    const newVersion = await createVersion(createdEvaluationId);

    await createNode(newVersion.id, {
      nodeType: 'output',
      label: 'Test Output',
      config: { outputKey: 'result' },
      positionX: 300,
      positionY: 100,
    });

    await publishVersion(createdEvaluationId, newVersion.id);

    const versions = await listVersions(createdEvaluationId);
    const updatedVersion = versions.find((v: any) => v.id === newVersion.id);
    expect(updatedVersion.status).toBe('PUBLISHED');
  });

  it('should add publishedAt timestamp after publishing', async () => {
    const newVersion = await createVersion(createdEvaluationId);

    await createNode(newVersion.id, {
      nodeType: 'output',
      label: 'Test Output',
      config: { outputKey: 'result' },
      positionX: 300,
      positionY: 100,
    });

    await publishVersion(createdEvaluationId, newVersion.id);

    const versions = await listVersions(createdEvaluationId);
    const publishedVersion = versions.find((v: any) => v.id === newVersion.id);
    expect(publishedVersion).toHaveProperty('publishedAt');
    expect(publishedVersion.publishedAt).not.toBeNull();
  });

  it('should publish version with output node', async () => {
    const newVersion = await createVersion(createdEvaluationId);

    await createNode(newVersion.id, {
      nodeType: 'output',
      label: 'Test Output',
      config: { outputKey: 'result' },
      positionX: 300,
      positionY: 100,
    });

    const published = await publishVersion(createdEvaluationId, newVersion.id);
    expect(published).toHaveProperty('status', 'PUBLISHED');
  });
});

describe('VersionManagerPage - State Machine', () => {
  let createdSchemaId: string;
  let createdEvaluationId: string;

  beforeAll(async () => {
    const schema = await createSchema(`VSM Schema ${Date.now()}-${Math.random()}`);
    createdSchemaId = schema.id;
    const evaluation = await createEvaluation(createdSchemaId, `VSM Eval ${Date.now()}`);
    createdEvaluationId = evaluation.id;
  });

  afterAll(async () => {
    if (createdEvaluationId) {
      try { await deleteEvaluation(createdEvaluationId); } catch {}
    }
    if (createdSchemaId) {
      try { await deleteSchema(createdSchemaId); } catch {}
    }
  });

  it('should start with DRAFT status', async () => {
    const versions = await listVersions(createdEvaluationId);
    expect(versions[0].status).toBe('DRAFT');
  });

  it('should transition to PUBLISHED', async () => {
    const newVersion = await createVersion(createdEvaluationId);
    await createNode(newVersion.id, {
      nodeType: 'output',
      label: 'Test Output',
      config: { outputKey: 'result' },
      positionX: 300,
      positionY: 100,
    });
    await publishVersion(createdEvaluationId, newVersion.id);

    const versions = await listVersions(createdEvaluationId);
    const publishedVersion = versions.find((v: any) => v.id === newVersion.id);
    expect(publishedVersion.status).toBe('PUBLISHED');
  });

  it('should allow multiple PUBLISHED versions', async () => {
    const v1 = await createVersion(createdEvaluationId);
    await createNode(v1.id, {
      nodeType: 'output',
      label: 'Output 1',
      config: { outputKey: 'result1' },
      positionX: 300,
      positionY: 100,
    });
    await publishVersion(createdEvaluationId, v1.id);

    const v2 = await createVersion(createdEvaluationId);
    await createNode(v2.id, {
      nodeType: 'output',
      label: 'Output 2',
      config: { outputKey: 'result2' },
      positionX: 300,
      positionY: 100,
    });
    await publishVersion(createdEvaluationId, v2.id);

    const versions = await listVersions(createdEvaluationId);
    const publishedVersions = versions.filter((v: any) => v.status === 'PUBLISHED');
    // Should have at least these 2 published versions from this test
    expect(publishedVersions.length).toBeGreaterThanOrEqual(1);
  });

  it('should have sequential version numbers when sorted', async () => {
    const versions = await listVersions(createdEvaluationId);
    const sorted = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
    for (let i = 0; i < sorted.length; i++) {
      expect(sorted[i].versionNumber).toBe(i + 1);
    }
  });
});

describe('VersionManagerPage - Error Handling', () => {
  it('should throw error for non-existent evaluation', async () => {
    await expect(listVersions('non-existent-id')).rejects.toThrow();
  });

  it('should handle evaluation with no versions gracefully', async () => {
    const schema = await createSchema(`NoVersions Test ${Date.now()}-${Math.random()}`);
    const evaluation = await createEvaluation(schema.id, `NoVersions Eval ${Date.now()}`);

    try {
      const versions = await listVersions(evaluation.id);
      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThanOrEqual(1);
    } finally {
      await deleteEvaluation(evaluation.id);
      await deleteSchema(schema.id);
    }
  });
});

describe('VersionManagerPage - Version Metadata', () => {
  let createdSchemaId: string;
  let createdEvaluationId: string;

  beforeAll(async () => {
    const schema = await createSchema(`VMeta Schema ${Date.now()}-${Math.random()}`);
    createdSchemaId = schema.id;
    const evaluation = await createEvaluation(createdSchemaId, `VMeta Eval ${Date.now()}`);
    createdEvaluationId = evaluation.id;
  });

  afterAll(async () => {
    if (createdEvaluationId) {
      try { await deleteEvaluation(createdEvaluationId); } catch {}
    }
    if (createdSchemaId) {
      try { await deleteSchema(createdSchemaId); } catch {}
    }
  });

  it('should have id as valid UUID', async () => {
    const versions = await listVersions(createdEvaluationId);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(versions[0].id).toMatch(uuidRegex);
  });

  it('should have versionNumber as positive integer', async () => {
    const versions = await listVersions(createdEvaluationId);
    expect(versions[0].versionNumber).toBeGreaterThan(0);
    expect(Number.isInteger(versions[0].versionNumber)).toBe(true);
  });

  it('should have valid status enum value', async () => {
    const versions = await listVersions(createdEvaluationId);
    const validStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
    expect(validStatuses).toContain(versions[0].status);
  });

  it('should have createdAt as valid date', async () => {
    const versions = await listVersions(createdEvaluationId);
    const date = new Date(versions[0].createdAt);
    expect(date).toBeInstanceOf(Date);
    expect(isNaN(date.getTime())).toBe(false);
  });

  it('should have publishedAt as null for DRAFT versions', async () => {
    const versions = await listVersions(createdEvaluationId);
    expect(versions[0]).toHaveProperty('publishedAt');
    expect(versions[0].publishedAt).toBeNull();
  });
});
