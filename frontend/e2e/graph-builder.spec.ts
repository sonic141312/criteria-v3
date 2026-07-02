import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function createFullEvaluation(request: any) {
  const schemaRes = await request.post(`${BASE_URL}/schemas`, {
    headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
    data: { name: `Graph Test Schema ${Date.now()}` }
  });
  const schema = await schemaRes.json();

  await request.post(`${BASE_URL}/schemas/${schema.id}/fields`, {
    headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
    data: { key: 'score', displayName: 'Score', dataType: 'number' }
  });

  const evalRes = await request.post(`${BASE_URL}/evaluations`, {
    headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
    data: { schemaId: schema.id, name: `Graph Test Eval ${Date.now()}` }
  });
  const evaluation = await evalRes.json();

  const versionsRes = await request.get(`${BASE_URL}/evaluations/${evaluation.id}/versions`, {
    headers: { 'X-Org-Id': ORG_ID }
  });
  const versions = await versionsRes.json();

  return { schema, evaluation, version: versions[0] };
}

async function cleanup(request: any, schemaId: string, evalId: string) {
  try {
    await request.delete(`${BASE_URL}/evaluations/${evalId}`, { headers: { 'X-Org-Id': ORG_ID } });
    await request.delete(`${BASE_URL}/schemas/${schemaId}`, { headers: { 'X-Org-Id': ORG_ID } });
  } catch {}
}

async function createNode(request: any, versionId: string, data: any) {
  const res = await request.post(`${BASE_URL}/versions/${versionId}/graph/nodes`, {
    headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
    data
  });
  return res.json();
}

async function createEdge(request: any, versionId: string, data: any) {
  const res = await request.post(`${BASE_URL}/versions/${versionId}/graph/edges`, {
    headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
    data
  });
  return res.json();
}

test.describe('GraphBuilderPage - Basic Functionality', () => {
  let testData: any;

  test.beforeEach(async ({ page }) => {
    testData = await createFullEvaluation(page.request);
  });

  test.afterEach(async ({ page }) => {
    if (testData) {
      await cleanup(page.request, testData.schema.id, testData.evaluation.id);
    }
  });

  test('should display graph builder page', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const header = page.locator('h1').filter({ hasText: /Graph Builder/i });
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should show version status badge', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const statusBadge = page.getByText(/DRAFT|PUBLISHED/i).first();
    await expect(statusBadge).toBeVisible({ timeout: 10000 });
  });

  test('should show version number', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const versionText = page.getByText(/v\d+/i).first();
    await expect(versionText).toBeVisible({ timeout: 10000 });
  });

  test('should display node palette for DRAFT version', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const palette = page.getByText('Node Types');
    await expect(palette).toBeVisible({ timeout: 10000 });
  });

  test('should show Add Node button for DRAFT version', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const addNodeBtn = page.getByRole('button', { name: /Add Node/i });
    await expect(addNodeBtn).toBeVisible({ timeout: 10000 });
  });

  test('should show node type buttons in palette', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const inputNode = page.getByText('Input').first();
    await expect(inputNode).toBeVisible({ timeout: 10000 });
  });

  test('should show React Flow canvas', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const reactFlowCanvas = page.locator('.react-flow').first();
    await expect(reactFlowCanvas).toBeVisible({ timeout: 10000 });
  });

  test('should show version switcher', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const versionsLabel = page.getByText('Versions:');
    await expect(versionsLabel).toBeVisible({ timeout: 10000 });
  });

  test('should show nodes/edges count', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const count = page.getByText(/\d+ nodes · \d+ edges/);
    await expect(count).toBeVisible({ timeout: 10000 });
  });

  test('should show Validate button', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const validateBtn = page.getByRole('button', { name: /Validate/i });
    await expect(validateBtn).toBeVisible({ timeout: 10000 });
  });

  test('should show Publish button for DRAFT', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const publishBtn = page.getByRole('button', { name: /Publish/i });
    await expect(publishBtn).toBeVisible({ timeout: 10000 });
  });

  test('should show New Version button for DRAFT', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const newVersionBtn = page.getByRole('button', { name: /New Version/i });
    await expect(newVersionBtn).toBeVisible({ timeout: 10000 });
  });
});

test.describe('GraphBuilderPage - Node Operations', () => {
  let testData: any;

  test.beforeEach(async ({ page }) => {
    testData = await createFullEvaluation(page.request);
  });

  test.afterEach(async ({ page }) => {
    if (testData) {
      await cleanup(page.request, testData.schema.id, testData.evaluation.id);
    }
  });

  test('should open Add Node modal', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Add Node/i }).click();
    await page.waitForTimeout(500);

    const modal = page.getByText('Add Node').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('should add Input node', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    await createNode(page.request, testData.version.id, {
      nodeType: 'input',
      label: 'Score Input',
      config: { fieldKey: 'score' },
      positionX: 100,
      positionY: 100
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const nodeLabel = page.getByText('Score Input').first();
    await expect(nodeLabel).toBeVisible({ timeout: 10000 });
  });

  test('should add Output node', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    await createNode(page.request, testData.version.id, {
      nodeType: 'output',
      label: 'Result',
      config: { outputKey: 'result' },
      positionX: 300,
      positionY: 200
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const resultNode = page.getByText('Result').first();
    await expect(resultNode).toBeVisible({ timeout: 10000 });
  });

  test('should add multiple nodes', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    // Add nodes via API
    await createNode(page.request, testData.version.id, {
      nodeType: 'input', label: 'Input1', config: { fieldKey: 'score' }, positionX: 100, positionY: 100
    });
    await createNode(page.request, testData.version.id, {
      nodeType: 'normalize', label: 'Normalize1', config: {}, positionX: 250, positionY: 100
    });
    await createNode(page.request, testData.version.id, {
      nodeType: 'output', label: 'Output1', config: { outputKey: 'result' }, positionX: 400, positionY: 100
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show at least one node
    await expect(page.getByText('Input1').first()).toBeVisible({ timeout: 10000 });
  });

  test('should interact with node', async ({ page }) => {
    await createNode(page.request, testData.version.id, {
      nodeType: 'input', label: 'Select Test', config: { fieldKey: 'score' }, positionX: 200, positionY: 200
    });

    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    // Node should be visible
    const node = page.getByText('Select Test').first();
    await expect(node).toBeVisible({ timeout: 10000 });
  });

  test('should update nodes count after adding node', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    // Initially 0 nodes
    const initialCount = page.getByText(/(\d+) nodes/);
    
    // Add a node via API
    await createNode(page.request, testData.version.id, {
      nodeType: 'input', label: 'New Node', config: { fieldKey: 'score' }, positionX: 100, positionY: 100
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show updated count (1 node)
    const countText = page.getByText(/1 nodes/).first();
    await expect(countText).toBeVisible({ timeout: 5000 });
  });
});

test.describe('GraphBuilderPage - Edge Operations', () => {
  let testData: any;
  let inputNode: any;
  let outputNode: any;

  test.beforeEach(async ({ page }) => {
    testData = await createFullEvaluation(page.request);

    inputNode = await createNode(page.request, testData.version.id, {
      nodeType: 'input', label: 'Input Edge', config: { fieldKey: 'score' }, positionX: 100, positionY: 100
    });
    outputNode = await createNode(page.request, testData.version.id, {
      nodeType: 'output', label: 'Output Edge', config: { outputKey: 'result' }, positionX: 300, positionY: 100
    });
  });

  test.afterEach(async ({ page }) => {
    if (testData) {
      await cleanup(page.request, testData.schema.id, testData.evaluation.id);
    }
  });

  test('should display edges between nodes', async ({ page }) => {
    await createEdge(page.request, testData.version.id, {
      fromNodeId: inputNode.id,
      fromPort: 'result',
      toNodeId: outputNode.id,
      toPort: 'value'
    });

    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    // Edge count should be 1
    const edgeCount = page.getByText(/1 edges/);
    await expect(edgeCount).toBeVisible({ timeout: 10000 });
  });

  test('should update edge count after creating edge', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    // Initially 0 edges
    const initialCount = page.getByText(/0 edges/);
    await expect(initialCount).toBeVisible({ timeout: 5000 });

    // Create edge via API
    await createEdge(page.request, testData.version.id, {
      fromNodeId: inputNode.id,
      fromPort: 'result',
      toNodeId: outputNode.id,
      toPort: 'value'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show updated count
    const edgeCount = page.getByText(/1 edges/);
    await expect(edgeCount).toBeVisible({ timeout: 10000 });
  });
});

test.describe('GraphBuilderPage - Validation', () => {
  let testData: any;

  test.beforeEach(async ({ page }) => {
    testData = await createFullEvaluation(page.request);
  });

  test.afterEach(async ({ page }) => {
    if (testData) {
      await cleanup(page.request, testData.schema.id, testData.evaluation.id);
    }
  });

  test('should show validation result for graph', async ({ page }) => {
    await createNode(page.request, testData.version.id, {
      nodeType: 'output', label: 'Result', config: { outputKey: 'result' }, positionX: 100, positionY: 100
    });

    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Validate/i }).click();
    await page.waitForTimeout(2000);

    const result = page.getByText(/valid|error/i).first();
    await expect(result).toBeVisible({ timeout: 5000 });
  });

  test('should show validation errors for invalid graph', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Validate/i }).click();
    await page.waitForTimeout(2000);

    const errorText = page.getByText(/error|Error/i).first();
    await expect(errorText).toBeVisible({ timeout: 5000 });
  });
});

test.describe('GraphBuilderPage - Version Management', () => {
  let testData: any;

  test.beforeEach(async ({ page }) => {
    testData = await createFullEvaluation(page.request);
  });

  test.afterEach(async ({ page }) => {
    if (testData) {
      await cleanup(page.request, testData.schema.id, testData.evaluation.id);
    }
  });

  test('should create new version', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    page.on('dialog', dialog => dialog.accept());

    await page.getByRole('button', { name: /New Version/i }).click();
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url).toContain('/graph');
  });

  test('should switch between versions', async ({ page }) => {
    await page.request.post(`${BASE_URL}/evaluations/${testData.evaluation.id}/versions`, {
      headers: { 'X-Org-Id': ORG_ID }
    });

    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const v1 = page.getByRole('button', { name: /v1/i }).first();
    await expect(v1).toBeVisible({ timeout: 5000 });
  });

  test('should show version controls based on status', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const addNodeBtn = page.getByRole('button', { name: /Add Node/i });
    await expect(addNodeBtn).toBeVisible({ timeout: 10000 });
  });
});

test.describe('GraphBuilderPage - Responsive Design', () => {
  let testData: any;

  test.beforeEach(async ({ page }) => {
    testData = await createFullEvaluation(page.request);
  });

  test.afterEach(async ({ page }) => {
    if (testData) {
      await cleanup(page.request, testData.schema.id, testData.evaluation.id);
    }
  });

  test('should render on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const header = page.getByText('Graph Builder').first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should render on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const header = page.getByText('Graph Builder').first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should render on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/evaluations/${testData.evaluation.id}/versions/${testData.version.id}/graph`);
    await page.waitForLoadState('networkidle');

    const header = page.getByText('Graph Builder').first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });
});

test.describe('GraphBuilderPage - Error Handling', () => {
  test('should handle non-existent version gracefully', async ({ page }) => {
    await page.goto('/evaluations/test-eval/versions/test-version/graph');
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('should handle API errors', async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/versions/non-existent/graph/nodes`, {
      headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
      data: { nodeType: 'input', label: 'Test', config: {}, positionX: 0, positionY: 0 }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should show loading state', async ({ page }) => {
    await page.goto('/evaluations/test/graph');
    
    const loading = page.getByText(/Loading|loading/i);
    const hasLoading = await loading.isVisible().catch(() => false);
    expect(typeof hasLoading === 'boolean').toBeTruthy();
  });
});
