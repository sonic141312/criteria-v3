import { test, expect } from '@playwright/test';
import {
  createSchemaAPI,
  createFieldAPI,
  createEvaluationAPI,
  createVersionAPI,
  publishVersionAPI,
  createNodeAPI,
  runExecutionAPI,
  deleteSchemaAPI,
  deleteEvaluationAPI,
  navigateToExecutions,
  navigateToExecutionTrace,
  waitForPageLoad,
} from './fixtures';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Full Evaluation Flow E2E Tests
 *
 * Tests the complete flow from schema creation to execution and trace viewing.
 */
test.describe('Full Evaluation Flow', () => {
  let testData: {
    schemaId: string;
    evaluationId: string;
    versionId: string;
    fieldId: string;
    executionId: string;
    cleanup: () => Promise<void>;
  };

  test.beforeAll(async ({ request }) => {
    // Step 1: Create Schema
    const schemaName = `E2E Test Schema ${Date.now()}`;
    const schemaId = await createSchemaAPIByRequest(request, schemaName);

    // Step 2: Add Fields
    const fieldId = await createFieldAPIByRequest(request, schemaId, {
      key: 'followers',
      displayName: 'Followers Count',
      dataType: 'number',
    });

    // Add second field
    await createFieldAPIByRequest(request, schemaId, {
      key: 'engagement_rate',
      displayName: 'Engagement Rate',
      dataType: 'percentage',
    });

    // Step 3: Create Evaluation
    const evaluationId = await createEvaluationAPIByRequest(request, schemaId, 'E2E Test Evaluation');

    // Step 4: Get Version
    const versionId = await getVersionIdByRequest(request, evaluationId);

    // Step 5: Add Nodes to Graph
    // Create Input node for followers
    const inputNodeId = await createNodeAPIByRequest(request, versionId, {
      nodeType: 'input',
      label: 'Followers Input',
      config: { fieldKey: 'followers' },
      positionX: 100,
      positionY: 100,
    });

    // Create Output node
    await createNodeAPIByRequest(request, versionId, {
      nodeType: 'output',
      label: 'Result',
      config: { outputKey: 'result' },
      positionX: 300,
      positionY: 100,
    });

    // Step 6: Create Edge (connect Input to Output)
    await createEdgeAPIByRequest(request, versionId, {
      fromNodeId: inputNodeId,
      fromPort: 'result',
      toNodeId: (await getNodesByRequest(request, versionId))[1].id, // Output node
      toPort: 'value',
    });

    // Step 7: Validate Graph
    await validateGraphAPIByRequest(request, versionId);

    // Step 8: Publish Version
    await publishVersionAPIByRequest(request, evaluationId, versionId);

    // Step 9: Run Execution
    const executionId = await runExecutionAPIByRequest(request, versionId, {
      followers: 10000,
      engagement_rate: 5.5,
    });

    testData = {
      schemaId,
      evaluationId,
      versionId,
      fieldId,
      executionId,
      cleanup: async () => {
        await deleteEvaluationAPIByRequest(request, evaluationId);
        await deleteSchemaAPIByRequest(request, schemaId);
      },
    };
  });

  test.afterAll(async () => {
    if (testData?.cleanup) {
      await testData.cleanup();
    }
  });

  test('should display execution history', async ({ page }) => {
    await page.goto(`${BASE_URL}/executions`);
    await waitForPageLoad(page);

    // Should show the execution we created
    await expect(page.locator('text=Recent Executions')).toBeVisible();
  });

  test('should navigate to execution trace', async ({ page }) => {
    await navigateToExecutionTrace(page, testData.executionId);
    await waitForPageLoad(page);

    // Should show trace page
    await expect(page.locator('text=Execution Trace')).toBeVisible();
  });

  test('should show node results in trace', async ({ page }) => {
    await navigateToExecutionTrace(page, testData.executionId);
    await waitForPageLoad(page);

    // Should display node results
    await expect(page.locator('text=Node Execution Results')).toBeVisible();
  });

  test('should show execution summary', async ({ page }) => {
    await navigateToExecutionTrace(page, testData.executionId);
    await waitForPageLoad(page);

    // Should show execution summary with status
    await expect(page.locator('text=Execution Summary')).toBeVisible();
  });

  test('should show final result', async ({ page }) => {
    await navigateToExecutionTrace(page, testData.executionId);
    await waitForPageLoad(page);

    // Should show final result section
    await expect(page.locator('text=Final Result')).toBeVisible();
  });

  test('should show input values', async ({ page }) => {
    await navigateToExecutionTrace(page, testData.executionId);
    await waitForPageLoad(page);

    // Should show input values
    await expect(page.locator('text=Input Values')).toBeVisible();
  });

  test('should navigate back to executions from trace', async ({ page }) => {
    await navigateToExecutionTrace(page, testData.executionId);
    await waitForPageLoad(page);

    // Click back to executions
    await page.click('text=Back to Executions');
    await waitForPageLoad(page);

    // Should be on executions page
    await expect(page.locator('text=Run Evaluation')).toBeVisible();
  });
});

// Helper functions for direct API calls
async function createSchemaAPIByRequest(
  request: any,
  name: string
): Promise<string> {
  const response = await request.fetch(`${API_URL}/schemas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Org-Id': ORG_ID },
    data: { name },
  });
  const data = await response.json();
  return data.id;
}

async function createFieldAPIByRequest(
  request: any,
  schemaId: string,
  data: { key: string; displayName: string; dataType: string }
): Promise<string> {
  const response = await request.fetch(`${API_URL}/schemas/${schemaId}/fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Org-Id': ORG_ID },
    data,
  });
  const result = await response.json();
  return result.id;
}

async function createEvaluationAPIByRequest(
  request: any,
  schemaId: string,
  name: string
): Promise<string> {
  const response = await request.fetch(`${API_URL}/evaluations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Org-Id': ORG_ID },
    data: { schemaId, name },
  });
  const data = await response.json();
  return data.id;
}

async function getVersionIdByRequest(
  request: any,
  evaluationId: string
): Promise<string> {
  const response = await request.fetch(
    `${API_URL}/evaluations/${evaluationId}/versions`,
    { headers: { 'X-Org-Id': ORG_ID } }
  );
  const versions = await response.json();
  return versions[0].id;
}

async function getNodesByRequest(
  request: any,
  versionId: string
): Promise<any[]> {
  const response = await request.fetch(`${API_URL}/versions/${versionId}/graph`, {
    headers: { 'X-Org-Id': ORG_ID },
  });
  const data = await response.json();
  return data.nodes;
}

async function createNodeAPIByRequest(
  request: any,
  versionId: string,
  data: any
): Promise<string> {
  const response = await request.fetch(
    `${API_URL}/versions/${versionId}/graph/nodes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Org-Id': ORG_ID },
      data,
    }
  );
  const result = await response.json();
  return result.id;
}

async function createEdgeAPIByRequest(
  request: any,
  versionId: string,
  data: { fromNodeId: string; fromPort: string; toNodeId: string; toPort: string }
): Promise<void> {
  await request.fetch(`${API_URL}/versions/${versionId}/graph/edges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Org-Id': ORG_ID },
    data,
  });
}

async function validateGraphAPIByRequest(
  request: any,
  versionId: string
): Promise<void> {
  await request.fetch(`${API_URL}/versions/${versionId}/graph/validate`, {
    method: 'POST',
    headers: { 'X-Org-Id': ORG_ID },
  });
}

async function publishVersionAPIByRequest(
  request: any,
  evaluationId: string,
  versionId: string
): Promise<void> {
  await request.fetch(
    `${API_URL}/evaluations/${evaluationId}/versions/${versionId}/publish`,
    {
      method: 'POST',
      headers: { 'X-Org-Id': ORG_ID },
    }
  );
}

async function runExecutionAPIByRequest(
  request: any,
  versionId: string,
  inputValues: Record<string, unknown>
): Promise<string> {
  const response = await request.fetch(`${API_URL}/executions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Org-Id': ORG_ID },
    data: { evaluationVersionId: versionId, inputValues },
  });
  const data = await response.json();
  return data.id;
}

async function deleteEvaluationAPIByRequest(
  request: any,
  evaluationId: string
): Promise<void> {
  await request.fetch(`${API_URL}/evaluations/${evaluationId}`, {
    method: 'DELETE',
    headers: { 'X-Org-Id': ORG_ID },
  });
}

async function deleteSchemaAPIByRequest(
  request: any,
  schemaId: string
): Promise<void> {
  await request.fetch(`${API_URL}/schemas/${schemaId}`, {
    method: 'DELETE',
    headers: { 'X-Org-Id': ORG_ID },
  });
}
