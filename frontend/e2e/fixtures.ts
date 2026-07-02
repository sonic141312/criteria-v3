import { test as base, Page } from '@playwright/test';

/**
 * Shared Fixtures for E2E Tests
 *
 * These fixtures provide common setup and utilities for testing
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

// Custom fixture type
interface Fixtures {
  apiBase: string;
  orgId: string;
}

// Extend Playwright test with custom fixtures
export const test = base.extend<Fixtures>({
  apiBase: API_URL,
  orgId: ORG_ID,
});

export { expect } from '@playwright/test';

/**
 * API Helper Functions for E2E Tests
 */
export async function createSchemaAPI(page: Page, name: string): Promise<string> {
  const response = await page.request.fetch(`${API_URL}/schemas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Org-Id': ORG_ID,
    },
    data: { name },
  });
  const data = await response.json();
  return data.id;
}

export async function createFieldAPI(
  page: Page,
  schemaId: string,
  data: { key: string; displayName: string; dataType: string }
): Promise<string> {
  const response = await page.request.fetch(`${API_URL}/schemas/${schemaId}/fields`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Org-Id': ORG_ID,
    },
    data,
  });
  const result = await response.json();
  return result.id;
}

export async function updateFieldAPI(
  page: Page,
  schemaId: string,
  fieldId: string,
  data: { displayName?: string; description?: string }
): Promise<void> {
  await page.request.fetch(`${API_URL}/schemas/${schemaId}/fields/${fieldId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Org-Id': ORG_ID,
    },
    data,
  });
}

export async function createEvaluationAPI(
  page: Page,
  schemaId: string,
  name: string
): Promise<string> {
  const response = await page.request.fetch(`${API_URL}/evaluations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Org-Id': ORG_ID,
    },
    data: { schemaId, name },
  });
  const data = await response.json();
  return data.id;
}

export async function createVersionAPI(
  page: Page,
  evaluationId: string
): Promise<string> {
  const response = await page.request.fetch(
    `${API_URL}/evaluations/${evaluationId}/versions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Org-Id': ORG_ID,
      },
    }
  );
  const data = await response.json();
  return data.id;
}

export async function publishVersionAPI(
  page: Page,
  evaluationId: string,
  versionId: string
): Promise<void> {
  await page.request.fetch(
    `${API_URL}/evaluations/${evaluationId}/versions/${versionId}/publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Org-Id': ORG_ID,
      },
    }
  );
}

export async function deleteSchemaAPI(page: Page, schemaId: string): Promise<void> {
  await page.request.fetch(`${API_URL}/schemas/${schemaId}`, {
    method: 'DELETE',
    headers: {
      'X-Org-Id': ORG_ID,
    },
  });
}

export async function deleteEvaluationAPI(
  page: Page,
  evaluationId: string
): Promise<void> {
  await page.request.fetch(`${API_URL}/evaluations/${evaluationId}`, {
    method: 'DELETE',
    headers: {
      'X-Org-Id': ORG_ID,
    },
  });
}

export async function createNodeAPI(
  page: Page,
  versionId: string,
  data: {
    nodeType: string;
    label: string;
    config: Record<string, unknown>;
    positionX: number;
    positionY: number;
  }
): Promise<string> {
  const response = await page.request.fetch(
    `${API_URL}/versions/${versionId}/graph/nodes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Org-Id': ORG_ID,
      },
      data,
    }
  );
  const result = await response.json();
  return result.id;
}

export async function runExecutionAPI(
  page: Page,
  evaluationVersionId: string,
  inputValues: Record<string, unknown>
): Promise<string> {
  const response = await page.request.fetch(`${API_URL}/executions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Org-Id': ORG_ID,
    },
    data: { evaluationVersionId, inputValues },
  });
  const data = await response.json();
  return data.id;
}

/**
 * Setup helper to create a complete evaluation with published version
 */
export async function setupTestEvaluation(
  page: Page,
  evalName: string = `Test Eval ${Date.now()}`
): Promise<{
  schemaId: string;
  evaluationId: string;
  versionId: string;
  cleanup: () => Promise<void>;
}> {
  // Create schema
  const schemaName = `Test Schema ${Date.now()}`;
  const schemaId = await createSchemaAPI(page, schemaName);

  // Create field
  await createFieldAPI(page, schemaId, {
    key: 'test_score',
    displayName: 'Test Score',
    dataType: 'number',
  });

  // Create evaluation
  const evaluationId = await createEvaluationAPI(page, schemaId, evalName);

  // Get version
  const versions = await page.request.fetch(
    `${API_URL}/evaluations/${evaluationId}/versions`,
    {
      headers: { 'X-Org-Id': ORG_ID },
    }
  );
  const versionsData = await versions.json();
  const versionId = versionsData[0].id;

  // Create output node
  await createNodeAPI(page, versionId, {
    nodeType: 'output',
    label: 'Result',
    config: { outputKey: 'result' },
    positionX: 300,
    positionY: 100,
  });

  // Publish version
  await publishVersionAPI(page, evaluationId, versionId);

  // Cleanup function
  const cleanup = async () => {
    await deleteEvaluationAPI(page, evaluationId);
    await deleteSchemaAPI(page, schemaId);
  };

  return { schemaId, evaluationId, versionId, cleanup };
}

/**
 * Navigation helpers
 */
export async function navigateToEvaluations(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/evaluations`);
}

export async function navigateToVersionManager(
  page: Page,
  evaluationId: string
): Promise<void> {
  await page.goto(`${BASE_URL}/evaluations/${evaluationId}/versions`);
}

export async function navigateToGraphBuilder(
  page: Page,
  evaluationId: string,
  versionId: string
): Promise<void> {
  await page.goto(
    `${BASE_URL}/evaluations/${evaluationId}/versions/${versionId}/graph`
  );
}

export async function navigateToExecutions(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/executions`);
}

export async function navigateToExecutionTrace(
  page: Page,
  executionId: string
): Promise<void> {
  await page.goto(`${BASE_URL}/executions/${executionId}/trace`);
}

/**
 * Wait helpers
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

export async function waitForDataLoad(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  await page.waitForTimeout(timeout);
}

/**
 * Assertion helpers
 */
export async function expectNoConsoleErrors(
  page: Page
): Promise<void> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  await page.waitForTimeout(1000);
  // Filter out expected errors
  const unexpectedErrors = errors.filter(
    (e) =>
      !e.includes('Failed to load') &&
      !e.includes('NetworkError') &&
      !e.includes('404')
  );
  expect(unexpectedErrors).toHaveLength(0);
}
